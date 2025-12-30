import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Database } from '@fitos/shared';

type Exercise = Database['public']['Tables']['exercises']['Row'];
type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

export interface ExerciseFilters {
  category?: string;
  muscleGroup?: string;
  equipment?: string;
  searchQuery?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  // State
  private exercisesSignal = signal<Exercise[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private filtersSignal = signal<ExerciseFilters>({});

  // Computed values
  exercises = computed(() => this.exercisesSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());
  filters = computed(() => this.filtersSignal());

  // Filtered exercises based on current filters
  filteredExercises = computed(() => {
    const exercises = this.exercisesSignal();
    const filters = this.filtersSignal();

    if (!filters.category && !filters.muscleGroup && !filters.equipment && !filters.searchQuery) {
      return exercises;
    }

    return exercises.filter(exercise => {
      if (filters.category && exercise.category !== filters.category) {
        return false;
      }
      if (filters.muscleGroup && exercise.primary_muscle !== filters.muscleGroup) {
        return false;
      }
      if (filters.equipment && !exercise.equipment?.includes(filters.equipment)) {
        return false;
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          exercise.name.toLowerCase().includes(query) ||
          exercise.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  });

  // Available filter options (computed from loaded exercises)
  categories = computed(() => {
    const exercises = this.exercisesSignal();
    return [...new Set(exercises.map(e => e.category))].filter(Boolean).sort();
  });

  muscleGroups = computed(() => {
    const exercises = this.exercisesSignal();
    return [...new Set(exercises.map(e => e.primary_muscle))].filter(Boolean).sort();
  });

  equipmentTypes = computed(() => {
    const exercises = this.exercisesSignal();
    const allEquipment = exercises.flatMap(e => e.equipment || []);
    return [...new Set(allEquipment)].filter(Boolean).sort();
  });

  constructor(private supabase: SupabaseService) {}

  /**
   * Load all exercises (system + user's custom exercises)
   */
  async loadExercises(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = (await this.supabase.client.auth.getUser()).data.user?.id;

      // Load system exercises + custom exercises created by this user
      const { data, error } = await this.supabase.client
        .from('exercises')
        .select('*')
        .or(`is_custom.eq.false,created_by.eq.${userId}`)
        .order('name');

      if (error) throw error;

      this.exercisesSignal.set(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load exercises');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Search exercises by name (full-text search)
   */
  async searchExercises(query: string): Promise<Exercise[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('exercises')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(50);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching exercises:', error);
      return [];
    }
  }

  /**
   * Get a single exercise by ID
   */
  async getExercise(id: string): Promise<Exercise | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting exercise:', error);
      return null;
    }
  }

  /**
   * Create a custom exercise
   */
  async createExercise(exercise: Omit<ExerciseInsert, 'id' | 'created_at' | 'created_by'>): Promise<Exercise | null> {
    try {
      const userId = (await this.supabase.client.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('exercises')
        .insert({
          ...exercise,
          is_custom: true,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      this.exercisesSignal.update(exercises => [...exercises, data]);

      return data;
    } catch (error) {
      console.error('Error creating exercise:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to create exercise');
      return null;
    }
  }

  /**
   * Update a custom exercise (only creator can update)
   */
  async updateExercise(id: string, updates: Partial<ExerciseInsert>): Promise<Exercise | null> {
    try {
      const userId = (await this.supabase.client.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .eq('created_by', userId) // Only allow updating own exercises
        .select()
        .single();

      if (error) throw error;

      // Update local state
      this.exercisesSignal.update(exercises =>
        exercises.map(e => e.id === id ? data : e)
      );

      return data;
    } catch (error) {
      console.error('Error updating exercise:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to update exercise');
      return null;
    }
  }

  /**
   * Delete a custom exercise (only creator can delete)
   */
  async deleteExercise(id: string): Promise<boolean> {
    try {
      const userId = (await this.supabase.client.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await this.supabase.client
        .from('exercises')
        .delete()
        .eq('id', id)
        .eq('created_by', userId); // Only allow deleting own exercises

      if (error) throw error;

      // Remove from local state
      this.exercisesSignal.update(exercises =>
        exercises.filter(e => e.id !== id)
      );

      return true;
    } catch (error) {
      console.error('Error deleting exercise:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to delete exercise');
      return false;
    }
  }

  /**
   * Update filters
   */
  setFilters(filters: ExerciseFilters): void {
    this.filtersSignal.set(filters);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filtersSignal.set({});
  }

  /**
   * Reset state
   */
  reset(): void {
    this.exercisesSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
    this.filtersSignal.set({});
  }
}
