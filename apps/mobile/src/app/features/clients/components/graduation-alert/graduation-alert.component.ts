import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  rocketOutline,
  sparklesOutline,
  arrowForwardOutline,
  closeOutline,
} from 'ionicons/icons';

import {
  AutonomyAssessment,
  RecommendedAction,
} from '../../../../core/services/autonomy.service';

interface ActionConfig {
  title: string;
  message: string;
  icon: string;
  color: string;
  actionLabel: string;
  showGraduateButton: boolean;
}

/**
 * GraduationAlertComponent - Alerts trainer when client is ready for graduation
 *
 * Shows different messages based on recommended action:
 * - continue_current: No alert shown
 * - increase_independence: Suggest giving client more autonomy
 * - reduce_frequency: Suggest reducing check-in frequency
 * - offer_graduation: Celebrate and offer full graduation
 */
@Component({
  selector: 'app-graduation-alert',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonCard,
    IonCardContent,
    IonIcon,
    IonButton
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (assessment && shouldShowAlert()) {
      <ion-card [class]="'graduation-alert ' + actionConfig.color">
        <ion-card-content>
          <div class="alert-content">
            <div class="alert-icon">
              <ion-icon [name]="actionConfig.icon" />
            </div>
            <div class="alert-text">
              <h3>{{ actionConfig.title }}</h3>
              <p>{{ actionConfig.message }}</p>
            </div>
            @if (dismissible) {
              <ion-button
                fill="clear"
                size="small"
                (click)="onDismiss()"
                class="dismiss-button"
                aria-label="Dismiss alert"
              >
                <ion-icon slot="icon-only" name="close-outline" />
              </ion-button>
            }
          </div>

          <div class="alert-actions">
            @if (actionConfig.showGraduateButton) {
              <ion-button
                expand="block"
                [color]="actionConfig.color"
                (click)="onGraduate()"
              >
                <ion-icon slot="start" name="rocket-outline" />
                {{ actionConfig.actionLabel }}
              </ion-button>
            } @else {
              <ion-button
                expand="block"
                fill="outline"
                [color]="actionConfig.color"
                (click)="onViewDetails()"
              >
                {{ actionConfig.actionLabel }}
                <ion-icon slot="end" name="arrow-forward-outline" />
              </ion-button>
            }
          </div>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: [
    `
      .graduation-alert {
        margin: 0 0 16px 0;
        border-left: 4px solid;
        border-radius: 12px;
        box-shadow: none;

        &.success {
          border-left-color: #10B981;
          --background: rgba(16, 185, 129, 0.08);
        }

        &.warning {
          border-left-color: #F59E0B;
          --background: rgba(245, 158, 11, 0.08);
        }

        &.primary {
          border-left-color: var(--ion-color-primary, #10B981);
          --background: rgba(16, 185, 129, 0.08);
        }
      }

      .alert-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }

      .alert-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--fitos-bg-secondary, #1A1A1A);
        flex-shrink: 0;

        ion-icon {
          font-size: 28px;
          color: var(--ion-color-primary, #10B981);
        }
      }

      .graduation-alert.success .alert-icon ion-icon {
        color: #10B981;
      }

      .graduation-alert.warning .alert-icon ion-icon {
        color: #F59E0B;
      }

      .graduation-alert.primary .alert-icon ion-icon {
        color: var(--ion-color-primary, #10B981);
      }

      .alert-text {
        flex: 1;
        min-width: 0;

        h3 {
          font-size: 14px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 4px 0;
        }

        p {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
          line-height: 1.5;
        }
      }

      .dismiss-button {
        --padding-start: 8px;
        --padding-end: 8px;
        margin: -8px -8px 0 0;

        ion-icon {
          font-size: 20px;
          color: var(--fitos-text-tertiary, #737373);
        }
      }

      .alert-actions {
        padding-top: 8px;

        ion-button {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
        }
      }
    `,
  ],
})
export class GraduationAlertComponent {
  @Input() assessment: AutonomyAssessment | null = null;
  @Input() clientId = '';
  @Input() dismissible = true;

  @Output() graduate = new EventEmitter<void>();
  @Output() viewDetails = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();

  private readonly actionConfigs: Record<RecommendedAction, ActionConfig> = {
    continue_current: {
      title: '',
      message: '',
      icon: '',
      color: '',
      actionLabel: '',
      showGraduateButton: false,
    },
    increase_independence: {
      title: 'Ready for More Independence',
      message:
        'This client is progressing well! Consider giving them more autonomy in workout modifications and nutrition decisions.',
      icon: 'trending-up-outline',
      color: 'primary',
      actionLabel: 'View Assessment',
      showGraduateButton: false,
    },
    reduce_frequency: {
      title: 'Consider Reducing Check-ins',
      message:
        'This client demonstrates strong independence! They may benefit from less frequent coaching sessions.',
      icon: 'sparkles-outline',
      color: 'warning',
      actionLabel: 'View Assessment',
      showGraduateButton: false,
    },
    offer_graduation: {
      title: '🎉 Client Ready for Graduation!',
      message:
        'Amazing progress! This client has demonstrated exceptional independence and is ready to graduate to maintenance mode.',
      icon: 'rocket-outline',
      color: 'success',
      actionLabel: 'Start Graduation',
      showGraduateButton: true,
    },
  };

  get actionConfig(): ActionConfig {
    if (!this.assessment) {
      return this.actionConfigs.continue_current;
    }
    return this.actionConfigs[this.assessment.recommended_action];
  }

  constructor() {
    addIcons({
      rocketOutline,
      sparklesOutline,
      arrowForwardOutline,
      closeOutline,
    });
  }

  shouldShowAlert(): boolean {
    if (!this.assessment) return false;
    return this.assessment.recommended_action !== 'continue_current';
  }

  onGraduate(): void {
    this.graduate.emit();
  }

  onViewDetails(): void {
    this.viewDetails.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}
