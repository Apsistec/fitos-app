import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type {
  Appointment,
  CancellationPolicy,
  CancellationPenalty,
  ClientLedgerEntry,
} from '@fitos/shared';

/**
 * CancellationPolicyService
 * Sprint 57.1 — Phase 5B: Cancellation Policies
 *
 * Manages trainer-defined cancellation rules and computes penalties.
 * Resolution order: service-type-specific policy → global policy → zero penalty (no policy).
 *
 * Fee charging (Stripe) is handled by the `charge-cancellation-fee` Edge Function,
 * which this service calls via `chargeFee()`.
 */

export type CreatePolicyDto = Omit<CancellationPolicy, 'id' | 'created_at' | 'updated_at'>;

@Injectable({ providedIn: 'root' })
export class CancellationPolicyService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  readonly policies   = signal<CancellationPolicy[]>([]);
  readonly isLoading  = signal(false);
  readonly error      = signal<string | null>(null);

  /** The trainer's global fallback policy (service_type_id IS NULL) */
  readonly globalPolicy = computed<CancellationPolicy | null>(() =>
    this.policies().find(p => !p.service_type_id) ?? null
  );

  // ── Load ─────────────────────────────────────────────────────────────────

  async loadPolicies(trainerId?: string): Promise<void> {
    const tid = trainerId ?? this.auth.profile()?.id;
    if (!tid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('cancellation_policies')
      .select('*')
      .eq('trainer_id', tid)
      .order('service_type_id', { ascending: true, nullsFirst: false });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.policies.set((data ?? []) as CancellationPolicy[]);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async createPolicy(dto: CreatePolicyDto): Promise<CancellationPolicy | null> {
    const { data, error } = await this.supabase.client
      .from('cancellation_policies')
      .insert(dto)
      .select()
      .single();

    if (error) {
      this.error.set(error.message);
      return null;
    }

    const created = data as CancellationPolicy;
    this.policies.update(list => [...list, created]);
    return created;
  }

  async updatePolicy(id: string, updates: Partial<CreatePolicyDto>): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('cancellation_policies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.error.set(error.message);
      return;
    }

    const updated = data as CancellationPolicy;
    this.policies.update(list => list.map(p => p.id === id ? updated : p));
  }

  async deletePolicy(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('cancellation_policies')
      .delete()
      .eq('id', id);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.policies.update(list => list.filter(p => p.id !== id));
  }

  // ── Policy Resolution ─────────────────────────────────────────────────────

  /**
   * Resolve the applicable policy for an appointment.
   * Precedence: service-type-specific → global → null (no policy).
   */
  getPolicyForAppointment(appointment: Appointment): CancellationPolicy | null {
    // 1. Service-type-specific policy
    const specific = this.policies().find(
      p => p.service_type_id === appointment.service_type_id
    );
    if (specific) return specific;

    // 2. Global fallback (service_type_id is null/undefined)
    return this.globalPolicy();
  }

  /**
   * Returns the timestamp after which a cancellation is "late".
   * `start_at − late_cancel_window_minutes`
   */
  getCancellationDeadline(appointment: Appointment): Date | null {
    const policy = this.getPolicyForAppointment(appointment);
    if (!policy) return null;

    const startMs = new Date(appointment.start_at).getTime();
    return new Date(startMs - policy.late_cancel_window_minutes * 60_000);
  }

  /**
   * Returns whether it's past the cancellation deadline (late cancel territory).
   * Uses current time — for server-authoritative check, the Edge Function re-validates.
   */
  isLateCancel(appointment: Appointment): boolean {
    const deadline = this.getCancellationDeadline(appointment);
    if (!deadline) return false;
    return Date.now() >= deadline.getTime();
  }

  /**
   * Calculate the penalty for a terminal cancellation/no-show status.
   * Returns fee amount and whether the session should be forfeited from any package.
   */
  calculatePenalty(
    appointment: Appointment,
    terminalStatus: 'late_cancel' | 'no_show' | 'early_cancel',
  ): CancellationPenalty {
    const policy = this.getPolicyForAppointment(appointment);

    if (!policy) {
      return { forfeitSession: false, feeAmount: 0, policy: null };
    }

    let feeAmount = 0;
    let forfeitSession = false;

    switch (terminalStatus) {
      case 'no_show':
        feeAmount = policy.no_show_fee_amount;
        forfeitSession = policy.forfeit_session;
        break;
      case 'late_cancel':
        feeAmount = policy.late_cancel_fee_amount;
        forfeitSession = policy.forfeit_session;
        break;
      case 'early_cancel':
        // Early cancel: no fee, no forfeiture by default
        feeAmount = 0;
        forfeitSession = false;
        break;
    }

    return { forfeitSession, feeAmount, policy };
  }

  /**
   * Returns a human-readable deadline string for display on booking confirmation.
   * e.g. "Cancel by Mon, Mar 3 at 10:00 AM to avoid a $25 fee"
   */
  getDeadlineLabel(appointment: Appointment): string | null {
    const policy = this.getPolicyForAppointment(appointment);
    if (!policy) return null;

    const deadline = this.getCancellationDeadline(appointment);
    if (!deadline) return null;

    const dateStr = deadline.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    const timeStr = deadline.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });

    const hasFee = policy.late_cancel_fee_amount > 0 || policy.no_show_fee_amount > 0;
    const feeStr = hasFee ? ` to avoid a $${policy.late_cancel_fee_amount} late-cancel fee` : '';

    return `Cancel by ${dateStr} at ${timeStr}${feeStr}`;
  }

  // ── Fee Charging ──────────────────────────────────────────────────────────

  /**
   * Trigger fee charging via Edge Function.
   * Called by AppointmentFsmService after a terminal transition with a fee.
   * Returns true if the charge succeeded or was enqueued as a ledger debit.
   */
  async chargeFee(
    appointmentId: string,
    feeType: 'late_cancel' | 'no_show',
  ): Promise<{ success: boolean; ledgerEntry?: ClientLedgerEntry; error?: string }> {
    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'charge-cancellation-fee',
        { body: { appointment_id: appointmentId, fee_type: feeType } }
      );

      if (error) throw new Error(error.message);

      return {
        success: true,
        ledgerEntry: data?.ledger_entry as ClientLedgerEntry | undefined,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fee charge failed';
      return { success: false, error: msg };
    }
  }

  // ── Client Ledger ─────────────────────────────────────────────────────────

  async getLedgerBalance(clientId: string, trainerId: string): Promise<number> {
    const { data, error } = await this.supabase.client
      .from('client_ledger')
      .select('entry_type, amount')
      .eq('client_id', clientId)
      .eq('trainer_id', trainerId);

    if (error || !data) return 0;

    return (data as ClientLedgerEntry[]).reduce((balance, entry) => {
      return entry.entry_type === 'debit'
        ? balance - entry.amount
        : balance + entry.amount;
    }, 0);
  }

  async getLedgerEntries(clientId: string): Promise<ClientLedgerEntry[]> {
    const { data, error } = await this.supabase.client
      .from('client_ledger')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []) as ClientLedgerEntry[];
  }

  // ── Seed default global policy for new trainers ───────────────────────────

  async seedDefaultPolicy(trainerId: string): Promise<void> {
    const existing = this.policies().find(p => !p.service_type_id);
    if (existing) return;

    await this.createPolicy({
      trainer_id: trainerId,
      service_type_id: undefined,
      late_cancel_window_minutes: 1440, // 24 hours
      late_cancel_fee_amount: 0,
      no_show_fee_amount: 0,
      forfeit_session: true,
      applies_to_memberships: true,
    });
  }
}
