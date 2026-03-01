/**
 * Sprint 68 — send-nps-survey Edge Function
 *
 * Two invocation modes:
 *
 * Mode 1 — Manual (trainer presses "Send Survey"):
 *   POST /functions/v1/send-nps-survey
 *   Body: { survey_id: string }
 *   Auth: Bearer trainer JWT
 *   → Sends NPS to all active clients of that trainer
 *
 * Mode 2 — Auto-trigger (pg_cron, weekly):
 *   POST /functions/v1/send-nps-survey
 *   Body: {}  (no survey_id)
 *   Auth: Service role key
 *   → Finds all trainers; for each client:
 *     - First completed session ≥ 90 days ago
 *     - No NPS response in last 90 days (or 30 days if they never responded)
 *   → Creates a survey per trainer (if any eligible clients) and sends notifications
 *
 * NPS segments:
 *   9–10 = Promoter
 *   7–8  = Passive
 *   0–6  = Detractor
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NPS_THRESHOLD_DAYS   = 90;
const NON_RESPONDER_DAYS   = 30;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { survey_id } = body;

    if (survey_id) {
      // ── Mode 1: manual — survey already created by service, just send notifications
      const count = await sendNotificationsForSurvey(survey_id);
      return new Response(JSON.stringify({ survey_id, notifications_sent: count }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Mode 2: auto batch ────────────────────────────────────────────────────
    const results = await runAutoNpsBatch();
    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-nps-survey]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ─── Mode 1: send notifications for an existing survey ───────────────────────

async function sendNotificationsForSurvey(surveyId: string): Promise<number> {
  // Get survey + trainer
  const { data: survey, error: sErr } = await supabase
    .from('nps_surveys')
    .select('id, trainer_id')
    .eq('id', surveyId)
    .single();

  if (sErr || !survey) {
    console.error('[send-nps-survey] Survey not found:', surveyId);
    return 0;
  }

  // Get trainer name
  const { data: trainer } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', survey.trainer_id)
    .single();

  const trainerName = (trainer as { full_name: string } | null)?.full_name ?? 'Your Trainer';

  // Get active clients for this trainer
  const { data: clients } = await supabase
    .from('trainer_clients')
    .select('client_id')
    .eq('trainer_id', survey.trainer_id)
    .eq('status', 'active');

  if (!clients || clients.length === 0) return 0;

  let sent = 0;

  for (const { client_id } of clients) {
    // Create nps_response row (pending)
    const { data: response, error: rErr } = await supabase
      .from('nps_responses')
      .insert({
        survey_id:  surveyId,
        trainer_id: survey.trainer_id,
        client_id,
      })
      .select('id')
      .single();

    if (rErr || !response) continue;

    // Push notification
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id:   client_id,
      type:      'nps_survey',
      title:     `Quick question for you 📊`,
      body:      `How likely are you to recommend ${trainerName} to a friend? Takes 30 seconds.`,
      deep_link: `/tabs/workouts/nps/${response.id}`,
      metadata:  {
        survey_id:    surveyId,
        response_id:  response.id,
        trainer_id:   survey.trainer_id,
        trainer_name: trainerName,
      },
      is_read: false,
    });

    if (!notifErr) sent++;
  }

  return sent;
}

// ─── Mode 2: auto-batch (weekly cron) ────────────────────────────────────────

interface AutoBatchResult {
  trainers_processed: number;
  surveys_created:    number;
  notifications_sent: number;
}

async function runAutoNpsBatch(): Promise<AutoBatchResult> {
  const thresholdDate     = new Date(Date.now() - NPS_THRESHOLD_DAYS * 86400000).toISOString();
  const nonResponderCutoff = new Date(Date.now() - NON_RESPONDER_DAYS * 86400000).toISOString();

  // Find all eligible (trainer, client) pairs
  // Criteria: first completed session >= 90 days ago AND no nps_response in last 90 days
  const { data: eligiblePairs, error: pErr } = await supabase.rpc(
    'get_nps_eligible_clients',
    {
      p_threshold_date:      thresholdDate,
      p_non_responder_cutoff: nonResponderCutoff,
    }
  );

  if (pErr) {
    console.error('[send-nps-survey] Failed to get eligible pairs:', pErr.message);
    return { trainers_processed: 0, surveys_created: 0, notifications_sent: 0 };
  }

  if (!eligiblePairs || eligiblePairs.length === 0) {
    return { trainers_processed: 0, surveys_created: 0, notifications_sent: 0 };
  }

  // Group by trainer
  const byTrainer = new Map<string, string[]>();
  for (const pair of eligiblePairs as { trainer_id: string; client_id: string }[]) {
    const clients = byTrainer.get(pair.trainer_id) ?? [];
    clients.push(pair.client_id);
    byTrainer.set(pair.trainer_id, clients);
  }

  let surveysCreated    = 0;
  let notificationsSent = 0;

  for (const [trainerId, clientIds] of byTrainer) {
    // Create survey for this trainer
    const { data: survey, error: sErr } = await supabase
      .from('nps_surveys')
      .insert({ trainer_id: trainerId })
      .select('id')
      .single();

    if (sErr || !survey) {
      console.error(`[send-nps-survey] Failed to create survey for trainer ${trainerId}`);
      continue;
    }
    surveysCreated++;

    // Get trainer name
    const { data: trainer } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', trainerId)
      .single();

    const trainerName = (trainer as { full_name: string } | null)?.full_name ?? 'Your Trainer';

    for (const clientId of clientIds) {
      const { data: response, error: rErr } = await supabase
        .from('nps_responses')
        .insert({ survey_id: survey.id, trainer_id: trainerId, client_id: clientId })
        .select('id')
        .single();

      if (rErr || !response) continue;

      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id:   clientId,
        type:      'nps_survey',
        title:     `Quick question for you 📊`,
        body:      `How likely are you to recommend ${trainerName} to a friend? Takes 30 seconds.`,
        deep_link: `/tabs/workouts/nps/${response.id}`,
        metadata:  { survey_id: survey.id, response_id: response.id, trainer_id: trainerId, trainer_name: trainerName },
        is_read: false,
      });

      if (!notifErr) notificationsSent++;
    }
  }

  return {
    trainers_processed: byTrainer.size,
    surveys_created:    surveysCreated,
    notifications_sent: notificationsSent,
  };
}
