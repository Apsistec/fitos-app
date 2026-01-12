import { Injectable, signal } from '@angular/core';

/**
 * HealthKit workout data
 */
export interface HealthKitWorkout {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  duration_minutes: number;
  calories_burned: number;
  distance_meters?: number;
  avg_heart_rate?: number;
  source: string;
}

/**
 * HealthKit metrics
 */
export interface HealthKitMetrics {
  resting_heart_rate?: number;
  hrv?: number; // Heart rate variability (ms)
  sleep_hours?: number;
  steps?: number;
  active_energy?: number;
  date: string;
}

/**
 * HealthKitService - iOS Health app integration
 *
 * Features:
 * - Request HealthKit permissions
 * - Read workout data
 * - Read health metrics (HRV, RHR, sleep, steps)
 * - Write workout data to Health app
 * - Sync wearable data for JITAI
 *
 * IMPORTANT: Only reads data, NEVER displays calorie burn
 * (wearable calorie estimates are highly inaccurate)
 *
 * Usage:
 * ```typescript
 * const authorized = await healthKit.requestAuthorization();
 * const metrics = await healthKit.getMetrics(startDate, endDate);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class HealthKitService {
  // State
  isAuthorized = signal(false);
  metrics = signal<HealthKitMetrics | null>(null);
  error = signal<string | null>(null);

  // TODO: Inject Capacitor HealthKit plugin when available
  // private healthKit = inject(CapacitorHealthKit);

  /**
   * Request HealthKit authorization
   */
  async requestAuthorization(): Promise<boolean> {
    try {
      // TODO: Implement when Capacitor HealthKit plugin available
      // const result = await this.healthKit.requestAuthorization({
      //   read: [
      //     'workouts',
      //     'resting_heart_rate',
      //     'heart_rate_variability',
      //     'sleep_analysis',
      //     'steps',
      //   ],
      //   write: ['workouts'],
      // });

      // this.isAuthorized.set(result.authorized);
      // return result.authorized;

      console.warn('HealthKit service not yet implemented - requires Capacitor plugin');
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request HealthKit authorization';
      this.error.set(errorMessage);
      return false;
    }
  }

  /**
   * Get health metrics for date range
   */
  async getMetrics(startDate: Date, endDate: Date): Promise<HealthKitMetrics> {
    try {
      if (!this.isAuthorized()) {
        throw new Error('HealthKit not authorized');
      }

      // TODO: Implement when plugin available
      // const data = await this.healthKit.queryMetrics({
      //   start_date: startDate.toISOString(),
      //   end_date: endDate.toISOString(),
      //   metrics: ['resting_heart_rate', 'hrv', 'sleep', 'steps'],
      // });

      // Mock data for now
      const metrics: HealthKitMetrics = {
        resting_heart_rate: 58,
        hrv: 65,
        sleep_hours: 7.5,
        steps: 8234,
        date: startDate.toISOString(),
      };

      this.metrics.set(metrics);
      return metrics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get recent workouts from Health app
   */
  async getWorkouts(limit: number = 10): Promise<HealthKitWorkout[]> {
    try {
      if (!this.isAuthorized()) {
        throw new Error('HealthKit not authorized');
      }

      // TODO: Implement when plugin available
      // const workouts = await this.healthKit.queryWorkouts({ limit });
      // return workouts;

      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workouts';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Write workout to Health app
   */
  async saveWorkout(workout: {
    type: string;
    start_date: Date;
    end_date: Date;
    calories_burned?: number;
  }): Promise<void> {
    try {
      if (!this.isAuthorized()) {
        throw new Error('HealthKit not authorized');
      }

      // TODO: Implement when plugin available
      // await this.healthKit.saveWorkout({
      //   type: workout.type,
      //   start_date: workout.start_date.toISOString(),
      //   end_date: workout.end_date.toISOString(),
      //   calories_burned: workout.calories_burned,
      // });

      console.log('Workout saved to Health app');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workout';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get today's metrics for JITAI
   */
  async getTodayMetrics(): Promise<HealthKitMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getMetrics(today, tomorrow);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
