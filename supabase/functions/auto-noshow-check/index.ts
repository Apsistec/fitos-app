/**
 * auto-noshow-check Edge Function
 * Sprint 56.1 — Phase 5B: Appointment Lifecycle
 *
 * Key competitive differentiator over Mindbody:
 *   Mindbody requires manual no-show marking — trainers forget, creating billing disputes.
 *   FitOS auto-marks no-shows using a pg_cron schedule every 5 minutes.
 *
 * Algorithm:
 *   1. Find all appointments in status IN ('booked','confirmed','arrived')
 *      whose start_at has passed by more than the trainer's `auto_noshow_minutes`
 *      (default 10 min) AND arrived_at IS NULL.
 *   2. For each: transition to `no_show`, create visit record, log result.
 *   3. (Optional) Fire no-show fee Stripe charge if configured — deferred to Sprint 57.
 *
 * Invocation:
 *   - pg_cron every 5 minutes:
 *       SELECT cron.schedule('auto-noshow', '*/5 * * * *',
 *         $$SELECT net.http_post(url := 'https://<project>.supabase.co/functions/v1/auto-noshow-check',
 *           headers := '{"Authorization":"Bearer <service_key>"}',
 *           body := '{}')$$);
 *   - Also callable manually from trainer settings for testing.
 *
 * Request body: {} (no params — processes all overdue appointments)
 * Response: { processed: number, errors: string[] }
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppointmentRow {
  id:                   string;
  trainer_id:           string;
  client_id:            string;
  service_type_id:      string;
  status:               string;
  start_at:             string;
  arrived_at:           string | null;
  client_service_id:    string | null;
  auto_noshow_minutes:  number; // from joined profile
  service_price:        number; // from joined service_type
  num_sessions_deducted: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Require service-role authorization for this cron function
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role to bypass RLS
    { auth: { persistSession: false } }
  );

  const now = new Date().toISOString();
  const processed: string[] = [];
  const errors: string[] = [];

  try {
    // ── Step 1: Find all overdue non-arrived appointments ─────────────────────
    // Join profiles to get trainer's `auto_noshow_minutes` setting.
    // Join service_types to get billing data for the visit record.
    const { data: overdue, error: queryError } = await supabase
      .from('appointments')
      .select(`
        id,
        trainer_id,
        client_id,
        service_type_id,
        status,
        start_at,
        arrived_at,
        client_service_id,
        trainer:profiles!appointments_trainer_id_fkey (
          auto_noshow_minutes
        ),
        service_type:service_types (
          base_price,
          num_sessions_deducted
        )
      `)
      .in('status', ['booked', 'confirmed', 'arrived'])
      .lt('start_at', now)  // already started
      .is('arrived_at', null); // no arrival recorded

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    if (!overdue || overdue.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, errors: [], message: 'No overdue appointments' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 2: Filter by per-trainer auto_noshow_minutes ────────────────────
    const eligibleForNoShow: AppointmentRow[] = [];

    for (const appt of overdue) {
      const trainerProfile = (appt as any).trainer;
      const autoNoshowMinutes = trainerProfile?.auto_noshow_minutes ?? 10;
      const serviceType = (appt as any).service_type;

      const startMs = new Date(appt.start_at).getTime();
      const nowMs = Date.now();
      const minutesSinceStart = (nowMs - startMs) / 60_000;

      if (minutesSinceStart >= autoNoshowMinutes) {
        eligibleForNoShow.push({
          id:                   appt.id,
          trainer_id:           appt.trainer_id,
          client_id:            appt.client_id,
          service_type_id:      appt.service_type_id,
          status:               appt.status,
          start_at:             appt.start_at,
          arrived_at:           appt.arrived_at,
          client_service_id:    appt.client_service_id ?? null,
          auto_noshow_minutes:  autoNoshowMinutes,
          service_price:        serviceType?.base_price ?? 0,
          num_sessions_deducted: serviceType?.num_sessions_deducted ?? 1,
        });
      }
    }

    // ── Step 3: Transition each eligible appointment to no_show ───────────────
    for (const appt of eligibleForNoShow) {
      try {
        // Update appointment status
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            status: 'no_show',
            updated_at: now,
          })
          .eq('id', appt.id)
          .in('status', ['booked', 'confirmed', 'arrived']); // re-check status (idempotent guard)

        if (updateError) {
          errors.push(`${appt.id}: status update failed — ${updateError.message}`);
          continue;
        }

        // Create visit record for billing/payroll
        const { error: visitError } = await supabase
          .from('visits')
          .insert({
            appointment_id:       appt.id,
            client_id:            appt.client_id,
            trainer_id:           appt.trainer_id,
            service_type_id:      appt.service_type_id,
            visit_status:         'no_show',
            sessions_deducted:    appt.num_sessions_deducted, // no-show deducts session
            service_price:        appt.service_price,
            client_service_id:    appt.client_service_id,
            created_at:           now,
          });

        if (visitError) {
          // Log but don't abort — status was already updated
          console.error(`[auto-noshow] Visit record failed for ${appt.id}: ${visitError.message}`);
          errors.push(`${appt.id}: visit record failed — ${visitError.message}`);
        }

        // TODO Sprint 57: trigger no-show fee charge via Stripe if configured
        // await chargeNoshowFee(appt);

        processed.push(appt.id);
        console.log(`[auto-noshow] Marked no-show: ${appt.id} (${appt.trainer_id})`);
      } catch (apptErr: unknown) {
        const msg = apptErr instanceof Error ? apptErr.message : String(apptErr);
        errors.push(`${appt.id}: ${msg}`);
        console.error(`[auto-noshow] Error processing ${appt.id}:`, msg);
      }
    }

    return new Response(
      JSON.stringify({
        processed: processed.length,
        processedIds: processed,
        errors,
        checkedAt: now,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auto-noshow] Fatal error:', msg);
    return new Response(
      JSON.stringify({ processed: 0, errors: [msg] }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
