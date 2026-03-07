/**
 * Sprint 69 — GrowthAnalyticsService
 *
 * Fetches trainer growth KPIs and cohort retention data
 * via the `get_growth_analytics` RPC.
 *
 * Also provides CSV export of client retention data
 * via the native Share sheet.
 */
import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { Share } from '@capacitor/share';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CohortMonth {
  cohort_month: string;   // e.g. "Jan 2026"
  cohort_size:  number;
  retained:     number;
  retention_pct: number;
}

export interface GrowthAnalytics {
  new_clients_mtd:         number;
  active_clients:          number;
  churned_last_90d:        number;
  avg_sessions_per_client: number;
  total_clients_ever:      number;
  cohort_retention:        CohortMonth[];
}

export interface GrowthClientRow {
  full_name:          string;
  join_date:          string;
  sessions_completed: number;
  last_activity:      string | null;
  status:             string;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GrowthAnalyticsService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  /** Session-derived trainer identity — prevents parameter-tampering. */
  private get trainerId(): string {
    const id = this.auth.user()?.id;
    if (!id) throw new Error('Not authenticated');
    return id;
  }

  // ── Signals ────────────────────────────────────────────────────────────────
  analytics  = signal<GrowthAnalytics | null>(null);
  isLoading  = signal(false);
  error      = signal<string | null>(null);

  // ── API ───────────────────────────────────────────────────────────────────

  async loadAnalytics(): Promise<GrowthAnalytics | null> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_growth_analytics', { p_trainer_id: this.trainerId });
      if (error) throw error;
      const result = data as GrowthAnalytics;
      this.analytics.set(result);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load growth analytics';
      this.error.set(errorMessage);
      if (isDevMode()) console.error('Error loading growth analytics:', err);
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Export client retention data as CSV via the native Share sheet.
   * Builds CSV from trainer_clients + appointments on the client side.
   */
  async exportCsv(): Promise<void> {
    try {
      // Fetch raw client data — scoped to this trainer
      const { data: clients, error } = await this.supabase.client
        .from('trainer_clients')
        .select(`
          client_id,
          status,
          created_at,
          profiles!trainer_clients_client_id_fkey (full_name),
          appointments!inner (
            id,
            start_time,
            status
          )
        `)
        .eq('trainer_id', this.trainerId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Build CSV rows
      const rows: GrowthClientRow[] = (clients ?? []).map((tc: Record<string, unknown>) => {
        const appointments = (tc['appointments'] as { id: string; start_time: string; status: string }[]) ?? [];
        const completedSessions = appointments.filter(a => a.status === 'completed');
        const lastActivity = completedSessions.length > 0
          ? completedSessions.sort((a, b) =>
              new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
            )[0].start_time
          : null;

        // Supabase returns joined relations — extract full_name safely
        const profilesRaw = tc['profiles'] as Record<string, unknown> | Record<string, unknown>[] | null;
        const fullName = Array.isArray(profilesRaw)
          ? (profilesRaw[0]?.['full_name'] as string ?? 'Unknown')
          : ((profilesRaw as Record<string, unknown>)?.['full_name'] as string ?? 'Unknown');

        return {
          full_name:          fullName,
          join_date:          (tc['created_at'] as string).slice(0, 10),
          sessions_completed: completedSessions.length,
          last_activity:      lastActivity ? lastActivity.slice(0, 10) : null,
          status:             tc['status'] as string,
        };
      });

      const header = 'Name,Join Date,Sessions Completed,Last Activity,Status\n';
      const csv = header + rows.map(r =>
        [
          `"${r.full_name}"`,
          r.join_date,
          r.sessions_completed,
          r.last_activity ?? '',
          r.status,
        ].join(',')
      ).join('\n');

      const filename = `fitos-clients-${new Date().toISOString().slice(0, 10)}.csv`;

      // Use native Share sheet — no server needed
      await Share.share({
        title:         'FitOS Client Retention Data',
        text:          csv,
        dialogTitle:   `Export ${filename}`,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      this.error.set(errorMessage);
      if (isDevMode()) console.error('Error exporting CSV:', err);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Colour for cohort retention cell: green → yellow → red */
  cohortCellColor(pct: number): string {
    if (pct >= 80) return '#10B981';  // green
    if (pct >= 60) return '#EAB308';  // yellow
    if (pct >= 40) return '#F97316';  // orange
    return '#EF4444';                 // red
  }

  /** Human-readable churn rate (inverse of retention) */
  churnRate(total: number, churned: number): number {
    return total > 0 ? Math.round((churned / total) * 100) : 0;
  }
}
