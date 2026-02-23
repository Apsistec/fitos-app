import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Appointment, BookableSlot, ScoredSlot, ScheduleInsight } from '@fitos/shared';

/**
 * ScheduleOptimizationService — Sprint 61.3 (Phase 5D)
 *
 * Scores available booking slots so trainers (and client-facing booking UIs)
 * can prefer back-to-back appointments over scattered gaps.
 *
 * Algorithm: For each open slot, compute a score 0–100 based on how well it
 * clusters with existing bookings:
 *   +50  if the slot is immediately adjacent to an existing appointment (≤5 min gap)
 *   +30  if within 30 minutes of an existing appointment
 *   +20  if it fills a gap *between* two existing appointments
 *   -20  if accepting the slot would create a gap < 45 min on either side
 *    0   if completely isolated (no bookings within 60 min on either side)
 *
 * Slots with score ≥ 60 are flagged as `isRecommended` (top picks shown in UI).
 */

/** Minutes gap considered "adjacent" */
const ADJACENT_GAP_MIN = 5;
/** Minutes gap considered "nearby" */
const NEARBY_GAP_MIN = 30;
/** Short gap penalty threshold: gaps shorter than this created by accepting are penalised */
const SHORT_GAP_PENALTY_MIN = 45;

@Injectable({ providedIn: 'root' })
export class ScheduleOptimizationService {
  private supabase = inject(SupabaseService);

  // ── Slot scoring ──────────────────────────────────────────────────────────

  /**
   * Scores an array of BookableSlots against a list of existing appointments.
   * Only slots with `available: true` are scored; unavailable slots get score 0.
   * Returns all slots with score and isRecommended populated.
   */
  rankSlots(
    slots: BookableSlot[],
    existingAppointments: Appointment[],
    slotDurationMinutes: number,
  ): ScoredSlot[] {
    // Pre-compute appointment windows as {start, end} pairs for efficiency
    const windows = existingAppointments
      .filter(a => !['early_cancel', 'late_cancel'].includes(a.status))
      .map(a => ({
        start: new Date(a.start_at).getTime(),
        end:   new Date(a.end_at).getTime(),
      }));

    const scored: ScoredSlot[] = slots.map(slot => {
      if (!slot.available) {
        return { ...slot, score: 0, isRecommended: false };
      }

      const slotStart = new Date(slot.time).getTime();
      const slotEnd   = slotStart + slotDurationMinutes * 60_000;
      const score     = this.computeScore(slotStart, slotEnd, windows);

      return { ...slot, score, isRecommended: false };
    });

    // Mark top slots as recommended (score ≥ 60 AND available)
    const availableScores = scored
      .filter(s => s.available && s.score >= 60)
      .map(s => s.score)
      .sort((a, b) => b - a);

    // At most 3 recommended slots
    const threshold = availableScores[2] ?? availableScores[0] ?? 101;

    return scored.map(s => ({
      ...s,
      isRecommended: s.available && s.score >= 60 && s.score >= threshold,
    }));
  }

  /**
   * Returns the top N scored available slots for client-facing booking UI.
   * Wraps rankSlots and slices to the requested count.
   */
  getSuggestedSlots(
    slots: BookableSlot[],
    existingAppointments: Appointment[],
    slotDurationMinutes: number,
    count = 3,
  ): ScoredSlot[] {
    const ranked = this.rankSlots(slots, existingAppointments, slotDurationMinutes);
    return ranked
      .filter(s => s.available)
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  // ── Utilization insights ──────────────────────────────────────────────────

  /**
   * Computes schedule utilization metrics for a given date.
   * - `bookedMinutes`: total minutes of confirmed/booked/arrived/completed appointments
   * - `availableMinutes`: total minutes of trainer availability for the day
   * - `utilizationPct`: bookedMinutes / availableMinutes * 100
   * - `gapCount`: number of gaps > 30 minutes between appointments
   * - `largestGapMinutes`: the longest single gap
   */
  computeInsight(
    date: Date,
    appointments: Appointment[],
    availabilityStart: Date,
    availabilityEnd: Date,
  ): ScheduleInsight {
    const dateStr = date.toISOString().slice(0, 10);

    const dayAppts = appointments
      .filter(a => {
        const d = new Date(a.start_at).toISOString().slice(0, 10);
        return d === dateStr && !['early_cancel', 'late_cancel'].includes(a.status);
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    const availableMinutes = Math.max(
      0,
      (availabilityEnd.getTime() - availabilityStart.getTime()) / 60_000
    );

    const bookedMinutes = dayAppts.reduce((acc, a) => {
      const dur = (new Date(a.end_at).getTime() - new Date(a.start_at).getTime()) / 60_000;
      return acc + dur;
    }, 0);

    // Compute gaps
    let gapCount = 0;
    let largestGapMinutes = 0;

    for (let i = 0; i < dayAppts.length - 1; i++) {
      const gapMs = new Date(dayAppts[i + 1].start_at).getTime() - new Date(dayAppts[i].end_at).getTime();
      const gapMin = gapMs / 60_000;
      if (gapMin > 30) {
        gapCount++;
        if (gapMin > largestGapMinutes) largestGapMinutes = gapMin;
      }
    }

    const utilizationPct = availableMinutes > 0
      ? Math.min(100, Math.round((bookedMinutes / availableMinutes) * 100))
      : 0;

    return {
      date: dateStr,
      bookedMinutes: Math.round(bookedMinutes),
      availableMinutes: Math.round(availableMinutes),
      utilizationPct,
      gapCount,
      largestGapMinutes: Math.round(largestGapMinutes),
    };
  }

  /**
   * Fetches appointments for a date range and returns insights per day.
   * Used by ScheduleInsightsComponent and the trainer dashboard widget.
   */
  async getInsightsForRange(
    trainerId: string,
    dateFrom: Date,
    dateTo: Date,
    appointments: Appointment[],
    availabilityByDay: Map<number, { start: string; end: string }>,
  ): Promise<ScheduleInsight[]> {
    const insights: ScheduleInsight[] = [];

    const current = new Date(dateFrom);
    while (current <= dateTo) {
      const dow = current.getDay();
      const avail = availabilityByDay.get(dow);

      if (avail) {
        const availStart = this.parseTimeOnDate(current, avail.start);
        const availEnd   = this.parseTimeOnDate(current, avail.end);
        insights.push(this.computeInsight(current, appointments, availStart, availEnd));
      }

      current.setDate(current.getDate() + 1);
    }

    return insights;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private computeScore(
    slotStart: number,
    slotEnd: number,
    windows: Array<{ start: number; end: number }>,
  ): number {
    let score = 0;
    let adjacentBefore = false;
    let adjacentAfter  = false;
    let nearbyBefore   = false;
    let nearbyAfter    = false;

    for (const w of windows) {
      // Gap between existing appointment end and proposed slot start
      const gapAfterExisting  = (slotStart - w.end)  / 60_000; // positive = slot is after
      // Gap between proposed slot end and next appointment start
      const gapBeforeExisting = (w.start - slotEnd)  / 60_000; // positive = slot is before

      // Slot immediately follows an appointment
      if (gapAfterExisting >= 0 && gapAfterExisting <= ADJACENT_GAP_MIN) {
        adjacentBefore = true;
      } else if (gapAfterExisting >= 0 && gapAfterExisting <= NEARBY_GAP_MIN) {
        nearbyBefore = true;
      }

      // An appointment immediately follows the slot
      if (gapBeforeExisting >= 0 && gapBeforeExisting <= ADJACENT_GAP_MIN) {
        adjacentAfter = true;
      } else if (gapBeforeExisting >= 0 && gapBeforeExisting <= NEARBY_GAP_MIN) {
        nearbyAfter = true;
      }

      // Check if slot creates a short gap on either side
      if (
        (gapAfterExisting > 0 && gapAfterExisting < SHORT_GAP_PENALTY_MIN) ||
        (gapBeforeExisting > 0 && gapBeforeExisting < SHORT_GAP_PENALTY_MIN)
      ) {
        score -= 20;
      }
    }

    // Award points for adjacency / proximity
    if (adjacentBefore && adjacentAfter) {
      score += 70; // fills a gap between two appointments — best case
    } else if (adjacentBefore || adjacentAfter) {
      score += 50;
    } else if (nearbyBefore && nearbyAfter) {
      score += 40;
    } else if (nearbyBefore || nearbyAfter) {
      score += 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  private parseTimeOnDate(date: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  }
}
