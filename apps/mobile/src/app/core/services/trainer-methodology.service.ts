import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Trainer Methodology Types
 */
export interface TrainerMethodology {
  id: string;
  trainer_id: string;
  training_philosophy: string | null;
  nutrition_approach: string | null;
  communication_style: string | null;
  key_phrases: string[];
  avoid_phrases: string[];
  response_examples: Record<string, any>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMethodologyInput {
  training_philosophy?: string;
  nutrition_approach?: string;
  communication_style?: string;
  key_phrases?: string[];
  avoid_phrases?: string[];
  response_examples?: Record<string, any>;
}

export interface UpdateMethodologyInput extends CreateMethodologyInput {
  is_active?: boolean;
}

export interface MethodologyTrainingData {
  id: string;
  trainer_id: string;
  input_type: 'message' | 'program' | 'feedback' | 'note' | 'workout_description';
  content: string;
  embedding: number[] | null;
  source_id: string | null;
  created_at: string;
}

export interface MethodologyResponseLog {
  id: string;
  trainer_id: string;
  client_id: string | null;
  query: string;
  response: string;
  context_used: Array<{ content: string; input_type: string; similarity?: number }> | null;
  trainer_rating: number | null;
  trainer_approved: boolean | null;
  trainer_feedback: string | null;
  created_at: string;
  reviewed_at: string | null;
}

/**
 * TrainerMethodologyService - Coach Brain Methodology Management
 *
 * Features:
 * - CRUD operations for trainer methodology
 * - Training data collection and storage
 * - Response logging and approval workflow
 * - Integration with AI backend for RAG retrieval
 *
 * Usage:
 * ```typescript
 * const methodology = await this.methodologyService.getMyMethodology();
 * await this.methodologyService.updateMethodology({ training_philosophy: '...' });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TrainerMethodologyService {
  private supabase = inject(SupabaseService);

  // State
  currentMethodology = signal<TrainerMethodology | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  /**
   * Get current trainer's methodology
   */
  async getMyMethodology(): Promise<TrainerMethodology | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: user } = await this.supabase.client.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await this.supabase.client
        .from('trainer_methodology')
        .select('*')
        .eq('trainer_id', user.user.id)
        .single();

      if (error) {
        // If no methodology exists yet, return null (not an error)
        if (error.code === 'PGRST116') {
          this.currentMethodology.set(null);
          return null;
        }
        throw error;
      }

      this.currentMethodology.set(data);
      return data;
    } catch (err: any) {
      console.error('Error fetching methodology:', err);
      this.error.set(err.message);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Create methodology for current trainer
   */
  async createMethodology(input: CreateMethodologyInput): Promise<TrainerMethodology | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: user } = await this.supabase.client.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await this.supabase.client
        .from('trainer_methodology')
        .insert({
          trainer_id: user.user.id,
          ...input
        })
        .select()
        .single();

      if (error) throw error;

      this.currentMethodology.set(data);
      return data;
    } catch (err: any) {
      console.error('Error creating methodology:', err);
      this.error.set(err.message);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update current trainer's methodology
   */
  async updateMethodology(input: UpdateMethodologyInput): Promise<TrainerMethodology | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data: user } = await this.supabase.client.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await this.supabase.client
        .from('trainer_methodology')
        .update(input)
        .eq('trainer_id', user.user.id)
        .select()
        .single();

      if (error) throw error;

      this.currentMethodology.set(data);
      return data;
    } catch (err: any) {
      console.error('Error updating methodology:', err);
      this.error.set(err.message);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Add training data for methodology learning
   * This data will be used for RAG retrieval in AI responses
   */
  async addTrainingData(
    content: string,
    inputType: MethodologyTrainingData['input_type'],
    sourceId?: string
  ): Promise<boolean> {
    try {
      const { data: user } = await this.supabase.client.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { error } = await this.supabase.client
        .from('methodology_training_data')
        .insert({
          trainer_id: user.user.id,
          content,
          input_type: inputType,
          source_id: sourceId || null,
          // Note: embedding will be generated by AI backend
          embedding: null
        });

      if (error) throw error;

      return true;
    } catch (err: any) {
      console.error('Error adding training data:', err);
      return false;
    }
  }

  /**
   * Get response logs for trainer review
   */
  async getResponseLogs(limit: number = 50): Promise<MethodologyResponseLog[]> {
    try {
      const { data: user } = await this.supabase.client.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await this.supabase.client
        .from('methodology_response_logs')
        .select('*')
        .eq('trainer_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (err: any) {
      console.error('Error fetching response logs:', err);
      return [];
    }
  }

  /**
   * Get unapproved response logs for trainer review
   */
  async getUnapprovedResponses(): Promise<MethodologyResponseLog[]> {
    try {
      const { data: user } = await this.supabase.client.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await this.supabase.client
        .from('methodology_response_logs')
        .select('*')
        .eq('trainer_id', user.user.id)
        .is('trainer_approved', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (err: any) {
      console.error('Error fetching unapproved responses:', err);
      return [];
    }
  }

  /**
   * Approve or reject an AI response
   */
  async reviewResponse(
    logId: string,
    approved: boolean,
    rating?: number,
    feedback?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('methodology_response_logs')
        .update({
          trainer_approved: approved,
          trainer_rating: rating || null,
          trainer_feedback: feedback || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', logId);

      if (error) throw error;

      return true;
    } catch (err: any) {
      console.error('Error reviewing response:', err);
      return false;
    }
  }

  /**
   * Check if trainer has completed methodology setup
   */
  async hasCompletedSetup(): Promise<boolean> {
    const methodology = await this.getMyMethodology();

    if (!methodology) {
      return false;
    }

    // Consider setup complete if at least philosophy and communication style are set
    return !!(
      methodology.training_philosophy &&
      methodology.communication_style
    );
  }

  /**
   * Get methodology completeness percentage
   */
  getMethodologyCompleteness(methodology: TrainerMethodology): number {
    const fields = [
      methodology.training_philosophy,
      methodology.nutrition_approach,
      methodology.communication_style,
      methodology.key_phrases.length > 0,
      methodology.avoid_phrases.length > 0
    ];

    const completed = fields.filter(field => !!field).length;
    return Math.round((completed / fields.length) * 100);
  }
}
