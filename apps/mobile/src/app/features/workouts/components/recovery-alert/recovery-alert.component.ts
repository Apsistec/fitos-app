import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonNote,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  warningOutline,
  checkmarkOutline,
  closeOutline,
  informationCircleOutline,
} from 'ionicons/icons';

import {
  RecoveryService,
  RecoveryScore,
  RecoveryAdjustmentLog,
} from '../../../../core/services/recovery.service';

/**
 * RecoveryAlertComponent - Recovery warning before workout
 *
 * Features:
 * - Shows recovery status before workout starts
 * - Offers to auto-adjust workout intensity/volume
 * - Allows user to accept, modify, or reject
 * - Logs decision for analysis
 *
 * Sprint 23: Wearable Recovery Integration
 */
@Component({
  selector: 'app-recovery-alert',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonNote,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (score() && !dismissed()) {
      <ion-card [class]="'recovery-alert ' + score()!.category">
        <ion-card-header>
          <div class="alert-header">
            <ion-icon
              [name]="getIconName()"
              [color]="service.getCategoryColor(score()!.category)"
            />
            <ion-card-title>Recovery Alert</ion-card-title>
            <ion-button fill="clear" size="small" (click)="dismiss()">
              <ion-icon slot="icon-only" name="close-outline" />
            </ion-button>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- Recovery Status -->
          <div class="status-display">
            <div class="status-info">
              <ion-badge [color]="service.getCategoryColor(score()!.category)">
                {{ service.getCategoryLabel(score()!.category) }}
              </ion-badge>
              <span class="score-value">{{ score()!.overall_score }}/100</span>
            </div>
            <p class="status-message">{{ score()!.suggested_action }}</p>
          </div>

          <!-- Recommendations -->
          @if (service.isUnderRecovered()) {
            <div class="recommendations">
              <h4>Recommended Adjustments</h4>
              <div class="adjustment-options">
                <div class="adjustment-item">
                  <span class="adjustment-label">Intensity</span>
                  <ion-badge color="warning">
                    {{ formatModifier(score()!.intensity_modifier) }}
                  </ion-badge>
                </div>
                <div class="adjustment-item">
                  <span class="adjustment-label">Volume</span>
                  <ion-badge color="warning">
                    {{ formatModifier(score()!.volume_modifier) }}
                  </ion-badge>
                </div>
              </div>

              <ion-note class="adjustment-note">
                These adjustments will help prevent overtraining and support recovery.
              </ion-note>
            </div>

            <!-- Action Buttons -->
            <div class="actions">
              <ion-button
                expand="block"
                color="primary"
                (click)="acceptAdjustment()"
                [disabled]="processing()"
              >
                <ion-icon slot="start" name="checkmark-outline" />
                Apply Adjustments
              </ion-button>

              <div class="secondary-actions">
                <ion-button
                  fill="outline"
                  size="small"
                  (click)="modifyAdjustment()"
                  [disabled]="processing()"
                >
                  Modify
                </ion-button>
                <ion-button
                  fill="clear"
                  size="small"
                  (click)="rejectAdjustment()"
                  [disabled]="processing()"
                >
                  Proceed Anyway
                </ion-button>
              </div>
            </div>
          } @else {
            <!-- Good Recovery -->
            <div class="good-recovery">
              <ion-note>
                Your recovery is good. Proceed with your planned workout!
              </ion-note>
              <ion-button fill="clear" size="small" (click)="dismiss()">
                Got It
              </ion-button>
            </div>
          }

          <!-- Info Link -->
          <ion-button fill="clear" size="small" class="info-button" (click)="showInfo()">
            <ion-icon slot="start" name="information-circle-outline" />
            How is this calculated?
          </ion-button>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: [
    `
      .recovery-alert {
        margin: 16px;
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        border-left: 4px solid;

        &.recovered {
          border-left-color: #10B981;
        }

        &.moderate {
          border-left-color: var(--ion-color-primary, #10B981);
        }

        &.under_recovered {
          border-left-color: #F59E0B;
        }

        &.critical {
          border-left-color: #EF4444;
        }
      }

      .alert-header {
        display: flex;
        align-items: center;
        gap: 8px;

        > ion-icon {
          font-size: 24px;
        }

        ion-card-title {
          flex: 1;
          font-size: 18px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      .status-display {
        margin-bottom: 16px;

        .status-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;

          ion-badge {
            font-size: 13px;
            padding: 6px 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .score-value {
            font-size: 18px;
            font-weight: 700;
            color: var(--fitos-text-primary, #F5F5F5);
            font-family: 'Space Mono', monospace;
          }
        }

        .status-message {
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
          line-height: 1.5;
        }
      }

      .recommendations {
        padding: 12px;
        background: var(--fitos-bg-tertiary, #262626);
        border-radius: 12px;
        margin-bottom: 16px;

        h4 {
          font-size: 11px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .adjustment-options {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;

          .adjustment-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 8px;
            background: var(--fitos-bg-primary, #0D0D0D);
            border-radius: 10px;

            .adjustment-label {
              font-size: 11px;
              color: var(--fitos-text-tertiary, #737373);
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 500;
            }

            ion-badge {
              font-size: 18px;
              font-weight: 700;
              padding: 6px 12px;
              align-self: flex-start;
              font-family: 'Space Mono', monospace;
            }
          }
        }

        .adjustment-note {
          font-size: 12px;
          line-height: 1.4;
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }

      .actions {
        display: flex;
        flex-direction: column;
        gap: 8px;

        ion-button[expand="block"] {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .secondary-actions {
          display: flex;
          gap: 8px;

          ion-button {
            flex: 1;
          }
        }
      }

      .good-recovery {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px;
        text-align: center;

        ion-note {
          font-size: 14px;
          line-height: 1.5;
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }

      .info-button {
        margin-top: 8px;
      }
    `,
  ],
})
export class RecoveryAlertComponent implements OnInit {
  @Input({ required: true }) userId!: string;
  @Input() workoutId?: string;

  @Output() adjustmentAccepted = new EventEmitter<{
    intensity: number;
    volume: number;
  }>();

  @Output() adjustmentRejected = new EventEmitter<void>();

  service = inject(RecoveryService);
  private alertCtrl = inject(AlertController);

  // State
  score = signal<RecoveryScore | null>(null);
  dismissed = signal(false);
  processing = signal(false);

  constructor() {
    addIcons({
      warningOutline,
      checkmarkOutline,
      closeOutline,
      informationCircleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadRecoveryScore();
  }

  async loadRecoveryScore(): Promise<void> {
    const score = await this.service.getTodayScore(this.userId);
    this.score.set(score);

    // Auto-acknowledge if recovered/moderate
    if (score && (score.category === 'recovered' || score.category === 'moderate')) {
      await this.service.acknowledgeScore(score.id);
    }
  }

  async acceptAdjustment(): Promise<void> {
    const currentScore = this.score();
    if (!currentScore) return;

    this.processing.set(true);

    try {
      // Log decision
      const log: RecoveryAdjustmentLog = {
        user_id: this.userId,
        recovery_score_id: currentScore.id,
        workout_id: this.workoutId,
        recovery_category: currentScore.category,
        overall_score: currentScore.overall_score,
        suggested_intensity_modifier: currentScore.intensity_modifier,
        suggested_volume_modifier: currentScore.volume_modifier,
        action_taken: 'accepted',
        actual_intensity_modifier: currentScore.intensity_modifier,
        actual_volume_modifier: currentScore.volume_modifier,
      };

      await this.service.logAdjustment(log);

      // Acknowledge score
      await this.service.acknowledgeScore(currentScore.id);

      // Emit event with modifiers
      this.adjustmentAccepted.emit({
        intensity: currentScore.intensity_modifier,
        volume: currentScore.volume_modifier,
      });

      this.dismissed.set(true);
    } catch (err) {
      console.error('Error accepting adjustment:', err);
    } finally {
      this.processing.set(false);
    }
  }

  async modifyAdjustment(): Promise<void> {
    const currentScore = this.score();
    if (!currentScore) return;

    const alert = await this.alertCtrl.create({
      header: 'Custom Adjustments',
      message: 'Enter your preferred adjustments (as percentages)',
      inputs: [
        {
          name: 'intensity',
          type: 'number',
          placeholder: 'Intensity (-50 to +20)',
          value: Math.round((currentScore.intensity_modifier - 1) * 100),
          min: -50,
          max: 20,
        },
        {
          name: 'volume',
          type: 'number',
          placeholder: 'Volume (-50 to +20)',
          value: Math.round((currentScore.volume_modifier - 1) * 100),
          min: -50,
          max: 20,
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Apply',
          handler: async (data) => {
            const intensityMod = 1 + (data.intensity / 100);
            const volumeMod = 1 + (data.volume / 100);

            // Log decision
            const log: RecoveryAdjustmentLog = {
              user_id: this.userId,
              recovery_score_id: currentScore.id,
              workout_id: this.workoutId,
              recovery_category: currentScore.category,
              overall_score: currentScore.overall_score,
              suggested_intensity_modifier: currentScore.intensity_modifier,
              suggested_volume_modifier: currentScore.volume_modifier,
              action_taken: 'modified',
              actual_intensity_modifier: intensityMod,
              actual_volume_modifier: volumeMod,
            };

            await this.service.logAdjustment(log);
            await this.service.acknowledgeScore(currentScore.id);

            this.adjustmentAccepted.emit({
              intensity: intensityMod,
              volume: volumeMod,
            });

            this.dismissed.set(true);
          },
        },
      ],
    });

    await alert.present();
  }

  async rejectAdjustment(): Promise<void> {
    const currentScore = this.score();
    if (!currentScore) return;

    const confirm = await this.alertCtrl.create({
      header: 'Proceed Without Adjustments?',
      message: 'Your recovery is low. Training at full intensity may increase injury risk and delay recovery.',
      buttons: [
        {
          text: 'Go Back',
          role: 'cancel',
        },
        {
          text: 'Proceed Anyway',
          role: 'destructive',
          handler: async () => {
            // Log decision
            const log: RecoveryAdjustmentLog = {
              user_id: this.userId,
              recovery_score_id: currentScore.id,
              workout_id: this.workoutId,
              recovery_category: currentScore.category,
              overall_score: currentScore.overall_score,
              suggested_intensity_modifier: currentScore.intensity_modifier,
              suggested_volume_modifier: currentScore.volume_modifier,
              action_taken: 'rejected',
            };

            await this.service.logAdjustment(log);
            await this.service.acknowledgeScore(currentScore.id);

            this.adjustmentRejected.emit();
            this.dismissed.set(true);
          },
        },
      ],
    });

    await confirm.present();
  }

  dismiss(): void {
    const currentScore = this.score();
    if (currentScore) {
      this.service.acknowledgeScore(currentScore.id);
    }
    this.dismissed.set(true);
  }

  async showInfo(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Recovery Score',
      message: `
        <p>Your recovery score is calculated from:</p>
        <ul>
          <li><strong>HRV (35%):</strong> Heart rate variability</li>
          <li><strong>Sleep (35%):</strong> Duration, efficiency, quality</li>
          <li><strong>Resting HR (20%):</strong> Morning heart rate</li>
          <li><strong>How You Feel (10%):</strong> Energy, soreness, stress</li>
        </ul>
        <p><strong>Adjustment Guidelines:</strong></p>
        <p>When under-recovered, reducing intensity and volume helps prevent overtraining, supports recovery, and maintains long-term progress.</p>
      `,
      buttons: ['Got It'],
    });

    await alert.present();
  }

  getIconName(): string {
    const currentScore = this.score();
    if (!currentScore) return 'information-circle-outline';

    switch (currentScore.category) {
      case 'critical':
      case 'under_recovered':
        return 'warning-outline';
      default:
        return 'checkmark-outline';
    }
  }

  formatModifier(modifier: number): string {
    const percent = Math.round((modifier - 1) * 100);
    if (percent > 0) {
      return `+${percent}%`;
    } else if (percent < 0) {
      return `${percent}%`;
    }
    return '0%';
  }
}
