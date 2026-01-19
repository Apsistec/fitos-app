import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Chronotype categories based on MEQ (Morningness-Eveningness Questionnaire)
 */
export type ChronotypeCategory =
  | 'extreme_morning'
  | 'moderate_morning'
  | 'intermediate'
  | 'moderate_evening'
  | 'extreme_evening';

export type WorkoutType = 'strength' | 'power' | 'hypertrophy' | 'endurance' | 'skill' | 'recovery';
export type TemplateType =
  | 'strength'
  | 'hypertrophy'
  | 'power'
  | 'endurance'
  | 'full_body'
  | 'upper_lower'
  | 'push_pull_legs';

/**
 * Chronotype assessment question
 */
export interface ChronotypeQuestion {
  id: string;
  text: string;
  options: Array<{
    text: string;
    value: number;
  }>;
  category: string;
}

/**
 * Chronotype assessment result
 */
export interface ChronotypeResult {
  category: ChronotypeCategory;
  score: number; // 16-86 MEQ score
  confidence: number; // 0-1
  natural_wake_time: string; // ISO time
  natural_sleep_time: string; // ISO time
  peak_performance_window: {
    start: string; // ISO time
    end: string; // ISO time
  };
  worst_performance_window: {
    start: string; // ISO time
    end: string; // ISO time
  };
  description: string;
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

/**
 * Optimal training window
 */
export interface OptimalWindow {
  start_time: string; // ISO time
  end_time: string; // ISO time
  performance_multiplier: number; // 0.8-1.15
  confidence: number; // 0-1
  reasoning: string;
  considerations: string[];
}

/**
 * Daily training schedule
 */
export interface DailySchedule {
  chronotype: ChronotypeCategory;
  strength_window: OptimalWindow;
  power_window: OptimalWindow;
  hypertrophy_window: OptimalWindow;
  endurance_window: OptimalWindow;
  best_overall_time: string; // ISO time
  acceptable_times: Array<{
    start: string;
    end: string;
  }>;
  avoid_times: Array<{
    start: string;
    end: string;
  }>;
  warm_up_adjustments: Record<string, string>;
  notes: string[];
}

/**
 * Exercise template
 */
export interface ExerciseTemplate {
  name: string;
  sets: string;
  reps: string;
  rpe: string;
  rest_seconds: number;
  tempo?: string;
  notes?: string;
}

/**
 * Workout template
 */
export interface WorkoutTemplate {
  name: string;
  chronotype: ChronotypeCategory;
  template_type: TemplateType;
  description: string;
  optimal_time_start: string; // ISO time
  optimal_time_end: string; // ISO time
  duration_minutes: number;
  warmup_minutes: number;
  cooldown_minutes: number;
  exercises: ExerciseTemplate[];
  adjustments: string[];
  considerations: string[];
}

/**
 * Stored user chronotype profile
 */
export interface UserChronotype {
  id?: string;
  user_id: string;
  category: ChronotypeCategory;
  score: number;
  confidence: number;
  assessment_responses?: Record<string, number>;
  assessed_at: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * ChronotypeService - Chronotype assessment and workout timing optimization
 *
 * Features:
 * - MEQ-based chronotype assessment (5 questions)
 * - Optimal workout timing recommendations
 * - Performance multipliers by time of day
 * - Chronotype-specific workout templates
 * - Integration with workout scheduling
 *
 * Research:
 * - Facer-Childs et al. (2018): 8.4% performance variance
 * - Horne & Östberg (1976): Original MEQ
 * - Randler (2008): Reduced MEQ validation
 *
 * Sprint 35: Chronotype Optimization
 */
@Injectable({
  providedIn: 'root',
})
export class ChronotypeService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseService);
  private readonly API_URL = environment.aiBackendUrl || 'http://localhost:8000';

  // State
  private readonly userChronotypeSignal = signal<UserChronotype | null>(null);
  private readonly assessmentQuestionsSignal = signal<ChronotypeQuestion[]>([]);
  private readonly loadingSignal = signal(false);

  // Computed
  readonly userChronotype = this.userChronotypeSignal.asReadonly();
  readonly assessmentQuestions = this.assessmentQuestionsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly hasChronotype = computed(() => this.userChronotypeSignal() !== null);

  // Friendly chronotype labels
  readonly chronotypeLabels: Record<ChronotypeCategory, string> = {
    extreme_morning: 'Extreme Morning Person (Early Bird)',
    moderate_morning: 'Morning Person',
    intermediate: 'Neutral (Flexible)',
    moderate_evening: 'Evening Person',
    extreme_evening: 'Extreme Evening Person (Night Owl)',
  };

  /**
   * Get assessment questions
   */
  async getAssessmentQuestions(): Promise<ChronotypeQuestion[]> {
    try {
      this.loadingSignal.set(true);
      const response = await firstValueFrom(
        this.http.get<{ questions: ChronotypeQuestion[] }>(
          `${this.API_URL}/api/v1/chronotype/questions`
        )
      );
      this.assessmentQuestionsSignal.set(response.questions);
      return response.questions;
    } catch (error) {
      console.error('Error fetching chronotype questions:', error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Calculate chronotype from assessment responses
   */
  async assessChronotype(responses: Record<string, number>): Promise<ChronotypeResult> {
    try {
      this.loadingSignal.set(true);
      const result = await firstValueFrom(
        this.http.post<ChronotypeResult>(`${this.API_URL}/api/v1/chronotype/assess`, {
          responses,
        })
      );
      return result;
    } catch (error) {
      console.error('Error calculating chronotype:', error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Save user chronotype to database
   */
  async saveUserChronotype(
    userId: string,
    result: ChronotypeResult,
    responses: Record<string, number>
  ): Promise<UserChronotype> {
    try {
      const userChronotype: Omit<UserChronotype, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        category: result.category,
        score: result.score,
        confidence: result.confidence,
        assessment_responses: responses,
        assessed_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase.client
        .from('user_chronotypes')
        .upsert(userChronotype, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      this.userChronotypeSignal.set(data);
      return data;
    } catch (error) {
      console.error('Error saving user chronotype:', error);
      throw error;
    }
  }

  /**
   * Load user chronotype from database
   */
  async loadUserChronotype(userId: string): Promise<UserChronotype | null> {
    try {
      this.loadingSignal.set(true);
      const { data, error } = await this.supabase.client
        .from('user_chronotypes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Ignore "not found" errors
        throw error;
      }

      this.userChronotypeSignal.set(data);
      return data;
    } catch (error) {
      console.error('Error loading user chronotype:', error);
      return null;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get optimal training window for workout type
   */
  async getOptimalWindow(
    chronotypeScore: number,
    workoutType: WorkoutType,
    constraints?: {
      earliest_time?: string;
      latest_time?: string;
      excluded_windows?: Array<[string, string]>;
    }
  ): Promise<OptimalWindow> {
    try {
      const response = await firstValueFrom(
        this.http.post<OptimalWindow>(`${this.API_URL}/api/v1/chronotype/optimal-window`, {
          chronotype_score: chronotypeScore,
          workout_type: workoutType,
          constraints,
        })
      );
      return response;
    } catch (error) {
      console.error('Error getting optimal window:', error);
      throw error;
    }
  }

  /**
   * Get complete daily training schedule
   */
  async getDailySchedule(chronotypeScore: number): Promise<DailySchedule> {
    try {
      const response = await firstValueFrom(
        this.http.post<DailySchedule>(`${this.API_URL}/api/v1/chronotype/daily-schedule`, {
          chronotype_score: chronotypeScore,
        })
      );
      return response;
    } catch (error) {
      console.error('Error getting daily schedule:', error);
      throw error;
    }
  }

  /**
   * Get chronotype-optimized workout template
   */
  async getWorkoutTemplate(
    chronotypeScore: number,
    templateType: TemplateType
  ): Promise<WorkoutTemplate> {
    try {
      const response = await firstValueFrom(
        this.http.post<WorkoutTemplate>(`${this.API_URL}/api/v1/chronotype/template`, {
          chronotype_score: chronotypeScore,
          template_type: templateType,
        })
      );
      return response;
    } catch (error) {
      console.error('Error getting workout template:', error);
      throw error;
    }
  }

  /**
   * Get friendly label for chronotype
   */
  getChronotypeLabel(category: ChronotypeCategory): string {
    return this.chronotypeLabels[category] || 'Unknown';
  }

  /**
   * Format time for display (HH:MM AM/PM)
   */
  formatTime(isoTime: string): string {
    try {
      const [hours, minutes] = isoTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return isoTime;
    }
  }

  /**
   * Get performance indicator for time of day
   * @returns 'excellent' | 'good' | 'fair' | 'poor'
   */
  getPerformanceIndicator(
    chronotype: ChronotypeCategory,
    timeOfDay: Date
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const hour = timeOfDay.getHours();

    // Simple heuristic based on chronotype
    if (chronotype === 'extreme_morning' || chronotype === 'moderate_morning') {
      if (hour >= 6 && hour <= 10) return 'excellent';
      if (hour >= 11 && hour <= 14) return 'good';
      if (hour >= 15 && hour <= 17) return 'fair';
      return 'poor';
    } else if (chronotype === 'extreme_evening' || chronotype === 'moderate_evening') {
      if (hour >= 16 && hour <= 21) return 'excellent';
      if (hour >= 12 && hour <= 15) return 'good';
      if (hour >= 10 && hour <= 11) return 'fair';
      return 'poor';
    } else {
      // Intermediate - flexible
      if (hour >= 9 && hour <= 18) return 'good';
      if ((hour >= 7 && hour <= 8) || (hour >= 19 && hour <= 20)) return 'fair';
      return 'poor';
    }
  }

  /**
   * Check if user should retake assessment
   * (Recommend every 6 months as chronotype can shift)
   */
  shouldRetakeAssessment(assessedAt: string): boolean {
    const assessed = new Date(assessedAt);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return assessed < sixMonthsAgo;
  }

  /**
   * Clear cached chronotype
   */
  clearChronotype(): void {
    this.userChronotypeSignal.set(null);
  }
}
