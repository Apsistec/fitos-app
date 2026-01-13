import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Streak type
 */
export type StreakType = 'workout' | 'nutrition' | 'combined';

/**
 * Repair method
 */
export type RepairMethod = 'bonus_workout' | 'extended_session' | 'grace_day';

/**
 * Week status
 */
export type WeekStatus = 'in_progress' | 'achieved' | 'partial' | 'missed';

/**
 * Streak data
 */
export interface Streak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_weeks: number;
  longest_weeks: number;
  target_days_per_week: number;
  grace_days_remaining: number;
  last_grace_reset: string;
  repair_available: boolean;
  repair_expires_at: string | null;
  started_at: string;
  last_activity_at: string;
}

/**
 * Weekly consistency data
 */
export interface WeeklyConsistency {
  id: string;
  user_id: string;
  week_start: string; // Date string
  streak_type: StreakType;
  target_days: number;
  completed_days: number;
  status: WeekStatus;
  repair_used: boolean;
  repair_method: RepairMethod | null;
}

/**
 * Streak milestone
 */
export interface StreakMilestone {
  id: string;
  user_id: string;
  streak_type: StreakType;
  milestone_days: number;
  achieved_at: string;
  celebrated: boolean;
}

/**
 * Activity log entry
 */
export interface ActivityLog {
  id: string;
  user_id: string;
  activity_date: string;
  activity_type: 'workout' | 'nutrition';
  completed: boolean;
  duration_minutes?: number;
  notes?: string;
}

/**
 * Streak stats for display
 */
export interface StreakStats {
  currentWeeks: number;
  longestWeeks: number;
  thisWeekProgress: { completed: number; target: number };
  graceDaysRemaining: number;
  repairAvailable: boolean;
  repairExpiresAt: string | null;
  weekStatus: WeekStatus;
}

/**
 * StreakService - Adaptive streak healing system
 *
 * Features:
 * - Weekly-based streak tracking (not daily chains)
 * - Forgiveness mechanisms (grace days, repair options)
 * - "Consistent week" = 4+ days of activity (configurable)
 * - Missing 1-2 days = "partial" (streak continues)
 * - Missing 3+ days = repair needed or streak resets
 * - Repair options:
 *   - Bonus workout (extra session = +1 day credit)
 *   - Extended session (150% duration = +1 day credit)
 *   - Grace day (4/month, auto-refills)
 *
 * Usage:
 * ```typescript
 * const stats = await streak.getStreakStats(userId, 'workout');
 * await streak.logActivity(userId, 'workout');
 * await streak.repairStreak(userId, 'workout', 'bonus_workout');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class StreakService {
  private supabase = inject(SupabaseService);

  // State
  currentStreak = signal<Streak | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  isLoading = computed(() => this.loading());
  hasError = computed(() => this.error() !== null);

  /**
   * Get or create streak for user
   */
  async getStreak(userId: string, type: StreakType): Promise<Streak | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Try to get existing streak
      const { data: existing, error: fetchError } = await this.supabase.client
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', type)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        this.currentStreak.set(existing);
        return existing;
      }

      // Create new streak
      const { data: newStreak, error: insertError } = await this.supabase.client
        .from('streaks')
        .insert({
          user_id: userId,
          streak_type: type,
          current_weeks: 0,
          longest_weeks: 0,
          target_days_per_week: 4,
          grace_days_remaining: 4,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      this.currentStreak.set(newStreak);
      return newStreak;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get streak';
      this.error.set(errorMessage);
      console.error('Error getting streak:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get streak stats for display
   */
  async getStreakStats(userId: string, type: StreakType): Promise<StreakStats | null> {
    try {
      const streak = await this.getStreak(userId, type);
      if (!streak) return null;

      // Get current week's consistency
      const weekStart = this.getWeekStart(new Date());
      const { data: weekData } = await this.supabase.client
        .from('weekly_consistency')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', type)
        .eq('week_start', weekStart)
        .maybeSingle();

      return {
        currentWeeks: streak.current_weeks,
        longestWeeks: streak.longest_weeks,
        thisWeekProgress: {
          completed: weekData?.completed_days || 0,
          target: streak.target_days_per_week,
        },
        graceDaysRemaining: streak.grace_days_remaining,
        repairAvailable: streak.repair_available,
        repairExpiresAt: streak.repair_expires_at,
        weekStatus: weekData?.status || 'in_progress',
      };
    } catch (err) {
      console.error('Error getting streak stats:', err);
      return null;
    }
  }

  /**
   * Log activity for today
   */
  async logActivity(
    userId: string,
    activityType: 'workout' | 'nutrition',
    durationMinutes?: number,
    notes?: string
  ): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Upsert activity log
      const { error: logError } = await this.supabase.client
        .from('activity_log')
        .upsert({
          user_id: userId,
          activity_date: today,
          activity_type: activityType,
          completed: true,
          duration_minutes: durationMinutes,
          notes,
        }, {
          onConflict: 'user_id,activity_date,activity_type',
        });

      if (logError) throw logError;

      // Update weekly consistency
      await this.updateWeeklyConsistency(userId, activityType);

      // Update streak
      await this.updateStreak(userId, activityType);

      return true;
    } catch (err) {
      console.error('Error logging activity:', err);
      return false;
    }
  }

  /**
   * Use a grace day to maintain streak
   */
  async useGraceDay(userId: string, type: StreakType): Promise<boolean> {
    try {
      const streak = await this.getStreak(userId, type);
      if (!streak || streak.grace_days_remaining <= 0) {
        this.error.set('No grace days remaining');
        return false;
      }

      // Decrement grace days
      const { error: updateError } = await this.supabase.client
        .from('streaks')
        .update({
          grace_days_remaining: streak.grace_days_remaining - 1,
        })
        .eq('id', streak.id);

      if (updateError) throw updateError;

      // Mark current week as repaired with grace day
      const weekStart = this.getWeekStart(new Date());
      const { error: repairError } = await this.supabase.client
        .from('weekly_consistency')
        .upsert({
          user_id: userId,
          week_start: weekStart,
          streak_type: type,
          target_days: streak.target_days_per_week,
          repair_used: true,
          repair_method: 'grace_day',
          status: 'partial',
        }, {
          onConflict: 'user_id,week_start,streak_type',
        });

      if (repairError) throw repairError;

      return true;
    } catch (err) {
      console.error('Error using grace day:', err);
      this.error.set('Failed to use grace day');
      return false;
    }
  }

  /**
   * Repair streak with bonus activity
   */
  async repairStreak(
    userId: string,
    type: StreakType,
    method: 'bonus_workout' | 'extended_session'
  ): Promise<boolean> {
    try {
      const streak = await this.getStreak(userId, type);
      if (!streak || !streak.repair_available) {
        this.error.set('Repair not available');
        return false;
      }

      const weekStart = this.getWeekStart(new Date());

      // Get current week data
      const { data: weekData } = await this.supabase.client
        .from('weekly_consistency')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', type)
        .eq('week_start', weekStart)
        .single();

      if (!weekData) {
        this.error.set('No week data found');
        return false;
      }

      // Add 1 day credit and mark as repaired
      const { error: repairError } = await this.supabase.client
        .from('weekly_consistency')
        .update({
          completed_days: weekData.completed_days + 1,
          repair_used: true,
          repair_method: method,
          status: 'partial', // Upgraded from missed
        })
        .eq('id', weekData.id);

      if (repairError) throw repairError;

      // Clear repair availability
      const { error: streakError } = await this.supabase.client
        .from('streaks')
        .update({
          repair_available: false,
          repair_expires_at: null,
        })
        .eq('id', streak.id);

      if (streakError) throw streakError;

      return true;
    } catch (err) {
      console.error('Error repairing streak:', err);
      this.error.set('Failed to repair streak');
      return false;
    }
  }

  /**
   * Check streak status and update repair availability
   */
  async checkStreakStatus(userId: string, type: StreakType): Promise<void> {
    try {
      // Call database function to check repair availability
      const { data, error } = await this.supabase.client
        .rpc('check_repair_availability', {
          p_user_id: userId,
          p_streak_type: type,
        });

      if (error) throw error;

      if (data) {
        // Update streak with repair availability
        const streak = await this.getStreak(userId, type);
        if (streak) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 2); // 48 hour window

          await this.supabase.client
            .from('streaks')
            .update({
              repair_available: true,
              repair_expires_at: expiresAt.toISOString(),
            })
            .eq('id', streak.id);
        }
      }
    } catch (err) {
      console.error('Error checking streak status:', err);
    }
  }

  /**
   * Get streak milestones
   */
  async getMilestones(userId: string, type: StreakType): Promise<StreakMilestone[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('streak_milestones')
        .select('*')
        .eq('user_id', userId)
        .eq('streak_type', type)
        .order('milestone_days', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting milestones:', err);
      return [];
    }
  }

  /**
   * Mark milestone as celebrated
   */
  async celebrateMilestone(milestoneId: string): Promise<void> {
    try {
      await this.supabase.client
        .from('streak_milestones')
        .update({ celebrated: true })
        .eq('id', milestoneId);
    } catch (err) {
      console.error('Error celebrating milestone:', err);
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Update weekly consistency for current week
   */
  private async updateWeeklyConsistency(
    userId: string,
    activityType: 'workout' | 'nutrition'
  ): Promise<void> {
    const weekStart = this.getWeekStart(new Date());
    const type = activityType as StreakType;

    // Get target days
    const streak = await this.getStreak(userId, type);
    if (!streak) return;

    // Count activities this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const { data: activities } = await this.supabase.client
      .from('activity_log')
      .select('activity_date')
      .eq('user_id', userId)
      .eq('activity_type', activityType)
      .gte('activity_date', weekStart)
      .lte('activity_date', weekEnd.toISOString().split('T')[0]);

    const completedDays = activities?.length || 0;
    const targetDays = streak.target_days_per_week;

    // Determine status
    let status: WeekStatus = 'in_progress';
    if (completedDays >= targetDays) {
      status = 'achieved';
    } else {
      const daysLeft = 7 - new Date().getDay();
      const daysNeeded = targetDays - completedDays;
      if (daysNeeded > daysLeft) {
        if (daysNeeded - daysLeft <= 2) {
          status = 'partial'; // Missed 1-2 days, streak continues
        } else {
          status = 'missed'; // Missed 3+ days, needs repair
        }
      }
    }

    // Upsert weekly consistency
    await this.supabase.client
      .from('weekly_consistency')
      .upsert({
        user_id: userId,
        week_start: weekStart,
        streak_type: type,
        target_days: targetDays,
        completed_days: completedDays,
        status,
      }, {
        onConflict: 'user_id,week_start,streak_type',
      });
  }

  /**
   * Update streak count
   */
  private async updateStreak(userId: string, type: StreakType): Promise<void> {
    try {
      // Calculate current streak using database function
      const { data: currentWeeks, error } = await this.supabase.client
        .rpc('calculate_weekly_streak', {
          p_user_id: userId,
          p_streak_type: type,
        });

      if (error) throw error;

      const streak = await this.getStreak(userId, type);
      if (!streak) return;

      // Update streak
      const longestWeeks = Math.max(streak.longest_weeks, currentWeeks || 0);

      await this.supabase.client
        .from('streaks')
        .update({
          current_weeks: currentWeeks || 0,
          longest_weeks: longestWeeks,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', streak.id);

      // Check for milestone achievements
      await this.checkMilestones(userId, type, currentWeeks || 0);
    } catch (err) {
      console.error('Error updating streak:', err);
    }
  }

  /**
   * Check and create milestone achievements
   */
  private async checkMilestones(
    userId: string,
    type: StreakType,
    currentWeeks: number
  ): Promise<void> {
    const milestoneDays = [7, 30, 100, 365]; // Days
    const milestoneWeeks = milestoneDays.map(d => Math.floor(d / 7)); // Convert to weeks

    for (const weeks of milestoneWeeks) {
      if (currentWeeks >= weeks) {
        // Check if milestone already exists
        const { data: existing } = await this.supabase.client
          .from('streak_milestones')
          .select('id')
          .eq('user_id', userId)
          .eq('streak_type', type)
          .eq('milestone_days', weeks * 7)
          .maybeSingle();

        if (!existing) {
          // Create milestone
          await this.supabase.client
            .from('streak_milestones')
            .insert({
              user_id: userId,
              streak_type: type,
              milestone_days: weeks * 7,
              celebrated: false,
            });
        }
      }
    }
  }

  /**
   * Get start of week (Monday)
   */
  private getWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }
}
