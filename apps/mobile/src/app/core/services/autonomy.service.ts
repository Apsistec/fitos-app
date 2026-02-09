import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Knowledge category scores
 */
export interface WorkoutKnowledge {
  form: number; // 0-100
  periodization: number;
  modification: number;
  exercise_selection: number;
}

export interface NutritionKnowledge {
  tracking_accuracy: number;
  portion_estimation: number;
  flexibility: number;
  meal_planning: number;
}

export interface BehaviorConsistency {
  workout_90d: number;
  nutrition_90d: number;
  self_initiated: number;
  recovery_awareness: number;
}

/**
 * Readiness levels
 */
export type ReadinessLevel = 'learning' | 'progressing' | 'near_ready' | 'ready';

/**
 * Recommended actions
 */
export type RecommendedAction =
  | 'continue_current'
  | 'increase_independence'
  | 'reduce_frequency'
  | 'offer_graduation';

/**
 * Autonomy assessment
 */
export interface AutonomyAssessment {
  id: string;
  client_id: string;
  trainer_id: string;
  workout_knowledge: WorkoutKnowledge;
  nutrition_knowledge: NutritionKnowledge;
  behavior_consistency: BehaviorConsistency;
  overall_score: number;
  readiness_level: ReadinessLevel;
  recommended_action: RecommendedAction;
  notes?: string;
  next_assessment_at?: string;
  assessed_at: string;
  created_at: string;
}

/**
 * Graduation types
 */
export type GraduationType = 'full' | 'maintenance' | 'check_in_only';
export type GraduationStatus = 'pending' | 'active' | 'completed' | 'reverted';
export type CheckInFrequency =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'none';

/**
 * Client graduation
 */
export interface ClientGraduation {
  id: string;
  client_id: string;
  trainer_id: string;
  graduation_type: GraduationType;
  status: GraduationStatus;
  previous_pricing_tier?: string;
  new_pricing_tier?: string;
  pricing_reduced_by?: number;
  pricing_change_effective_date?: string;
  check_in_frequency: CheckInFrequency;
  next_check_in_at?: string;
  journey_stats: Record<string, unknown>;
  achievements: string[];
  celebration_sent: boolean;
  celebration_sent_at?: string;
  notes?: string;
  graduated_at: string;
  reverted_at?: string;
  revert_reason?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Maintenance check-in
 */
export interface MaintenanceCheckIn {
  id: string;
  graduation_id: string;
  client_id: string;
  trainer_id: string;
  check_in_type: 'scheduled' | 'client_initiated' | 'concern_flagged';
  status: 'pending' | 'completed' | 'skipped' | 'rescheduled';
  current_performance: Record<string, unknown>;
  concerns: string[];
  action_items: string[];
  outcome?:
    | 'continue_maintenance'
    | 'increase_support'
    | 'revert_to_full_coaching'
    | 'extend_graduation';
  notes?: string;
  scheduled_for: string;
  completed_at?: string;
  created_at: string;
}

/**
 * Autonomy milestone
 */
export interface AutonomyMilestone {
  id: string;
  client_id: string;
  trainer_id: string;
  milestone_type: string;
  title: string;
  description?: string;
  evidence?: string;
  autonomy_score_increase: number;
  celebrated: boolean;
  celebration_message?: string;
  achieved_at: string;
  created_at: string;
}

/**
 * Create assessment input
 */
export interface CreateAssessmentInput {
  client_id: string;
  workout_knowledge: Partial<WorkoutKnowledge>;
  nutrition_knowledge: Partial<NutritionKnowledge>;
  behavior_consistency: Partial<BehaviorConsistency>;
  notes?: string;
}

/**
 * Create graduation input
 */
export interface CreateGraduationInput {
  client_id: string;
  graduation_type: GraduationType;
  check_in_frequency: CheckInFrequency;
  pricing_reduced_by?: number;
  journey_stats?: Record<string, unknown>;
  achievements?: string[];
  notes?: string;
}

/**
 * AutonomyService - Progressive autonomy transfer and client graduation
 *
 * Features:
 * - Autonomy assessment scoring
 * - Readiness level calculation
 * - Graduation flow management
 * - Maintenance check-in scheduling
 * - Milestone tracking
 *
 * Usage:
 * ```typescript
 * const assessment = await autonomyService.createAssessment(trainerId, input);
 * const readiness = autonomyService.getReadinessLevel(score);
 * await autonomyService.graduateClient(trainerId, input);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class AutonomyService {
  private supabase = inject(SupabaseService);

  // State
  assessments = signal<AutonomyAssessment[]>([]);
  graduations = signal<ClientGraduation[]>([]);
  milestones = signal<AutonomyMilestone[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  isLoading = computed(() => this.loading());
  hasError = computed(() => this.error() !== null);

  /**
   * Get latest autonomy assessment for a client
   */
  async getLatestAssessment(
    clientId: string
  ): Promise<AutonomyAssessment | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('autonomy_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('assessed_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error getting latest assessment:', err);
      return null;
    }
  }

  /**
   * Get all assessments for a client
   */
  async getClientAssessments(
    clientId: string
  ): Promise<AutonomyAssessment[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('autonomy_assessments')
        .select('*')
        .eq('client_id', clientId)
        .order('assessed_at', { ascending: false });

      if (error) throw error;

      this.assessments.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting client assessments:', err);
      this.error.set('Failed to load assessments');
      return [];
    }
  }

  /**
   * Create autonomy assessment
   */
  async createAssessment(
    trainerId: string,
    input: CreateAssessmentInput
  ): Promise<AutonomyAssessment | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Fill in default values for missing scores
      const workoutKnowledge: WorkoutKnowledge = {
        form: input.workout_knowledge.form || 0,
        periodization: input.workout_knowledge.periodization || 0,
        modification: input.workout_knowledge.modification || 0,
        exercise_selection: input.workout_knowledge.exercise_selection || 0,
      };

      const nutritionKnowledge: NutritionKnowledge = {
        tracking_accuracy: input.nutrition_knowledge.tracking_accuracy || 0,
        portion_estimation: input.nutrition_knowledge.portion_estimation || 0,
        flexibility: input.nutrition_knowledge.flexibility || 0,
        meal_planning: input.nutrition_knowledge.meal_planning || 0,
      };

      const behaviorConsistency: BehaviorConsistency = {
        workout_90d: input.behavior_consistency.workout_90d || 0,
        nutrition_90d: input.behavior_consistency.nutrition_90d || 0,
        self_initiated: input.behavior_consistency.self_initiated || 0,
        recovery_awareness: input.behavior_consistency.recovery_awareness || 0,
      };

      // Calculate overall score
      const overallScore = this.calculateScore(
        workoutKnowledge,
        nutritionKnowledge,
        behaviorConsistency
      );

      // Determine readiness level
      const readinessLevel = this.getReadinessLevel(overallScore);

      // Get recommended action (simplified - the database function is more complex)
      const recommendedAction =
        this.getRecommendedAction(readinessLevel);

      // Calculate next assessment date (90 days from now)
      const nextAssessmentAt = new Date();
      nextAssessmentAt.setDate(nextAssessmentAt.getDate() + 90);

      const { data, error } = await this.supabase.client
        .from('autonomy_assessments')
        .insert({
          client_id: input.client_id,
          trainer_id: trainerId,
          workout_knowledge: workoutKnowledge,
          nutrition_knowledge: nutritionKnowledge,
          behavior_consistency: behaviorConsistency,
          overall_score: overallScore,
          readiness_level: readinessLevel,
          recommended_action: recommendedAction,
          notes: input.notes,
          next_assessment_at: nextAssessmentAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentAssessments = this.assessments();
      this.assessments.set([data, ...currentAssessments]);

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create assessment';
      this.error.set(errorMessage);
      console.error('Error creating assessment:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Calculate autonomy score
   * Weighted: behavior 40%, workout 35%, nutrition 25%
   */
  calculateScore(
    workout: WorkoutKnowledge,
    nutrition: NutritionKnowledge,
    behavior: BehaviorConsistency
  ): number {
    const workoutAvg =
      (workout.form +
        workout.periodization +
        workout.modification +
        workout.exercise_selection) /
      4;

    const nutritionAvg =
      (nutrition.tracking_accuracy +
        nutrition.portion_estimation +
        nutrition.flexibility +
        nutrition.meal_planning) /
      4;

    const behaviorAvg =
      (behavior.workout_90d +
        behavior.nutrition_90d +
        behavior.self_initiated +
        behavior.recovery_awareness) /
      4;

    const totalScore = Math.round(
      behaviorAvg * 0.4 + workoutAvg * 0.35 + nutritionAvg * 0.25
    );

    return Math.min(100, Math.max(0, totalScore));
  }

  /**
   * Get readiness level from score
   */
  getReadinessLevel(score: number): ReadinessLevel {
    if (score >= 80) return 'ready';
    if (score >= 65) return 'near_ready';
    if (score >= 40) return 'progressing';
    return 'learning';
  }

  /**
   * Get recommended action from readiness level
   */
  getRecommendedAction(level: ReadinessLevel): RecommendedAction {
    switch (level) {
      case 'ready':
        return 'offer_graduation';
      case 'near_ready':
        return 'reduce_frequency';
      case 'progressing':
        return 'increase_independence';
      default:
        return 'continue_current';
    }
  }

  /**
   * Graduate client to maintenance mode
   */
  async graduateClient(
    trainerId: string,
    input: CreateGraduationInput
  ): Promise<ClientGraduation | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Calculate next check-in date
      const nextCheckIn = this.calculateNextCheckIn(input.check_in_frequency);

      const { data, error } = await this.supabase.client
        .from('client_graduations')
        .insert({
          client_id: input.client_id,
          trainer_id: trainerId,
          graduation_type: input.graduation_type,
          status: 'active',
          check_in_frequency: input.check_in_frequency,
          next_check_in_at: nextCheckIn?.toISOString(),
          pricing_reduced_by: input.pricing_reduced_by,
          notes: input.notes,
          journey_stats: input.journey_stats || {},
          achievements: input.achievements || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentGraduations = this.graduations();
      this.graduations.set([data, ...currentGraduations]);

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to graduate client';
      this.error.set(errorMessage);
      console.error('Error graduating client:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get active graduation for a client
   */
  async getActiveGraduation(
    clientId: string
  ): Promise<ClientGraduation | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('client_graduations')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('graduated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error getting active graduation:', err);
      return null;
    }
  }

  /**
   * Revert graduation (return to full coaching)
   */
  async revertGraduation(
    graduationId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('client_graduations')
        .update({
          status: 'reverted',
          reverted_at: new Date().toISOString(),
          revert_reason: reason,
        })
        .eq('id', graduationId);

      if (error) throw error;

      // Update local state
      const currentGraduations = this.graduations();
      const updatedGraduations = currentGraduations.map((g) =>
        g.id === graduationId
          ? {
              ...g,
              status: 'reverted' as GraduationStatus,
              reverted_at: new Date().toISOString(),
              revert_reason: reason,
            }
          : g
      );
      this.graduations.set(updatedGraduations);

      return true;
    } catch (err) {
      console.error('Error reverting graduation:', err);
      return false;
    }
  }

  /**
   * Calculate next check-in date based on frequency
   */
  private calculateNextCheckIn(frequency: CheckInFrequency): Date | null {
    if (frequency === 'none') return null;

    const now = new Date();

    switch (frequency) {
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'biweekly':
        now.setDate(now.getDate() + 14);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        break;
    }

    return now;
  }

  /**
   * Get milestones for a client
   */
  async getClientMilestones(clientId: string): Promise<AutonomyMilestone[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('autonomy_milestones')
        .select('*')
        .eq('client_id', clientId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;

      this.milestones.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting client milestones:', err);
      return [];
    }
  }

  /**
   * Record autonomy milestone
   */
  async recordMilestone(
    trainerId: string,
    clientId: string,
    milestoneType: string,
    title: string,
    options?: {
      description?: string;
      evidence?: string;
      scoreIncrease?: number;
      celebrationMessage?: string;
    }
  ): Promise<AutonomyMilestone | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('autonomy_milestones')
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          milestone_type: milestoneType,
          title,
          description: options?.description,
          evidence: options?.evidence,
          autonomy_score_increase: options?.scoreIncrease || 0,
          celebrated: !!options?.celebrationMessage,
          celebration_message: options?.celebrationMessage,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentMilestones = this.milestones();
      this.milestones.set([data, ...currentMilestones]);

      return data;
    } catch (err) {
      console.error('Error recording milestone:', err);
      return null;
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
