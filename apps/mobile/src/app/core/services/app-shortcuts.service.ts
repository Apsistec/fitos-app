import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AuthService } from './auth.service';
import { DeepLinkService } from './deep-link.service';

export type ShortcutAction =
  | 'log_workout'
  | 'quick_add_food'
  | 'add_water'
  | 'start_timer';

/**
 * Manages iOS/Android home-screen quick actions (long-press the app icon).
 * Uses @capawesome/capacitor-app-shortcuts dynamically so the app compiles
 * and runs in environments where the plugin is not yet synced natively.
 *
 * Registration flow:
 *   AppComponent constructor → appShortcutsService.registerShortcuts()
 *
 * Shortcut tap flow (native):
 *   AppShortcuts 'shortcutUsed' event → handleShortcutAction() → DeepLinkService
 */
@Injectable({ providedIn: 'root' })
export class AppShortcutsService {
  private authService = inject(AuthService);
  private deepLinkService = inject(DeepLinkService);

  /**
   * Register shortcuts appropriate for the current user's role.
   * Trainers get a "Log Workout" shortcut; clients get nutrition shortcuts.
   * Safe to call on every app launch — replaces existing shortcuts.
   */
  async registerShortcuts(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('@capawesome/capacitor-app-shortcuts' as string).catch(() => null);
    if (!mod?.AppShortcuts) return;

    const { AppShortcuts } = mod;

    const isTrainer =
      this.authService.isTrainer() || this.authService.isOwner();

    const shortcuts = [
      {
        id: 'log_workout' as ShortcutAction,
        shortLabel: 'Log Workout',
        longLabel: 'Start a Workout',
        icon: isTrainer ? 'ic_shortcut_barbell' : undefined,
      },
      {
        id: 'quick_add_food' as ShortcutAction,
        shortLabel: 'Add Food',
        longLabel: 'Quick-Log a Meal',
      },
      {
        id: 'add_water' as ShortcutAction,
        shortLabel: 'Add Water',
        longLabel: 'Log Water Intake',
      },
      {
        id: 'start_timer' as ShortcutAction,
        shortLabel: 'Rest Timer',
        longLabel: 'Start Rest Timer',
      },
    ];

    try {
      await AppShortcuts.setShortcuts({ shortcuts });
    } catch (err) {
      console.warn('[AppShortcutsService] setShortcuts failed:', err);
    }
  }

  /**
   * Start listening for shortcut-use events from the OS.
   * Call once on app init after shortcuts are registered.
   */
  async startListening(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('@capawesome/capacitor-app-shortcuts' as string).catch(() => null);
    if (!mod?.AppShortcuts) return;

    const { AppShortcuts } = mod;

    try {
      await AppShortcuts.addListener(
        'shortcutUsed',
        (event: { shortcutId: string }) => {
          this.handleShortcutAction(event.shortcutId as ShortcutAction);
        }
      );
    } catch (err) {
      console.warn('[AppShortcutsService] addListener failed:', err);
    }
  }

  /**
   * Route the tapped shortcut to the correct page via DeepLinkService
   * (reuses the same navigation logic as NFC/QR deep links).
   */
  handleShortcutAction(action: ShortcutAction): void {
    switch (action) {
      case 'log_workout':
        // Navigate to workout list — user picks or continues a template
        this.deepLinkService.navigateDirect(['/tabs/workouts']);
        break;

      case 'quick_add_food':
        // Navigate to add-food page in nutrition tab
        this.deepLinkService.navigateDirect(['/tabs/nutrition/add']);
        break;

      case 'add_water':
        // Navigate to water quick-log page
        this.deepLinkService.navigateDirect(['/tabs/nutrition/water']);
        break;

      case 'start_timer':
        // Navigate to workouts tab; the active session timer is there
        this.deepLinkService.navigateDirect(['/tabs/workouts']);
        break;
    }
  }
}
