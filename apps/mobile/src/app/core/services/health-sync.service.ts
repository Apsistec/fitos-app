import { Injectable, signal, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { HealthKitService } from './healthkit.service';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * Sync result returned by syncAll() and syncBackground()
 */
export interface HealthSyncResult {
  success: boolean;
  recordsSynced: number;
  dataTypesSynced: string[];
  errorMessage?: string;
  durationMs?: number;
}

/**
 * HealthSyncService — Sprint 49
 *
 * Orchestrates direct health data sync between platform health APIs
 * (iOS HealthKit / Android Health Connect) and Supabase.
 *
 * Architecture:
 *   HealthKitService (platform plugin) → HealthSyncService (orchestrator) → Supabase
 *
 * Key decisions:
 * - Platform detection: iOS → HealthKit, Android → Health Connect (same plugin)
 * - Terra remains the preferred path for Garmin / Whoop / Oura users
 * - NEVER sync or display calorie burn from wearables
 * - Background sync via @capacitor/background-runner (configured separately)
 *
 * Data written to: wearable_daily_data table (upsert via upsert_wearable_day RPC)
 * Audit trail: health_sync_log table
 */
@Injectable({
  providedIn: 'root',
})
export class HealthSyncService {
  // ─── State ───────────────────────────────────────────────────
  isSyncing = signal(false);
  lastSyncAt = signal<string | null>(null);
  lastSyncResult = signal<HealthSyncResult | null>(null);
  isAuthorized = signal(false);

  private healthKit = inject(HealthKitService);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ─── Initialization ──────────────────────────────────────────

  /**
   * Initialize the sync service on app startup.
   * Checks existing authorization and enables background delivery.
   */
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const authorized = await this.healthKit.checkAuthorization();
    this.isAuthorized.set(authorized);

    if (authorized) {
      // Enable background delivery for key data types (iOS only)
      await this.enableBackgroundDelivery();
    }
  }

  // ─── Authorization ───────────────────────────────────────────

  /**
   * Request health data authorization from the user.
   * Should be called from the wearables settings page.
   */
  async requestAuthorization(): Promise<boolean> {
    const authorized = await this.healthKit.requestAuthorization();
    this.isAuthorized.set(authorized);

    if (authorized) {
      await this.enableBackgroundDelivery();
      // Run first sync immediately
      await this.syncAll();
    }

    return authorized;
  }

  // ─── Sync Operations ─────────────────────────────────────────

  /**
   * Full foreground sync — reads last 7 days of health data.
   * Called when user opens the wearables page or manually triggers sync.
   */
  async syncAll(): Promise<HealthSyncResult> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      return { success: false, recordsSynced: 0, dataTypesSynced: [], errorMessage: 'Not authenticated' };
    }

    if (!this.isAuthorized()) {
      return { success: false, recordsSynced: 0, dataTypesSynced: [], errorMessage: 'Health access not authorized' };
    }

    this.isSyncing.set(true);
    const startTime = Date.now();
    const syncedTypes: string[] = [];
    let recordsSynced = 0;

    try {
      const source = this.getDataSource();

      // Sync the past 7 days (allows backfill for missed days)
      for (let daysBack = 0; daysBack < 7; daysBack++) {
        const date = new Date();
        date.setDate(date.getDate() - daysBack);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const [metrics, bodyComp] = await Promise.all([
          this.healthKit.getMetrics(date, nextDay),
          this.healthKit.readBodyComposition(date, nextDay),
        ]);

        const dateStr = date.toISOString().split('T')[0];

        // Upsert via Postgres function (handles conflict on user_id + date)
        const { error } = await this.supabase.client.rpc('upsert_wearable_day', {
          p_user_id:     userId,
          p_date:        dateStr,
          p_source:      source,
          p_hrv_rmssd:   metrics.hrv ?? null,
          p_hrv_sdnn:    null, // not exposed by @capgo/capacitor-health plugin API
          p_resting_hr:  metrics.resting_heart_rate ?? null,
          p_steps:       metrics.steps ?? null,
          p_sleep_hours: metrics.sleep_hours ?? null,
          p_sleep_deep:  metrics.sleep_deep_mins ?? null,
          p_sleep_rem:   metrics.sleep_rem_mins ?? null,
          p_sleep_light: metrics.sleep_light_mins ?? null,
          p_sleep_awake: metrics.sleep_awake_mins ?? null,
          p_body_fat:    bodyComp.body_fat_pct ?? null,
          p_lean_mass:   bodyComp.lean_body_mass_kg ?? null,
          p_bone_mass:   null, // not exposed by @capgo/capacitor-health plugin API
        });

        if (!error) {
          recordsSynced++;

          // Track which data types had real data
          if (metrics.hrv !== undefined && !syncedTypes.includes('hrv')) syncedTypes.push('hrv');
          if (metrics.resting_heart_rate !== undefined && !syncedTypes.includes('resting_heart_rate')) syncedTypes.push('resting_heart_rate');
          if (metrics.steps !== undefined && !syncedTypes.includes('steps')) syncedTypes.push('steps');
          if (metrics.sleep_hours !== undefined && !syncedTypes.includes('sleep')) syncedTypes.push('sleep');
          if (bodyComp.body_fat_pct !== undefined && !syncedTypes.includes('body_composition')) syncedTypes.push('body_composition');
        }
      }

      const durationMs = Date.now() - startTime;
      const result: HealthSyncResult = { success: true, recordsSynced, dataTypesSynced: syncedTypes, durationMs };

      await this.logSync(userId, 'foreground', source, result);
      this.lastSyncAt.set(new Date().toISOString());
      this.lastSyncResult.set(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      const result: HealthSyncResult = {
        success: false,
        recordsSynced,
        dataTypesSynced: syncedTypes,
        errorMessage,
        durationMs: Date.now() - startTime,
      };
      this.lastSyncResult.set(result);
      await this.logSync(userId, 'foreground', this.getDataSource(), result);
      return result;
    } finally {
      this.isSyncing.set(false);
    }
  }

  /**
   * Minimal background sync — reads only today's data.
   * Called by @capacitor/background-runner every 4-6 hours.
   * Keeps execution time short to avoid OS termination.
   */
  async syncBackground(): Promise<HealthSyncResult> {
    const userId = this.auth.user()?.id;
    if (!userId || !this.isAuthorized()) {
      return { success: false, recordsSynced: 0, dataTypesSynced: [] };
    }

    const startTime = Date.now();
    const source = this.getDataSource();

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const metrics = await this.healthKit.getMetrics(today, tomorrow);
      const dateStr = today.toISOString().split('T')[0];

      const { error } = await this.supabase.client.rpc('upsert_wearable_day', {
        p_user_id:     userId,
        p_date:        dateStr,
        p_source:      source,
        p_hrv_rmssd:   metrics.hrv ?? null,
        p_hrv_sdnn:    null, // not exposed by @capgo/capacitor-health plugin API
        p_resting_hr:  metrics.resting_heart_rate ?? null,
        p_steps:       metrics.steps ?? null,
        p_sleep_hours: metrics.sleep_hours ?? null,
        p_sleep_deep:  metrics.sleep_deep_mins ?? null,
        p_sleep_rem:   metrics.sleep_rem_mins ?? null,
        p_sleep_light: metrics.sleep_light_mins ?? null,
        p_sleep_awake: metrics.sleep_awake_mins ?? null,
        p_body_fat:    null,  // skip body composition in background (not time-sensitive)
        p_lean_mass:   null,
        p_bone_mass:   null,
      });

      const syncedTypes = ['hrv', 'resting_heart_rate', 'steps', 'sleep'].filter(t => {
        if (t === 'hrv') return metrics.hrv !== undefined;
        if (t === 'resting_heart_rate') return metrics.resting_heart_rate !== undefined;
        if (t === 'steps') return metrics.steps !== undefined;
        if (t === 'sleep') return metrics.sleep_hours !== undefined;
        return false;
      });

      const result: HealthSyncResult = {
        success: !error,
        recordsSynced: error ? 0 : 1,
        dataTypesSynced: syncedTypes,
        errorMessage: error?.message,
        durationMs: Date.now() - startTime,
      };

      this.lastSyncAt.set(new Date().toISOString());
      this.lastSyncResult.set(result);
      await this.logSync(userId, 'background', source, result);
      return result;
    } catch (err) {
      return {
        success: false,
        recordsSynced: 0,
        dataTypesSynced: [],
        errorMessage: err instanceof Error ? err.message : 'Background sync failed',
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ─── Platform Detection ──────────────────────────────────────

  /**
   * Returns the appropriate data source identifier for the current platform.
   * Used to tag rows in wearable_daily_data so we know the provenance.
   */
  getDataSource(): 'healthkit' | 'health_connect' {
    return Capacitor.getPlatform() === 'ios' ? 'healthkit' : 'health_connect';
  }

  // ─── Private ─────────────────────────────────────────────────

  /** Enable iOS background delivery for key data types */
  private async enableBackgroundDelivery(): Promise<void> {
    // Only needed on iOS; Android Health Connect uses different mechanism
    if (Capacitor.getPlatform() !== 'ios') return;

    await Promise.allSettled([
      this.healthKit.enableBackgroundDelivery('heartRateVariabilitySDNN'),
      this.healthKit.enableBackgroundDelivery('restingHeartRate'),
      this.healthKit.enableBackgroundDelivery('stepCount'),
    ]);
  }

  /** Write a row to health_sync_log for audit/debugging */
  private async logSync(
    userId: string,
    syncType: 'foreground' | 'background' | 'manual',
    source: string,
    result: HealthSyncResult,
  ): Promise<void> {
    try {
      await this.supabase.client.from('health_sync_log').insert({
        user_id:           userId,
        sync_type:         syncType,
        data_source:       source,
        data_types_synced: result.dataTypesSynced,
        records_synced:    result.recordsSynced,
        error_message:     result.errorMessage ?? null,
        duration_ms:       result.durationMs ?? null,
      });
    } catch {
      // Log failures are non-fatal
    }
  }
}
