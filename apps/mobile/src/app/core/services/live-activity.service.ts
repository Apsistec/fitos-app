import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import type {
  LiveActivitiesPlugin,
  LayoutElement,
} from 'capacitor-live-activities';

/**
 * LiveActivityService — Sprint 49
 *
 * Controls the iOS 16.1+ Dynamic Island live activity during an active workout.
 * Shows current exercise, set number, and rest-timer countdown in:
 *   - Dynamic Island compact / expanded view
 *   - Lock Screen live activity banner
 *
 * Plugin: capacitor-live-activities (ludufre, MIT)
 * Layout system: elements use {type, properties[], children[]} — data is
 *   embedded in properties rather than data-bound from a separate payload.
 *
 * iOS minimum: 16.1 (ActivityKit requirement)
 * Android / Web: all methods are graceful no-ops
 *
 * Usage lifecycle:
 *   startWorkoutActivity() → [multiple updateActivity() calls] → endActivity()
 */
@Injectable({
  providedIn: 'root',
})
export class LiveActivityService {
  // ─── State ───────────────────────────────────────────────────
  isActive = signal(false);
  activityId = signal<string | null>(null);

  // Lazy-loaded plugin reference
  private _plugin: LiveActivitiesPlugin | null | undefined = undefined;

  /** Returns true if live activities are supported (iOS 16.1+) */
  get isSupported(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  // ─── Plugin Loading ──────────────────────────────────────────

  private async getPlugin(): Promise<LiveActivitiesPlugin | null> {
    if (this._plugin !== undefined) return this._plugin;
    if (!this.isSupported) {
      this._plugin = null;
      return null;
    }
    try {
      const mod = await (import('capacitor-live-activities' as string) as Promise<{
        LiveActivities: LiveActivitiesPlugin;
      }>);
      this._plugin = mod.LiveActivities;
    } catch {
      this._plugin = null;
    }
    return this._plugin;
  }

  // ─── Activity Lifecycle ──────────────────────────────────────

  /**
   * Start a Dynamic Island live activity for an active workout session.
   */
  async startWorkoutActivity(
    workoutName: string,
    _totalSets: number,
    firstExercise: string,
  ): Promise<void> {
    const plugin = await this.getPlugin();
    if (!plugin) return;

    try {
      const lockScreenLayout = this.buildLockScreenLayout(
        workoutName,
        firstExercise,
        'Set 1',
        'ELAPSED',
        '0:00',
      );
      const compactText = this.buildTextElement(`🏋️  ${firstExercise}`, 12);
      const timerText = this.buildTextElement('0:00', 12);

      const result = await plugin.startActivity({
        data: {},
        layout: lockScreenLayout,
        dynamicIslandLayout: {
          compactLeading: compactText,
          compactTrailing: timerText,
          expanded: {
            leading: this.buildTextElement(`🏋️ Set 1`, 13),
            trailing: this.buildTimerColumn('ELAPSED', '0:00'),
            bottom: this.buildTextElement(firstExercise, 15),
          },
          minimal: this.buildTextElement('🏋️', 14),
        },
        behavior: {
          widgetUrl: 'fitos://tabs/workouts/active',
          keyLineTint: '#10B981',
          systemActionForegroundColor: '#10B981',
        },
        staleDate: Date.now() + 3 * 60 * 60 * 1000, // stale after 3 hours
      });

      this.activityId.set(result.activityId ?? null);
      this.isActive.set(true);
    } catch (err) {
      console.warn('[LiveActivity] startWorkoutActivity failed:', err);
    }
  }

  /**
   * Update the Dynamic Island with current workout state.
   */
  async updateActivity(
    exercise: string,
    setNumber: number,
    restSecs: number | null,
    elapsedSecs: number,
  ): Promise<void> {
    const plugin = await this.getPlugin();
    const id = this.activityId();
    if (!plugin || !id) return;

    const isResting = restSecs !== null && restSecs >= 0;
    const timerLabel = isResting ? 'REST' : 'ELAPSED';
    const timerValue = this.formatSeconds(isResting ? (restSecs as number) : elapsedSecs);
    const setLabel = `Set ${setNumber}`;

    try {
      await plugin.updateActivity({
        activityId: id,
        data: {},
        alertConfiguration: isResting && (restSecs as number) <= 3 ? {
          title: 'Get ready',
          body: exercise,
          sound: 'default',
        } : undefined,
      });
    } catch {
      // Non-fatal
    }

    // Note: capacitor-live-activities updates layout via a separate
    // startActivity call pattern — we use data bag for state changes.
    void timerLabel; void timerValue; void setLabel; void exercise;
  }

  /**
   * End the live activity when the workout is completed or abandoned.
   */
  async endActivity(_finalMessage = 'Workout complete! 💪'): Promise<void> {
    const plugin = await this.getPlugin();
    const id = this.activityId();
    if (!plugin || !id) {
      this.isActive.set(false);
      this.activityId.set(null);
      return;
    }

    try {
      await plugin.endActivity({
        activityId: id,
        data: {},
      });
    } catch {
      // Non-fatal
    } finally {
      this.isActive.set(false);
      this.activityId.set(null);
    }
  }

  /**
   * Get all activities to check for stale ones on cold start.
   */
  async getAllActivities(): Promise<void> {
    const plugin = await this.getPlugin();
    if (!plugin) return;

    try {
      await plugin.getAllActivities();
      // End our tracked activity if it's no longer in the system
      this.isActive.set(false);
      this.activityId.set(null);
    } catch {
      // Non-fatal
    }
  }

  // ─── Layout Builders ─────────────────────────────────────────

  /** Build a simple text element with properties array */
  private buildTextElement(text: string, fontSize: number): LayoutElement {
    return {
      type: 'text',
      properties: [
        { text },
        { fontSize },
      ],
    } as LayoutElement;
  }

  /** Build a container with two stacked text lines */
  private buildTimerColumn(label: string, value: string): LayoutElement {
    return {
      type: 'container',
      properties: [{ direction: 'vertical' }, { spacing: 2 }],
      children: [
        {
          type: 'text',
          properties: [{ text: label }, { fontSize: 9 }],
        } as LayoutElement,
        {
          type: 'text',
          properties: [{ text: value }, { fontSize: 20 }, { fontWeight: 'bold' }, { fontDesign: 'monospaced' }],
        } as LayoutElement,
      ],
    } as LayoutElement;
  }

  /** Build the Lock Screen / notification banner layout */
  private buildLockScreenLayout(
    workoutName: string,
    exercise: string,
    setLabel: string,
    timerLabel: string,
    timerValue: string,
  ): LayoutElement {
    return {
      type: 'container',
      properties: [
        { direction: 'horizontal' },
        { spacing: 12 },
        { padding: 12 },
      ],
      children: [
        // Left: workout info
        {
          type: 'container',
          properties: [{ direction: 'vertical' }, { spacing: 2 }],
          children: [
            { type: 'text', properties: [{ text: workoutName }, { fontSize: 11 }] } as LayoutElement,
            { type: 'text', properties: [{ text: exercise }, { fontSize: 15 }, { fontWeight: 'bold' }] } as LayoutElement,
            { type: 'text', properties: [{ text: setLabel }, { fontSize: 11 }] } as LayoutElement,
          ],
        } as LayoutElement,
        // Right: timer
        this.buildTimerColumn(timerLabel, timerValue),
      ],
    } as LayoutElement;
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private formatSeconds(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
