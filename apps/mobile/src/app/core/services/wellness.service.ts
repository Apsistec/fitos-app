import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Wellness & Mental Health Service
 *
 * PHQ-2/GAD-2 validated screening, mood-boosting workout recommendations,
 * and crisis resources.
 *
 * ⚠️ LEGAL DISCLAIMER:
 * All screening tools are for INFORMATIONAL PURPOSES ONLY and do NOT constitute
 * medical advice, diagnosis, or treatment.
 *
 * Sprint 37: Mental Health Integration
 */

// =====================================================================
// TYPES
// =====================================================================

export type ScreeningType = 'phq2' | 'gad2' | 'combined';
export type ScreeningSeverity = 'minimal' | 'mild' | 'moderate' | 'severe';
export type WorkoutIntensity = 'low' | 'moderate' | 'high';
export type MoodWorkoutType =
  | 'dance'
  | 'walking'
  | 'jogging'
  | 'yoga'
  | 'strength'
  | 'group_fitness'
  | 'hiit'
  | 'cycling'
  | 'swimming';
export type UrgencyLevel = 'immediate' | 'urgent' | 'important' | 'routine';
export type ResourceType =
  | 'crisis_hotline'
  | 'crisis_text'
  | 'emergency'
  | 'therapist_finder'
  | 'support_group'
  | 'telehealth'
  | 'specialized';

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: ScreeningType;
  options: Array<{
    text: string;
    value: number;
  }>;
}

export interface ScreeningResult {
  screening_type: ScreeningType;
  score: number;
  severity: ScreeningSeverity;
  description: string;
  needs_followup: boolean;
  needs_professional_referral: boolean;
  crisis_concern: boolean;
  recommendations: string[];
  exercise_interventions: string[];
  professional_resources: string[];
  crisis_resources?: CrisisResource[];
  screened_at: string;
  notes: string[];
}

export interface WorkoutRecommendation {
  workout_type: MoodWorkoutType;
  intensity: WorkoutIntensity;
  duration_minutes: number;
  frequency_per_week: number;
  title: string;
  description: string;
  effect_size: string;
  research_notes: string;
  how_to_start: string[];
  progression: string[];
  barriers_solutions: Record<string, string>;
  mechanisms: string[];
  contraindications: string[];
  modifications: string[];
}

export interface WorkoutPlan {
  primary_recommendation: WorkoutRecommendation;
  alternative_options: WorkoutRecommendation[];
  adherence_tips: string[];
  social_strategies: string[];
  notes: string[];
}

export interface CrisisResource {
  name: string;
  type: ResourceType;
  urgency: UrgencyLevel;
  phone?: string;
  text?: string;
  website?: string;
  description: string;
  availability: string;
  cost: string;
  populations: string[];
  languages: string[];
  notes: string[];
}

export interface CrisisResourceRecommendations {
  urgency_level: UrgencyLevel;
  immediate_resources: CrisisResource[];
  professional_resources: CrisisResource[];
  support_resources: CrisisResource[];
  population_specific?: CrisisResource[];
  notes: string[];
}

// =====================================================================
// SERVICE
// =====================================================================

@Injectable({
  providedIn: 'root',
})
export class WellnessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.aiBackendUrl}/wellness`;

  // State
  private readonly _currentScreening = signal<ScreeningResult | null>(null);
  private readonly _currentWorkoutPlan = signal<WorkoutPlan | null>(null);
  private readonly _screeningHistory = signal<ScreeningResult[]>([]);

  // Computed
  readonly currentScreening = this._currentScreening.asReadonly();
  readonly currentWorkoutPlan = this._currentWorkoutPlan.asReadonly();
  readonly screeningHistory = this._screeningHistory.asReadonly();

  readonly needsFollowup = computed(() => {
    const screening = this._currentScreening();
    return screening?.needs_followup ?? false;
  });

  readonly needsProfessionalReferral = computed(() => {
    const screening = this._currentScreening();
    return screening?.needs_professional_referral ?? false;
  });

  readonly crisisConcern = computed(() => {
    const screening = this._currentScreening();
    return screening?.crisis_concern ?? false;
  });

  // =====================================================================
  // SCREENING
  // =====================================================================

  /**
   * Get screening questions for PHQ-2, GAD-2, or combined assessment
   */
  async getScreeningQuestions(
    screeningType: ScreeningType = 'combined'
  ): Promise<{
    screening_type: ScreeningType;
    questions: ScreeningQuestion[];
    disclaimer: string;
  }> {
    return firstValueFrom(
      this.http.post<{
        screening_type: ScreeningType;
        questions: ScreeningQuestion[];
        disclaimer: string;
      }>(`${this.baseUrl}/screening/questions`, {
        screening_type: screeningType,
      })
    );
  }

  /**
   * Calculate screening score and get recommendations
   */
  async assessScreening(
    screeningType: ScreeningType,
    responses: Record<string, number>
  ): Promise<ScreeningResult> {
    const result = await firstValueFrom(
      this.http.post<ScreeningResult>(`${this.baseUrl}/screening/assess`, {
        screening_type: screeningType,
        responses,
      })
    );

    // Update state
    this._currentScreening.set(result);

    // Add to history
    const history = this._screeningHistory();
    this._screeningHistory.set([result, ...history]);

    return result;
  }

  /**
   * Clear current screening
   */
  clearCurrentScreening(): void {
    this._currentScreening.set(null);
  }

  // =====================================================================
  // WORKOUT RECOMMENDATIONS
  // =====================================================================

  /**
   * Get mood-boosting workout recommendations based on screening
   */
  async getWorkoutRecommendations(
    screeningSeverity: ScreeningSeverity,
    screeningType: ScreeningType,
    currentActivityLevel: 'sedentary' | 'light' | 'moderate' | 'active' = 'sedentary',
    preferences?: string[]
  ): Promise<WorkoutPlan> {
    const plan = await firstValueFrom(
      this.http.post<WorkoutPlan>(`${this.baseUrl}/workouts/recommend`, {
        screening_severity: screeningSeverity,
        screening_type: screeningType,
        current_activity_level: currentActivityLevel,
        preferences,
      })
    );

    // Update state
    this._currentWorkoutPlan.set(plan);

    return plan;
  }

  /**
   * Clear current workout plan
   */
  clearCurrentWorkoutPlan(): void {
    this._currentWorkoutPlan.set(null);
  }

  // =====================================================================
  // CRISIS RESOURCES
  // =====================================================================

  /**
   * Get crisis resources based on urgency level
   */
  async getCrisisResources(
    urgencyLevel: UrgencyLevel,
    population?: string
  ): Promise<CrisisResourceRecommendations> {
    return firstValueFrom(
      this.http.post<CrisisResourceRecommendations>(
        `${this.baseUrl}/resources/crisis`,
        {
          urgency_level: urgencyLevel,
          population,
        }
      )
    );
  }

  /**
   * Get all crisis hotlines and emergency resources
   */
  async getAllCrisisResources(): Promise<{
    resources: CrisisResource[];
    count: number;
  }> {
    return firstValueFrom(
      this.http.get<{ resources: CrisisResource[]; count: number }>(
        `${this.baseUrl}/resources/all-crisis`
      )
    );
  }

  /**
   * Get all professional mental health resources
   */
  async getProfessionalResources(): Promise<{
    resources: CrisisResource[];
    count: number;
  }> {
    return firstValueFrom(
      this.http.get<{ resources: CrisisResource[]; count: number }>(
        `${this.baseUrl}/resources/professional`
      )
    );
  }

  /**
   * Get all support group resources
   */
  async getSupportGroupResources(): Promise<{
    resources: CrisisResource[];
    count: number;
  }> {
    return firstValueFrom(
      this.http.get<{ resources: CrisisResource[]; count: number }>(
        `${this.baseUrl}/resources/support-groups`
      )
    );
  }

  // =====================================================================
  // HELPER METHODS
  // =====================================================================

  /**
   * Format severity for display
   */
  formatSeverity(severity: ScreeningSeverity): string {
    const map: Record<ScreeningSeverity, string> = {
      minimal: 'Minimal',
      mild: 'Mild',
      moderate: 'Moderate',
      severe: 'Severe',
    };
    return map[severity];
  }

  /**
   * Get severity color
   */
  getSeverityColor(severity: ScreeningSeverity): string {
    const map: Record<ScreeningSeverity, string> = {
      minimal: 'success',
      mild: 'warning',
      moderate: 'warning',
      severe: 'danger',
    };
    return map[severity];
  }

  /**
   * Get urgency color
   */
  getUrgencyColor(urgency: UrgencyLevel): string {
    const map: Record<UrgencyLevel, string> = {
      immediate: 'danger',
      urgent: 'warning',
      important: 'primary',
      routine: 'medium',
    };
    return map[urgency];
  }

  /**
   * Format workout type for display
   */
  formatWorkoutType(type: MoodWorkoutType): string {
    const map: Record<MoodWorkoutType, string> = {
      dance: 'Dance',
      walking: 'Walking',
      jogging: 'Jogging',
      yoga: 'Yoga',
      strength: 'Strength Training',
      group_fitness: 'Group Fitness',
      hiit: 'HIIT',
      cycling: 'Cycling',
      swimming: 'Swimming',
    };
    return map[type];
  }

  /**
   * Format intensity for display
   */
  formatIntensity(intensity: WorkoutIntensity): string {
    const map: Record<WorkoutIntensity, string> = {
      low: 'Low',
      moderate: 'Moderate',
      high: 'High',
    };
    return map[intensity];
  }

  /**
   * Get workout icon
   */
  getWorkoutIcon(type: MoodWorkoutType): string {
    const map: Record<MoodWorkoutType, string> = {
      dance: 'musical-notes',
      walking: 'walk',
      jogging: 'fitness',
      yoga: 'body',
      strength: 'barbell',
      group_fitness: 'people',
      hiit: 'flash',
      cycling: 'bicycle',
      swimming: 'water',
    };
    return map[type];
  }

  /**
   * Call emergency number
   */
  callEmergency(phone: string): void {
    window.open(`tel:${phone}`, '_system');
  }

  /**
   * Send text message
   */
  sendText(number: string, message?: string): void {
    const url = message ? `sms:${number}?body=${encodeURIComponent(message)}` : `sms:${number}`;
    window.open(url, '_system');
  }

  /**
   * Open website
   */
  openWebsite(url: string): void {
    window.open(url, '_system');
  }

  /**
   * Log crisis resource access (for safety monitoring)
   */
  async logCrisisResourceAccess(
    resourceType: ResourceType,
    resourceName: string,
    urgencyLevel: UrgencyLevel,
    screeningId?: string
  ): Promise<void> {
    // This would typically call a backend endpoint to log the access
    // For now, just console log
    console.log('Crisis resource accessed:', {
      resourceType,
      resourceName,
      urgencyLevel,
      screeningId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if user needs immediate help
   */
  needsImmediateHelp(result: ScreeningResult): boolean {
    return result.crisis_concern || result.severity === 'severe';
  }

  /**
   * Get recommended urgency level from screening result
   */
  getRecommendedUrgencyLevel(result: ScreeningResult): UrgencyLevel {
    if (result.crisis_concern || result.severity === 'severe') {
      return 'immediate';
    } else if (result.severity === 'moderate') {
      return 'urgent';
    } else if (result.severity === 'mild') {
      return 'important';
    } else {
      return 'routine';
    }
  }
}
