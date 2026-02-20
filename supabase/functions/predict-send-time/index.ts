/**
 * predict-send-time Edge Function
 * Sprint 52: Context-Aware Notifications + Geofencing
 *
 * Analyses a user's notification open history to predict the best
 * hour of day (per day-of-week) to send future notifications.
 *
 * Called by a scheduled cron job once per day, or on-demand.
 *
 * Request body:
 *   { user_id }   — update predictions for a single user
 *   { all: true } — update predictions for all users (admin/cron only, requires service role)
 *
 * Algorithm:
 *   Weighted average of open-time hours, exponentially favouring recent opens.
 *   Confidence = min(0.95, 0.1 * sample_size).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { user_id, all } = body as { user_id?: string; all?: boolean };

    let targetUserIds: string[] = [];

    if (all) {
      // Cron mode: fetch all users who have notifications in the last 30 days
      const { data: users } = await supabase
        .from('notification_log')
        .select('user_id')
        .gte('delivered_at', new Date(Date.now() - 30 * 86400_000).toISOString());

      const uniqueIds = [...new Set((users ?? []).map((u: { user_id: string }) => u.user_id))];
      targetUserIds = uniqueIds;
    } else if (user_id) {
      targetUserIds = [user_id];
    } else {
      return new Response(
        JSON.stringify({ error: 'Provide user_id or all: true' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let processed = 0;

    for (const uid of targetUserIds) {
      try {
        await updatePredictionsForUser(supabase, uid);
        processed++;
      } catch (err) {
        console.error(`[predict-send-time] failed for user ${uid}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[predict-send-time] error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function updatePredictionsForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  // Fetch notifications opened in last 90 days
  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const { data: logs } = await supabase
    .from('notification_log')
    .select('opened_at')
    .eq('user_id', userId)
    .not('opened_at', 'is', null)
    .gte('opened_at', since)
    .order('opened_at', { ascending: false });

  if (!logs || logs.length === 0) return;

  // Group open hours by day-of-week
  const dayHours: Map<number, number[]> = new Map();
  for (const log of logs as { opened_at: string }[]) {
    const d = new Date(log.opened_at);
    const dow = d.getDay();
    const hour = d.getHours();
    if (!dayHours.has(dow)) dayHours.set(dow, []);
    dayHours.get(dow)!.push(hour);
  }

  // For each day-of-week compute weighted average (exponential, α=0.3, favouring recent)
  for (const [dow, hours] of dayHours) {
    let weightedSum = 0;
    let weightTotal = 0;
    const alpha = 0.3;

    for (let i = 0; i < hours.length; i++) {
      const weight = Math.pow(1 - alpha, i); // most recent = index 0 = highest weight
      weightedSum += hours[i] * weight;
      weightTotal += weight;
    }

    const predictedHour = Math.round(weightedSum / weightTotal);
    const sampleSize = hours.length;
    const confidence = Math.min(0.95, 0.1 * sampleSize);

    await supabase
      .from('send_time_predictions')
      .upsert({
        user_id: userId,
        day_of_week: dow,
        predicted_best_hour: predictedHour,
        sample_size: sampleSize,
        confidence,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,day_of_week' });
  }
}
