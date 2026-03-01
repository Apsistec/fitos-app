/**
 * send-session-reminders Edge Function
 * Sprint 63.3 — Phase 6A: Client Mobile App Experience
 *
 * Cron-triggered every minute; fires push notifications to clients who:
 *   - Have a booked/confirmed appointment starting in ~60 minutes (±2 min window)
 *   - Have a booked/confirmed appointment starting in ~15 minutes (±2 min window)
 *   - Have `session_reminder_60min` or `session_reminder_15min` enabled respectively
 *
 * Returns { processed60: number, processed15: number, errors: string[] }
 *
 * Invoke manually for testing:
 *   curl -X POST https://<project>.supabase.co/functions/v1/send-session-reminders \
 *     -H "Authorization: Bearer <service_role_key>"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface ReminderRow {
  appointment_id: string;
  client_id: string;
  push_token: string | null;
  client_name: string | null;
  trainer_name: string | null;
  service_name: string | null;
  start_at: string;
}

Deno.serve(async (req) => {
  // Service-role guard for non-cron invocations
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const now = new Date();
  const errors: string[] = [];
  let processed60 = 0;
  let processed15 = 0;

  try {
    // ─── 60-minute reminders ─────────────────────────────────────────────
    const window60From = new Date(now.getTime() + 58 * 60_000).toISOString();
    const window60To   = new Date(now.getTime() + 62 * 60_000).toISOString();

    const { data: rows60, error: e60 } = await supabase
      .rpc('get_reminder_appointments', {
        p_window_from: window60From,
        p_window_to:   window60To,
        p_pref_column: 'session_reminder_60min',
      });

    if (e60) {
      errors.push(`60min query: ${e60.message}`);
    } else {
      for (const row of (rows60 as ReminderRow[]) ?? []) {
        const result = await sendReminder(row, 60);
        if (result) processed60++;
        else errors.push(`Failed 60min push for appt ${row.appointment_id}`);
      }
    }

    // ─── 15-minute reminders ─────────────────────────────────────────────
    const window15From = new Date(now.getTime() + 13 * 60_000).toISOString();
    const window15To   = new Date(now.getTime() + 17 * 60_000).toISOString();

    const { data: rows15, error: e15 } = await supabase
      .rpc('get_reminder_appointments', {
        p_window_from: window15From,
        p_window_to:   window15To,
        p_pref_column: 'session_reminder_15min',
      });

    if (e15) {
      errors.push(`15min query: ${e15.message}`);
    } else {
      for (const row of (rows15 as ReminderRow[]) ?? []) {
        const result = await sendReminder(row, 15);
        if (result) processed15++;
        else errors.push(`Failed 15min push for appt ${row.appointment_id}`);
      }
    }
  } catch (err) {
    errors.push(`Unhandled: ${(err as Error).message}`);
  }

  return new Response(
    JSON.stringify({ processed60, processed15, errors, checkedAt: now.toISOString() }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

/** Sends a push notification for a session reminder. Returns true on success. */
async function sendReminder(row: ReminderRow, minutesBefore: number): Promise<boolean> {
  if (!row.push_token) return false; // no push token → silent skip

  const trainerName = row.trainer_name || 'your trainer';
  const serviceName = row.service_name || 'session';
  const startTime = new Date(row.start_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const title = minutesBefore === 60
    ? `Session in 1 hour`
    : `Session in 15 minutes`;

  const body = minutesBefore === 60
    ? `Your ${serviceName} with ${trainerName} starts at ${startTime}.`
    : `Get ready! Your ${serviceName} with ${trainerName} starts at ${startTime}.`;

  // Insert into notifications table — let the existing push handler pick it up
  const { error } = await supabase.from('notifications').insert({
    user_id: row.client_id,
    title,
    body,
    type: 'session_reminder',
    data: {
      appointment_id: row.appointment_id,
      minutes_before: minutesBefore,
    },
    push_token: row.push_token,
  });

  return !error;
}
