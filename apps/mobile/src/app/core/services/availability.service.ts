import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { StaffAvailability } from '@fitos/shared';

/**
 * AvailabilityService
 * Sprint 54.1 — Phase 5A
 *
 * Manages trainer weekly availability templates and exposes
 * the conflict-check helper used by booking flows.
 *
 * The actual bookable-slot computation (15-minute grid walk) lives
 * in the `get-bookable-slots` Edge Function for performance and
 * to avoid shipping heavy date logic to the client.
 */

export type CreateAvailabilityDto = Omit<StaffAvailability, 'id' | 'created_at' | 'updated_at'>;

/** Human-readable day names indexed 0=Sun to 6=Sat */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  availability = signal<StaffAvailability[]>([]);
  isLoading    = signal(false);
  error        = signal<string | null>(null);

  // ── Load ─────────────────────────────────────────────────────

  async loadAvailability(trainerId?: string): Promise<void> {
    const tid = trainerId ?? this.auth.currentUser()?.id;
    if (!tid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('staff_availability')
      .select('*')
      .eq('trainer_id', tid)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.availability.set((data ?? []) as StaffAvailability[]);
  }

  /** Get availability blocks for a specific day of week (0=Sun) */
  getAvailabilityForDay(dayOfWeek: number): StaffAvailability[] {
    return this.availability().filter(a => a.day_of_week === dayOfWeek);
  }

  /**
   * Returns whether a trainer has any availability set at all.
   * Used to prompt new trainers to set up their schedule.
   */
  hasAvailability(): boolean {
    return this.availability().length > 0;
  }

  // ── Upsert (replaces full day or all availability) ───────────

  /**
   * Sets all availability for a trainer.
   * Deletes existing and inserts the new set.
   * This is simpler than diffing individual blocks.
   */
  async setAvailability(
    trainerId: string,
    blocks: Omit<CreateAvailabilityDto, 'trainer_id'>[],
  ): Promise<{ error: Error | null }> {
    try {
      // Soft-delete all existing availability
      const { error: delErr } = await this.supabase.client
        .from('staff_availability')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('trainer_id', trainerId)
        .eq('is_active', true);

      if (delErr) throw new Error(delErr.message);

      if (blocks.length === 0) {
        this.availability.set([]);
        return { error: null };
      }

      const rows = blocks.map(b => ({
        ...b,
        trainer_id: trainerId,
        is_active: true,
      }));

      const { data, error } = await this.supabase.client
        .from('staff_availability')
        .insert(rows)
        .select();

      if (error) throw new Error(error.message);

      this.availability.set((data ?? []) as StaffAvailability[]);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  /**
   * Adds a single availability block without replacing existing ones.
   */
  async addBlock(
    trainerId: string,
    block: Omit<CreateAvailabilityDto, 'trainer_id'>,
  ): Promise<{ data: StaffAvailability | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase.client
        .from('staff_availability')
        .insert({ ...block, trainer_id: trainerId, is_active: true })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const block_ = data as StaffAvailability;
      this.availability.update(list =>
        [...list, block_].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
      );

      return { data: block_, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * Removes (soft-deletes) a single availability block.
   */
  async removeBlock(blockId: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.client
        .from('staff_availability')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', blockId);

      if (error) throw new Error(error.message);

      this.availability.update(list => list.filter(a => a.id !== blockId));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  // ── Conflict detection ───────────────────────────────────────

  /**
   * Client-side double-booking guard.
   * Delegates to DB function for authoritative check.
   * Returns true if the given window conflicts with an existing appointment.
   */
  async checkConflict(
    trainerId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const { data } = await this.supabase.client
      .rpc('check_appointment_conflict', {
        p_trainer_id: trainerId,
        p_start_at:   startAt.toISOString(),
        p_end_at:     endAt.toISOString(),
        p_exclude_id: excludeAppointmentId ?? null,
      });

    return !!data;
  }

  /**
   * Checks if a given Date falls within any of the trainer's availability windows.
   * Used for client-side slot validation before calling the Edge Function.
   */
  isWithinAvailability(date: Date, durationMinutes: number): boolean {
    const dayOfWeek = date.getDay();
    const blocks    = this.getAvailabilityForDay(dayOfWeek);

    if (blocks.length === 0) return false;

    const startHHMM = this.dateToTimeString(date);
    const endDate   = new Date(date.getTime() + durationMinutes * 60_000);
    const endHHMM   = this.dateToTimeString(endDate);

    return blocks.some(
      b => startHHMM >= b.start_time && endHHMM <= b.end_time
    );
  }

  // ── Default availability for new trainers ────────────────────

  async seedDefaultAvailability(trainerId: string): Promise<void> {
    const workdays = [1, 2, 3, 4, 5]; // Mon–Fri
    const blocks = workdays.map(day => ({
      trainer_id:  trainerId,
      day_of_week: day,
      start_time:  '07:00',
      end_time:    '19:00',
      is_active:   true,
    }));

    await this.supabase.client
      .from('staff_availability')
      .upsert(blocks, { onConflict: 'trainer_id,day_of_week,start_time', ignoreDuplicates: true });
  }

  // ── Helpers ──────────────────────────────────────────────────

  private dateToTimeString(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
