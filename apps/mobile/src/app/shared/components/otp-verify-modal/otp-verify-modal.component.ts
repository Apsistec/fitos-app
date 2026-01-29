import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, shieldCheckmarkOutline, refreshOutline } from 'ionicons/icons';
import { OtpInputComponent } from '../otp-input/otp-input.component';

export interface OtpVerifyResult {
  success: boolean;
  code?: string;
  cancelled?: boolean;
}

@Component({
  selector: 'app-otp-verify-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonSpinner,
    OtpInputComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button (click)="cancel()" [disabled]="isVerifying()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="verify-container">
        <!-- Header -->
        <div class="verify-header">
          <div class="icon-wrapper" [class.error]="hasError()" [class.verifying]="isVerifying()">
            @if (isVerifying()) {
              <ion-spinner name="crescent" color="primary"></ion-spinner>
            } @else {
              <ion-icon name="shield-checkmark-outline"></ion-icon>
            }
          </div>
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}</p>
        </div>

        <!-- OTP Input -->
        <app-otp-input
          #otpInput
          [length]="6"
          [error]="hasError()"
          [success]="isSuccess()"
          [disabled]="isVerifying()"
          (codeComplete)="onCodeComplete($event)"
          (codeChange)="onCodeChange($event)"
        />

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="error-container">
            <p class="error-message">{{ errorMessage() }}</p>
            <ion-button fill="clear" size="small" (click)="retry()">
              <ion-icon name="refresh-outline" slot="start"></ion-icon>
              Try Again
            </ion-button>
          </div>
        }

        <!-- Help Text -->
        <p class="help-text">
          {{ helpText }}
        </p>

        <!-- Actions -->
        <div class="actions">
          @if (showManualSubmit && !isVerifying()) {
            <ion-button
              expand="block"
              [disabled]="currentCode().length !== 6"
              (click)="submitCode()"
            >
              Verify Code
            </ion-button>
          }

          <ion-button fill="clear" expand="block" (click)="cancel()" [disabled]="isVerifying()">
            Cancel
          </ion-button>
        </div>

        <!-- Alternative Options -->
        @if (showRecoveryOption) {
          <div class="alternative-section">
            <p>Lost access to your authenticator?</p>
            <ion-button fill="clear" size="small" (click)="useRecoveryCode()">
              Use Recovery Code
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .verify-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 400px;
      margin: 0 auto;
      padding-top: 16px;
    }

    .verify-header {
      text-align: center;
      margin-bottom: 24px;

      .icon-wrapper {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(var(--ion-color-primary-rgb), 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        transition: all 0.3s ease;

        ion-icon {
          font-size: 40px;
          color: var(--ion-color-primary);
        }

        ion-spinner {
          width: 36px;
          height: 36px;
        }

        &.error {
          background: rgba(var(--ion-color-danger-rgb), 0.1);

          ion-icon {
            color: var(--ion-color-danger);
          }
        }

        &.verifying {
          animation: pulse 1.5s ease-in-out infinite;
        }
      }

      h2 {
        margin: 0 0 8px;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ion-text-color);
      }

      p {
        margin: 0;
        font-size: 0.95rem;
        color: var(--ion-color-medium);
        line-height: 1.4;
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
    }

    .error-container {
      text-align: center;
      margin: 16px 0;
      padding: 16px;
      background: rgba(var(--ion-color-danger-rgb), 0.08);
      border-radius: 12px;
      width: 100%;

      .error-message {
        margin: 0 0 8px;
        color: var(--ion-color-danger);
        font-size: 0.9rem;
        font-weight: 500;
      }

      ion-button {
        --color: var(--ion-color-danger);
      }
    }

    .help-text {
      text-align: center;
      font-size: 0.85rem;
      color: var(--ion-color-medium);
      margin: 8px 0 24px;
      max-width: 280px;
      line-height: 1.4;
    }

    .actions {
      width: 100%;
      margin-top: 8px;

      ion-button {
        margin-bottom: 8px;
      }
    }

    .alternative-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--ion-color-light-shade);
      text-align: center;
      width: 100%;

      p {
        margin: 0 0 8px;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
      }
    }

    /* Dark mode */
    :host-context(.dark) {
      .verify-header .icon-wrapper {
        background: rgba(var(--ion-color-primary-rgb), 0.15);
      }

      .error-container {
        background: rgba(var(--ion-color-danger-rgb), 0.12);
      }
    }
  `],
})
export class OtpVerifyModalComponent {
  @ViewChild('otpInput') otpInput!: OtpInputComponent;

  @Input() title = 'Enter Verification Code';
  @Input() subtitle = 'Enter the 6-digit code from your authenticator app';
  @Input() helpText = 'Open your authenticator app to view your verification code';
  @Input() showManualSubmit = false;
  @Input() showRecoveryOption = false;
  @Input() autoSubmit = true;

  @Output() verify = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() recoveryCode = new EventEmitter<void>();

  isVerifying = signal(false);
  hasError = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  currentCode = signal('');

  constructor() {
    addIcons({ closeOutline, shieldCheckmarkOutline, refreshOutline });
  }

  onCodeComplete(code: string): void {
    if (this.autoSubmit && !this.isVerifying()) {
      this.submitCode(code);
    }
  }

  onCodeChange(code: string): void {
    this.currentCode.set(code);
    // Clear error when user starts typing
    if (this.hasError()) {
      this.hasError.set(false);
      this.errorMessage.set(null);
    }
  }

  submitCode(code?: string): void {
    const codeToSubmit = code || this.currentCode();
    if (codeToSubmit.length !== 6) return;

    this.isVerifying.set(true);
    this.hasError.set(false);
    this.errorMessage.set(null);

    this.verify.emit(codeToSubmit);
  }

  /** Call this from parent to show verification success */
  setSuccess(): void {
    this.isVerifying.set(false);
    this.isSuccess.set(true);
    this.hasError.set(false);
    this.errorMessage.set(null);
  }

  /** Call this from parent to show verification error */
  setError(message: string = 'Invalid code. Please try again.'): void {
    this.isVerifying.set(false);
    this.isSuccess.set(false);
    this.hasError.set(true);
    this.errorMessage.set(message);
  }

  /** Call this from parent to reset the state for retry */
  reset(): void {
    this.isVerifying.set(false);
    this.hasError.set(false);
    this.isSuccess.set(false);
    this.errorMessage.set(null);
    this.otpInput?.clear();
  }

  retry(): void {
    this.reset();
  }

  cancel(): void {
    this.cancelled.emit();
  }

  useRecoveryCode(): void {
    this.recoveryCode.emit();
  }
}
