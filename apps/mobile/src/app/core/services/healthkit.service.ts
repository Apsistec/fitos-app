import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import type { HealthPlugin } from '@capgo/capacitor-health';

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
  source: string;
}

/**
 * HealthKit metrics — only safe-to-display fields per FitOS rules.
 * NEVER expose calorie burn (wearable estimates are highly inaccurate).
 */
export interface HealthKitMetrics {
  resting_heart_rate?: number;
  hrv?: number;           // ms — heart rate variability
  sleep_hours?: number;   // total hours
  sleep_deep_mins?: number;
  sleep_rem_mins?: number;
  sleep_light_mins?: number;
  sleep_awake_mins?: number;
  steps?: number;
  date: string;
}

/**
 * Body composition from smart scale passthrough
 * (written to Health app by connected smart scale app — kilogram unit)
 */
export interface BodyCompositionData {
  body_fat_pct?: number;
  lean_body_mass_kg?: number;
  date: string;
}

/**
 * HealthKitService — Sprint 49
 * iOS HealthKit / Android Health Connect integration via @capgo/capacitor-health.
 *
 * Plugin API uses Health.readSamples({ dataType, startDate, endDate }) for all queries.
 *
 * Key rules:
 * - NEVER display calorie burn from wearables (inaccurate)
 * - Only expose: RHR, HRV, sleep, steps, body composition (weight)
 * - Same public signal interface as stub version; swap-in ready
 *
 * Plugin: @capgo/capacitor-health@8.x
 */
@Injectable({
  providedIn: 'root',
})
export class HealthKitService {
  // ─── State signals ───────────────────────────────────────────
  isAuthorized = signal(false);
  metrics = signal<HealthKitMetrics | null>(null);
  bodyComposition = signal<BodyCompositionData | null>(null);
  error = signal<string | null>(null);

  // Lazy-loaded plugin reference
  private _plugin: HealthPlugin | null | undefined = undefined;

  /** Load plugin once; returns null on web or unsupported platform */
  private async getPlugin(): Promise<HealthPlugin | null> {
    if (this._plugin !== undefined) return this._plugin;
    if (!Capacitor.isNativePlatform()) {
      this._plugin = null;
      return null;
    }
    try {
      const mod = await (import('@capgo/capacitor-health' as string) as Promise<{ Health: HealthPlugin }>);
      this._plugin = mod.Health;
    } catch {
      this._plugin = null;
    }
    return this._plugin;
  }

  // ─── Authorization ───────────────────────────────────────────

  /**
   * Request HealthKit (iOS) or Health Connect (Android) authorization.
   */
  async requestAuthorization(): Promise<boolean> {
    const plugin = await this.getPlugin();
    if (!plugin) {
      console.warn('[HealthKit] Plugin not available — web/simulator fallback');
      return false;
    }

    try {
      await plugin.requestAuthorization({
        read: [
          'heartRateVariability',
          'restingHeartRate',
          'sleep',
          'steps',
          'weight',           // lean mass / body fat written as weight samples by scale apps
        ],
        write: [],
      });

      const authorized = await this.checkAuthorization();
      this.isAuthorized.set(authorized);
      return authorized;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Authorization failed');
      return false;
    }
  }

  /**
   * Check whether health data is available and accessible.
   */
  async checkAuthorization(): Promise<boolean> {
    const plugin = await this.getPlugin();
    if (!plugin) return false;

    try {
      const result = await plugin.isAvailable();
      const available = result.available ?? false;
      this.isAuthorized.set(available);
      return available;
    } catch {
      return false;
    }
  }

  // ─── Metrics ─────────────────────────────────────────────────

  /**
   * Get health metrics for a date range.
   */
  async getMetrics(startDate: Date, endDate: Date): Promise<HealthKitMetrics> {
    const plugin = await this.getPlugin();
    const dateStr = startDate.toISOString().split('T')[0];

    if (!plugin) {
      // Return mock data for development / web
      const mock: HealthKitMetrics = {
        resting_heart_rate: 58,
        hrv: 65,
        sleep_hours: 7.5,
        steps: 8234,
        date: dateStr,
      };
      this.metrics.set(mock);
      return mock;
    }

    try {
      const start = startDate.toISOString();
      const end = endDate.toISOString();

      // Read all data types in parallel — each uses readSamples()
      const [hrvResult, rhrResult, sleepResult, stepsResult] = await Promise.allSettled([
        plugin.readSamples({ dataType: 'heartRateVariability', startDate: start, endDate: end }),
        plugin.readSamples({ dataType: 'restingHeartRate', startDate: start, endDate: end }),
        plugin.readSamples({ dataType: 'sleep', startDate: start, endDate: end }),
        plugin.readSamples({ dataType: 'steps', startDate: start, endDate: end }),
      ]);

      const metrics: HealthKitMetrics = { date: dateStr };

      // HRV — use the most recent sample
      if (hrvResult.status === 'fulfilled' && hrvResult.value.samples.length > 0) {
        const last = hrvResult.value.samples[hrvResult.value.samples.length - 1];
        metrics.hrv = last.value;
      }

      // Resting heart rate — most recent sample
      if (rhrResult.status === 'fulfilled' && rhrResult.value.samples.length > 0) {
        const last = rhrResult.value.samples[rhrResult.value.samples.length - 1];
        metrics.resting_heart_rate = Math.round(last.value);
      }

      // Sleep — aggregate into totals by sleepState
      if (sleepResult.status === 'fulfilled' && sleepResult.value.samples.length > 0) {
        let totalMins = 0, deepMins = 0, remMins = 0, lightMins = 0, awakeMins = 0;
        for (const s of sleepResult.value.samples) {
          const mins = this.durationMins(s.startDate, s.endDate);
          totalMins += mins;
          const state = (s.sleepState ?? '').toLowerCase();
          if (state === 'deep') deepMins += mins;
          else if (state === 'rem') remMins += mins;
          else if (state === 'awake') awakeMins += mins;
          else if (state === 'asleep' || state === 'light') lightMins += mins;
        }
        if (totalMins > 0) {
          metrics.sleep_hours = Math.round((totalMins / 60) * 10) / 10;
          if (deepMins > 0) metrics.sleep_deep_mins = deepMins;
          if (remMins > 0) metrics.sleep_rem_mins = remMins;
          if (lightMins > 0) metrics.sleep_light_mins = lightMins;
          if (awakeMins > 0) metrics.sleep_awake_mins = awakeMins;
        }
      }

      // Steps — sum all samples in the period
      if (stepsResult.status === 'fulfilled' && stepsResult.value.samples.length > 0) {
        metrics.steps = stepsResult.value.samples.reduce((acc, s) => acc + s.value, 0);
      }

      this.metrics.set(metrics);
      return metrics;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Read body composition data from HealthKit (smart scale passthrough).
   * Weight samples written by scale apps can include body fat % as metadata.
   * We read weight samples and surface lean mass / body fat where available.
   */
  async readBodyComposition(startDate: Date, endDate: Date): Promise<BodyCompositionData> {
    const plugin = await this.getPlugin();
    const dateStr = startDate.toISOString().split('T')[0];

    if (!plugin) {
      return { date: dateStr };
    }

    try {
      const result = await plugin.readSamples({
        dataType: 'weight',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const data: BodyCompositionData = { date: dateStr };

      // Weight samples give us the raw kg value.
      // The plugin's HealthSample type does not include metadata —
      // body fat % is not accessible via this plugin's API surface.
      // Body composition is returned as-is for future enhancement when
      // a plugin that exposes HK metadata fields becomes available.
      void result; // data remains empty {date} — stub for now

      this.bodyComposition.set(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch body composition';
      this.error.set(errorMessage);
      return { date: dateStr };
    }
  }

  // ─── Workouts ────────────────────────────────────────────────

  /**
   * Get recent workouts from Health app.
   * NOTE: workout.calories_burned is available internally but NEVER displayed in FitOS UI.
   */
  async getWorkouts(_limit = 10): Promise<HealthKitWorkout[]> {
    const plugin = await this.getPlugin();
    if (!plugin) return [];

    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);

      // The plugin doesn't expose workouts via readSamples — it has queryWorkouts
      // But @capgo/capacitor-health doesn't export queryWorkouts as a public method
      // in the HealthPlugin interface used by readSamples.
      // For now, return empty — FitOS writes workouts (saveWorkout) rather than reads them.
      void start; void end; void plugin;
      return [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workouts';
      this.error.set(errorMessage);
      return [];
    }
  }

  /**
   * Write a FitOS workout session to Health app.
   */
  async saveWorkout(workout: {
    type: string;
    start_date: Date;
    end_date: Date;
    calories_burned?: number;
  }): Promise<void> {
    const plugin = await this.getPlugin();
    if (!plugin) {
      console.warn('[HealthKit] saveWorkout — plugin not available');
      return;
    }

    try {
      if (workout.calories_burned !== undefined) {
        await plugin.saveSample({
          dataType: 'calories',
          value: workout.calories_burned,
          startDate: workout.start_date.toISOString(),
          endDate: workout.end_date.toISOString(),
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workout';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Enable iOS background delivery — no-op for @capgo/capacitor-health
   * (background delivery is configured via the BackgroundRunner plugin instead).
   */
  async enableBackgroundDelivery(_dataType: string): Promise<void> {
    // Background sync is handled by @capacitor/background-runner (health-sync.runner.ts)
  }

  // ─── Convenience ─────────────────────────────────────────────

  /** Get today's metrics for JITAI and widget updates */
  async getTodayMetrics(): Promise<HealthKitMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getMetrics(today, tomorrow);
  }

  /** Clear error state */
  clearError(): void {
    this.error.set(null);
  }

  // ─── Private helpers ─────────────────────────────────────────

  private durationMins(startStr: string, endStr: string): number {
    const diff = new Date(endStr).getTime() - new Date(startStr).getTime();
    return Math.max(0, Math.round(diff / 60000));
  }
}
