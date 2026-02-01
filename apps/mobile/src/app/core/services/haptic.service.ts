import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * HapticService provides tactile feedback on supported devices
 *
 * Uses @capacitor/haptics for native iOS/Android haptic feedback.
 * Gracefully falls back on web platforms where haptics are unavailable.
 *
 * @example
 * ```typescript
 * // On set completion
 * await this.haptic.success();
 *
 * // On button press
 * await this.haptic.impact(ImpactStyle.Light);
 *
 * // On timer warning
 * await this.haptic.notification(NotificationType.Warning);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class HapticService {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Trigger a haptic impact
   * @param style - Impact intensity (Light, Medium, Heavy, Rigid, Soft)
   */
  async impact(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('Haptic impact failed:', error);
    }
  }

  /**
   * Trigger a notification haptic
   * @param type - Notification type (Success, Warning, Error)
   */
  async notification(type: NotificationType): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.notification({ type });
    } catch (error) {
      console.warn('Haptic notification failed:', error);
    }
  }

  /**
   * Trigger a success haptic (convenience method)
   * Used for: set completion, workout completion, goal achieved
   */
  async success(): Promise<void> {
    await this.notification(NotificationType.Success);
  }

  /**
   * Trigger a warning haptic (convenience method)
   * Used for: timer ending, rest period ending
   */
  async warning(): Promise<void> {
    await this.notification(NotificationType.Warning);
  }

  /**
   * Trigger an error haptic (convenience method)
   * Used for: validation errors, failed actions
   */
  async error(): Promise<void> {
    await this.notification(NotificationType.Error);
  }

  /**
   * Trigger a light haptic for UI interactions
   * Used for: button presses, toggles, selections
   */
  async light(): Promise<void> {
    await this.impact(ImpactStyle.Light);
  }

  /**
   * Trigger a medium haptic for standard interactions
   * Used for: standard button presses, confirmations
   */
  async medium(): Promise<void> {
    await this.impact(ImpactStyle.Medium);
  }

  /**
   * Trigger a heavy haptic for important actions
   * Used for: workout completion, major achievements
   */
  async heavy(): Promise<void> {
    await this.impact(ImpactStyle.Heavy);
  }

  /**
   * Vibrate device for a specific duration (fallback for older APIs)
   * @param duration - Duration in milliseconds
   */
  async vibrate(duration = 200): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.warn('Haptic vibrate failed:', error);
    }
  }

  /**
   * Selection changed haptic (used for pickers, sliders)
   */
  async selectionChanged(): Promise<void> {
    if (!this.isNative) return;

    try {
      await Haptics.selectionChanged();
    } catch (error) {
      console.warn('Haptic selection changed failed:', error);
    }
  }
}
