/**
 * Sprint 67 — trigger-session-review Edge Function
 *
 * Triggered 2 hours after an appointment moves to `completed` status.
 * Can be invoked two ways:
 *   1. Webhook from `auto-noshow-check` or appointment FSM when status → completed
 *   2. pg_cron polling: SELECT appointments completed ~2h ago without a review request
 *
 * Creates a push notification for the client with a deep-link to open the
 * PostSessionReviewComponent modal in the app.
 *
 * POST /functions/v1/trigger-session-review
 * Body: { appointment_id: string }   — OR — invoked by cron (no body, batch mode)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVIEW_DELAY_HOURS      = 2;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // ── Mode 1: single appointment (webhook call) ─────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { appointment_id } = body;

    if (appointment_id) {
      const count = await triggerForAppointment(appointment_id);
      return new Response(JSON.stringify({ triggered: count }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Mode 2: batch (pg_cron polling) ──────────────────────────────────────
    // Find appointments completed ~2h ago that haven't had a review notification yet
    const cutoffEarly = new Date(Date.now() - (REVIEW_DELAY_HOURS + 0.5) * 3600000).toISOString();
    const cutoffLate  = new Date(Date.now() - REVIEW_DELAY_HOURS * 3600000).toISOString();

    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        client_id,
        trainer_id,
        start_time,
        service_type,
        profiles!trainer_id (full_name)
      `)
      .eq('status', 'completed')
      .gte('updated_at', cutoffEarly)
      .lte('updated_at', cutoffLate);

    if (apptError) throw apptError;
    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ triggered: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Filter: only appointments without an existing review notification
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('metadata->appointment_id')
      .eq('type', 'review_request')
      .in('metadata->appointment_id', appointments.map((a: { id: string }) => a.id));

    const alreadyNotified = new Set(
      (existingNotifs ?? []).map((n: Record<string, unknown>) => n['metadata->appointment_id'] as string)
    );

    let triggered = 0;
    for (const appt of appointments) {
      if (!alreadyNotified.has(appt.id)) {
        triggered += await triggerForAppointment(appt.id);
      }
    }

    return new Response(JSON.stringify({ triggered }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[trigger-session-review]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ─── Core trigger logic ───────────────────────────────────────────────────────

async function triggerForAppointment(appointmentId: string): Promise<number> {
  // Load appointment details
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .select(`
      id,
      client_id,
      trainer_id,
      start_time,
      service_type,
      profiles!trainer_id (full_name)
    `)
    .eq('id', appointmentId)
    .eq('status', 'completed')
    .maybeSingle();

  if (apptErr || !appt) return 0;

  const trainerName  = (appt.profiles as { full_name: string } | null)?.full_name ?? 'Your Trainer';
  const sessionDate  = new Date(appt.start_time).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  // Insert review-request notification for the client
  const { error: notifErr } = await supabase.from('notifications').insert({
    user_id:  appt.client_id,
    type:     'review_request',
    title:    `How was your session with ${trainerName}?`,
    body:     `Take 30 seconds to rate your ${appt.service_type ?? 'training session'} on ${sessionDate}.`,
    deep_link: `/tabs/review?session=${appointmentId}&trainer=${appt.trainer_id}`,
    metadata:  {
      appointment_id: appt.id,
      trainer_id:     appt.trainer_id,
      trainer_name:   trainerName,
      session_label:  `${appt.service_type ?? 'Training Session'} · ${sessionDate}`,
    },
    is_read:  false,
  });

  if (notifErr) {
    console.error(`[trigger-session-review] Failed to insert notification for ${appointmentId}:`, notifErr.message);
    return 0;
  }

  return 1;
}
