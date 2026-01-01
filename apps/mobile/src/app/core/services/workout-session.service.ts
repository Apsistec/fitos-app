import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Database } from '@fitos/shared';

type WorkoutSession = Database['public']['Tables']['workouts']['Row'];
type WorkoutSessionInsert = Database['public']['Tables']['workouts']['Insert'];
type LoggedSet = Database['public']['Tables']['workout_sets']['Row'];
type LoggedSetInsert = Database['public']['Tables']['workout_sets']['Insert'];

export interface SetLog {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight?: number;
  rpe?: number;
  notes?: string;
}

export interface ActiveSession {
  session: WorkoutSession;
  loggedSets: LoggedSet[];
}

@Injectable({
  providedIn: 'root'
})
export class WorkoutSessionService {
  // State
  private activeSessionSignal = signal<ActiveSession | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // Computed values
  activeSession = computed(() => this.activeSessionSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  /**
   * Start a new workout session
   */
  async startSession(assignedWorkoutId: string): Promise<WorkoutSession | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      // Update the existing workout to mark it as started
      const { data, error } = await this.supabase.client
        .from('workouts')
        .update({
          started_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', assignedWorkoutId)
        .select()
        .single();

      if (error) throw error;

      // Update assignment status to in_progress
      await this.supabase.client
        .from('assigned_workouts')
        .update({ status: 'in_progress' })
        .eq('id', assignedWorkoutId);

      this.activeSessionSignal.set({
        session: data,
        loggedSets: []
      });

      return data;
    } catch (error) {
      console.error('Error starting session:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to start session');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Load an existing session
   */
  async loadSession(sessionId: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data: session, error: sessionError } = await this.supabase.client
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const { data: sets, error: setsError } = await this.supabase.client
        .from('logged_sets')
        .select('*')
        .eq('session_id', sessionId)
        .order('set_number');

      if (setsError) throw setsError;

      this.activeSessionSignal.set({
        session,
        loggedSets: sets || []
      });
    } catch (error) {
      console.error('Error loading session:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load session');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Log a set
   */
  async logSet(setLog: SetLog): Promise<LoggedSet | null> {
    const session = this.activeSessionSignal();
    if (!session) {
      this.errorSignal.set('No active session');
      return null;
    }

    try {
      const setData: LoggedSetInsert = {
        workout_exercise_id: setLog.exerciseId,
        set_number: setLog.setNumber,
        reps_completed: setLog.reps,
        weight_used: setLog.weight || null,
        rpe: setLog.rpe || null,
        notes: setLog.notes || null
      };

      const { data, error } = await this.supabase.client
        .from('workout_sets')
        .insert(setData)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      this.activeSessionSignal.update(s => {
        if (!s) return s;
        return {
          ...s,
          loggedSets: [...s.loggedSets, data]
        };
      });

      return data;
    } catch (error) {
      console.error('Error logging set:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to log set');
      return null;
    }
  }

  /**
   * Update a logged set
   */
  async updateSet(setId: string, updates: Partial<SetLog>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('logged_sets')
        .update({
          reps: updates.reps,
          weight: updates.weight || null,
          rpe: updates.rpe || null,
          notes: updates.notes || null
        })
        .eq('id', setId);

      if (error) throw error;

      // Update local state
      this.activeSessionSignal.update(s => {
        if (!s) return s;
        return {
          ...s,
          loggedSets: s.loggedSets.map(set =>
            set.id === setId ? { ...set, ...updates } : set
          )
        };
      });

      return true;
    } catch (error) {
      console.error('Error updating set:', error);
      return false;
    }
  }

  /**
   * Delete a logged set
   */
  async deleteSet(setId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('logged_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      // Update local state
      this.activeSessionSignal.update(s => {
        if (!s) return s;
        return {
          ...s,
          loggedSets: s.loggedSets.filter(set => set.id !== setId)
        };
      });

      return true;
    } catch (error) {
      console.error('Error deleting set:', error);
      return false;
    }
  }

  /**
   * Complete the workout session
   */
  async completeSession(rating?: number, notes?: string): Promise<boolean> {
    const session = this.activeSessionSignal();
    if (!session) {
      this.errorSignal.set('No active session');
      return false;
    }

    this.loadingSignal.set(true);

    try {
      const completedAt = new Date().toISOString();
      const startedAt = session.session.started_at;
      const duration = startedAt ? Math.floor(
        (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000
      ) : null;

      const { error: sessionError } = await this.supabase.client
        .from('workouts')
        .update({
          completed_at: completedAt,
          status: 'completed',
          rating: rating || null,
          notes: notes || null
        })
        .eq('id', session.session.id);

      if (sessionError) throw sessionError;

      // Update assignment status to completed
      this.activeSessionSignal.set(null);

      return true;
    } catch (error) {
      console.error('Error completing session:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to complete session');
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get logged sets for a specific exercise in current session
   */
  getExerciseSets(exerciseId: string): LoggedSet[] {
    const session = this.activeSessionSignal();
    if (!session) return [];

    return session.loggedSets.filter(set => set.workout_exercise_id === exerciseId);
  }

  /**
   * Clear active session (without completing)
   */
  clearSession(): void {
    this.activeSessionSignal.set(null);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.activeSessionSignal.set(null);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }

  /**
   * Get today's workout for a client (scheduled or in_progress)
   * Used by client dashboard
   */
  async getTodayWorkout(clientId: string): Promise<WorkoutSession | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase.client
        .from('workouts')
        .select('*, template:workout_templates(*)')
        .eq('client_id', clientId)
        .eq('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching today\'s workout:', error);
      return null;
    }
  }

  /**
   * Get count of completed workouts in the last N days
   * Used by client dashboard for weekly stats
   */
  async getWorkoutCount(clientId: string, days: number = 7): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const { count, error } = await this.supabase.client
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('completed_at', startDateStr);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error fetching workout count:', error);
      return 0;
    }
  }

  /**
   * Calculate current workout streak (consecutive days with completed workouts)
   * Used by client dashboard
   */
  async getCurrentStreak(clientId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.client
        .from('workouts')
        .select('completed_at')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(90); // Check last 90 days

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      // Group workouts by date
      const workoutDates = new Set(
        data.map(w => new Date(w.completed_at!).toISOString().split('T')[0])
      );

      // Calculate streak
      let streak = 0;
      const today = new Date();

      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];

        if (workoutDates.has(dateStr)) {
          streak++;
        } else if (i > 0) {
          // Break streak if not today (allow rest day today)
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }

  /**
   * Get upcoming workouts for a client (next 7 days)
   * Used by client dashboard
   */
  async getUpcomingWorkouts(clientId: string, limit: number = 5): Promise<WorkoutSession[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const { data, error } = await this.supabase.client
        .from('workouts')
        .select('*, template:workout_templates(*)')
        .eq('client_id', clientId)
        .gt('scheduled_date', today)
        .lte('scheduled_date', nextWeekStr)
        .in('status', ['scheduled'])
        .order('scheduled_date', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming workouts:', error);
      return [];
    }
  }

  /**
   * Get workout history for the current user (client view)
   */
  async getWorkoutHistory(limit = 50, offset = 0): Promise<any[]> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('workouts')
        .select('*, template:workout_templates(*)')
        .eq('client_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching workout history:', error);
      return [];
    }
  }

  /**
   * Get workout history for a specific client (trainer view)
   */
  async getClientWorkoutHistory(clientId: string, limit = 50, offset = 0): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('workouts')
        .select('*, template:workout_templates(*)')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching client workout history:', error);
      return [];
    }
  }

  /**
   * Get workout detail with all sets
   */
  async getWorkoutDetail(workoutId: string): Promise<{
    workout: any;
    sets: LoggedSet[];
  } | null> {
    try {
      const { data: workout, error: workoutError } = await this.supabase.client
        .from('workouts')
        .select('*, template:workout_templates(*)')
        .eq('id', workoutId)
        .single();

      if (workoutError) throw workoutError;

      const { data: sets, error: setsError } = await this.supabase.client
        .from('workout_sets')
        .select('*')
        .eq('workout_id', workoutId)
        .order('set_number');

      if (setsError) throw setsError;

      return {
        workout,
        sets: sets || []
      };
    } catch (error) {
      console.error('Error fetching workout detail:', error);
      return null;
    }
  }
}
