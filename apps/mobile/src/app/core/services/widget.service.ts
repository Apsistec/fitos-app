import { Injectable, inject, effect } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NutritionService } from './nutrition.service';
import { WorkoutSessionService } from './workout-session.service';
import { StreakService } from './streak.service';
import { AuthService } from './auth.service';

/**
 * Widget data shape pushed to native home/lock screen widgets.
 * Kept flat and JSON-serializable for SharedPreferences / UserDefaults.
 */
export interface WidgetData {
  // Nutrition
  caloriesCurrent: number;
  caloriesTarget: number;
  proteinCurrent: number;
  proteinTarget: number;
  waterMl: number;
  // Next workout
  nextWorkoutName: string;
  nextWorkoutTime: string; // ISO string or empty
  // Streak
  streakWeeks: number;
  streakType: string; // 'workout' | 'nutrition' | 'combined'
  // Meta
  updatedAt: string; // ISO string
}

const WIDGET_KEY = 'fitos_widget_data';

/**
 * WidgetService — bridges live app data to native iOS/Android widgets.
 *
 * Data flow:
 *   Angular signals (nutrition, workout, streak) → updateWidgetData()
 *   → capacitor-widget-bridge → iOS App Group UserDefaults / Android SharedPreferences
 *   → WidgetKit / Glance reads the shared data and reloads the widget timeline.
 *
 * Usage:
 *   Inject WidgetService anywhere — effects react automatically to signal changes.
 *   Call updateWidgetData() explicitly after significant events (workout complete, etc).
 *
 * Native widget extensions:
 *   iOS:     apps/mobile/ios/App/FitOSWidget/         (Swift / WidgetKit)
 *   Android: apps/mobile/android/app/.../widgets/     (Kotlin / Glance)
 */
@Injectable({ providedIn: 'root' })
export class WidgetService {
  private nutritionService = inject(NutritionService);
  private workoutSessionService = inject(WorkoutSessionService);
  private streakService = inject(StreakService);
  private authService = inject(AuthService);

  constructor() {
    // Auto-update widgets when nutrition summary signal changes
    effect(() => {
      const summary = this.nutritionService.dailySummarySignal();
      if (summary) {
        this.updateWidgetData();
      }
    });

    // Auto-update widgets when streak changes
    effect(() => {
      const streak = this.streakService.currentStreak();
      if (streak) {
        this.updateWidgetData();
      }
    });
  }

  /**
   * Push the latest data snapshot to native widgets.
   * Safe to call from anywhere — no-ops on web.
   */
  async updateWidgetData(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const data = this.buildWidgetData();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('capacitor-widget-bridge' as string).catch(() => null);
    if (!mod?.WidgetBridge) return;

    try {
      await mod.WidgetBridge.setItem({
        key: WIDGET_KEY,
        value: JSON.stringify(data),
        group: 'group.com.fitos.app', // iOS App Group — must match entitlement
      });

      // Request widget timeline reload
      await mod.WidgetBridge.reloadAllTimelines?.().catch(() => undefined);
    } catch (err) {
      console.warn('[WidgetService] updateWidgetData failed:', err);
    }
  }

  /**
   * Read widget data back (for debugging / testing).
   */
  async getWidgetData(): Promise<WidgetData | null> {
    if (!Capacitor.isNativePlatform()) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('capacitor-widget-bridge' as string).catch(() => null);
    if (!mod?.WidgetBridge) return null;

    try {
      const result = await mod.WidgetBridge.getItem({
        key: WIDGET_KEY,
        group: 'group.com.fitos.app',
      });
      return result?.value ? (JSON.parse(result.value) as WidgetData) : null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private buildWidgetData(): WidgetData {
    const summary = this.nutritionService.dailySummarySignal();
    const streak = this.streakService.currentStreak();
    const session = this.workoutSessionService.activeSession();

    return {
      caloriesCurrent: summary?.calories ?? 0,
      caloriesTarget: summary?.targets?.calories ?? 2000,
      proteinCurrent: summary?.protein ?? 0,
      proteinTarget: summary?.targets?.protein ?? 150,
      waterMl: 0, // Updated by water logging flow — see water_logs table
      nextWorkoutName: session?.session
        ? 'Workout in progress'
        : '',
      nextWorkoutTime: '',
      streakWeeks: streak?.current_weeks ?? 0,
      streakType: streak?.streak_type ?? 'workout',
      updatedAt: new Date().toISOString(),
    };
  }
}
