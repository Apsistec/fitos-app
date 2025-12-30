import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Database } from '@fitos/shared';

type AssignedWorkout = Database['public']['Tables']['assigned_workouts']['Row'];
type AssignedWorkoutInsert = Database['public']['Tables']['assigned_workouts']['Insert'];

export interface WorkoutAssignment {
  clientId: string;
  templateId: string;
  scheduledDate: string; // ISO date string
  trainerNotes?: string;
}

export interface AssignedWorkoutWithDetails extends AssignedWorkout {
  template?: any;
  client?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  // State
  private assignmentsSignal = signal<AssignedWorkoutWithDetails[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed values
  assignments = computed(() => this.assignmentsSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

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
        assigned_by: userId,
        scheduled_date: assignment.scheduledDate,
        trainer_notes: assignment.trainerNotes || null,
        status: 'scheduled'
      };

      const { data, error } = await this.supabase.client
        .from('assigned_workouts')
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
        assigned_by: userId,
        scheduled_date: a.scheduledDate,
        trainer_notes: a.trainerNotes || null,
        status: 'scheduled'
      }));

      const { error } = await this.supabase.client
        .from('assigned_workouts')
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

      this.assignmentsSignal.set(data as any || []);
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

      this.assignmentsSignal.set(data as any || []);
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
}
