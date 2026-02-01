import { Component, inject, signal, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonSpinner,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, keyOutline, refreshOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { OtpInputComponent } from '../../../../shared/components/otp-input/otp-input.component';

@Component({
  selector: 'app-mfa-verify',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonSpinner,
    IonIcon,
    OtpInputComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Two-Factor Verification</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="mfa-verify-container">
        <!-- Header -->
        <div class="verify-header">
          <div class="icon-container" [class.verifying]="isVerifying()" [class.error]="hasError()" [class.success]="isSuccess()">
            @if (isVerifying()) {
              <ion-spinner name="crescent" color="primary"></ion-spinner>
            } @else {
              <ion-icon name="shield-checkmark-outline"></ion-icon>
            }
          </div>
          <h1>Verify Your Identity</h1>
          <p>Enter the 6-digit code from your authenticator app</p>
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
        <div class="help-section">
          <p>Open your authenticator app to view your verification code. The code refreshes every 30 seconds.</p>
        </div>

        <!-- Recovery Code Option -->
        <div class="recovery-section">
          <p>Lost access to your authenticator?</p>
          <ion-button fill="clear" size="small" (click)="useRecoveryCode()">
            Use Recovery Code
          </ion-button>
        </div>

        <!-- Sign Out Option -->
        <div class="signout-section">
          <ion-button fill="clear" (click)="signOut()">
            Sign out and use a different account
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .mfa-verify-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 16px 24px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .verify-header {
      text-align: center;
      margin-bottom: 16px;
      padding-top: 32px;

      .icon-container {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        transition: all 0.3s ease;

        ion-icon {
          font-size: 40px;
          color: var(--ion-color-primary, #10B981);
        }

        ion-spinner {
          width: 36px;
          height: 36px;
        }

        &.verifying {
          animation: pulse 1.5s ease-in-out infinite;
        }

        &.error {
          background: rgba(239, 68, 68, 0.1);

          ion-icon {
            color: #EF4444;
          }
        }

        &.success {
          background: rgba(16, 185, 129, 0.15);

          ion-icon {
            color: var(--ion-color-primary, #10B981);
          }
        }
      }

      h1 {
        margin: 0 0 12px;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
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
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
      width: 100%;

      .error-message {
        margin: 0 0 8px;
        color: #FCA5A5;
        font-size: 14px;
        font-weight: 500;
      }

      ion-button {
        --color: #FCA5A5;
      }
    }

    .help-section {
      text-align: center;
      margin-top: 24px;
      max-width: 280px;

      p {
        font-size: 13px;
        color: var(--fitos-text-tertiary, #737373);
        margin: 0;
        line-height: 1.5;
      }
    }

    .recovery-section {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      width: 100%;

      p {
        margin: 0 0 8px;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .signout-section {
      text-align: center;
      margin-top: 24px;
    }
  `],
})
export class MfaVerifyPage implements OnInit {
  @ViewChild('otpInput') otpInput!: OtpInputComponent;

  private router = inject(Router);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private toastController = inject(ToastController);

  isVerifying = signal(false);
  hasError = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  factorId = signal<string | null>(null);
  currentCode = signal('');

  constructor() {
    addIcons({ shieldCheckmarkOutline, keyOutline, refreshOutline });
  }

  ngOnInit(): void {
    this.loadFactorId();
  }

  private async loadFactorId(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.mfa.listFactors();

      if (error) {
        console.error('Error loading MFA factors:', error);
        this.errorMessage.set('Failed to load MFA configuration');
        return;
      }

      // Get the verified TOTP factor
      const verifiedTotp = data.totp.find(f => f.status === 'verified');
      if (verifiedTotp) {
        this.factorId.set(verifiedTotp.id);
      } else {
        // No MFA enrolled, redirect to setup
        this.router.navigate(['/auth/mfa-setup']);
      }
    } catch (err) {
      console.error('Error loading MFA:', err);
      this.errorMessage.set('Failed to load MFA configuration');
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

  async onCodeComplete(code: string): Promise<void> {
    if (!this.factorId() || this.isVerifying()) return;

    this.isVerifying.set(true);
    this.hasError.set(false);
    this.errorMessage.set(null);

    try {
      // Challenge to get challenge ID
      const { data: challengeData, error: challengeError } = await this.supabase.auth.mfa.challenge({
        factorId: this.factorId()!,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge
      const { error: verifyError } = await this.supabase.auth.mfa.verify({
        factorId: this.factorId()!,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      // Success!
      this.isSuccess.set(true);

      const toast = await this.toastController.create({
        message: 'Verification successful!',
        duration: 2000,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      // Short delay to show success state before navigating
      setTimeout(() => {
        this.router.navigate(['/tabs/dashboard']);
      }, 500);

    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      this.hasError.set(true);
      this.isSuccess.set(false);
      this.errorMessage.set('Invalid code. Please check your authenticator app and try again.');
    } finally {
      this.isVerifying.set(false);
    }
  }

  retry(): void {
    this.hasError.set(false);
    this.isSuccess.set(false);
    this.errorMessage.set(null);
    this.otpInput?.clear();
  }

  useRecoveryCode(): void {
    // Navigate to recovery code entry page
    this.router.navigate(['/auth/mfa-recovery']);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
