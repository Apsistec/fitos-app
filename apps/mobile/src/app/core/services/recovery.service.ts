import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Recovery score types
 */
export type RecoveryCategory = 'recovered' | 'moderate' | 'under_recovered' | 'critical';
export type RecoveryDataSource = 'terra_api' | 'manual' | 'whoop' | 'oura' | 'garmin' | 'apple_health' | 'fitbit';
export type AdjustmentAction = 'accepted' | 'rejected' | 'modified' | 'skipped_workout';

export interface RecoveryScore {
  id: string;
  user_id: string;
  score_date: string; // YYYY-MM-DD
  hrv_score?: number;
  sleep_score?: number;
  resting_hr_score?: number;
  subjective_score?: number;
  overall_score: number;
  category: RecoveryCategory;
  intensity_modifier: number;
  volume_modifier: number;
  suggested_action: string;
  data_sources: string[];
  confidence: number;
  user_acknowledged: boolean;
  acknowledged_at?: string;
  adjustment_applied: boolean;
  adjustment_details?: any;
  created_at: string;
  updated_at: string;
}

export interface RecoveryDataPoint {
  id?: string;
  user_id: string;
  data_date: string; // YYYY-MM-DD
  // HRV
  hrv_rmssd?: number;
  hrv_sdnn?: number;
  // Heart rate
  resting_hr?: number;
  avg_hr_awake?: number;
  hr_variability_index?: number;
  // Sleep
  sleep_duration_minutes?: number;
  sleep_efficiency?: number;
  deep_sleep_minutes?: number;
  rem_sleep_minutes?: number;
  awakenings_count?: number;
  sleep_quality_rating?: number;
  // Activity
  steps?: number;
  active_minutes?: number;
  training_load?: number;
  // Subjective
  energy_level?: number;
  muscle_soreness?: number;
  stress_level?: number;
  mood?: number;
  // Source
  source: RecoveryDataSource;
  raw_data?: any;
}

export interface RecoveryAdjustmentLog {
  id?: string;
  user_id: string;
  recovery_score_id?: string;
  workout_id?: string;
  recovery_category: RecoveryCategory;
  overall_score: number;
  suggested_intensity_modifier: number;
  suggested_volume_modifier: number;
  action_taken: AdjustmentAction;
  actual_intensity_modifier?: number;
  actual_volume_modifier?: number;
  user_notes?: string;
  felt_appropriate?: boolean;
  created_at?: string;
}

export interface CreateRecoveryScoreInput {
  user_id: string;
  score_date: string;
  hrv_score?: number;
  sleep_score?: number;
  resting_hr_score?: number;
  subjective_score?: number;
  data_sources?: string[];
}

/**
 * RecoveryService - Manage recovery scores and workout adjustments
 *
 * Features:
 * - Calculate daily recovery scores from wearable data
 * - Suggest workout intensity/volume adjustments
 * - Track user response to recommendations
 * - Integrate with Terra API for wearable data
 * - Manual subjective input support
 *
 * Sprint 23: Wearable Recovery Integration
 */
@Injectable({
  providedIn: 'root',
})
export class RecoveryService {
  private supabase = inject(SupabaseService);

  // State
  currentScore = signal<RecoveryScore | null>(null);
  recentScores = signal<RecoveryScore[]>([]);
  dataPoints = signal<RecoveryDataPoint[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  isUnderRecovered = computed(() => {
    const score = this.currentScore();
    return score?.category === 'under_recovered' || score?.category === 'critical';
  });

  needsAttention = computed(() => {
    const score = this.currentScore();
    return score && !score.user_acknowledged && this.isUnderRecovered();
  });

  /**
   * Get today's recovery score for a user
   */
  async getTodayScore(userId: string): Promise<RecoveryScore | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase.client
        .from('recovery_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('score_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.currentScore.set(data);
      }

      return data;
    } catch (err) {
      console.error('Error getting today score:', err);
      return null;
    }
  }

  /**
   * Get recent recovery scores (last N days)
   */
  async getRecentScores(
    userId: string,
    days = 7
  ): Promise<RecoveryScore[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { data, error } = await this.supabase.client
        .from('recovery_scores')
        .select('*')
        .eq('user_id', userId)
        .gte('score_date', startDateStr)
        .order('score_date', { ascending: false });

      if (error) throw error;

      this.recentScores.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load recovery scores';
      this.error.set(errorMessage);
      console.error('Error getting recent scores:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Calculate and save recovery score
   */
  async calculateScore(
    input: CreateRecoveryScoreInput
  ): Promise<RecoveryScore | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Calculate overall score using database function
      const { data: scoreData, error: scoreError } = await this.supabase.client
        .rpc('calculate_recovery_score', {
          p_hrv_score: input.hrv_score || null,
          p_sleep_score: input.sleep_score || null,
          p_resting_hr_score: input.resting_hr_score || null,
          p_subjective_score: input.subjective_score || null,
        });

      if (scoreError) throw scoreError;

      const overallScore = scoreData as number;

      // Get category using database function
      const { data: categoryData, error: categoryError } = await this.supabase.client
        .rpc('get_recovery_category', {
          p_score: overallScore,
        });

      if (categoryError) throw categoryError;

      const category = categoryData as RecoveryCategory;

      // Get modifiers and action
      const { data: intensityData } = await this.supabase.client
        .rpc('get_intensity_modifier', { p_category: category });

      const { data: volumeData } = await this.supabase.client
        .rpc('get_volume_modifier', { p_category: category });

      const { data: actionData } = await this.supabase.client
        .rpc('get_recovery_action', { p_category: category });

      // Calculate confidence based on data completeness
      let confidence = 0;
      let dataCount = 0;

      if (input.hrv_score !== undefined) { confidence += 0.35; dataCount++; }
      if (input.sleep_score !== undefined) { confidence += 0.35; dataCount++; }
      if (input.resting_hr_score !== undefined) { confidence += 0.20; dataCount++; }
      if (input.subjective_score !== undefined) { confidence += 0.10; dataCount++; }

      if (dataCount === 0) confidence = 0.5; // Default for no data

      // Insert recovery score
      const { data, error } = await this.supabase.client
        .from('recovery_scores')
        .upsert(
          {
            user_id: input.user_id,
            score_date: input.score_date,
            hrv_score: input.hrv_score,
            sleep_score: input.sleep_score,
            resting_hr_score: input.resting_hr_score,
            subjective_score: input.subjective_score,
            overall_score: overallScore,
            category,
            intensity_modifier: intensityData || 1.0,
            volume_modifier: volumeData || 1.0,
            suggested_action: actionData || 'Proceed with your planned workout.',
            data_sources: input.data_sources || [],
            confidence,
          },
          {
            onConflict: 'user_id,score_date',
          }
        )
        .select()
        .single();

      if (error) throw error;

      // Update local state if today's score
      const today = new Date().toISOString().split('T')[0];
      if (input.score_date === today) {
        this.currentScore.set(data);
      }

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to calculate recovery score';
      this.error.set(errorMessage);
      console.error('Error calculating score:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Save recovery data point (raw wearable data)
   */
  async saveDataPoint(dataPoint: RecoveryDataPoint): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('recovery_data_points')
        .upsert(dataPoint, {
          onConflict: 'user_id,data_date,source',
        });

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error saving data point:', err);
      return false;
    }
  }

  /**
   * Get data points for a date range
   */
  async getDataPoints(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<RecoveryDataPoint[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('recovery_data_points')
        .select('*')
        .eq('user_id', userId)
        .gte('data_date', startDate)
        .lte('data_date', endDate)
        .order('data_date', { ascending: false });

      if (error) throw error;

      this.dataPoints.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting data points:', err);
      return [];
    }
  }

  /**
   * Acknowledge recovery alert
   */
  async acknowledgeScore(scoreId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('recovery_scores')
        .update({
          user_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', scoreId);

      if (error) throw error;

      // Update local state
      const current = this.currentScore();
      if (current && current.id === scoreId) {
        this.currentScore.set({
          ...current,
          user_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.error('Error acknowledging score:', err);
      return false;
    }
  }

  /**
   * Log adjustment decision
   */
  async logAdjustment(log: RecoveryAdjustmentLog): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('recovery_adjustment_log')
        .insert(log);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error logging adjustment:', err);
      return false;
    }
  }

  /**
   * Get adjustment history
   */
  async getAdjustmentHistory(
    userId: string,
    limit = 10
  ): Promise<RecoveryAdjustmentLog[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('recovery_adjustment_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error getting adjustment history:', err);
      return [];
    }
  }

  /**
   * Calculate HRV score from raw HRV data
   * Using baseline comparison (user's 7-day average)
   */
  calculateHrvScore(currentRmssd: number, baseline7dAvg: number): number {
    if (baseline7dAvg === 0) return 50; // Default if no baseline

    const percentDiff = ((currentRmssd - baseline7dAvg) / baseline7dAvg) * 100;

    // Convert to 0-100 score
    // +20% or more = 100
    // 0% = 70
    // -20% or more = 30
    let score = 70 + (percentDiff * 1.5);
    score = Math.max(0, Math.min(100, score));

    return Math.round(score);
  }

  /**
   * Calculate sleep score from sleep metrics
   */
  calculateSleepScore(
    durationMinutes: number,
    efficiency: number,
    deepMinutes: number,
    remMinutes: number
  ): number {
    let score = 0;

    // Duration (40 points): target 420-540 minutes (7-9 hours)
    if (durationMinutes >= 420 && durationMinutes <= 540) {
      score += 40;
    } else if (durationMinutes < 420) {
      score += Math.max(0, 40 * (durationMinutes / 420));
    } else {
      score += Math.max(0, 40 * (540 / durationMinutes));
    }

    // Efficiency (30 points): target 85%+
    score += Math.min(30, (efficiency / 85) * 30);

    // Deep sleep (15 points): target 90+ minutes
    score += Math.min(15, (deepMinutes / 90) * 15);

    // REM sleep (15 points): target 90+ minutes
    score += Math.min(15, (remMinutes / 90) * 15);

    return Math.round(score);
  }

  /**
   * Calculate resting HR score
   */
  calculateRestingHrScore(currentHr: number, baselineHr: number): number {
    if (baselineHr === 0) return 50; // Default if no baseline

    const percentDiff = ((currentHr - baselineHr) / baselineHr) * 100;

    // Convert to 0-100 score
    // -10% or more (lower is better) = 100
    // 0% = 70
    // +10% or more = 30
    let score = 70 - (percentDiff * 4);
    score = Math.max(0, Math.min(100, score));

    return Math.round(score);
  }

  /**
   * Calculate subjective score from user inputs
   */
  calculateSubjectiveScore(
    energyLevel: number,
    muscleSoreness: number,
    stressLevel: number,
    mood: number
  ): number {
    // All on 1-5 scale
    // Energy: 5 = high, 1 = low
    // Soreness: 5 = very sore, 1 = not sore
    // Stress: 5 = very stressed, 1 = relaxed
    // Mood: 5 = great, 1 = poor

    let score = 0;

    // Energy (40 points)
    score += (energyLevel / 5) * 40;

    // Soreness (20 points) - inverted
    score += ((6 - muscleSoreness) / 5) * 20;

    // Stress (20 points) - inverted
    score += ((6 - stressLevel) / 5) * 20;

    // Mood (20 points)
    score += (mood / 5) * 20;

    return Math.round(score);
  }

  /**
   * Get recovery trend (7-day average)
   */
  getTrend(): 'improving' | 'declining' | 'stable' | null {
    const scores = this.recentScores();
    if (scores.length < 3) return null;

    // Compare first half to second half
    const midpoint = Math.floor(scores.length / 2);
    const recentAvg = scores.slice(0, midpoint).reduce((sum, s) => sum + s.overall_score, 0) / midpoint;
    const olderAvg = scores.slice(midpoint).reduce((sum, s) => sum + s.overall_score, 0) / (scores.length - midpoint);

    const diff = recentAvg - olderAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * Get category color for UI
   */
  getCategoryColor(category: RecoveryCategory): string {
    switch (category) {
      case 'recovered':
        return 'success';
      case 'moderate':
        return 'primary';
      case 'under_recovered':
        return 'warning';
      case 'critical':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: RecoveryCategory): string {
    switch (category) {
      case 'recovered':
        return 'Recovered';
      case 'moderate':
        return 'Moderate';
      case 'under_recovered':
        return 'Under-Recovered';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
