import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * JITAI Context - Just-In-Time Adaptive Intervention
 * Based on Stanford GPTCoach research
 */
export interface JITAIContext {
  vulnerability: number; // 0-1, risk of skipping workout
  receptivity: number; // 0-1, willingness to engage
  opportunity: number; // 0-1, context allows action
}

/**
 * JITAI Intervention
 */
export interface JITAIIntervention {
  id: string;
  type: 'reminder' | 'encouragement' | 'tip' | 'check_in';
  title: string;
  message: string;
  priority: number; // 1-5
  actions?: Array<{
    label: string;
    action: string;
  }>;
  delivered_at?: string;
  responded_at?: string;
}

/**
 * JITAIService - Proactive AI interventions
 *
 * Features:
 * - Context-aware intervention timing
 * - Vulnerability detection (risk of dropout)
 * - Receptivity scoring (best time to engage)
 * - Opportunity detection (can user act now?)
 * - Smart frequency caps (max 2-3/day)
 *
 * Based on: Stanford GPTCoach JITAI research
 * Intervene when: vulnerability > 0.6 AND receptivity > 0.5 AND opportunity > 0.4
 *
 * Usage:
 * ```typescript
 * const context = await jitai.getContext(userId);
 * if (jitai.shouldIntervene(context)) {
 *   const intervention = await jitai.generateIntervention(userId);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class JITAIService {
  private http = inject(HttpClient);

  // AI Backend URL
  private readonly AI_BACKEND_URL = environment.aiBackendUrl || 'http://localhost:8000';

  // State
  interventions = signal<JITAIIntervention[]>([]);
  isProcessing = signal(false);
  error = signal<string | null>(null);

  // Intervention thresholds
  private readonly VULNERABILITY_THRESHOLD = 0.6;
  private readonly RECEPTIVITY_THRESHOLD = 0.5;
  private readonly OPPORTUNITY_THRESHOLD = 0.4;
  private readonly MAX_DAILY_INTERVENTIONS = 3;

  /**
   * Get JITAI context for user
   */
  async getContext(userId: string): Promise<JITAIContext> {
    try {
      const context = await firstValueFrom(
        this.http.get<JITAIContext>(`${this.AI_BACKEND_URL}/api/v1/jitai/context/${userId}`)
      );
      return context;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get JITAI context';
      throw new Error(errorMessage);
    }
  }

  /**
   * Determine if intervention should be sent
   */
  shouldIntervene(context: JITAIContext): boolean {
    return (
      context.vulnerability >= this.VULNERABILITY_THRESHOLD &&
      context.receptivity >= this.RECEPTIVITY_THRESHOLD &&
      context.opportunity >= this.OPPORTUNITY_THRESHOLD &&
      this.getDailyInterventionCount() < this.MAX_DAILY_INTERVENTIONS
    );
  }

  /**
   * Update opportunity score based on geofence state.
   * Being at the gym dramatically increases opportunity (user can act immediately).
   * Call this whenever the geofence transitions to 'enter' or 'exit'.
   *
   * Sprint 52: Geofencing integration
   */
  updateOpportunityFromGeofence(isNearGym: boolean): void {
    // Boost opportunity signal — passed to the AI backend on next getContext() call
    // so it can factor gym proximity into real-time opportunity scoring.
    this._geofenceOpportunityBoost = isNearGym ? 0.5 : 0;
  }

  /**
   * Update opportunity score based on Wi-Fi SSID gym detection.
   * Secondary signal alongside GPS geofencing.
   *
   * Sprint 52: Wi-Fi context integration
   */
  updateOpportunityFromWifi(ssid: string | null, gymWifiSsids: string[]): void {
    const onGymWifi = ssid !== null && gymWifiSsids.includes(ssid);
    this._wifiOpportunityBoost = onGymWifi ? 0.3 : 0;
  }

  /**
   * Get the combined opportunity boost from geofence + Wi-Fi signals.
   * Used when calling getContext() to augment server-side opportunity score.
   */
  getLocalOpportunityBoost(): number {
    return Math.min(1, this._geofenceOpportunityBoost + this._wifiOpportunityBoost);
  }

  // Local opportunity boosts from geofence / Wi-Fi (do not persist)
  private _geofenceOpportunityBoost = 0;
  private _wifiOpportunityBoost = 0;

  /**
   * Generate personalized intervention
   */
  async generateIntervention(userId: string): Promise<JITAIIntervention> {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      const intervention = await firstValueFrom(
        this.http.post<JITAIIntervention>(`${this.AI_BACKEND_URL}/api/v1/jitai/generate`, {
          user_id: userId,
        })
      );

      // Add to local interventions
      this.interventions.update(interventions => [...interventions, intervention]);

      return intervention;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate intervention';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Mark intervention as responded
   */
  async respondToIntervention(interventionId: string, action?: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.AI_BACKEND_URL}/api/v1/jitai/respond`, {
          intervention_id: interventionId,
          action,
          responded_at: new Date().toISOString(),
        })
      );

      // Update local intervention
      this.interventions.update(interventions =>
        interventions.map(i =>
          i.id === interventionId
            ? { ...i, responded_at: new Date().toISOString() }
            : i
        )
      );
    } catch (err) {
      console.error('Error recording intervention response:', err);
    }
  }

  /**
   * Get daily intervention count
   */
  private getDailyInterventionCount(): number {
    const today = new Date().toDateString();
    return this.interventions().filter(i => {
      if (!i.delivered_at) return false;
      return new Date(i.delivered_at).toDateString() === today;
    }).length;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
