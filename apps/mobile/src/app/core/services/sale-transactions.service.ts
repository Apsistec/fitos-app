import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
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

  readonly isLoading = signal(false);
  readonly error     = signal<string | null>(null);

  // ── Client transaction history ─────────────────────────────────────────────

  async getClientHistory(clientId: string, limit = 50): Promise<SaleTransaction[]> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('sale_transactions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return [];
    }

    return (data ?? []) as SaleTransaction[];
  }

  // ── Daily revenue report ───────────────────────────────────────────────────

  async getDailyReport(trainerId: string, date: string): Promise<DailyRevenueSummary> {
    this.isLoading.set(true);
    this.error.set(null);

    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay   = `${date}T23:59:59.999Z`;

    const { data, error } = await this.supabase.client
      .from('sale_transactions')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('status', 'completed')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return this.emptyDailySummary(date);
    }

    const transactions = (data ?? []) as SaleTransaction[];

    return {
      date,
      total_revenue: transactions.reduce((sum, t) => sum + t.total, 0),
      total_tips:    transactions.reduce((sum, t) => sum + t.tip_amount, 0),
      session_count: transactions.length,
      cash_count:    transactions.filter(t => t.payment_method === 'cash').length,
      card_count:    transactions.filter(t => t.payment_method === 'card').length,
      pack_count:    transactions.filter(t => t.payment_method === 'session_pack').length,
    };
  }

  // ── Date range revenue report ──────────────────────────────────────────────

  async getRevenueReport(
    trainerId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<SaleTransaction[]> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('sale_transactions')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('status', 'completed')
      .gte('created_at', `${dateFrom}T00:00:00.000Z`)
      .lte('created_at', `${dateTo}T23:59:59.999Z`)
      .order('created_at', { ascending: false });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return [];
    }

    return (data ?? []) as SaleTransaction[];
  }

  // ── Single transaction ─────────────────────────────────────────────────────

  async getTransaction(id: string): Promise<SaleTransaction | null> {
    const { data, error } = await this.supabase.client
      .from('sale_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.error.set(error.message);
      return null;
    }

    return data as SaleTransaction;
  }

  // ── Outstanding balances (client ledger debts) ────────────────────────────

  async getOutstandingBalances(trainerId: string): Promise<{ client_id: string; balance: number }[]> {
    const { data, error } = await this.supabase.client
      .from('client_ledger')
      .select('client_id, entry_type, amount')
      .eq('trainer_id', trainerId);

    if (error) {
      this.error.set(error.message);
      return [];
    }

    // Aggregate debits - credits per client
    const balanceMap = new Map<string, number>();

    for (const entry of (data ?? [])) {
      const current = balanceMap.get(entry.client_id) ?? 0;
      const delta   = entry.entry_type === 'debit' ? entry.amount : -entry.amount;
      balanceMap.set(entry.client_id, current + delta);
    }

    return Array.from(balanceMap.entries())
      .filter(([, balance]) => balance > 0)  // only show positive debts
      .map(([client_id, balance]) => ({ client_id, balance }));
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
