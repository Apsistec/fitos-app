import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, rocketOutline } from 'ionicons/icons';
import { TrainerMethodologyService } from '@app/core/services/trainer-methodology.service';
import { MethodologyQuestionnaireComponent } from '../../components/methodology-questionnaire/methodology-questionnaire.component';

/**
 * MethodologySetupPage - Wizard for setting up Coach Brain
 *
 * Features:
 * - Multi-step wizard for methodology setup
 * - Progress indication
 * - Preview of how AI will use methodology
 * - Optional skip for later
 *
 * Route: /tabs/coaching/methodology-setup
 */
@Component({
  selector: 'app-methodology-setup',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon,
    IonProgressBar,
    MethodologyQuestionnaireComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/coaching"></ion-back-button>
        </ion-buttons>
        <ion-title>Coach Brain Setup</ion-title>
        @if (showSkip()) {
          <ion-buttons slot="end">
            <ion-button (click)="skip()">Skip for now</ion-button>
          </ion-buttons>
        }
      </ion-toolbar>

      @if (currentStep() < 3) {
        <ion-toolbar>
          <ion-progress-bar [value]="progress()"></ion-progress-bar>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content>
      <div class="setup-container">
        @switch (currentStep()) {
          <!-- Step 1: Introduction -->
          @case (1) {
            <div class="intro-section">
              <ion-icon name="rocket-outline" class="hero-icon" color="primary"></ion-icon>
              <h1>Welcome to Coach Brain</h1>
              <p class="subtitle">
                Train your AI assistant to sound like you, not a generic chatbot.
              </p>

              <div class="benefits">
                <div class="benefit">
                  <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                  <div>
                    <h3>Your Voice, Amplified</h3>
                    <p>The AI learns your coaching philosophy and communication style</p>
                  </div>
                </div>

                <div class="benefit">
                  <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                  <div>
                    <h3>24/7 Support for Clients</h3>
                    <p>Answer questions instantly while maintaining your unique approach</p>
                  </div>
                </div>

                <div class="benefit">
                  <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
                  <div>
                    <h3>Always Improving</h3>
                    <p>Review and approve responses to continuously refine the AI</p>
                  </div>
                </div>
              </div>

              <ion-button expand="block" (click)="nextStep()">
                Get Started
              </ion-button>
            </div>
          }

          <!-- Step 2: Methodology Questionnaire -->
          @case (2) {
            <div class="questionnaire-section">
              <h2>Tell Us About Your Approach</h2>
              <p class="subtitle">
                This helps the AI understand how you coach and communicate.
                You can always update this later.
              </p>

              <app-methodology-questionnaire
                (completed)="handleMethodologyComplete()">
              </app-methodology-questionnaire>
            </div>
          }

          <!-- Step 3: Completion -->
          @case (3) {
            <div class="completion-section">
              <ion-icon name="checkmark-circle-outline" class="success-icon" color="success"></ion-icon>
              <h1>You're All Set!</h1>
              <p class="subtitle">
                Coach Brain is now learning your methodology and will start
                responding to your clients in your voice.
              </p>

              <div class="next-steps">
                <h3>What Happens Next?</h3>
                <ul>
                  <li>The AI will use your methodology to generate personalized responses</li>
                  <li>You'll be able to review and approve responses in the "Review" tab</li>
                  <li>The more you review, the better the AI becomes at matching your voice</li>
                  <li>You can update your methodology anytime in Settings</li>
                </ul>
              </div>

              <ion-button expand="block" (click)="finish()">
                <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
                Start Using Coach Brain
              </ion-button>
            </div>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .setup-container {
      max-width: 800px;
      margin: 0 auto;
      padding: var(--fitos-space-6) var(--fitos-space-4);
    }

    .intro-section,
    .completion-section {
      text-align: center;
    }

    .hero-icon {
      font-size: 80px;
      margin-bottom: var(--fitos-space-4);
    }

    .success-icon {
      font-size: 100px;
      margin-bottom: var(--fitos-space-4);
    }

    h1 {
      margin: 0 0 var(--fitos-space-3) 0;
      font-size: var(--fitos-text-3xl);
      font-weight: 700;
      color: var(--fitos-text-primary);
    }

    .subtitle {
      margin: 0 0 var(--fitos-space-6) 0;
      font-size: var(--fitos-text-lg);
      color: var(--fitos-text-secondary);
      line-height: 1.6;
    }

    .benefits {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-4);
      margin-bottom: var(--fitos-space-8);
      text-align: left;
    }

    .benefit {
      display: flex;
      gap: var(--fitos-space-3);
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-secondary);
      border-radius: var(--fitos-radius-lg);
      border: 1px solid var(--fitos-border-subtle);

      ion-icon {
        font-size: 32px;
        flex-shrink: 0;
        margin-top: 4px;
      }

      h3 {
        margin: 0 0 var(--fitos-space-1) 0;
        font-size: var(--fitos-text-base);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-secondary);
        line-height: 1.5;
      }
    }

    .questionnaire-section {
      h2 {
        margin: 0 0 var(--fitos-space-2) 0;
        font-size: var(--fitos-text-2xl);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      .subtitle {
        text-align: left;
        margin-bottom: var(--fitos-space-6);
      }
    }

    .next-steps {
      background: var(--fitos-bg-secondary);
      border-radius: var(--fitos-radius-lg);
      border: 1px solid var(--fitos-border-subtle);
      padding: var(--fitos-space-5);
      margin: var(--fitos-space-6) 0;
      text-align: left;

      h3 {
        margin: 0 0 var(--fitos-space-3) 0;
        font-size: var(--fitos-text-lg);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      ul {
        margin: 0;
        padding-left: var(--fitos-space-5);
        color: var(--fitos-text-secondary);
        line-height: 1.8;

        li {
          margin-bottom: var(--fitos-space-2);
        }
      }
    }

    ion-button {
      margin-top: var(--fitos-space-4);
    }

    @media (min-width: 768px) {
      .setup-container {
        padding: var(--fitos-space-8) var(--fitos-space-6);
      }
    }
  `]
})
export class MethodologySetupPage implements OnInit {
  private router = inject(Router);
  private methodologyService = inject(TrainerMethodologyService);

  currentStep = signal(1);
  showSkip = signal(true);

  constructor() {
    addIcons({ checkmarkCircleOutline, rocketOutline });
  }

  async ngOnInit() {
    // Check if methodology already exists
    const hasCompleted = await this.methodologyService.hasCompletedSetup();
    if (hasCompleted) {
      // Skip directly to completion step if already set up
      this.currentStep.set(3);
      this.showSkip.set(false);
    }
  }

  progress(): number {
    return this.currentStep() / 3;
  }

  nextStep(): void {
    this.currentStep.update(step => step + 1);
  }

  handleMethodologyComplete(): void {
    this.nextStep();
  }

  skip(): void {
    this.router.navigate(['/tabs/coaching']);
  }

  finish(): void {
    this.router.navigate(['/tabs/coaching']);
  }
}
