import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Database } from '@fitos/shared';

type AssignedWorkout = Database['public']['Tables']['workouts']['Row'];
type AssignedWorkoutInsert = Database['public']['Tables']['workouts']['Insert'];

export interface WorkoutAssignment {
  clientId: string;
  templateId: string;
  scheduledDate: string; // ISO date string
  trainerNotes?: string;
}

export interface AssignedWorkoutWithDetails extends AssignedWorkout {
  template?: Record<string, unknown>;
  client?: Record<string, unknown>;
}

export interface RecentActivity {
  workout: AssignedWorkout;
  clientName: string;
  clientAvatar: string | null;
  completedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  // State
  private assignmentsSignal = signal<AssignedWorkoutWithDetails[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // Computed values
  assignments = computed(() => this.assignmentsSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  /**
   * Assign a workout to a client on a specific date
   */
  async assignWorkout(assignment: WorkoutAssignment): Promise<AssignedWorkout | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const assignmentData: AssignedWorkoutInsert = {
        client_id: assignment.clientId,
        template_id: assignment.templateId,
        trainer_id: userId,
        name: 'Assigned Workout',
        scheduled_date: assignment.scheduledDate,
        trainer_notes: assignment.trainerNotes || null,
        status: 'scheduled'
      };

      const { data, error } = await this.supabase.client
        .from('workouts')
        .insert(assignmentData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error assigning workout:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to assign workout');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Assign multiple workouts at once (weekly program)
   */
  async assignMultipleWorkouts(assignments: WorkoutAssignment[]): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const assignmentData: AssignedWorkoutInsert[] = assignments.map(a => ({
        client_id: a.clientId,
        template_id: a.templateId,
        trainer_id: userId,
        name: 'Assigned Workout',
        scheduled_date: a.scheduledDate,
        trainer_notes: a.trainerNotes || null,
        status: 'scheduled'
      }));

      const { error } = await this.supabase.client
        .from('workouts')
        .insert(assignmentData);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error assigning workouts:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to assign workouts');
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Load assignments for a specific client
   */
  async loadClientAssignments(clientId: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('assigned_workouts')
        .select(`
          *,
          template:workout_templates(*),
          client:client_profiles(
            *,
            profile:profiles(*)
          )
        `)
        .eq('client_id', clientId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      this.assignmentsSignal.set((data as unknown as AssignedWorkoutWithDetails[]) || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load assignments');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Load all assignments for the trainer
   */
  async loadTrainerAssignments(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('assigned_workouts')
        .select(`
          *,
          template:workout_templates(*),
          client:client_profiles(
            *,
            profile:profiles(*)
          )
        `)
        .eq('assigned_by', userId)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      this.assignmentsSignal.set((data as unknown as AssignedWorkoutWithDetails[]) || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load assignments');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('assigned_workouts')
        .update({ status })
        .eq('id', assignmentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating assignment:', error);
      return false;
    }
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId: string): Promise<boolean> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await this.supabase.client
        .from('assigned_workouts')
        .delete()
        .eq('id', assignmentId)
        .eq('assigned_by', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return false;
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this.assignmentsSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }

  /**
   * Get today's schedule for trainer dashboard
   * Returns all workouts scheduled for today with client details
   */
  async getTodaySchedule(trainerId: string): Promise<AssignedWorkoutWithDetails[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase.client
        .from('workouts')
        .select(`
          *,
          template:workout_templates(*),
          client:profiles!workouts_client_id_fkey(*)
        `)
        .eq('trainer_id', trainerId)
        .eq('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_time', { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data as unknown as AssignedWorkoutWithDetails[]) || [];
    } catch (error) {
      console.error('Error fetching today\'s schedule:', error);
      return [];
    }
  }

  /**
   * Get recent client activity for trainer dashboard
   * Returns workouts completed in the last N hours
   */
  async getRecentActivity(trainerId: string, hours = 24): Promise<RecentActivity[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      const cutoffTimeStr = cutoffTime.toISOString();

      const { data, error } = await this.supabase.client
        .from('workouts')
        .select(`
          *,
          client:profiles!workouts_client_id_fkey(full_name, avatar_url)
        `)
        .eq('trainer_id', trainerId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .gte('completed_at', cutoffTimeStr)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform to RecentActivity format
      const activities: RecentActivity[] = (data || []).map((workout: AssignedWorkout & { client?: { full_name?: string; avatar_url?: string | null } }) => ({
        workout,
        clientName: workout.client?.full_name || 'Unknown Client',
        clientAvatar: workout.client?.avatar_url || null,
        completedAt: workout.completed_at,
      }));

      return activities;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }
}
