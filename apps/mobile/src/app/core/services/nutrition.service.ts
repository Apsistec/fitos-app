import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Tables } from '@fitos/shared';

export interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
}

export interface NutritionLogWithEntries {
  log: Tables<'nutrition_logs'>;
  entries: Array<Tables<'nutrition_entries'> & { food?: Tables<'foods'> | null }>;
}

@Injectable({
  providedIn: 'root'
})
export class NutritionService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // State signals
  dailySummarySignal = signal<NutritionSummary | null>(null);
  currentLogSignal = signal<NutritionLogWithEntries | null>(null);
  targetsSignal = signal<Tables<'nutrition_targets'> | null>(null);
  isLoadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  /**
   * Get nutrition summary for a specific date
   * Calculates totals from entries and includes targets
   */
  async getDailySummary(clientId: string, date: string): Promise<NutritionSummary | null> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      // Get log for the date
      const { data: log, error: logError } = await this.supabase
        .from('nutrition_logs')
        .select('*, entries:nutrition_entries(*)')
        .eq('client_id', clientId)
        .eq('log_date', date)
        .maybeSingle();

      if (logError && logError.code !== 'PGRST116') {
        throw logError;
      }

      // Get active targets
      const { data: targets, error: targetsError } = await this.supabase
        .from('nutrition_targets')
        .select('*')
        .eq('client_id', clientId)
        .lte('effective_from', date)
        .or(`effective_to.is.null,effective_to.gte.${date}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (targetsError) {
        console.warn('Error fetching nutrition targets:', targetsError);
      }

      // Calculate totals from entries
      const entries = (log?.entries as Tables<'nutrition_entries'>[]) || [];
      const totals = entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + (entry.calories || 0),
          protein: acc.protein + (entry.protein_g || 0),
          carbs: acc.carbs + (entry.carbs_g || 0),
          fat: acc.fat + (entry.fat_g || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const summary: NutritionSummary = {
        ...totals,
        targets: targets
          ? {
              calories: targets.calories_target || 2000,
              protein: targets.protein_target_g || 150,
              carbs: targets.carbs_target_g || 200,
              fat: targets.fat_target_g || 60,
            }
          : null,
      };

      this.dailySummarySignal.set(summary);
      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load nutrition summary';
      this.errorSignal.set(message);
      console.error('Error fetching daily nutrition summary:', error);
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Load full nutrition log with entries for a specific date
   * Creates log if it doesn't exist
   */
  async loadNutritionLog(clientId: string, date: string): Promise<NutritionLogWithEntries | null> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      // Try to get existing log
      const result = await this.supabase
        .from('nutrition_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('log_date', date)
        .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      let log = result.data;

      // Create log if it doesn't exist
      if (!log) {
        const { data: newLog, error: createError } = await this.supabase
          .from('nutrition_logs')
          .insert({
            client_id: clientId,
            log_date: date,
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        log = newLog;
      }

      // Get entries with food details
      const { data: entries, error: entriesError } = await this.supabase
        .from('nutrition_entries')
        .select('*, food:foods(*)')
        .eq('log_id', log.id)
        .order('logged_at', { ascending: true });

      if (entriesError) {
        throw entriesError;
      }

      const logWithEntries: NutritionLogWithEntries = {
        log,
        entries: entries || [],
      };

      this.currentLogSignal.set(logWithEntries);
      return logWithEntries;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load nutrition log';
      this.errorSignal.set(message);
      console.error('Error loading nutrition log:', error);
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Get active nutrition targets for a client
   */
  async getActiveTargets(clientId: string): Promise<Tables<'nutrition_targets'> | null> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('nutrition_targets')
        .select('*')
        .eq('client_id', clientId)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      this.targetsSignal.set(data);
      return data;
    } catch (error) {
      console.error('Error fetching active targets:', error);
      return null;
    }
  }

  /**
   * Add a nutrition entry to a log
   */
  async addEntry(
    logId: string,
    entry: {
      food_id?: string;
      custom_name?: string;
      servings: number;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      meal_type?: string;
    }
  ): Promise<Tables<'nutrition_entries'> | null> {
    try {
      const { data, error } = await this.supabase
        .from('nutrition_entries')
        .insert({
          log_id: logId,
          ...entry,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding nutrition entry:', error);
      return null;
    }
  }

  /**
   * Update a nutrition entry
   */
  async updateEntry(
    entryId: string,
    updates: Partial<Tables<'nutrition_entries'>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('nutrition_entries')
        .update(updates)
        .eq('id', entryId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating nutrition entry:', error);
      return false;
    }
  }

  /**
   * Delete a nutrition entry
   */
  async deleteEntry(entryId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('nutrition_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting nutrition entry:', error);
      return false;
    }
  }

  /**
   * Create or update nutrition targets for a client
   */
  async setTargets(
    clientId: string,
    targets: {
      calories_target: number;
      protein_target_g: number;
      carbs_target_g: number;
      fat_target_g: number;
      effective_from: string;
      effective_to?: string;
      notes?: string;
    }
  ): Promise<Tables<'nutrition_targets'> | null> {
    try {
      const trainerId = this.auth.user()?.id;

      const { data, error } = await this.supabase
        .from('nutrition_targets')
        .insert({
          client_id: clientId,
          created_by: trainerId,
          ...targets,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      this.targetsSignal.set(data);
      return data;
    } catch (error) {
      console.error('Error setting nutrition targets:', error);
      return null;
    }
  }

  /**
   * Clear service state
   */
  clearState(): void {
    this.dailySummarySignal.set(null);
    this.currentLogSignal.set(null);
    this.targetsSignal.set(null);
    this.errorSignal.set(null);
    this.isLoadingSignal.set(false);
  }
}
