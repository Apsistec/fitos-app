import {
  Component,
  input,
  output,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonButton,
  IonSpinner,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flameOutline,
  trophyOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  constructOutline,
  heartOutline,
  buildOutline,
  helpCircleOutline,
  warningOutline,
} from 'ionicons/icons';
import { StreakService, StreakStats, StreakType } from '../../../core/services/streak.service';
import { HapticService } from '../../../core/services/haptic.service';

/**
 * StreakWidgetComponent - Display weekly streak progress
 *
 * Features:
 * - Shows weekly consistency bands (not daily chains)
 * - Current streak in weeks
 * - This week's progress (e.g., "3/4 days")
 * - Never shows "broken" in red
 * - Forgiveness messaging: "Life happens. Pick up where you left off."
 * - Repair button when available
 *
 * Usage:
 * ```html
 * <app-streak-widget
 *   [userId]="userId"
 *   [streakType]="'workout'"
 *   (repairNeeded)="openRepairModal()"
 * />
 * ```
 */
@Component({
  selector: 'app-streak-widget',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonButton,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="streak-widget">
      <ion-card-header>
        <div class="header-row">
          <ion-card-title>{{ getTitle() }}</ion-card-title>
          @if (stats()) {
            <ion-badge [color]="getStreakColor()">
              {{ stats()!.currentWeeks }} {{ stats()!.currentWeeks === 1 ? 'week' : 'weeks' }}
            </ion-badge>
          }
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner></ion-spinner>
            <p>Loading streak...</p>
          </div>
        } @else if (stats()) {
          <!-- Current Streak Display -->
          <div class="streak-header">
            <div class="streak-count">
              <span class="streak-number">{{ stats()!.currentWeeks }}</span>
              <span class="streak-unit">{{ stats()!.currentWeeks === 1 ? 'week' : 'weeks' }}</span>
            </div>
            <div class="streak-subtitle">
              <span>Current Streak</span>
              @if (stats()!.longestWeeks > 0) {
                <span class="longest">Best: {{ stats()!.longestWeeks }} {{ stats()!.longestWeeks === 1 ? 'week' : 'weeks' }}</span>
              }
            </div>
          </div>

          <!-- This Week's Progress -->
          <div class="week-progress">
            <div class="progress-header">
              <span class="label">This Week</span>
              <span class="progress-text">
                {{ stats()!.thisWeekProgress.completed }} / {{ stats()!.thisWeekProgress.target }} days
              </span>
            </div>

            <!-- Progress Bands -->
            <div class="progress-bands">
              @for (day of [0,1,2,3,4,5,6]; track $index) {
                <div
                  class="day-band"
                  [class.completed]="$index < stats()!.thisWeekProgress.completed"
                  [class.target]="$index < stats()!.thisWeekProgress.target"
                ></div>
              }
            </div>

            <!-- Week Status Message -->
            <div class="week-status">
              @if (stats()!.weekStatus === 'achieved') {
                <div class="status-badge success">
                  <ion-icon name="checkmark-circle-outline"></ion-icon>
                  <span>Target achieved!</span>
                </div>
              } @else if (stats()!.weekStatus === 'partial') {
                <div class="status-message neutral">
                  <ion-icon name="information-circle-outline"></ion-icon>
                  <span>Life happens. Pick up where you left off.</span>
                </div>
              } @else if (stats()!.repairAvailable) {
                <div class="repair-alert">
                  <ion-icon name="construct-outline"></ion-icon>
                  <span>Repair available! Tap to maintain your streak.</span>
                </div>
              }
            </div>

            <!-- Grace Days -->
            @if (stats()!.graceDaysRemaining > 0) {
              <div class="grace-days">
                <ion-icon name="heart-outline"></ion-icon>
                <span>{{ stats()!.graceDaysRemaining }} grace day{{ stats()!.graceDaysRemaining !== 1 ? 's' : '' }} remaining this month</span>
              </div>
            }
          </div>

          <!-- Repair Button -->
          @if (stats()!.repairAvailable) {
            <ion-button
              expand="block"
              fill="outline"
              color="warning"
              (click)="handleRepairClick()"
              class="repair-button"
            >
              <ion-icon slot="start" name="build-outline"></ion-icon>
              Repair Streak
            </ion-button>
          }
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .streak-widget {
        background: var(--fitos-bg-secondary);
        border: 1px solid var(--fitos-border-subtle);
        border-radius: var(--fitos-radius-lg);
        padding: var(--fitos-space-4);
      }

      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--fitos-space-4);
      }

      .streak-header {
        text-align: center;
        margin-bottom: var(--fitos-space-4);
      }

      .streak-count {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: var(--fitos-space-2);
      }

      .streak-number {
        font-family: var(--fitos-font-mono);
        font-size: var(--fitos-text-4xl);
        font-weight: 800;
        line-height: 1;
        color: var(--fitos-accent-primary);
      }

      .streak-unit {
        font-size: var(--fitos-text-lg);
        color: var(--fitos-text-secondary);
      }

      .streak-subtitle {
        display: flex;
        flex-direction: column;
        gap: var(--fitos-space-1);
        margin-top: var(--fitos-space-2);
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-tertiary);
      }

      .longest {
        color: var(--fitos-status-warning);
      }

      .week-progress {
        background: var(--fitos-bg-tertiary);
        border-radius: var(--fitos-radius-md);
        padding: var(--fitos-space-4);
        margin-bottom: var(--fitos-space-4);
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--fitos-space-3);
      }

      .label {
        font-size: var(--fitos-text-sm);
        font-weight: 500;
        color: var(--fitos-text-secondary);
      }

      .progress-text {
        font-family: var(--fitos-font-mono);
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-primary);
      }

      .progress-bands {
        display: flex;
        gap: var(--fitos-space-1);
        margin-bottom: var(--fitos-space-3);
      }

      .day-band {
        flex: 1;
        height: 8px;
        border-radius: 4px;
        background: var(--fitos-bg-elevated);
        transition: background var(--fitos-duration-fast);
      }

      .day-band.target {
        background: var(--fitos-border-default);
      }

      .day-band.completed {
        background: var(--fitos-accent-primary);
      }

      .week-status {
        margin-top: var(--fitos-space-3);
      }

      .status-badge,
      .status-message,
      .repair-alert {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-2);
        padding: var(--fitos-space-2) var(--fitos-space-3);
        border-radius: var(--fitos-radius-sm);
        font-size: var(--fitos-text-sm);
      }

      .status-badge.success {
        background: rgba(34, 197, 94, 0.1);
        color: var(--fitos-status-success);
      }

      .status-message.neutral {
        background: rgba(100, 116, 139, 0.1);
        color: var(--fitos-text-secondary);
      }

      .repair-alert {
        background: rgba(245, 158, 11, 0.1);
        color: var(--fitos-status-warning);
      }

      .grace-days {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-2);
        margin-top: var(--fitos-space-3);
        padding: var(--fitos-space-2);
        font-size: var(--fitos-text-xs);
        color: var(--fitos-text-tertiary);
      }

      .repair-button {
        margin-top: var(--fitos-space-2);
      }
    `,
  ],
})
export class StreakWidgetComponent implements OnInit {
  // Inputs
  userId = input.required<string>();
  streakType = input<StreakType>('workout');

  // Outputs
  repairRequested = output<void>();

  // Services
  private streak = inject(StreakService);
  private haptic = inject(HapticService);
  private alertCtrl = inject(AlertController);

  // State
  stats = signal<StreakStats | null>(null);
  loading = signal(true);

  // Computed
  progressPercent = computed(() => {
    const s = this.stats();
    if (!s) return 0;
    return Math.min((s.thisWeekProgress.completed / s.thisWeekProgress.target) * 100, 100);
  });

  statusMessage = computed(() => {
    const s = this.stats();
    if (!s) return '';

    const { completed, target } = s.thisWeekProgress;
    const remaining = target - completed;

    switch (s.weekStatus) {
      case 'achieved':
        return `🎉 Week complete! ${completed}/${target} days`;
      case 'in_progress':
        return remaining === 1 ? '1 day to go this week' : `${remaining} days to go this week`;
      case 'partial':
        return 'Week continues (1-2 days missed)';
      case 'missed':
        return 'Repair needed to maintain streak';
      default:
        return '';
    }
  });

  constructor() {
    addIcons({
      flameOutline,
      trophyOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
      constructOutline,
      heartOutline,
      buildOutline,
      helpCircleOutline,
      warningOutline,
    });
  }

  async ngOnInit() {
    await this.loadStats();
  }

  /**
   * Get widget title based on streak type
   */
  getTitle(): string {
    switch (this.streakType()) {
      case 'workout':
        return 'Workout Streak';
      case 'nutrition':
        return 'Nutrition Streak';
      case 'combined':
        return 'Activity Streak';
      default:
        return 'Streak';
    }
  }

  /**
   * Get streak badge color
   */
  getStreakColor(): string {
    const weeks = this.stats()?.currentWeeks ?? 0;
    if (weeks >= 12) return 'success';
    if (weeks >= 4) return 'primary';
    if (weeks >= 1) return 'warning';
    return 'medium';
  }

  /**
   * Load streak stats
   */
  async loadStats(): Promise<void> {
    this.loading.set(true);
    try {
      const stats = await this.streak.getStreakStats(this.userId(), this.streakType());
      this.stats.set(stats);
    } catch (err) {
      console.error('Error loading streak stats:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Show info about streaks
   */
  async showInfo(): Promise<void> {
    await this.haptic.light();

    const alert = await this.alertCtrl.create({
      header: 'How Streaks Work',
      message: `
        <p><strong>Weekly Consistency</strong></p>
        <p>Maintain ${this.stats()?.thisWeekProgress.target || 4} days of activity per week to keep your streak alive.</p>

        <p><strong>Forgiveness</strong></p>
        <ul>
          <li>Missing 1-2 days: Streak continues as "partial"</li>
          <li>Missing 3+ days: Repair needed</li>
          <li>Grace days: ${this.stats()?.graceDaysRemaining || 4} remaining this month</li>
        </ul>

        <p><strong>Repair Options</strong></p>
        <ul>
          <li>Bonus workout: Extra session = +1 day credit</li>
          <li>Extended session: 150% duration = +1 day credit</li>
        </ul>

        <p style="font-style: italic; color: var(--fitos-text-tertiary); margin-top: 1rem;">
          Life happens. We're here to help you pick up where you left off.
        </p>
      `,
      buttons: ['Got it'],
    });

    await alert.present();
  }

  /**
   * Handle repair click
   */
  handleRepairClick(): void {
    this.haptic.light();
    this.repairRequested.emit();
  }
}
