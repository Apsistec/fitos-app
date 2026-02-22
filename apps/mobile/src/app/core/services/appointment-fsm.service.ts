import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { CancellationPolicyService } from './cancellation-policy.service';
import type {
  Appointment,
  AppointmentStatus,
  Visit,
  APPOINTMENT_TRANSITIONS,
} from '@fitos/shared';
import { APPOINTMENT_TERMINAL_STATES } from '@fitos/shared';

/**
 * AppointmentFsmService
 * Sprint 56.1 — Phase 5B
 *
 * Enforces the 8-state appointment lifecycle FSM.
 * All status mutations flow through this service; direct DB updates to `status`
 * are forbidden in feature components.
 *
 * State graph (valid forward transitions only):
 *
 *   requested  → booked | [deleted on deny]
 *   booked     → confirmed | arrived | early_cancel | late_cancel
 *   confirmed  → arrived | early_cancel | late_cancel
 *   arrived    → completed | no_show
 *   completed  → (terminal)
 *   no_show    → (terminal)
 *   early_cancel → (terminal)
 *   late_cancel  → (terminal)
 */

export interface TransitionMetadata {
  cancelReason?: string;
  /** Override: force late_cancel classification even if window hasn't passed */
  forceLateCancel?: boolean;
  /** Notes to attach to the visit record */
  visitNotes?: string;
  /** Arrival time (defaults to now) */
  arrivedAt?: Date;
}

export interface TransitionResult {
  success: boolean;
  appointment?: Appointment;
  visit?: Visit;
  error?: string;
}

// ── Valid transitions ─────────────────────────────────────────────────────────
// Matches APPOINTMENT_TRANSITIONS from @fitos/shared
const VALID_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  requested:    ['booked'],
  booked:       ['confirmed', 'arrived', 'early_cancel', 'late_cancel'],
  confirmed:    ['arrived', 'early_cancel', 'late_cancel'],
  arrived:      ['completed', 'no_show'],
};

@Injectable({ providedIn: 'root' })
export class AppointmentFsmService {
  private supabase         = inject(SupabaseService);
  private auth             = inject(AuthService);
  private notify           = inject(NotificationService);
  private cancellationSvc  = inject(CancellationPolicyService);

  /** Last transition error — drives error UI without throw */
  readonly lastError = signal<string | null>(null);
  readonly isTransitioning = signal(false);

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Pure function: can `from` legally transition to `to`?
   * Used by UI components to show/hide action buttons.
   */
  canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
    return (VALID_TRANSITIONS[from] ?? []).includes(to);
  }

  /**
   * Is this appointment in a terminal state?
   */
  isTerminal(status: AppointmentStatus): boolean {
    return (APPOINTMENT_TERMINAL_STATES as readonly string[]).includes(status);
  }

  /**
   * Is it past the cancel window? If so, any cancellation is a late_cancel.
   * `cancelWindowMinutes` comes from the appointment's `service_type.cancel_window_minutes`.
   */
  isLateCancel(appointment: Appointment, cancelWindowMinutes = 1440): boolean {
    const now = Date.now();
    const deadline = new Date(appointment.start_at).getTime() - cancelWindowMinutes * 60_000;
    return now >= deadline;
  }

  /**
   * Resolve the correct cancel status: early_cancel or late_cancel.
   * Checks the cancel window unless `forceLateCancel` is set.
   */
  resolveCancelStatus(appointment: Appointment, meta: TransitionMetadata = {}): AppointmentStatus {
    if (meta.forceLateCancel) return 'late_cancel';
    // Fetch cancel_window_minutes from joined service_type if available
    const windowMinutes = (appointment as any).service_type?.cancel_window_minutes ?? 1440;
    return this.isLateCancel(appointment, windowMinutes) ? 'late_cancel' : 'early_cancel';
  }

  /**
   * Execute a state transition.
   *
   * - Validates the transition is legal
   * - Applies business rules (late cancel classification, arrived_at timestamp)
   * - Writes updated status to `appointments`
   * - Creates a `visit` record on terminal states
   * - Fires appropriate notifications
   */
  async transition(
    appointment: Appointment,
    toStatus: AppointmentStatus,
    meta: TransitionMetadata = {},
  ): Promise<TransitionResult> {
    this.lastError.set(null);
    this.isTransitioning.set(true);

    try {
      // Guard: terminal states cannot transition
      if (this.isTerminal(appointment.status)) {
        throw new Error(`Appointment is already in terminal state: ${appointment.status}`);
      }

      // Guard: validate transition legality
      if (!this.canTransition(appointment.status, toStatus)) {
        throw new Error(
          `Invalid transition: ${appointment.status} → ${toStatus}. ` +
          `Allowed: ${(VALID_TRANSITIONS[appointment.status] ?? []).join(', ')}`
        );
      }

      // Build update payload
      const now = new Date().toISOString();
      const updates: Partial<Appointment> & Record<string, unknown> = {
        status: toStatus,
        updated_at: now,
      };

      if (toStatus === 'arrived') {
        updates['arrived_at'] = (meta.arrivedAt ?? new Date()).toISOString();
      }
      if (toStatus === 'completed') {
        updates['completed_at'] = now;
      }
      if (toStatus === 'early_cancel' || toStatus === 'late_cancel') {
        updates['cancelled_at'] = now;
        if (meta.cancelReason) updates['cancel_reason'] = meta.cancelReason;
      }

      // Write to DB
      const { data: updated, error: updateError } = await this.supabase.client
        .from('appointments')
        .update(updates)
        .eq('id', appointment.id)
        .select('*, service_type:service_types(*), client:profiles!appointments_client_id_fkey(*)')
        .single();

      if (updateError) throw new Error(updateError.message);

      const updatedAppointment = updated as Appointment;

      // Create visit record on terminal states
      let visit: Visit | undefined;
      if (this.isTerminal(toStatus)) {
        visit = await this.createVisitRecord(updatedAppointment, toStatus);
      }

      // ── Charge cancellation fee for late_cancel / no_show ─────────────────
      // chargeFee() is fire-and-forget from the FSM's perspective:
      // a card decline creates a ledger debit instead of blocking the transition.
      if (toStatus === 'late_cancel' || toStatus === 'no_show') {
        const penalty = this.cancellationSvc.calculatePenalty(
          updatedAppointment,
          toStatus as 'late_cancel' | 'no_show',
        );
        if (penalty.feeAmount > 0) {
          // Non-blocking: don't await — fee failure is surfaced separately
          this.cancellationSvc.chargeFee(appointment.id, toStatus as 'late_cancel' | 'no_show')
            .then(result => {
              if (!result.success) {
                console.warn(
                  `[AppointmentFsmService] Fee charge failed for ${appointment.id}:`,
                  result.error,
                );
              }
            });
        }
      }

      // Fire notifications
      await this.fireTransitionNotifications(updatedAppointment, toStatus);

      return { success: true, appointment: updatedAppointment, visit };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transition failed';
      this.lastError.set(msg);
      return { success: false, error: msg };
    } finally {
      this.isTransitioning.set(false);
    }
  }

  /**
   * Approve a `requested` appointment → transitions to `booked`.
   * Convenience wrapper with semantic name.
   */
  async approve(appointment: Appointment): Promise<TransitionResult> {
    return this.transition(appointment, 'booked');
  }

  /**
   * Deny a `requested` appointment → deletes the record (no state transition).
   */
  async deny(appointmentId: string): Promise<{ success: boolean; error?: string }> {
    this.isTransitioning.set(true);
    try {
      const { error } = await this.supabase.client
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .eq('status', 'requested'); // safety: only delete if still requested

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      this.lastError.set(msg);
      return { success: false, error: msg };
    } finally {
      this.isTransitioning.set(false);
    }
  }

  /**
   * Cancel an appointment, auto-classifying early/late based on window.
   * Convenience wrapper for the most common cancellation flow.
   */
  async cancel(appointment: Appointment, reason?: string): Promise<TransitionResult> {
    const cancelStatus = this.resolveCancelStatus(appointment);
    return this.transition(appointment, cancelStatus, { cancelReason: reason });
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private async createVisitRecord(
    appointment: Appointment,
    terminalStatus: AppointmentStatus,
  ): Promise<Visit> {
    const serviceType = (appointment as any).service_type;
    const sessionsDeducted =
      terminalStatus === 'completed' || terminalStatus === 'no_show' || terminalStatus === 'late_cancel'
        ? (serviceType?.num_sessions_deducted ?? 1)
        : 0; // early_cancel → no session deducted by default

    const visitRecord = {
      appointment_id: appointment.id,
      client_id: appointment.client_id,
      trainer_id: appointment.trainer_id,
      service_type_id: appointment.service_type_id,
      visit_status: terminalStatus,
      sessions_deducted: sessionsDeducted,
      service_price: serviceType?.base_price ?? 0,
      client_service_id: appointment.client_service_id ?? null,
    };

    const { data, error } = await this.supabase.client
      .from('visits')
      .insert(visitRecord)
      .select()
      .single();

    if (error) {
      console.error('[AppointmentFsmService] Failed to create visit record:', error.message);
      // Don't throw — visit creation failure shouldn't roll back the status update
    }

    return (data ?? visitRecord) as Visit;
  }

  private async fireTransitionNotifications(
    appointment: Appointment,
    toStatus: AppointmentStatus,
  ): Promise<void> {
    const clientName = (appointment as any).client?.full_name ?? 'Client';

    switch (toStatus) {
      case 'booked':
        // Booking confirmation → notify client
        await this.notify.send({
          type: 'appointment_reminder',
          title: 'Appointment Confirmed',
          body: `Your session has been booked for ${this.formatApptTime(appointment)}.`,
          scheduledAt: undefined,
        });
        break;

      case 'confirmed':
        // Confirmed → push to client; also schedule 24h reminder
        await this.notify.send({
          type: 'appointment_reminder',
          title: 'Appointment Confirmed ✓',
          body: `Your trainer confirmed your session on ${this.formatApptTime(appointment)}.`,
        });
        // Schedule 24h-before reminder
        const reminderAt = new Date(appointment.start_at);
        reminderAt.setHours(reminderAt.getHours() - 24);
        if (reminderAt > new Date()) {
          await this.notify.send({
            type: 'appointment_reminder',
            title: 'Appointment Tomorrow',
            body: `Don't forget your session tomorrow at ${this.formatApptTime(appointment)}.`,
            scheduledAt: reminderAt,
          });
        }
        break;

      case 'no_show':
        // No-show → notify trainer (auto no-show was triggered)
        await this.notify.send({
          type: 'appointment_reminder',
          title: 'No-Show Recorded',
          body: `${clientName} was marked as a no-show for ${this.formatApptTime(appointment)}.`,
        });
        break;

      case 'late_cancel':
        // Late cancel → notify trainer
        await this.notify.send({
          type: 'appointment_reminder',
          title: 'Late Cancellation',
          body: `${clientName} late-cancelled their session at ${this.formatApptTime(appointment)}.`,
        });
        break;

      default:
        break;
    }
  }

  private formatApptTime(appointment: Appointment): string {
    const d = new Date(appointment.start_at);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
