import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Trainer performance metrics
 */
export interface TrainerMetrics {
  trainer_id: string;
  trainer_name: string;

  // Client metrics
  total_clients: number;
  active_clients: number;
  new_clients_month: number;
  churned_clients_month: number;

  // Revenue metrics
  total_revenue_month: number;
  total_revenue_ytd: number;
  avg_client_value: number;

  // Retention metrics
  retention_rate: number; // % clients retained over period
  churn_rate: number; // % clients lost per month

  // Engagement metrics
  avg_sessions_per_client: number;
  completion_rate: number; // % of assigned workouts completed
  response_time_hours: number; // Avg time to respond to messages

  // Growth metrics
  client_growth_rate: number; // % change in client count
  revenue_growth_rate: number; // % change in revenue

  // Quality metrics
  avg_client_satisfaction: number; // 1-5 scale
  program_adherence_rate: number; // % clients following program

  // Period
  period_start: string;
  period_end: string;
}

export interface FacilityMetrics {
  // Revenue
  total_revenue_month: number;
  total_revenue_ytd: number;
  revenue_growth_rate: number;

  // Clients
  total_clients: number;
  active_clients: number;
  new_clients_month: number;
  churned_clients_month: number;

  // Trainers
  total_trainers: number;
  active_trainers: number;

  // Aggregate metrics
  avg_retention_rate: number;
  avg_churn_rate: number;
  ltv_cac_ratio: number;

  // Benchmarks
  retention_benchmark: number; // 66-71%
  churn_benchmark: number; // 3-5%
  meets_retention_goal: boolean;
  meets_churn_goal: boolean;
}

export interface TrainerRanking {
  trainer_id: string;
  trainer_name: string;
  metric_value: number;
  rank: number;
  percentile: number;
}

export interface RevenueByTrainer {
  trainer_id: string;
  trainer_name: string;
  revenue: number;
  client_count: number;
  avg_per_client: number;
}

/**
 * TrainerPerformanceService - Analytics for gym owners
 *
 * Features:
 * - Multi-trainer performance comparison
 * - Facility-wide metrics aggregation
 * - Revenue analytics and trends
 * - Retention and churn tracking
 * - Trainer ranking and benchmarking
 * - Client distribution analysis
 *
 * Sprint 25: Gym Owner Business Analytics
 */
@Injectable({
  providedIn: 'root',
})
export class TrainerPerformanceService {
  private supabase = inject(SupabaseService);

  // State
  trainerMetrics = signal<TrainerMetrics[]>([]);
  facilityMetrics = signal<FacilityMetrics | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  topRevenueTrainers = computed(() =>
    [...this.trainerMetrics()]
      .sort((a, b) => b.total_revenue_month - a.total_revenue_month)
      .slice(0, 5)
  );

  topRetentionTrainers = computed(() =>
    [...this.trainerMetrics()]
      .sort((a, b) => b.retention_rate - a.retention_rate)
      .slice(0, 5)
  );

  needsAttention = computed(() =>
    this.trainerMetrics().filter(t =>
      t.churn_rate > 0.05 || // > 5% monthly churn
      t.retention_rate < 0.66 || // < 66% retention
      t.completion_rate < 0.70 // < 70% workout completion
    )
  );

  /**
   * Get trainer performance metrics for a period
   */
  async getTrainerMetrics(
    gymOwnerId: string,
    startDate: string,
    endDate: string
  ): Promise<TrainerMetrics[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Get all trainers under this gym owner
      const { data: trainers, error: trainersError } = await this.supabase.client
        .from('profiles')
        .select('id, full_name')
        .eq('gym_owner_id', gymOwnerId)
        .eq('role', 'trainer');

      if (trainersError) throw trainersError;

      if (!trainers || trainers.length === 0) {
        this.trainerMetrics.set([]);
        return [];
      }

      // Calculate metrics for each trainer
      const metricsPromises = trainers.map(trainer =>
        this.calculateTrainerMetrics(trainer.id, startDate, endDate)
      );

      const metrics = await Promise.all(metricsPromises);

      // Filter out nulls and set
      const validMetrics = metrics.filter((m): m is TrainerMetrics => m !== null);
      this.trainerMetrics.set(validMetrics);

      return validMetrics;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load trainer metrics';
      this.error.set(errorMessage);
      console.error('Error getting trainer metrics:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Calculate metrics for a single trainer
   */
  private async calculateTrainerMetrics(
    trainerId: string,
    startDate: string,
    endDate: string
  ): Promise<TrainerMetrics | null> {
    try {
      // Get trainer name
      const { data: profile } = await this.supabase.client
        .from('profiles')
        .select('full_name')
        .eq('id', trainerId)
        .single();

      // Get client counts
      const { data: allClients } = await this.supabase.client
        .from('client_trainers')
        .select('client_id, status, created_at, ended_at')
        .eq('trainer_id', trainerId);

      const totalClients = allClients?.length || 0;
      const activeClients = allClients?.filter(c => c.status === 'active').length || 0;

      const newClientsMonth = allClients?.filter(c =>
        c.created_at >= startDate && c.created_at <= endDate
      ).length || 0;

      const churnedClientsMonth = allClients?.filter(c =>
        c.ended_at && c.ended_at >= startDate && c.ended_at <= endDate
      ).length || 0;

      // Get revenue (from subscriptions)
      const { data: subscriptions } = await this.supabase.client
        .from('subscriptions')
        .select('amount, created_at')
        .eq('trainer_id', trainerId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const totalRevenueMonth = subscriptions?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      // Get YTD revenue
      const ytdStart = new Date(endDate).getFullYear() + '-01-01';
      const { data: ytdSubs } = await this.supabase.client
        .from('subscriptions')
        .select('amount')
        .eq('trainer_id', trainerId)
        .gte('created_at', ytdStart)
        .lte('created_at', endDate);

      const totalRevenueYtd = ytdSubs?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      // Get workout completion rate
      const { data: workouts } = await this.supabase.client
        .from('workouts')
        .select('id, completed')
        .eq('trainer_id', trainerId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const completionRate = workouts && workouts.length > 0
        ? workouts.filter(w => w.completed).length / workouts.length
        : 0;

      // Calculate retention rate (clients retained / clients at start)
      const clientsAtStart = allClients?.filter(c =>
        c.created_at < startDate && (c.status === 'active' || c.ended_at! > startDate)
      ).length || 0;

      const retentionRate = clientsAtStart > 0
        ? (clientsAtStart - churnedClientsMonth) / clientsAtStart
        : 1;

      // Calculate churn rate (churned / total active)
      const churnRate = activeClients > 0
        ? churnedClientsMonth / activeClients
        : 0;

      // Growth rates (simplified - would be more complex in production)
      const clientGrowthRate = totalClients > 0
        ? (newClientsMonth - churnedClientsMonth) / totalClients
        : 0;

      return {
        trainer_id: trainerId,
        trainer_name: profile?.full_name || 'Unknown',
        total_clients: totalClients,
        active_clients: activeClients,
        new_clients_month: newClientsMonth,
        churned_clients_month: churnedClientsMonth,
        total_revenue_month: totalRevenueMonth,
        total_revenue_ytd: totalRevenueYtd,
        avg_client_value: activeClients > 0 ? totalRevenueMonth / activeClients : 0,
        retention_rate: retentionRate,
        churn_rate: churnRate,
        avg_sessions_per_client: 0, // Would need workout session data
        completion_rate: completionRate,
        response_time_hours: 0, // Would need message timestamp data
        client_growth_rate: clientGrowthRate,
        revenue_growth_rate: 0, // Would need historical comparison
        avg_client_satisfaction: 0, // Would need satisfaction survey data
        program_adherence_rate: completionRate, // Use completion as proxy
        period_start: startDate,
        period_end: endDate,
      };
    } catch (err) {
      console.error('Error calculating trainer metrics:', err);
      return null;
    }
  }

  /**
   * Get facility-wide aggregate metrics
   */
  async getFacilityMetrics(
    gymOwnerId: string,
    startDate: string,
    endDate: string
  ): Promise<FacilityMetrics | null> {
    try {
      // Get trainer metrics first
      const trainerMetrics = this.trainerMetrics().length > 0
        ? this.trainerMetrics()
        : await this.getTrainerMetrics(gymOwnerId, startDate, endDate);

      if (trainerMetrics.length === 0) {
        return null;
      }

      // Aggregate metrics
      const totalRevenueMonth = trainerMetrics.reduce((sum, t) => sum + t.total_revenue_month, 0);
      const totalRevenueYtd = trainerMetrics.reduce((sum, t) => sum + t.total_revenue_ytd, 0);
      const totalClients = trainerMetrics.reduce((sum, t) => sum + t.total_clients, 0);
      const activeClients = trainerMetrics.reduce((sum, t) => sum + t.active_clients, 0);
      const newClientsMonth = trainerMetrics.reduce((sum, t) => sum + t.new_clients_month, 0);
      const churnedClientsMonth = trainerMetrics.reduce((sum, t) => sum + t.churned_clients_month, 0);

      // Average retention and churn
      const avgRetentionRate = trainerMetrics.reduce((sum, t) => sum + t.retention_rate, 0) / trainerMetrics.length;
      const avgChurnRate = trainerMetrics.reduce((sum, t) => sum + t.churn_rate, 0) / trainerMetrics.length;

      // LTV:CAC calculation (simplified)
      const avgClientLtv = totalRevenueYtd / activeClients;
      const avgCac = 100; // Placeholder - would need marketing spend data
      const ltvCacRatio = avgClientLtv / avgCac;

      const retentionBenchmark = 0.68; // 68% (middle of 66-71%)
      const churnBenchmark = 0.04; // 4% (middle of 3-5%)

      const metrics: FacilityMetrics = {
        total_revenue_month: totalRevenueMonth,
        total_revenue_ytd: totalRevenueYtd,
        revenue_growth_rate: 0, // Would need historical comparison
        total_clients: totalClients,
        active_clients: activeClients,
        new_clients_month: newClientsMonth,
        churned_clients_month: churnedClientsMonth,
        total_trainers: trainerMetrics.length,
        active_trainers: trainerMetrics.filter(t => t.active_clients > 0).length,
        avg_retention_rate: avgRetentionRate,
        avg_churn_rate: avgChurnRate,
        ltv_cac_ratio: ltvCacRatio,
        retention_benchmark: retentionBenchmark,
        churn_benchmark: churnBenchmark,
        meets_retention_goal: avgRetentionRate >= 0.66,
        meets_churn_goal: avgChurnRate <= 0.05,
      };

      this.facilityMetrics.set(metrics);
      return metrics;
    } catch (err) {
      console.error('Error getting facility metrics:', err);
      return null;
    }
  }

  /**
   * Get revenue breakdown by trainer
   */
  getRevenueByTrainer(): RevenueByTrainer[] {
    return this.trainerMetrics().map(t => ({
      trainer_id: t.trainer_id,
      trainer_name: t.trainer_name,
      revenue: t.total_revenue_month,
      client_count: t.active_clients,
      avg_per_client: t.avg_client_value,
    })).sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Rank trainers by a specific metric
   */
  rankTrainers(metric: keyof TrainerMetrics): TrainerRanking[] {
    const metrics = this.trainerMetrics();
    if (metrics.length === 0) return [];

    // Sort by metric (descending)
    const sorted = [...metrics].sort((a, b) => {
      const aVal = a[metric] as number;
      const bVal = b[metric] as number;
      return bVal - aVal;
    });

    // Create rankings
    return sorted.map((trainer, index) => ({
      trainer_id: trainer.trainer_id,
      trainer_name: trainer.trainer_name,
      metric_value: trainer[metric] as number,
      rank: index + 1,
      percentile: ((metrics.length - index) / metrics.length) * 100,
    }));
  }

  /**
   * Get client distribution across trainers
   */
  getClientDistribution(): { trainer_name: string; client_count: number }[] {
    return this.trainerMetrics().map(t => ({
      trainer_name: t.trainer_name,
      client_count: t.active_clients,
    })).sort((a, b) => b.client_count - a.client_count);
  }

  /**
   * Calculate period-over-period comparison
   */
  async getPeriodComparison(
    gymOwnerId: string,
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): Promise<{
    current: FacilityMetrics | null;
    previous: FacilityMetrics | null;
    change: {
      revenue: number;
      clients: number;
      retention: number;
    };
  }> {
    // Get current period
    const current = await this.getFacilityMetrics(gymOwnerId, currentStart, currentEnd);

    // Get previous period (simplified - would cache in production)
    const previousMetrics = await this.getTrainerMetrics(gymOwnerId, previousStart, previousEnd);
    const previous = previousMetrics.length > 0
      ? await this.getFacilityMetrics(gymOwnerId, previousStart, previousEnd)
      : null;

    // Calculate changes
    const change = {
      revenue: current && previous
        ? ((current.total_revenue_month - previous.total_revenue_month) / previous.total_revenue_month) * 100
        : 0,
      clients: current && previous
        ? ((current.active_clients - previous.active_clients) / previous.active_clients) * 100
        : 0,
      retention: current && previous
        ? (current.avg_retention_rate - previous.avg_retention_rate) * 100
        : 0,
    };

    return { current, previous, change };
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  /**
   * Get metric color (for health indicators)
   */
  getMetricColor(value: number, benchmark: number, higherIsBetter: boolean = true): string {
    const diff = higherIsBetter ? value - benchmark : benchmark - value;

    if (diff >= 0.05) return 'success'; // 5%+ above benchmark
    if (diff >= 0) return 'primary'; // At or slightly above benchmark
    if (diff >= -0.05) return 'warning'; // Slightly below benchmark
    return 'danger'; // Significantly below benchmark
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
