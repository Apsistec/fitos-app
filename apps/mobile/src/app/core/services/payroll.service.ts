/**
 * PayrollService — Sprint 60 (Phase 5D)
 *
 * Manages pay rate configuration and payroll reporting:
 * - CRUD for TrainerPayRate records
 * - CRUD for TrainerPayPolicy (one per trainer)
 * - getPayrollSummary(): calls get_payroll_report() DB RPC + aggregates
 * - calculateSessionPay(): client-side preview before checkout
 * - markProcessed(): bulk-marks visits as payroll_processed = true
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  TrainerPayRate,
  TrainerPayPolicy,
  PayrollReportRow,
  PayrollSummary,
  PayRateType,
} from '@fitos/shared';

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private supabase = inject(SupabaseService);

  // ── Signals ────────────────────────────────────────────────────────────────

  payRates   = signal<TrainerPayRate[]>([]);
  payPolicy  = signal<TrainerPayPolicy | null>(null);
  isLoading  = signal(false);
  error      = signal<string | null>(null);
  payrollSummary = signal<PayrollSummary | null>(null);

  /** Derived: rate that applies to all service types (fallback) */
  defaultRate = computed(() =>
    this.payRates().find(r => !r.service_type_id) ?? null
  );

  /** Derived: rates scoped to specific service types */
  serviceSpecificRates = computed(() =>
    this.payRates().filter(r => !!r.service_type_id)
  );

  // ── Pay Rates ──────────────────────────────────────────────────────────────

  async loadPayRates(trainerId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('trainer_pay_rates')
      .select('*, service_type:service_types(name)')
      .eq('trainer_id', trainerId)
      .order('service_type_id', { nullsFirst: true });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.payRates.set((data ?? []) as TrainerPayRate[]);
  }

  async upsertPayRate(
    trainerId: string,
    rate: Omit<TrainerPayRate, 'id' | 'trainer_id' | 'created_at' | 'updated_at' | 'service_type'>,
  ): Promise<TrainerPayRate | null> {
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('trainer_pay_rates')
      .upsert(
        {
          trainer_id:            trainerId,
          service_type_id:       rate.service_type_id ?? null,
          pay_rate_type:         rate.pay_rate_type,
          flat_amount:           rate.flat_amount ?? null,
          percentage:            rate.percentage ?? null,
          hourly_rate:           rate.hourly_rate ?? null,
          commission_percentage: rate.commission_percentage ?? null,
        },
        { onConflict: 'trainer_id,service_type_id' },
      )
      .select('*, service_type:service_types(name)')
      .single();

    if (error || !data) {
      this.error.set(error?.message ?? 'Upsert failed');
      return null;
    }

    const saved = data as TrainerPayRate;
    this.payRates.update(prev => {
      const idx = prev.findIndex(
        r => r.service_type_id === saved.service_type_id
      );
      return idx >= 0
        ? prev.map((r, i) => (i === idx ? saved : r))
        : [...prev, saved];
    });

    return saved;
  }

  async deletePayRate(rateId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('trainer_pay_rates')
      .delete()
      .eq('id', rateId);

    if (error) {
      this.error.set(error.message);
      return false;
    }

    this.payRates.update(prev => prev.filter(r => r.id !== rateId));
    return true;
  }

  // ── Pay Policy ─────────────────────────────────────────────────────────────

  async loadPayPolicy(trainerId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('trainer_pay_policies')
      .select('*')
      .eq('trainer_id', trainerId)
      .maybeSingle();

    this.payPolicy.set(data as TrainerPayPolicy | null);
  }

  async upsertPayPolicy(
    trainerId: string,
    policy: Omit<TrainerPayPolicy, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>,
  ): Promise<TrainerPayPolicy | null> {
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('trainer_pay_policies')
      .upsert(
        { trainer_id: trainerId, ...policy },
        { onConflict: 'trainer_id' },
      )
      .select()
      .single();

    if (error || !data) {
      this.error.set(error?.message ?? 'Policy upsert failed');
      return null;
    }

    const saved = data as TrainerPayPolicy;
    this.payPolicy.set(saved);
    return saved;
  }

  // ── Payroll Report ─────────────────────────────────────────────────────────

  async getPayrollSummary(
    trainerId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<PayrollSummary | null> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .rpc('get_payroll_report', {
        p_trainer_id: trainerId,
        p_date_from:  dateFrom.toISOString(),
        p_date_to:    dateTo.toISOString(),
      });

    this.isLoading.set(false);

    if (error || !data) {
      this.error.set(error?.message ?? 'Report failed');
      return null;
    }

    const rows = (data as PayrollReportRow[]);

    const summary: PayrollSummary = {
      date_from:           dateFrom.toISOString(),
      date_to:             dateTo.toISOString(),
      total_sessions:      rows.length,
      total_completed:     rows.filter(r => r.appointment_status === 'completed').length,
      total_no_shows:      rows.filter(r => r.appointment_status === 'no_show').length,
      total_cancellations: rows.filter(r =>
        r.appointment_status === 'late_cancel' ||
        r.appointment_status === 'early_cancel'
      ).length,
      total_gross_revenue: rows.reduce((s, r) => s + r.service_price, 0),
      total_trainer_pay:   rows.reduce((s, r) => s + r.trainer_pay_amount, 0),
      total_tips:          rows.reduce((s, r) => s + r.tip_amount, 0),
      total_commissions:   rows.reduce((s, r) => s + r.commission_amount, 0),
      rows,
    };

    this.payrollSummary.set(summary);
    return summary;
  }

  /** Mark a batch of visits as payroll-processed */
  async markProcessed(visitIds: string[]): Promise<number> {
    const { data, error } = await this.supabase.client
      .rpc('mark_payroll_processed', { p_visit_ids: visitIds });

    if (error) {
      this.error.set(error.message);
      return 0;
    }

    return (data as number) ?? 0;
  }

  // ── Client-side pay preview ────────────────────────────────────────────────
  // Used in PayrollSettingsPage to preview earnings before saving rates.

  calculateSessionPay(
    servicePrice: number,
    durationMinutes: number,
    appointmentStatus: string,
    rate: TrainerPayRate,
    policy: TrainerPayPolicy | null,
  ): number {
    let basePay = 0;

    switch (rate.pay_rate_type as PayRateType) {
      case 'flat_per_session':
        basePay = rate.flat_amount ?? 0;
        break;
      case 'percentage_of_revenue':
        basePay = servicePrice * (rate.percentage ?? 0) / 100;
        break;
      case 'hourly':
        basePay = (rate.hourly_rate ?? 0) * durationMinutes / 60;
        break;
      case 'commission_on_sale':
        basePay = servicePrice * (rate.commission_percentage ?? 0) / 100;
        break;
    }

    if (!policy || appointmentStatus === 'completed') {
      return Math.round(basePay * 100) / 100;
    }

    let multiplier = 1.0;
    switch (appointmentStatus) {
      case 'no_show':
        if (!policy.pay_for_no_show) return 0;
        multiplier = policy.no_show_pay_percentage / 100;
        break;
      case 'late_cancel':
        if (!policy.pay_for_late_cancel) return 0;
        multiplier = policy.late_cancel_pay_percentage / 100;
        break;
      case 'early_cancel':
        if (!policy.pay_for_early_cancel) return 0;
        multiplier = policy.early_cancel_pay_percentage / 100;
        break;
    }

    return Math.round(basePay * multiplier * 100) / 100;
  }

  // ── CSV export helper ──────────────────────────────────────────────────────

  generateCsv(summary: PayrollSummary): string {
    const header = [
      'Date',
      'Client',
      'Service',
      'Status',
      'Service Price',
      'Trainer Pay',
      'Tip',
      'Commission',
      'Processed',
    ].join(',');

    const rows = summary.rows.map(r =>
      [
        new Date(r.visit_date).toLocaleDateString('en-US'),
        `"${r.client_name}"`,
        `"${r.service_name}"`,
        r.appointment_status,
        r.service_price.toFixed(2),
        r.trainer_pay_amount.toFixed(2),
        r.tip_amount.toFixed(2),
        r.commission_amount.toFixed(2),
        r.payroll_processed ? 'Yes' : 'No',
      ].join(',')
    );

    return [header, ...rows].join('\n');
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  formatRateType(type: PayRateType): string {
    const map: Record<PayRateType, string> = {
      flat_per_session:      'Flat per Session',
      percentage_of_revenue: '% of Revenue',
      hourly:                'Hourly Rate',
      commission_on_sale:    'Commission',
    };
    return map[type] ?? type;
  }

  formatPayRate(rate: TrainerPayRate): string {
    switch (rate.pay_rate_type) {
      case 'flat_per_session':
        return `$${(rate.flat_amount ?? 0).toFixed(2)} / session`;
      case 'percentage_of_revenue':
        return `${rate.percentage ?? 0}% of revenue`;
      case 'hourly':
        return `$${(rate.hourly_rate ?? 0).toFixed(2)} / hr`;
      case 'commission_on_sale':
        return `${rate.commission_percentage ?? 0}% commission`;
      default:
        return '—';
    }
  }

  clear(): void {
    this.payRates.set([]);
    this.payPolicy.set(null);
    this.payrollSummary.set(null);
    this.error.set(null);
  }
}
