import { Component, input, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  barbellOutline,
  timeOutline,
  heartOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { StreakService, StreakType, RepairMethod } from '../../../core/services/streak.service';
import { HapticService } from '../../../core/services/haptic.service';

/**
 * Repair option
 */
interface RepairOption {
  id: RepairMethod;
  title: string;
  description: string;
  icon: string;
  available: boolean;
  reason?: string;
}

/**
 * StreakRepairModalComponent - Modal for repairing missed streaks
 *
 * Features:
 * - Three repair options: bonus workout, extended session, grace day
 * - Clear explanations of each method
 * - Availability indicators
 * - Countdown until repair expires
 * - Forgiveness messaging throughout
 *
 * Usage:
 * ```typescript
 * const modal = await modalCtrl.create({
 *   component: StreakRepairModalComponent,
 *   componentProps: {
 *     userId: 'user_id',
 *     streakType: 'workout',
 *   }
 * });
 * await modal.present();
 * const { data } = await modal.onWillDismiss();
 * if (data?.repaired) {
 *   // Streak was repaired
 * }
 * ```
 */
@Component({
  selector: 'app-streak-repair-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Repair Your Streak</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="repair-modal">
        <!-- Header Message -->
        <div class="modal-header">
          <h2>Life Happens</h2>
          <p>Don't worry - we have ways to help you maintain your streak.</p>
        </div>

        <!-- Repair Options -->
        <div class="repair-options">
          @for (option of repairOptions; track option.id) {
            <ion-card
              class="repair-option"
              [class.available]="option.available"
              [class.unavailable]="!option.available"
              button
              (click)="selectOption(option)"
              [disabled]="!option.available"
            >
              <ion-card-header>
                <div class="option-header">
                  <div class="option-icon">
                    <ion-icon [name]="option.icon"></ion-icon>
                  </div>
                  <div class="option-title">
                    <ion-card-title>{{ option.title }}</ion-card-title>
                    @if (!option.available && option.reason) {
                      <ion-text color="warning" class="unavailable-reason">
                        <small>{{ option.reason }}</small>
                      </ion-text>
                    }
                  </div>
                  @if (option.available) {
                    <ion-icon name="checkmark-circle-outline" class="available-icon"></ion-icon>
                  }
                </div>
              </ion-card-header>

              <ion-card-content>
                <p>{{ option.description }}</p>
              </ion-card-content>
            </ion-card>
          }
        </div>

        <!-- Expiration Warning -->
        @if (expiresAt()) {
          <div class="expiration-warning">
            <ion-icon name="time-outline"></ion-icon>
            <span>Repair window expires {{ getTimeRemaining() }}</span>
          </div>
        }

        <!-- Info Section -->
        <div class="info-section">
          <ion-text color="medium">
            <p>
              <strong>Remember:</strong> Consistency is about progress, not perfection.
              We're here to support your journey, not judge missed days.
            </p>
          </ion-text>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .repair-modal {
      padding: var(--fitos-space-4);
      max-width: 600px;
      margin: 0 auto;
    }

    .modal-header {
      text-align: center;
      margin-bottom: var(--fitos-space-6);

      h2 {
        margin: 0 0 var(--fitos-space-2) 0;
        font-size: var(--fitos-text-2xl);
        font-weight: 700;
        color: var(--fitos-text-primary);
      }

      p {
        margin: 0;
        font-size: var(--fitos-text-base);
        color: var(--fitos-text-secondary);
        line-height: 1.5;
      }
    }

    .repair-options {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-3);
      margin-bottom: var(--fitos-space-4);
    }

    .repair-option {
      margin: 0;
      transition: all var(--fitos-duration-fast) var(--fitos-ease-default);

      &.available {
        border: 2px solid var(--fitos-border-subtle);
        cursor: pointer;

        &:hover {
          border-color: var(--fitos-accent-primary);
          transform: translateY(-2px);
          box-shadow: var(--fitos-glow-primary);
        }
      }

      &.unavailable {
        opacity: 0.6;
        cursor: not-allowed;
        border: 2px solid var(--fitos-border-subtle);
      }
    }

    .option-header {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-3);
    }

    .option-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--fitos-bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      ion-icon {
        font-size: 24px;
        color: var(--fitos-accent-primary);
      }
    }

    .available .option-icon {
      background: rgba(16, 185, 129, 0.15);

      ion-icon {
        color: var(--fitos-accent-primary);
      }
    }

    .unavailable .option-icon {
      background: var(--fitos-bg-tertiary);

      ion-icon {
        color: var(--fitos-text-tertiary);
      }
    }

    .option-title {
      flex: 1;

      ion-card-title {
        font-size: var(--fitos-text-lg);
        font-weight: 600;
        margin-bottom: 4px;
      }

      .unavailable-reason {
        display: block;
        font-size: var(--fitos-text-xs);
        font-style: italic;
      }
    }

    .available-icon {
      font-size: 24px;
      color: var(--fitos-accent-primary);
      flex-shrink: 0;
    }

    ion-card-content p {
      margin: 0;
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-secondary);
      line-height: 1.5;
    }

    .expiration-warning {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--fitos-space-2);
      padding: var(--fitos-space-3);
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--fitos-status-warning);
      border-radius: var(--fitos-radius-lg);
      margin-bottom: var(--fitos-space-4);

      ion-icon {
        font-size: 20px;
        color: var(--fitos-status-warning);
      }

      span {
        font-size: var(--fitos-text-sm);
        font-weight: 600;
        color: var(--fitos-status-warning);
      }
    }

    .info-section {
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-lg);
      border-left: 4px solid var(--fitos-accent-primary);

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
        line-height: 1.6;

        strong {
          color: var(--fitos-text-primary);
        }
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .repair-option {
        transition: none;
      }

      .repair-option.available:hover {
        transform: none;
      }
    }
  `],
})
export class StreakRepairModalComponent implements OnInit {
  // Inputs
  userId = input.required<string>();
  streakType = input.required<StreakType>();
  graceDaysRemaining = input<number>(0);
  expiresAt = input<string | null>(null);

  // Services
  private streakService = inject(StreakService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private haptic = inject(HapticService);

  // State
  repairOptions: RepairOption[] = [
    {
      id: 'bonus_workout',
      title: 'Bonus Activity',
      description: 'Complete an extra session this week to earn +1 day credit',
      icon: 'barbell-outline',
      available: true,
    },
    {
      id: 'extended_session',
      title: 'Extended Session',
      description: 'Complete a session with 150% of your usual duration to earn +1 day credit',
      icon: 'time-outline',
      available: true,
    },
    {
      id: 'grace_day',
      title: 'Use Grace Day',
      description: 'Use one of your monthly grace days (refills on the 1st)',
      icon: 'heart-outline',
      available: false,
      reason: 'No grace days remaining',
    },
  ];

  constructor() {
    addIcons({
      closeOutline,
      barbellOutline,
      timeOutline,
      heartOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit() {
    // Update grace day availability
    const graceDays = this.graceDaysRemaining();
    const graceOption = this.repairOptions.find(opt => opt.id === 'grace_day');
    if (graceOption) {
      graceOption.available = graceDays > 0;
      graceOption.reason = graceDays > 0
        ? `${graceDays} remaining this month`
        : 'No grace days remaining';
    }
  }

  /**
   * Select repair option
   */
  async selectOption(option: RepairOption): Promise<void> {
    if (!option.available) return;

    await this.haptic.light();

    let success = false;

    if (option.id === 'grace_day') {
      success = await this.streakService.useGraceDay(
        this.userId(),
        this.streakType()
      );
    } else {
      success = await this.streakService.repairStreak(
        this.userId(),
        this.streakType(),
        option.id
      );
    }

    if (success) {
      await this.haptic.success();
      await this.showToast('Streak repaired!', 'success');
      await this.modalCtrl.dismiss({ repaired: true });
    } else {
      await this.haptic.error();
      await this.showToast('Failed to repair streak. Please try again.', 'danger');
    }
  }

  /**
   * Get time remaining until repair expires
   */
  getTimeRemaining(): string {
    const expiresAt = this.expiresAt();
    if (!expiresAt) return '';

    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days !== 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }

    return `in ${minutes}m`;
  }

  /**
   * Dismiss modal
   */
  async dismiss(): Promise<void> {
    await this.haptic.light();
    await this.modalCtrl.dismiss({ repaired: false });
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
