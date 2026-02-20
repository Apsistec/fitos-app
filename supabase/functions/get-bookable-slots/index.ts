/**
 * get-bookable-slots Edge Function
 * Sprint 54.2 — Phase 5A: Availability Engine
 *
 * Returns a 15-minute grid of available/blocked slots for a given
 * trainer + service type + date combination.
 *
 * Algorithm:
 *  1. Load trainer's staff_availability for the day of week
 *  2. Load all active appointments with their service type buffers
 *  3. Walk the availability window in 15-minute steps
 *  4. For each slot: mark blocked if it overlaps any appointment
 *     (including buffer_after_minutes + travel_buffer_minutes)
 *
 * Performance target: <200ms on cold start
 * Concurrency safety: use DB-level conflict check on final INSERT
 *
 * Request body: { trainer_id: string, service_type_id: string, date: string }
 * Response: { slots: BookableSlot[], service_duration_minutes: number }
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RequestBody {
  trainer_id:      string;
  service_type_id: string;
  date:            string; // YYYY-MM-DD
}

interface AvailabilityRow {
  start_time: string; // HH:MM:SS
  end_time:   string;
  facility_id: string | null;
}

interface AppointmentWindow {
  start_at:              string;
  end_at:                string;
  buffer_after_minutes:  number;
  travel_buffer_minutes: number;
  facility_id:           string | null;
}

interface ServiceTypeRow {
  duration_minutes:      number;
  buffer_after_minutes:  number;
  travel_buffer_minutes: number;
  cancel_window_minutes: number;
}

interface BookableSlot {
  time:           string; // ISO timestamp
  available:      boolean;
  blocked_reason?: 'outside_availability' | 'existing_appointment' | 'buffer' | 'travel_buffer' | 'booking_lead_time';
}

const SLOT_INTERVAL_MINUTES = 15;
const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as RequestBody;
    const { trainer_id, service_type_id, date } = body;

    if (!trainer_id || !service_type_id || !date) {
      return Response.json(
        { error: 'trainer_id, service_type_id, and date are required' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return Response.json(
        { error: 'date must be YYYY-MM-DD format' },
        { status: 400, headers: corsHeaders },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const targetDate = new Date(date + 'T00:00:00Z');
    // day_of_week: 0=Sun uses JS getUTCDay convention
    const dayOfWeek = targetDate.getUTCDay();

    // ── 1. Load service type ────────────────────────────────────
    const { data: serviceType, error: stErr } = await supabase
      .from('service_types')
      .select('duration_minutes, buffer_after_minutes, travel_buffer_minutes, cancel_window_minutes')
      .eq('id', service_type_id)
      .single();

    if (stErr || !serviceType) {
      return Response.json(
        { error: 'Service type not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    const st = serviceType as ServiceTypeRow;

    // ── 2. Load trainer availability for this day ───────────────
    const { data: availRows } = await supabase
      .from('staff_availability')
      .select('start_time, end_time, facility_id')
      .eq('trainer_id', trainer_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    if (!availRows || availRows.length === 0) {
      // No availability set for this day
      return Response.json(
        { slots: [], service_duration_minutes: st.duration_minutes },
        { headers: corsHeaders },
      );
    }

    // ── 3. Load existing appointments for this day + buffers ────
    const dayStart = date + 'T00:00:00.000Z';
    const dayEnd   = date + 'T23:59:59.999Z';

    const { data: apptRows } = await supabase
      .from('appointments')
      .select(`
        start_at,
        end_at,
        facility_id,
        service_type:service_types(buffer_after_minutes, travel_buffer_minutes)
      `)
      .eq('trainer_id', trainer_id)
      .gte('start_at', dayStart)
      .lte('start_at', dayEnd)
      .not('status', 'in', '("early_cancel","late_cancel")');

    const appointments: AppointmentWindow[] = (apptRows ?? []).map((a: Record<string, unknown>) => ({
      start_at:              a['start_at'] as string,
      end_at:                a['end_at'] as string,
      buffer_after_minutes:  ((a['service_type'] as Record<string, number>)?.['buffer_after_minutes'] ?? 0),
      travel_buffer_minutes: ((a['service_type'] as Record<string, number>)?.['travel_buffer_minutes'] ?? 0),
      facility_id:           a['facility_id'] as string | null,
    }));

    // ── 4. Build the slot grid ──────────────────────────────────
    const now = new Date();
    const bookingLeadTimeMs = 60 * 60 * 1000; // 1 hour minimum lead time (default)
    const slots: BookableSlot[] = [];

    for (const avail of availRows as AvailabilityRow[]) {
      // Parse HH:MM:SS into minutes-from-midnight
      const [sh, sm] = avail.start_time.split(':').map(Number);
      const [eh, em] = avail.end_time.split(':').map(Number);
      const windowStartMin = sh * 60 + sm;
      const windowEndMin   = eh * 60 + em;

      // Walk in 15-min increments from window start
      // Stop when the proposed session would end after the window
      for (
        let slotStartMin = windowStartMin;
        slotStartMin + st.duration_minutes <= windowEndMin;
        slotStartMin += SLOT_INTERVAL_MINUTES
      ) {
        const slotStartISO = dateMinutesToISO(date, slotStartMin);
        const slotEndMin   = slotStartMin + st.duration_minutes;
        const slotEndISO   = dateMinutesToISO(date, slotEndMin);

        const slotStartDate = new Date(slotStartISO);
        const slotEndDate   = new Date(slotEndISO);

        // ── Check: booking lead time ────────────────────────────
        if (slotStartDate.getTime() - now.getTime() < bookingLeadTimeMs) {
          slots.push({ time: slotStartISO, available: false, blocked_reason: 'booking_lead_time' });
          continue;
        }

        // ── Check: conflicts with existing appointments ─────────
        let blocked   = false;
        let reason: BookableSlot['blocked_reason'];

        for (const appt of appointments) {
          const apptStart  = new Date(appt.start_at).getTime();
          const apptEnd    = new Date(appt.end_at).getTime();
          const bufferEnd  = apptEnd + (appt.buffer_after_minutes + appt.travel_buffer_minutes) * 60_000;
          const slotStart  = slotStartDate.getTime();
          const slotEnd    = slotEndDate.getTime();
          // Also add the new slot's own buffer to calculate blocked-after window
          const slotWithBuffer = slotEnd + (st.buffer_after_minutes + st.travel_buffer_minutes) * 60_000;

          // Overlap: proposed slot overlaps the appointment window + its tail buffers
          if (slotStart < bufferEnd && slotWithBuffer > apptStart) {
            blocked = true;

            // Classify reason
            if (slotStart >= apptEnd) {
              reason = appt.travel_buffer_minutes > 0 ? 'travel_buffer' : 'buffer';
            } else {
              reason = 'existing_appointment';
            }
            break;
          }
        }

        slots.push({
          time:            slotStartISO,
          available:       !blocked,
          blocked_reason:  blocked ? reason : undefined,
        });
      }
    }

    // Sort slots chronologically (multiple availability blocks may interleave)
    slots.sort((a, b) => a.time.localeCompare(b.time));

    return Response.json(
      {
        slots,
        service_duration_minutes: st.duration_minutes,
        date,
        trainer_id,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json(
      { error: message },
      { status: 500, headers: corsHeaders },
    );
  }
});

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Converts a YYYY-MM-DD date string + minutes-from-midnight
 * into a UTC ISO timestamp.
 */
function dateMinutesToISO(date: string, minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60).toString().padStart(2, '0');
  const m = (minutesFromMidnight % 60).toString().padStart(2, '0');
  return `${date}T${h}:${m}:00.000Z`;
}
