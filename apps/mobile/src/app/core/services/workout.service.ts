import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Database } from '@fitos/shared';

type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row'];
type WorkoutTemplateInsert = Database['public']['Tables']['workout_templates']['Insert'];
type WorkoutTemplateUpdate = Database['public']['Tables']['workout_templates']['Update'];
type TemplateExercise = Database['public']['Tables']['workout_template_exercises']['Row'];
type TemplateExerciseInsert = Database['public']['Tables']['workout_template_exercises']['Insert'];

export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  exercises: TemplateExercise[];
}

export interface ExerciseConfiguration {
  exerciseId: string;
  exerciseName?: string;
  order: number;
  sets: number;
  reps: string; // Can be "8-12", "10", "AMRAP", etc.
  restSeconds: number;
  notes?: string;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  tempo?: string; // e.g., "3-0-1-0"
}

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  // State
  private templatesSignal = signal<WorkoutTemplateWithExercises[]>([]);
  private currentTemplateSignal = signal<WorkoutTemplateWithExercises | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed values
  templates = computed(() => this.templatesSignal());
  currentTemplate = computed(() => this.currentTemplateSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  /**
   * Load all workout templates for the current trainer
   */
  async loadTemplates(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('workout_templates')
        .select(`
          *,
          exercises:workout_template_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.templatesSignal.set(data as any || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Load a single workout template by ID
   */
  async loadTemplate(id: string): Promise<WorkoutTemplateWithExercises | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('workout_templates')
        .select(`
          *,
          exercises:workout_template_exercises(
            *,
            exercise:exercises(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const template = data as any as WorkoutTemplateWithExercises;
      this.currentTemplateSignal.set(template);
      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load template');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Create a new workout template
   */
  async createTemplate(
    name: string,
    description: string | null,
    exercises: ExerciseConfiguration[]
  ): Promise<WorkoutTemplateWithExercises | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      // Calculate estimated duration based on exercises
      const estimatedDuration = this.calculateEstimatedDuration(exercises);

      // Create template
      const { data: template, error: templateError } = await this.supabase.client
        .from('workout_templates')
        .insert({
          name,
          description,
          created_by: userId,
          estimated_duration: estimatedDuration,
          is_public: false
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template exercises
      const templateExercises: TemplateExerciseInsert[] = exercises.map((ex) => ({
        template_id: template.id,
        exercise_id: ex.exerciseId,
        order_index: ex.order,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.restSeconds,
        notes: ex.notes || null,
        rpe_target: ex.rpe || null,
        tempo: ex.tempo || null
      }));

      const { error: exercisesError } = await this.supabase.client
        .from('workout_template_exercises')
        .insert(templateExercises);

      if (exercisesError) throw exercisesError;

      // Reload to get full data with exercises
      const fullTemplate = await this.loadTemplate(template.id);

      if (fullTemplate) {
        // Add to local state
        this.templatesSignal.update(templates => [fullTemplate, ...templates]);
      }

      return fullTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to create template');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update an existing workout template
   */
  async updateTemplate(
    id: string,
    name: string,
    description: string | null,
    exercises: ExerciseConfiguration[]
  ): Promise<WorkoutTemplateWithExercises | null> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const estimatedDuration = this.calculateEstimatedDuration(exercises);

      // Update template metadata
      const { error: templateError } = await this.supabase.client
        .from('workout_templates')
        .update({
          name,
          description,
          estimated_duration: estimatedDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('created_by', userId);

      if (templateError) throw templateError;

      // Delete existing exercises
      const { error: deleteError } = await this.supabase.client
        .from('workout_template_exercises')
        .delete()
        .eq('template_id', id);

      if (deleteError) throw deleteError;

      // Insert updated exercises
      const templateExercises: TemplateExerciseInsert[] = exercises.map((ex) => ({
        template_id: id,
        exercise_id: ex.exerciseId,
        order_index: ex.order,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.restSeconds,
        notes: ex.notes || null,
        rpe_target: ex.rpe || null,
        tempo: ex.tempo || null
      }));

      const { error: exercisesError } = await this.supabase.client
        .from('workout_template_exercises')
        .insert(templateExercises);

      if (exercisesError) throw exercisesError;

      // Reload to get full data
      const fullTemplate = await this.loadTemplate(id);

      if (fullTemplate) {
        // Update local state
        this.templatesSignal.update(templates =>
          templates.map(t => t.id === id ? fullTemplate : t)
        );
      }

      return fullTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to update template');
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Duplicate a workout template
   */
  async duplicateTemplate(id: string): Promise<WorkoutTemplateWithExercises | null> {
    try {
      const original = await this.loadTemplate(id);
      if (!original) return null;

      const exercises: ExerciseConfiguration[] = original.exercises.map((ex) => ({
        exerciseId: ex.exercise_id,
        order: ex.order_index,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.rest_seconds,
        notes: ex.notes || undefined,
        rpe: ex.rpe_target || undefined,
        tempo: ex.tempo || undefined
      }));

      return await this.createTemplate(
        `${original.name} (Copy)`,
        original.description,
        exercises
      );
    } catch (error) {
      console.error('Error duplicating template:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to duplicate template');
      return null;
    }
  }

  /**
   * Delete a workout template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      // Delete template (cascade will handle exercises)
      const { error } = await this.supabase.client
        .from('workout_templates')
        .delete()
        .eq('id', id)
        .eq('created_by', userId);

      if (error) throw error;

      // Update local state
      this.templatesSignal.update(templates =>
        templates.filter(t => t.id !== id)
      );

      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to delete template');
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Calculate estimated duration based on exercises
   * Formula: (sets × reps × 3 seconds) + (sets × rest time)
   */
  private calculateEstimatedDuration(exercises: ExerciseConfiguration[]): number {
    return exercises.reduce((total, ex) => {
      // Parse reps (handle ranges like "8-12", take average)
      let reps = 10; // default
      if (ex.reps.includes('-')) {
        const [min, max] = ex.reps.split('-').map(Number);
        reps = (min + max) / 2;
      } else if (!isNaN(Number(ex.reps))) {
        reps = Number(ex.reps);
      }

      // Estimate 3 seconds per rep + rest time per set
      const workTime = ex.sets * reps * 3;
      const restTime = ex.sets * ex.restSeconds;

      return total + workTime + restTime;
    }, 0);
  }

  /**
   * Clear current template
   */
  clearCurrentTemplate(): void {
    this.currentTemplateSignal.set(null);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.templatesSignal.set([]);
    this.currentTemplateSignal.set(null);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}
