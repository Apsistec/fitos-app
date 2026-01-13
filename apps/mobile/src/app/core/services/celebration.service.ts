import { Injectable } from '@angular/core';
import confetti from 'canvas-confetti';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * CelebrationService - Celebration animations for achievements
 *
 * Features:
 * - Workout completion confetti
 * - Personal record gold fireworks
 * - Streak milestone celebrations (scaled by achievement)
 * - Haptic feedback integration
 * - Respects prefers-reduced-motion
 *
 * Usage:
 * ```typescript
 * await this.celebration.workoutComplete();
 * await this.celebration.personalRecord();
 * await this.celebration.streakMilestone(30);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CelebrationService {

  /**
   * Celebrate workout completion with brand-colored confetti burst
   */
  async workoutComplete(): Promise<void> {
    await this.haptic(ImpactStyle.Heavy);

    // Main burst from center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#8B5CF6', '#F59E0B'], // FitOS brand colors
      disableForReducedMotion: true
    });
  }

  /**
   * Celebrate personal record with gold confetti fireworks
   */
  async personalRecord(): Promise<void> {
    await this.haptic(ImpactStyle.Heavy);

    // Gold confetti fireworks effect
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF8C00'],
        disableForReducedMotion: true
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF8C00'],
        disableForReducedMotion: true
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }

  /**
   * Celebrate streak milestone with scaled intensity
   * @param days - Number of days in the streak (7, 30, 100, 365)
   */
  async streakMilestone(days: number): Promise<void> {
    await this.haptic(ImpactStyle.Medium);

    // Scale intensity based on milestone
    const particleCount = days >= 100 ? 200 : days >= 30 ? 150 : 100;

    confetti({
      particleCount,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#10B981', '#8B5CF6', '#3B82F6'],
      shapes: ['star', 'circle'],
      disableForReducedMotion: true
    });
  }

  /**
   * Trigger haptic feedback if on native platform
   */
  private async haptic(style: ImpactStyle): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style });
    }
  }
}
