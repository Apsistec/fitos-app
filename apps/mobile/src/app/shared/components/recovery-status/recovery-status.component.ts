import {
  Component,
  OnInit,
  Input,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonProgressBar,
  IonSpinner,
  IonNote,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  heartOutline,
  trendingUpOutline,
  trendingDownOutline,
  removeOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

import {
  RecoveryService,
  RecoveryScore,
} from '../../../core/services/recovery.service';

/**
 * RecoveryStatusComponent - Display user's recovery status
 *
 * Features:
 * - Shows today's recovery score and category
 * - Visual indicator (progress bar/ring)
 * - Trend arrow (improving/declining/stable)
 * - Quick adjustment recommendations
 * - Acknowledge/dismiss alerts
 *
 * Sprint 23: Wearable Recovery Integration
 */
@Component({
  selector: 'app-recovery-status',
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
    IonProgressBar,
    IonSpinner,
    IonNote,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="recovery-card">
      <ion-card-header>
        <div class="card-header">
          <ion-card-title>
            <ion-icon name="heart-outline" />
            Recovery Status
          </ion-card-title>
          @if (score() && !score()!.user_acknowledged && service.isUnderRecovered()) {
            <ion-badge color="warning">
              <ion-icon name="information-circle-outline" />
              Needs Attention
            </ion-badge>
          }
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" />
            <p>Loading recovery data...</p>
          </div>
        } @else if (score()) {
          <!-- Recovery Score Display -->
          <div class="score-display">
            <div class="score-circle">
              <svg viewBox="0 0 100 100" class="score-ring">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--fitos-bg-secondary)"
                  stroke-width="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  [attr.stroke]="getRingColor(score()!.category)"
                  stroke-width="8"
                  stroke-linecap="round"
                  [style.strokeDasharray]="getCircumference()"
                  [style.strokeDashoffset]="getDashOffset(score()!.overall_score)"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div class="score-text">
                <div class="score-number">{{ score()!.overall_score }}</div>
                <div class="score-label">Recovery</div>
              </div>
            </div>

            <div class="score-details">
              <ion-badge [color]="service.getCategoryColor(score()!.category)" class="category-badge">
                {{ service.getCategoryLabel(score()!.category) }}
              </ion-badge>

              @if (trend()) {
                <div class="trend">
                  @if (trend() === 'improving') {
                    <ion-icon name="trending-up-outline" color="success" />
                    <span class="trend-text success">Improving</span>
                  } @else if (trend() === 'declining') {
                    <ion-icon name="trending-down-outline" color="danger" />
                    <span class="trend-text danger">Declining</span>
                  } @else {
                    <ion-icon name="remove-outline" color="medium" />
                    <span class="trend-text">Stable</span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Component Scores -->
          @if (showDetails()) {
            <div class="component-scores">
              <h4>Details</h4>
              @if (score()!.hrv_score !== null && score()!.hrv_score !== undefined) {
                <div class="component-item">
                  <span class="component-label">HRV</span>
                  <div class="component-bar">
                    <ion-progress-bar [value]="score()!.hrv_score! / 100" />
                    <span class="component-value">{{ score()!.hrv_score }}</span>
                  </div>
                </div>
              }
              @if (score()!.sleep_score !== null && score()!.sleep_score !== undefined) {
                <div class="component-item">
                  <span class="component-label">Sleep</span>
                  <div class="component-bar">
                    <ion-progress-bar [value]="score()!.sleep_score! / 100" />
                    <span class="component-value">{{ score()!.sleep_score }}</span>
                  </div>
                </div>
              }
              @if (score()!.resting_hr_score !== null && score()!.resting_hr_score !== undefined) {
                <div class="component-item">
                  <span class="component-label">Heart Rate</span>
                  <div class="component-bar">
                    <ion-progress-bar [value]="score()!.resting_hr_score! / 100" />
                    <span class="component-value">{{ score()!.resting_hr_score }}</span>
                  </div>
                </div>
              }
              @if (score()!.subjective_score !== null && score()!.subjective_score !== undefined) {
                <div class="component-item">
                  <span class="component-label">How You Feel</span>
                  <div class="component-bar">
                    <ion-progress-bar [value]="score()!.subjective_score! / 100" />
                    <span class="component-value">{{ score()!.subjective_score }}</span>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Recommendation -->
          <div class="recommendation">
            <p class="recommendation-text">{{ score()!.suggested_action }}</p>

            @if (service.isUnderRecovered()) {
              <div class="adjustment-info">
                <ion-note>
                  <strong>Recommended Adjustments:</strong>
                  Intensity {{ formatModifier(score()!.intensity_modifier) }},
                  Volume {{ formatModifier(score()!.volume_modifier) }}
                </ion-note>
              </div>
            }
          </div>

          <!-- Actions -->
          <div class="actions">
            @if (!score()!.user_acknowledged && service.isUnderRecovered()) {
              <ion-button expand="block" size="small" (click)="acknowledgeAlert()">
                <ion-icon slot="start" name="checkmark-circle-outline" />
                Got It
              </ion-button>
            }
            <ion-button fill="clear" size="small" (click)="toggleDetails()">
              {{ showDetails() ? 'Hide Details' : 'Show Details' }}
            </ion-button>
            <ion-button fill="clear" size="small" (click)="showInfo()">
              <ion-icon slot="icon-only" name="information-circle-outline" />
            </ion-button>
          </div>
        } @else {
          <div class="empty-state">
            <ion-icon name="heart-outline" />
            <p>No recovery data for today</p>
            <ion-note>
              Connect a wearable device or manually log your recovery metrics.
            </ion-note>
            <ion-button fill="outline" size="small" (click)="goToWearables()">
              Connect Device
            </ion-button>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .recovery-card {
        margin: var(--fitos-space-4);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--fitos-space-2);

        ion-card-title {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-lg);
          font-weight: 600;

          ion-icon {
            font-size: 20px;
            color: var(--fitos-accent-primary);
          }
        }

        ion-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: var(--fitos-font-size-xs);
          padding: 4px 10px;

          ion-icon {
            font-size: 14px;
          }
        }
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--fitos-space-6) var(--fitos-space-4);
        text-align: center;

        ion-icon {
          font-size: 48px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-2);
        }

        ion-spinner {
          margin-bottom: var(--fitos-space-2);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-2) 0;
        }

        ion-note {
          font-size: var(--fitos-font-size-sm);
          margin-bottom: var(--fitos-space-3);
        }
      }

      .score-display {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-4);
        padding: var(--fitos-space-3) 0;
      }

      .score-circle {
        position: relative;
        width: 120px;
        height: 120px;
        flex-shrink: 0;

        .score-ring {
          width: 100%;
          height: 100%;
          transform: rotate(0deg);
          transition: stroke-dashoffset 0.5s ease;
        }

        .score-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;

          .score-number {
            font-size: 32px;
            font-weight: 700;
            color: var(--fitos-text-primary);
            line-height: 1;
          }

          .score-label {
            font-size: var(--fitos-font-size-xs);
            color: var(--fitos-text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
          }
        }
      }

      .score-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--fitos-space-2);

        .category-badge {
          font-size: var(--fitos-font-size-base);
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .trend {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-1);

          ion-icon {
            font-size: 18px;
          }

          .trend-text {
            font-size: var(--fitos-font-size-sm);
            color: var(--fitos-text-secondary);

            &.success {
              color: var(--ion-color-success);
            }

            &.danger {
              color: var(--ion-color-danger);
            }
          }
        }
      }

      .component-scores {
        margin-top: var(--fitos-space-4);
        padding-top: var(--fitos-space-4);
        border-top: 1px solid var(--fitos-border-color);

        h4 {
          font-size: var(--fitos-font-size-base);
          font-weight: 600;
          color: var(--fitos-text-primary);
          margin: 0 0 var(--fitos-space-3) 0;
        }

        .component-item {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          margin-bottom: var(--fitos-space-2);

          &:last-child {
            margin-bottom: 0;
          }

          .component-label {
            font-size: var(--fitos-font-size-sm);
            color: var(--fitos-text-secondary);
            min-width: 80px;
          }

          .component-bar {
            flex: 1;
            display: flex;
            align-items: center;
            gap: var(--fitos-space-2);

            ion-progress-bar {
              flex: 1;
              height: 8px;
              border-radius: 4px;
            }

            .component-value {
              font-size: var(--fitos-font-size-sm);
              font-weight: 600;
              color: var(--fitos-text-primary);
              min-width: 30px;
              text-align: right;
            }
          }
        }
      }

      .recommendation {
        margin-top: var(--fitos-space-4);
        padding: var(--fitos-space-3);
        background: var(--fitos-bg-secondary);
        border-radius: var(--fitos-border-radius);

        .recommendation-text {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-primary);
          margin: 0 0 var(--fitos-space-2) 0;
          line-height: 1.5;
        }

        .adjustment-info {
          ion-note {
            font-size: var(--fitos-font-size-sm);
            line-height: 1.4;

            strong {
              color: var(--fitos-text-primary);
            }
          }
        }
      }

      .actions {
        display: flex;
        gap: var(--fitos-space-2);
        margin-top: var(--fitos-space-3);
        flex-wrap: wrap;

        ion-button {
          flex: 1;
          min-width: 120px;
        }
      }
    `,
  ],
})
export class RecoveryStatusComponent implements OnInit {
  @Input({ required: true }) userId!: string;
  @Input() compact: boolean = false;

  service = inject(RecoveryService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);

  // State
  score = this.service.currentScore;
  loading = signal(false);
  showDetails = signal(false);
  trend = signal<'improving' | 'declining' | 'stable' | null>(null);

  constructor() {
    addIcons({
      heartOutline,
      trendingUpOutline,
      trendingDownOutline,
      removeOutline,
      informationCircleOutline,
      checkmarkCircleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadRecoveryData();
  }

  async loadRecoveryData(): Promise<void> {
    this.loading.set(true);

    try {
      // Load today's score
      await this.service.getTodayScore(this.userId);

      // Load recent scores for trend
      await this.service.getRecentScores(this.userId, 7);

      // Calculate trend
      const trendResult = this.service.getTrend();
      this.trend.set(trendResult);
    } catch (err) {
      console.error('Error loading recovery data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async acknowledgeAlert(): Promise<void> {
    const currentScore = this.score();
    if (!currentScore) return;

    const success = await this.service.acknowledgeScore(currentScore.id);
    if (success) {
      // Score will be updated via signal in service
    }
  }

  toggleDetails(): void {
    this.showDetails.update((v) => !v);
  }

  async showInfo(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Recovery Score',
      message: `
        <p><strong>Your recovery score is calculated from:</strong></p>
        <ul>
          <li>HRV (35%): Heart rate variability</li>
          <li>Sleep (35%): Duration, efficiency, and quality</li>
          <li>Resting HR (20%): Morning heart rate</li>
          <li>How You Feel (10%): Energy, soreness, stress</li>
        </ul>
        <p><strong>Categories:</strong></p>
        <ul>
          <li>80-100: Recovered (ready for high intensity)</li>
          <li>60-79: Moderate (normal training)</li>
          <li>40-59: Under-recovered (reduce volume/intensity)</li>
          <li>0-39: Critical (rest recommended)</li>
        </ul>
      `,
      buttons: ['Got It'],
    });

    await alert.present();
  }

  goToWearables(): void {
    this.router.navigate(['/tabs/settings/wearables']);
  }

  getRingColor(category: string): string {
    switch (category) {
      case 'recovered':
        return 'var(--ion-color-success)';
      case 'moderate':
        return 'var(--ion-color-primary)';
      case 'under_recovered':
        return 'var(--ion-color-warning)';
      case 'critical':
        return 'var(--ion-color-danger)';
      default:
        return 'var(--ion-color-medium)';
    }
  }

  getCircumference(): string {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    return `${circumference} ${circumference}`;
  }

  getDashOffset(score: number): number {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    return offset;
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
