import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Outcome-Based Pricing Service
 *
 * Handles all API interactions for outcome-based pricing:
 * - Pricing tier management
 * - Goal creation and tracking
 * - Verification and progress updates
 * - Analytics and milestone tracking
 */
@Injectable({
  providedIn: 'root'
})
export class OutcomePricingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.aiBackendUrl}/outcome-pricing`;

  // State signals
  pricingTiers = signal<PricingTier[]>([]);
  clientGoals = signal<ClientGoal[]>([]);
  trainerAnalytics = signal<TrainerAnalytics | null>(null);

  // =============================================================================
  // PRICING TIERS
  // =============================================================================

  /**
   * Create a new pricing tier
   */
  createPricingTier(request: CreatePricingTierRequest): Observable<PricingTier> {
    return this.http.post<PricingTier>(`${this.baseUrl}/tiers`, request).pipe(
      tap(tier => {
        this.pricingTiers.update(tiers => [...tiers, tier]);
      })
    );
  }

  /**
   * List all pricing tiers for current trainer
   */
  listPricingTiers(): Observable<PricingTier[]> {
    return this.http.get<PricingTier[]>(`${this.baseUrl}/tiers`).pipe(
      tap(tiers => this.pricingTiers.set(tiers))
    );
  }

  /**
   * Get specific pricing tier details
   */
  getPricingTier(tierId: string): Observable<PricingTier> {
    return this.http.get<PricingTier>(`${this.baseUrl}/tiers/${tierId}`);
  }

  /**
   * Update a pricing tier
   */
  updatePricingTier(tierId: string, updates: Partial<PricingTier>): Observable<PricingTier> {
    return this.http.put<PricingTier>(`${this.baseUrl}/tiers/${tierId}`, updates).pipe(
      tap(updatedTier => {
        this.pricingTiers.update(tiers =>
          tiers.map(t => t.id === tierId ? updatedTier : t)
        );
      })
    );
  }

  /**
   * Deactivate a pricing tier
   */
  deactivatePricingTier(tierId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/tiers/${tierId}`).pipe(
      tap(() => {
        this.pricingTiers.update(tiers => tiers.filter(t => t.id !== tierId));
      })
    );
  }

  // =============================================================================
  // CLIENT GOALS
  // =============================================================================

  /**
   * Create a goal for a client
   */
  createClientGoal(request: CreateClientGoalRequest): Observable<ClientGoal> {
    return this.http.post<ClientGoal>(`${this.baseUrl}/goals`, request).pipe(
      tap(goal => {
        this.clientGoals.update(goals => [...goals, goal]);
      })
    );
  }

  /**
   * List goals (filtered by client_id or all for trainer)
   */
  listGoals(clientId?: string, status?: GoalStatus): Observable<ClientGoal[]> {
    let params: any = {};
    if (clientId) params.client_id = clientId;
    if (status) params.status = status;

    return this.http.get<ClientGoal[]>(`${this.baseUrl}/goals`, { params }).pipe(
      tap(goals => this.clientGoals.set(goals))
    );
  }

  /**
   * Get specific goal details
   */
  getGoalDetails(goalId: string): Observable<ClientGoal> {
    return this.http.get<ClientGoal>(`${this.baseUrl}/goals/${goalId}`);
  }

  /**
   * Get detailed progress for a goal
   */
  getGoalProgress(goalId: string): Observable<GoalProgressResponse> {
    return this.http.get<GoalProgressResponse>(`${this.baseUrl}/goals/${goalId}/progress`);
  }

  // =============================================================================
  // VERIFICATION
  // =============================================================================

  /**
   * Verify goal progress (automated or manual)
   */
  verifyGoalProgress(
    goalId: string,
    request: VerifyGoalRequest
  ): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(
      `${this.baseUrl}/goals/${goalId}/verify`,
      request
    );
  }

  /**
   * List all verifications for a goal
   */
  listVerifications(goalId: string): Observable<Verification[]> {
    return this.http.get<Verification[]>(`${this.baseUrl}/goals/${goalId}/verifications`);
  }

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  /**
   * Get trainer's outcome pricing analytics
   */
  getTrainerAnalytics(): Observable<TrainerAnalytics> {
    return this.http.get<TrainerAnalytics>(`${this.baseUrl}/analytics/trainer`).pipe(
      tap(analytics => this.trainerAnalytics.set(analytics))
    );
  }

  /**
   * Get analytics for a specific client
   */
  getClientAnalytics(clientId: string): Observable<ClientAnalytics> {
    return this.http.get<ClientAnalytics>(`${this.baseUrl}/analytics/client/${clientId}`);
  }

  /**
   * Get pending celebration milestones
   */
  getPendingCelebrations(): Observable<PendingCelebration[]> {
    return this.http.get<PendingCelebration[]>(`${this.baseUrl}/milestones/pending-celebration`);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Calculate progress percentage
   */
  calculateProgressPercent(goal: ClientGoal): number {
    if (!goal.current_value) return 0;

    let progress = 0;

    if (goal.goal_type === 'weight_loss') {
      progress = ((goal.start_value - goal.current_value) /
                  (goal.start_value - goal.target_value)) * 100;
    } else if (goal.goal_type === 'strength_gain') {
      progress = ((goal.current_value - goal.start_value) /
                  (goal.target_value - goal.start_value)) * 100;
    } else {
      progress = (goal.current_value / goal.target_value) * 100;
    }

    return Math.max(0, Math.min(100, progress));
  }

  /**
   * Get next milestone for a goal
   */
  getNextMilestone(progressPercent: number): number | null {
    const milestones = [25, 50, 75, 100];
    return milestones.find(m => progressPercent < m) || null;
  }

  /**
   * Get achieved milestones
   */
  getAchievedMilestones(progressPercent: number): number[] {
    const milestones = [25, 50, 75, 100];
    return milestones.filter(m => progressPercent >= m);
  }

  /**
   * Format verification method for display
   */
  formatVerificationMethod(method: VerificationMethod): string {
    const labels: Record<VerificationMethod, string> = {
      manual: 'Manual Entry',
      workout_data: 'Workout Data',
      nutrition_data: 'Nutrition Data',
      photo: 'Photo Verification',
      wearable: 'Wearable Data',
      ai_analyzed: 'AI Analysis'
    };
    return labels[method] || method;
  }

  /**
   * Get confidence level label and color
   */
  getConfidenceLevel(score: number): { label: string; color: string } {
    if (score >= 0.80) {
      return { label: 'High Confidence', color: 'success' };
    } else if (score >= 0.70) {
      return { label: 'Medium Confidence', color: 'warning' };
    } else {
      return { label: 'Low Confidence', color: 'danger' };
    }
  }

  // =============================================================================
  // STRIPE BILLING INTEGRATION
  // =============================================================================

  /**
   * Create Stripe invoice item for milestone bonus
   *
   * This leverages the existing Stripe Connect infrastructure from Sprints 27-29.
   * Creates an invoice item that will be added to the client's next billing cycle.
   */
  createMilestoneBonusInvoice(request: CreateBonusInvoiceRequest): Observable<BonusInvoiceResponse> {
    return this.http.post<BonusInvoiceResponse>(
      `${this.baseUrl}/milestones/${request.milestoneId}/bill`,
      request
    );
  }

  /**
   * Get billing status for a milestone
   */
  getMilestoneBillingStatus(milestoneId: string): Observable<BonusInvoiceResponse> {
    return this.http.get<BonusInvoiceResponse>(
      `${this.baseUrl}/milestones/${milestoneId}/billing-status`
    );
  }
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PricingTier {
  id: string;
  trainer_id: string;
  name: string;
  description?: string;
  base_price_cents: number;
  outcome_bonus_cents?: number;
  verification_method: VerificationMethod;
  tier_config?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePricingTierRequest {
  name: string;
  description?: string;
  base_price_cents: number;
  outcome_bonus_cents?: number;
  verification_method: 'weight_loss' | 'strength_gain' | 'body_comp' | 'consistency' | 'custom';
  tier_config?: Record<string, any>;
}

export interface ClientGoal {
  id: string;
  client_id: string;
  trainer_id: string;
  pricing_tier_id?: string;
  goal_type: GoalType;
  target_value: number;
  current_value?: number;
  start_value: number;
  unit: string;
  target_date: string;
  start_date: string;
  achieved_date?: string;
  verification_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  last_verified_at?: string;
  next_verification_due?: string;
  status: GoalStatus;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateClientGoalRequest {
  client_id: string;
  pricing_tier_id?: string;
  goal_type: GoalType;
  target_value: number;
  start_value: number;
  unit: string;
  target_date: string;
  verification_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  notes?: string;
  metadata?: Record<string, any>;
}

export interface VerifyGoalRequest {
  manual_value?: number;
  photo_urls?: string[];
}

export interface VerificationResponse {
  verification_id: string;
  goal_id: string;
  measured_value: number;
  unit: string;
  confidence_score: number;
  verification_method: VerificationMethod;
  requires_manual_review: boolean;
  anomaly_detected: boolean;
  verified_at: string;
}

export interface Verification {
  id: string;
  goal_id: string;
  client_id: string;
  trainer_id: string;
  verification_type: string;
  measured_value: number;
  unit: string;
  verification_method: VerificationMethod;
  confidence_score?: number;
  verified_at: string;
  verified_by?: string;
  notes?: string;
  photo_urls?: string[];
  source_ids?: string[];
  metadata?: Record<string, any>;
}

export interface GoalProgressResponse {
  goal: ClientGoal;
  progress_percent: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  goal_id: string;
  milestone_percent: number;
  milestone_value?: number;
  achieved_at?: string;
  verification_id?: string;
  bonus_applied: boolean;
  bonus_amount_cents?: number;
  celebration_sent: boolean;
  celebration_sent_at?: string;
  created_at: string;
}

export interface TrainerAnalytics {
  total_outcome_clients: number;
  active_goals: number;
  achieved_goals: number;
  avg_completion_rate: number;
  total_bonus_revenue_cents: number;
  pending_verifications: number;
}

export interface ClientAnalytics {
  client_id: string;
  total_goals: number;
  active_goals: number;
  achieved_goals: number;
  total_bonuses_earned_cents: number;
  goals: ClientGoal[];
  recent_adjustments: PricingAdjustment[];
}

export interface PricingAdjustment {
  id: string;
  client_id: string;
  trainer_id: string;
  goal_id?: string;
  milestone_id?: string;
  adjustment_type: 'milestone_bonus' | 'goal_achieved' | 'consistency_bonus' | 'early_achievement' | 'manual_adjustment';
  amount_cents: number;
  description?: string;
  applied_at: string;
  stripe_invoice_id?: string;
  stripe_invoice_item_id?: string;
  payment_status: 'pending' | 'invoiced' | 'paid' | 'failed' | 'refunded';
  metadata?: Record<string, any>;
}

export interface PendingCelebration {
  id: string;
  goal_id: string;
  milestone_percent: number;
  achieved_at: string;
  client_outcome_goals: {
    client_id: string;
    trainer_id: string;
  };
}

export interface CreateBonusInvoiceRequest {
  milestoneId: string;
  clientId: string;
  trainerId: string;
  amountCents: number;
  description: string;
  applyImmediately?: boolean;  // If true, invoice immediately; if false, add to next billing cycle
}

export interface BonusInvoiceResponse {
  success: boolean;
  invoiceItemId?: string;
  invoiceId?: string;
  amountCents: number;
  status: 'pending' | 'invoiced' | 'paid';
  message?: string;
}

export type GoalType = 'weight_loss' | 'strength_gain' | 'body_comp' | 'consistency' | 'custom';
export type GoalStatus = 'active' | 'achieved' | 'abandoned' | 'expired';
export type VerificationMethod = 'manual' | 'workout_data' | 'nutrition_data' | 'photo' | 'wearable' | 'ai_analyzed';
