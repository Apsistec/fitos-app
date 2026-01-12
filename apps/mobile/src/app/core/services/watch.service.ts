import { Injectable, signal } from '@angular/core';

/**
 * Watch workout data
 */
export interface WatchWorkout {
  id: string;
  name: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: number;
    reps: string;
    weight?: number;
  }>;
  date: string;
}

/**
 * Watch set log
 */
export interface WatchSetLog {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight?: number;
  timestamp: string;
}

/**
 * WatchService - Apple Watch integration via Capacitor
 *
 * Features:
 * - Sync today's workout to watch
 * - Receive set logs from watch
 * - Push notifications to watch
 * - Rest timer sync
 * - Haptic feedback triggers
 *
 * Implementation Notes:
 * - Uses WatchConnectivity framework via Capacitor plugin
 * - Bidirectional sync when watch in range
 * - Queues messages when watch disconnected
 *
 * Usage:
 * ```typescript
 * await watchService.syncWorkout(todaysWorkout);
 * watchService.setLogs$.subscribe(log => {
 *   // Handle set logged from watch
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class WatchService {
  // State
  isWatchConnected = signal(false);
  isWatchAppInstalled = signal(false);
  setLogs = signal<WatchSetLog[]>([]);
  error = signal<string | null>(null);

  // TODO: Inject Capacitor Watch plugin when available
  // private watch = inject(CapacitorWatch);

  /**
   * Check if Apple Watch is paired and app installed
   */
  async checkWatchStatus(): Promise<boolean> {
    try {
      // TODO: Implement when Capacitor Watch plugin available
      // const status = await this.watch.getStatus();
      // this.isWatchConnected.set(status.isPaired && status.isReachable);
      // this.isWatchAppInstalled.set(status.isAppInstalled);
      // return status.isAppInstalled;

      console.warn('Watch service not yet implemented - requires Capacitor plugin');
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check watch status';
      this.error.set(errorMessage);
      return false;
    }
  }

  /**
   * Sync workout to watch
   */
  async syncWorkout(workout: WatchWorkout): Promise<void> {
    try {
      if (!this.isWatchAppInstalled()) {
        throw new Error('Apple Watch app not installed');
      }

      // TODO: Implement when plugin available
      // await this.watch.sendMessage({
      //   type: 'workout_sync',
      //   payload: workout,
      // });

      console.log('Workout synced to watch:', workout.name);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync workout';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Send rest timer to watch
   */
  async syncRestTimer(seconds: number): Promise<void> {
    try {
      if (!this.isWatchConnected()) return;

      // TODO: Implement when plugin available
      // await this.watch.sendMessage({
      //   type: 'rest_timer',
      //   payload: { seconds },
      // });

      console.log(`Rest timer synced: ${seconds}s`);
    } catch (err) {
      console.error('Error syncing rest timer:', err);
    }
  }

  /**
   * Trigger haptic feedback on watch
   */
  async triggerWatchHaptic(type: 'success' | 'warning' | 'error'): Promise<void> {
    try {
      if (!this.isWatchConnected()) return;

      // TODO: Implement when plugin available
      // await this.watch.sendMessage({
      //   type: 'haptic',
      //   payload: { type },
      // });

      console.log(`Watch haptic triggered: ${type}`);
    } catch (err) {
      console.error('Error triggering watch haptic:', err);
    }
  }

  /**
   * Listen for set logs from watch
   */
  startListening(): void {
    // TODO: Implement when plugin available
    // this.watch.addListener('set_logged', (log: WatchSetLog) => {
    //   this.setLogs.update(logs => [...logs, log]);
    // });

    console.log('Watch listener started');
  }

  /**
   * Stop listening for watch messages
   */
  stopListening(): void {
    // TODO: Implement when plugin available
    // this.watch.removeAllListeners();

    console.log('Watch listener stopped');
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
