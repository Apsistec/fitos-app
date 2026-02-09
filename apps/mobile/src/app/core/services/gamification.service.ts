import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Gamification types
 */
export type LeaderboardType =
  | 'weekly_steps'
  | 'monthly_steps'
  | 'weekly_workouts'
  | 'monthly_workouts'
  | 'consistency_streak'
  | 'improvement_rate';

export type LeaderboardScope = 'global' | 'facility' | 'trainer_clients';

export type ChallengeType =
  | 'step_goal'
  | 'workout_count'
  | 'active_minutes'
  | 'consistency'
  | 'improvement';

export interface GamificationPreferences {
  user_id: string;
  leaderboard_opt_in: boolean;
  display_name_anonymized: boolean;
  display_name_override?: string;
  show_in_global_leaderboards: boolean;
  show_in_facility_leaderboards: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  leaderboard_type: LeaderboardType;
  leaderboard_scope: LeaderboardScope;
  scope_id?: string;
  period_start: string;
  period_end: string;
  metric_value: number;
  rank?: number;
  percentile?: number;
  improvement_from_baseline?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  user_name?: string;
  is_current_user?: boolean;
}

export interface WeeklyChallenge {
  id: string;
  challenge_name: string;
  challenge_description?: string;
  challenge_type: ChallengeType;
  target_metric: number;
  baseline_metric?: string;
  start_date: string;
  end_date: string;
  created_by?: string;
  scope: LeaderboardScope;
  scope_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  joined_at: string;
  current_progress: number;
  completed: boolean;
  completed_at?: string;
}

export interface Achievement {
  id: string;
  achievement_key: string;
  achievement_name: string;
  achievement_description?: string;
  achievement_category: string;
  badge_icon?: string;
  badge_color?: string;
  threshold_value: number;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  celebrated: boolean;
  // Joined data
  achievement?: Achievement;
}

/**
 * GamificationService - Activity-based leaderboards and challenges
 *
 * Features:
 * - Opt-in leaderboards (global, facility, trainer)
 * - Weekly/monthly challenges
 * - Activity-based achievements
 * - Privacy controls (anonymize, display name override)
 * - NEVER includes weight, body composition, or appearance
 *
 * Leaderboard Types:
 * - Weekly/Monthly Steps
 * - Weekly/Monthly Workouts
 * - Consistency Streak (weeks)
 * - Improvement Rate (% gain over baseline)
 *
 * Privacy First:
 * - Opt-in required for all leaderboards
 * - Anonymize option (show as "User123")
 * - Separate controls for global vs facility leaderboards
 * - Compare to self by default
 *
 * Sprint 26: Advanced Gamification
 */
@Injectable({
  providedIn: 'root',
})
export class GamificationService {
  private supabase = inject(SupabaseService);

  // State
  preferences = signal<GamificationPreferences | null>(null);
  leaderboardEntries = signal<LeaderboardEntry[]>([]);
  activeChallenges = signal<WeeklyChallenge[]>([]);
  myChallenges = signal<ChallengeParticipant[]>([]);
  achievements = signal<Achievement[]>([]);
  myAchievements = signal<UserAchievement[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  hasOptedIn = computed(() => this.preferences()?.leaderboard_opt_in ?? false);
  myRank = computed(() => {
    const entries = this.leaderboardEntries();
    const myEntry = entries.find((e) => e.is_current_user);
    return myEntry?.rank ?? null;
  });
  completedChallenges = computed(() =>
    this.myChallenges().filter((c) => c.completed)
  );
  unlockedAchievements = computed(() => this.myAchievements().length);

  /**
   * Get or create user gamification preferences
   */
  async getPreferences(userId: string): Promise<GamificationPreferences | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('gamification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create default preferences
        const { data: newPrefs, error: insertError } = await this.supabase.client
          .from('gamification_preferences')
          .insert({
            user_id: userId,
            leaderboard_opt_in: false,
            display_name_anonymized: false,
            show_in_global_leaderboards: false,
            show_in_facility_leaderboards: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        this.preferences.set(newPrefs);
        return newPrefs;
      }

      this.preferences.set(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load preferences';
      this.error.set(errorMessage);
      console.error('Error getting preferences:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update gamification preferences
   */
  async updatePreferences(
    userId: string,
    updates: Partial<Omit<GamificationPreferences, 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('gamification_preferences')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh preferences
      await this.getPreferences(userId);

      return true;
    } catch (err) {
      console.error('Error updating preferences:', err);
      return false;
    }
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboard(
    type: LeaderboardType,
    scope: LeaderboardScope = 'global',
    scopeId?: string,
    limit = 50
  ): Promise<LeaderboardEntry[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Get current period dates
      const { periodStart, periodEnd: _periodEnd } = this.getCurrentPeriod(type);

      let query = this.supabase.client
        .from('leaderboard_entries')
        .select(`
          *,
          profiles!inner(full_name)
        `)
        .eq('leaderboard_type', type)
        .eq('leaderboard_scope', scope)
        .eq('period_start', periodStart)
        .order('rank', { ascending: true })
        .limit(limit);

      if (scopeId) {
        query = query.eq('scope_id', scopeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enhance entries with user names and current user flag
      const entries: LeaderboardEntry[] = (data || []).map((entry: LeaderboardEntry & { profiles?: { full_name?: string } }) => ({
        ...entry,
        user_name: entry.profiles?.full_name || 'Unknown User',
        is_current_user: entry.user_id === this.supabase.client.auth.getUser().then(u => u.data.user?.id),
      }));

      this.leaderboardEntries.set(entries);
      return entries;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load leaderboard';
      this.error.set(errorMessage);
      console.error('Error getting leaderboard:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get my rank in leaderboard
   */
  async getMyRank(
    userId: string,
    type: LeaderboardType,
    scope: LeaderboardScope = 'global',
    scopeId?: string
  ): Promise<LeaderboardEntry | null> {
    try {
      const { periodStart, periodEnd: _periodEnd2 } = this.getCurrentPeriod(type);

      let query = this.supabase.client
        .from('leaderboard_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('leaderboard_type', type)
        .eq('leaderboard_scope', scope)
        .eq('period_start', periodStart);

      if (scopeId) {
        query = query.eq('scope_id', scopeId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error getting my rank:', err);
      return null;
    }
  }

  /**
   * Get active challenges
   */
  async getActiveChallenges(scope?: LeaderboardScope, scopeId?: string): Promise<WeeklyChallenge[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      let query = this.supabase.client
        .from('weekly_challenges')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false });

      if (scope) {
        query = query.eq('scope', scope);
      }
      if (scopeId) {
        query = query.eq('scope_id', scopeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.activeChallenges.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting challenges:', err);
      return [];
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId: string, challengeId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          current_progress: 0,
          completed: false,
        });

      if (error) throw error;

      // Refresh my challenges
      await this.getMyChallenges(userId);

      return true;
    } catch (err) {
      console.error('Error joining challenge:', err);
      return false;
    }
  }

  /**
   * Get my challenge participations
   */
  async getMyChallenges(userId: string): Promise<ChallengeParticipant[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('challenge_participants')
        .select(`
          *,
          weekly_challenges!inner(*)
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      this.myChallenges.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting my challenges:', err);
      return [];
    }
  }

  /**
   * Get all achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('threshold_value', { ascending: true });

      if (error) throw error;

      this.achievements.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting achievements:', err);
      return [];
    }
  }

  /**
   * Get my unlocked achievements
   */
  async getMyAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('user_achievements')
        .select(`
          *,
          achievements!inner(*)
        `)
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;

      this.myAchievements.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting my achievements:', err);
      return [];
    }
  }

  /**
   * Get current period for leaderboard type
   */
  private getCurrentPeriod(type: LeaderboardType): { periodStart: string; periodEnd: string } {
    const now = new Date();

    if (type.includes('weekly')) {
      // Get Monday of current week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      return {
        periodStart: monday.toISOString().split('T')[0],
        periodEnd: sunday.toISOString().split('T')[0],
      };
    } else {
      // Monthly
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        periodStart: firstDay.toISOString().split('T')[0],
        periodEnd: lastDay.toISOString().split('T')[0],
      };
    }
  }

  /**
   * Get leaderboard label
   */
  getLeaderboardLabel(type: LeaderboardType): string {
    switch (type) {
      case 'weekly_steps':
        return 'Weekly Steps';
      case 'monthly_steps':
        return 'Monthly Steps';
      case 'weekly_workouts':
        return 'Weekly Workouts';
      case 'monthly_workouts':
        return 'Monthly Workouts';
      case 'consistency_streak':
        return 'Consistency Streak';
      case 'improvement_rate':
        return 'Improvement Rate';
      default:
        return type;
    }
  }

  /**
   * Get metric label
   */
  getMetricLabel(type: LeaderboardType): string {
    if (type.includes('steps')) return 'steps';
    if (type.includes('workouts')) return 'workouts';
    if (type === 'consistency_streak') return 'weeks';
    if (type === 'improvement_rate') return '% improvement';
    return '';
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
