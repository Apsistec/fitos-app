import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * Celebration Modal Component
 *
 * Animated modal shown when client achieves a milestone.
 * Displays progress, achievement, and bonus information.
 */
@Component({
  selector: 'fit-celebration-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('scaleIn', [
      state('void', style({ transform: 'scale(0)', opacity: 0 })),
      state('*', style({ transform: 'scale(1)', opacity: 1 })),
      transition('void => *', animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)'))
    ]),
    trigger('slideUp', [
      state('void', style({ transform: 'translateY(100%)', opacity: 0 })),
      state('*', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void => *', animate('400ms ease-out'))
    ])
  ],
  template: `
    <div class="celebration-container">
      <!-- Confetti Background -->
      <div class="confetti-container">
        @for (item of confettiItems; track $index) {
          <div
            class="confetti"
            [style.left.%]="item.left"
            [style.animation-delay.s]="item.delay"
            [style.background-color]="item.color"
          ></div>
        }
      </div>

      <!-- Content -->
      <div class="content" @slideUp>
        <!-- Trophy Icon -->
        <div class="trophy-container" @scaleIn>
          <ion-icon name="trophy" class="trophy-icon"></ion-icon>
          <div class="trophy-shine"></div>
        </div>

        <!-- Message -->
        <h1 class="celebration-title">{{ title }}</h1>
        <p class="celebration-message">{{ message }}</p>

        <!-- Milestone Badge -->
        @if (milestonePercent) {
          <div class="milestone-badge">
            <span class="percent">{{ milestonePercent }}%</span>
            <span class="label">Milestone Achieved</span>
          </div>
        }

        <!-- Goal Progress -->
        @if (goalData) {
          <ion-card class="progress-card">
            <ion-card-content>
              <div class="progress-stats">
                <div class="stat">
                  <span class="label">Start</span>
                  <span class="value">{{ goalData.startValue }} {{ goalData.unit }}</span>
                </div>
                <ion-icon name="arrow-forward" class="arrow"></ion-icon>
                <div class="stat highlight">
                  <span class="label">Current</span>
                  <span class="value">{{ goalData.currentValue }} {{ goalData.unit }}</span>
                </div>
                <ion-icon name="arrow-forward" class="arrow"></ion-icon>
                <div class="stat">
                  <span class="label">Target</span>
                  <span class="value">{{ goalData.targetValue }} {{ goalData.unit }}</span>
                </div>
              </div>

              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="goalData.progressPercent"></div>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- Bonus Info -->
        @if (bonusAmount) {
          <div class="bonus-info">
            <ion-icon name="gift-outline"></ion-icon>
            <div>
              <strong>{{ formatBonus(bonusAmount) }} Bonus Applied</strong>
              <p>Rewarding your amazing progress!</p>
            </div>
          </div>
        }

        <!-- Next Milestone -->
        @if (nextMilestone) {
          <div class="next-milestone">
            <ion-icon name="flag-outline"></ion-icon>
            <span>Next milestone: {{ nextMilestone }}%</span>
          </div>
        }

        <!-- Actions -->
        <div class="actions">
          @if (shareEnabled) {
            <ion-button expand="block" fill="outline" (click)="onShare()">
              <ion-icon name="share-social-outline" slot="start"></ion-icon>
              Share Achievement
            </ion-button>
          }
          <ion-button expand="block" (click)="onContinue()">
            Continue
          </ion-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .celebration-container {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, var(--fitos-bg-primary, #0D0D0D) 0%, #1a1a1a 100%);
      overflow: hidden;
    }

    /* Confetti Animation */
    .confetti-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    }

    .confetti {
      position: absolute;
      width: 10px;
      height: 10px;
      top: -10px;
      animation: confetti-fall 3s linear infinite;
    }

    @keyframes confetti-fall {
      0% {
        top: -10%;
        transform: rotate(0deg);
      }
      100% {
        top: 110%;
        transform: rotate(360deg);
      }
    }

    /* Content */
    .content {
      position: relative;
      z-index: 1;
      max-width: 500px;
      width: 100%;
      text-align: center;
    }

    /* Trophy */
    .trophy-container {
      position: relative;
      display: inline-block;
      margin-bottom: 24px;
    }

    .trophy-icon {
      font-size: 120px;
      color: var(--ion-color-warning);
      filter: drop-shadow(0 8px 16px rgba(251, 191, 36, 0.4));
    }

    .trophy-shine {
      position: absolute;
      top: 20%;
      left: 20%;
      width: 60%;
      height: 60%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
      border-radius: 50%;
      animation: shine 2s ease-in-out infinite;
    }

    @keyframes shine {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
    }

    /* Text */
    .celebration-title {
      font-size: 32px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .celebration-message {
      font-size: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    /* Milestone Badge */
    .milestone-badge {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 32px;
      background: linear-gradient(135deg, var(--fitos-accent-primary, #10B981) 0%, #059669 100%);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
    }

    .milestone-badge .percent {
      font-size: 48px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      color: white;
      line-height: 1;
    }

    .milestone-badge .label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    /* Progress Card */
    .progress-card {
      margin: 24px 0;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    .progress-stats {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .stat .label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat .value {
      font-size: 16px;
      font-weight: 600;
      font-family: 'Space Mono', monospace;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .stat.highlight .value {
      font-size: 20px;
      color: var(--fitos-accent-primary, #10B981);
    }

    .stat .arrow {
      color: var(--fitos-text-tertiary, #737373);
    }

    .progress-bar {
      height: 8px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--fitos-accent-primary, #10B981) 0%, #059669 100%);
      transition: width 0.5s ease;
    }

    /* Bonus Info */
    .bonus-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(16, 185, 129, 0.1);
      border: 2px solid var(--fitos-accent-primary, #10B981);
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .bonus-info ion-icon {
      font-size: 32px;
      color: var(--fitos-accent-primary, #10B981);
    }

    .bonus-info div {
      text-align: left;
      flex: 1;
    }

    .bonus-info strong {
      display: block;
      font-size: 16px;
      color: var(--fitos-text-primary, #F5F5F5);
      margin-bottom: 2px;
    }

    .bonus-info p {
      margin: 0;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    /* Next Milestone */
    .next-milestone {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .next-milestone ion-icon {
      font-size: 20px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .next-milestone span {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    /* Actions */
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  `]
})
export class CelebrationModalComponent {
  private readonly modalController = inject(ModalController);

  @Input() title = 'Congratulations!';
  @Input() message = 'You\'ve achieved a major milestone!';
  @Input() milestonePercent?: number;
  @Input() bonusAmount?: number;
  @Input() nextMilestone?: number;
  @Input() goalData?: {
    startValue: number;
    currentValue: number;
    targetValue: number;
    unit: string;
    progressPercent: number;
  };
  @Input() shareEnabled = true;

  confettiItems = this.generateConfetti();

  generateConfetti() {
    const colors = [
      'var(--ion-color-primary)',
      'var(--ion-color-secondary)',
      'var(--fitos-accent-primary, #10B981)',
      'var(--ion-color-warning)',
      '#8B5CF6'
    ];

    return Array.from({ length: 50 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
  }

  formatBonus(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  onShare() {
    // TODO: Implement native share functionality
    console.log('Share achievement');
    // Could use Capacitor Share API or generate shareable card
  }

  onContinue() {
    this.modalController.dismiss();
  }
}
