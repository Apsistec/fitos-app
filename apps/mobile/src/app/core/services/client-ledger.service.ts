/**
 * ClientLedgerService — Sprint 59 (Phase 5C)
 *
 * Manages the client_ledger table:
 * - Debit/credit history (session fees, autopay, no-show charges, manual adjustments)
 * - Running balance computation (credits − debits)
 * - Manual credit/debit entries for trainer adjustments
 *
 * Balance convention:
 *   positive  = client has a credit (trainer owes sessions or refund)
 *   negative  = client owes money (outstanding debt)
 */

import { Injectable, signal, computed, inject, isDevMode } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ── Types ──────────────────────────────────────────────────────────────────────

export type LedgerEntryType = 'credit' | 'debit';

export type LedgerReason =
  | 'session_credit'    // autopay renewal or pack purchase
  | 'session_debit'     // session consumed at checkout
  | 'no_show_fee'       // no-show charge applied
  | 'cancellation_fee'  // late cancellation charge
  | 'manual_adjustment' // trainer manual entry
  | 'refund';           // refund issued

export interface LedgerEntry {
  id: string;
  client_id: string;
  trainer_id: string;
  entry_type: LedgerEntryType;
  amount: number;
  reason: LedgerReason;
  stripe_payment_intent_id?: string;
  appointment_id?: string;
  notes?: string;
  created_at: string;
}

export interface AddLedgerEntryDto {
  client_id: string;
  trainer_id: string;
  entry_type: LedgerEntryType;
  amount: number;
  reason: LedgerReason;
  notes?: string;
  appointment_id?: string;
  stripe_payment_intent_id?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ClientLedgerService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ── State ──────────────────────────────────────────────────────────────────

  /** Ledger entries for the currently loaded client */
  entries = signal<LedgerEntry[]>([]);

  /** Whether the service is busy loading / saving */
  isLoading = signal(false);

  /** Last error message */
  error = signal<string | null>(null);

  /** Computed balance: sum of credits − sum of debits */
  balance = computed<number>(() => {
    return this.entries().reduce((acc, e) => {
      return e.entry_type === 'credit' ? acc + e.amount : acc - e.amount;
    }, 0);
  });

  // ── Queries ────────────────────────────────────────────────────────────────

  /**
   * Load all ledger entries for a client, newest first.
   * Scoped to the authenticated trainer's entries.
   */
  async getHistory(clientId: string, limit = 50): Promise<LedgerEntry[]> {
    const userId = this.auth.user()?.id;
    if (!userId) return [];

    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('client_ledger')
      .select('*')
      .eq('client_id', clientId)
      .eq('trainer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    this.isLoading.set(false);

    if (error) {
      if (isDevMode()) console.error('Error loading ledger history:', error);
      this.error.set(error.message);
      return [];
    }

    const mapped = (data ?? []) as LedgerEntry[];
    this.entries.set(mapped);
    return mapped;
  }

  /**
   * Compute current balance for a client via server-side RPC.
   * Useful for inline display without a full history load.
   */
  async getBalance(clientId: string, trainerId?: string): Promise<number> {
    const { data, error } = await this.supabase.client
      .rpc('get_client_ledger_balance', {
        p_client_id: clientId,
        p_trainer_id: trainerId ?? null,
      });

    if (error) {
      if (isDevMode()) console.error('Error fetching ledger balance:', error);
      return 0;
    }

    return (data as number) ?? 0;
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Add a credit entry (e.g. manual session credit, refund).
   */
  async addCredit(dto: Omit<AddLedgerEntryDto, 'entry_type'>): Promise<LedgerEntry | null> {
    return this.addEntry({ ...dto, entry_type: 'credit' });
  }

  /**
   * Add a debit entry (e.g. manual no-show fee, cancellation charge).
   */
  async addDebit(dto: Omit<AddLedgerEntryDto, 'entry_type'>): Promise<LedgerEntry | null> {
    return this.addEntry({ ...dto, entry_type: 'debit' });
  }

  /**
   * Generic entry insertion. Updates local signal on success.
   * Validates ownership (trainer_id must match auth user) and amount bounds.
   */
  async addEntry(dto: AddLedgerEntryDto): Promise<LedgerEntry | null> {
    this.error.set(null);

    // Auth check: only the trainer can add ledger entries for their clients
    const userId = this.auth.user()?.id;
    if (!userId) {
      this.error.set('Not authenticated');
      return null;
    }
    if (dto.trainer_id !== userId) {
      this.error.set('Unauthorized: trainer_id does not match authenticated user');
      return null;
    }

    // Amount validation: positive, finite, max 100,000
    if (!Number.isFinite(dto.amount) || dto.amount <= 0 || dto.amount > 100_000) {
      this.error.set('Invalid amount: must be between 0.01 and 100,000');
      return null;
    }

    const { data, error } = await this.supabase.client
      .from('client_ledger')
      .insert({
        client_id:               dto.client_id,
        trainer_id:              userId,
        entry_type:              dto.entry_type,
        amount:                  dto.amount,
        reason:                  dto.reason,
        notes:                   dto.notes ?? null,
        appointment_id:          dto.appointment_id ?? null,
        stripe_payment_intent_id: dto.stripe_payment_intent_id ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      if (isDevMode()) console.error('Error adding ledger entry:', error);
      this.error.set(error?.message ?? 'Insert failed');
      return null;
    }

    const entry = data as LedgerEntry;

    // Prepend to local signal (newest first)
    this.entries.update((prev) => [entry, ...prev]);

    return entry;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Human-readable label for a ledger reason.
   */
  formatReason(reason: LedgerReason): string {
    const map: Record<LedgerReason, string> = {
      session_credit:   'Session Credit',
      session_debit:    'Session Used',
      no_show_fee:      'No-Show Fee',
      cancellation_fee: 'Late Cancel Fee',
      manual_adjustment: 'Manual Adjustment',
      refund:           'Refund',
    };
    return map[reason] ?? reason;
  }

  /**
   * Clear local state (e.g. when navigating away from client detail).
   */
  clear(): void {
    this.entries.set([]);
    this.error.set(null);
  }
}
