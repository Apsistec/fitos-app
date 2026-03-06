import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { SaleTransaction } from '@fitos/shared';

export interface DailyRevenueSummary {
  date: string;
  total_revenue: number;
  total_tips: number;
  session_count: number;
  cash_count: number;
  card_count: number;
  pack_count: number;
}

/**
 * SaleTransactionsService — Sprint 58 (Phase 5C)
 *
 * Read-only access to sale_transactions for reporting and client history.
 * Write operations go through the process-checkout Edge Function to ensure
 * atomic session deduction + appointment transition.
 */
@Injectable({ providedIn: 'root' })
export class SaleTransactionsService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  readonly isLoading = signal(false);
  readonly error     = signal<string | null>(null);

  // ── Client transaction history ─────────────────────────────────────────────

  /**
   * Load client transaction history.
   * Scoped to the authenticated trainer's transactions.
   */
  async getClientHistory(clientId: string, limit = 50): Promise<SaleTransaction[]> {
    const userId = this.auth.user()?.id;
    if (!userId) return [];

    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('sale_transactions')
      .select('*')
      .eq('client_id', clientId)
      .eq('trainer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    this.isLoading.set(false);

    if (error) {
      if (isDevMode()) console.error('Error loading client history:', error);
      this.error.set(error.message);
      return [];
    }

    return (data ?? []) as SaleTransaction[];
  }

  // ── Daily revenue report ───────────────────────────────────────────────────

  /**
   * Get daily revenue summary via server-side RPC.
   * Trainer ID derived from auth session.
   */
  async getDailyReport(date: string): Promise<DailyRevenueSummary> {
    const userId = this.auth.user()?.id;
    if (!userId) return this.emptyDailySummary(date);

    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .rpc('get_daily_revenue_summary', {
        p_trainer_id: userId,
        p_date: date,
      });

    this.isLoading.set(false);

    if (error) {
      if (isDevMode()) console.error('Error fetching daily report:', error);
      this.error.set(error.message);
      return this.emptyDailySummary(date);
    }

    return (data as DailyRevenueSummary) ?? this.emptyDailySummary(date);
  }

  // ── Date range revenue report ──────────────────────────────────────────────

  /**
   * Get revenue report for a date range.
   * Trainer ID derived from auth session.
   */
  async getRevenueReport(
    dateFrom: string,
    dateTo: string,
  ): Promise<SaleTransaction[]> {
    const userId = this.auth.user()?.id;
    if (!userId) return [];

    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('sale_transactions')
      .select('*')
      .eq('trainer_id', userId)
      .eq('status', 'completed')
      .gte('created_at', `${dateFrom}T00:00:00.000Z`)
      .lte('created_at', `${dateTo}T23:59:59.999Z`)
      .order('created_at', { ascending: false })
      .limit(1000);

    this.isLoading.set(false);

    if (error) {
      if (isDevMode()) console.error('Error fetching revenue report:', error);
      this.error.set(error.message);
      return [];
    }

    return (data ?? []) as SaleTransaction[];
  }

  // ── Single transaction ─────────────────────────────────────────────────────

  /**
   * Get a single transaction. Scoped to the authenticated user (trainer or client).
   */
  async getTransaction(id: string): Promise<SaleTransaction | null> {
    const userId = this.auth.user()?.id;
    if (!userId) return null;

    const { data, error } = await this.supabase.client
      .from('sale_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isDevMode()) console.error('Error fetching transaction:', error);
      this.error.set(error.message);
      return null;
    }

    const tx = data as SaleTransaction;

    // Defense-in-depth: verify caller is trainer or client on this transaction
    if (tx.trainer_id !== userId && tx.client_id !== userId) {
      this.error.set('Unauthorized');
      return null;
    }

    return tx;
  }

  // ── Outstanding balances (client ledger debts) ────────────────────────────

  /**
   * Get outstanding client balances via server-side RPC.
   * Trainer ID derived from auth session.
   */
  async getOutstandingBalances(): Promise<{ client_id: string; balance: number }[]> {
    const userId = this.auth.user()?.id;
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .rpc('get_outstanding_balances', { p_trainer_id: userId });

    if (error) {
      if (isDevMode()) console.error('Error fetching outstanding balances:', error);
      this.error.set(error.message);
      return [];
    }

    return (data as { client_id: string; balance: number }[]) ?? [];
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private emptyDailySummary(date: string): DailyRevenueSummary {
    return {
      date,
      total_revenue: 0,
      total_tips:    0,
      session_count: 0,
      cash_count:    0,
      card_count:    0,
      pack_count:    0,
    };
  }
}
