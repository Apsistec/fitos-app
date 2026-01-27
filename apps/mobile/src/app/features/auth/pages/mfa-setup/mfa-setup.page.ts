import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonItem,
  IonList,
  IonSpinner,
  IonIcon,
  IonNote,
  IonCard,
  IonCardContent,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, qrCodeOutline, phonePortraitOutline, checkmarkCircle } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

interface MfaFactor {
  id: string;
  type: string;
  totp?: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

@Component({
  selector: 'app-mfa-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonItem,
    IonList,
    IonSpinner,
    IonIcon,
    IonNote,
    IonCard,
    IonCardContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Setup Two-Factor Authentication</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="mfa-setup-container">
        @if (!enrollmentStarted()) {
          <!-- Initial Setup Screen -->
          <div class="setup-intro">
            <div class="icon-container">
              <ion-icon name="shield-checkmark-outline" color="primary"></ion-icon>
            </div>
            <h1>Secure Your Account</h1>
            <p>Add an extra layer of security to protect your FitOS account.</p>

            <ion-card class="method-card" (click)="startTotpEnrollment()">
              <ion-card-content>
                <div class="method-icon">
                  <ion-icon name="qr-code-outline"></ion-icon>
                </div>
                <div class="method-content">
                  <h3>Authenticator App</h3>
                  <p>Use Google Authenticator, Authy, or similar apps</p>
                </div>
                @if (isEnrolling()) {
                  <ion-spinner name="crescent"></ion-spinner>
                }
              </ion-card-content>
            </ion-card>

            @if (canSkip()) {
              <ion-button fill="clear" (click)="skipForNow()">
                Skip for now
              </ion-button>
            }
          </div>
        } @else {
          <!-- TOTP Setup Screen -->
          <div class="totp-setup">
            <h2>Setup Authenticator App</h2>

            <div class="steps">
              <div class="step">
                <div class="step-number">1</div>
                <p>Open your authenticator app (Google Authenticator, Authy, etc.)</p>
              </div>

              <div class="step">
                <div class="step-number">2</div>
                <p>Scan this QR code or enter the secret key manually</p>
              </div>
            </div>

            <!-- QR Code Display -->
            @if (qrCode()) {
              <div class="qr-container">
                <img [src]="qrCode()" alt="QR Code for authenticator app" />
              </div>

              <div class="secret-key">
                <p class="label">Or enter this code manually:</p>
                <code>{{ secret() }}</code>
                <ion-button fill="clear" size="small" (click)="copySecret()">
                  Copy
                </ion-button>
              </div>
            } @else {
              <div class="qr-loading">
                <ion-spinner name="crescent"></ion-spinner>
                <p>Generating QR code...</p>
              </div>
            }

            <div class="step">
              <div class="step-number">3</div>
              <p>Enter the 6-digit code from your authenticator app</p>
            </div>

            <!-- Verification Form -->
            <form [formGroup]="verifyForm" (ngSubmit)="verifyTotp()">
              <ion-list lines="none">
                <ion-item lines="none">
                  <ion-input
                    formControlName="code"
                    type="text"
                    inputmode="numeric"
                    label="Verification Code"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="000000"
                    [maxlength]="6"
                    [errorText]="codeError()"
                  />
                </ion-item>
              </ion-list>

              <!-- Error Message -->
              @if (errorMessage()) {
                <ion-note color="danger" class="error-message">
                  {{ errorMessage() }}
                </ion-note>
              }

              <ion-button
                expand="block"
                type="submit"
                [disabled]="verifyForm.invalid || isVerifying()"
              >
                @if (isVerifying()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else {
                  Verify & Enable
                }
              </ion-button>
            </form>

            <ion-button fill="clear" (click)="cancelSetup()">
              Cancel
            </ion-button>
          </div>
        }

        @if (setupComplete()) {
          <!-- Success Screen -->
          <div class="success-screen">
            <div class="success-icon">
              <ion-icon name="checkmark-circle" color="success"></ion-icon>
            </div>
            <h2>Two-Factor Authentication Enabled!</h2>
            <p>Your account is now protected with an additional layer of security.</p>
            <ion-button expand="block" (click)="continueToDashboard()">
              Continue to Dashboard
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .mfa-setup-container {
      max-width: 500px;
      margin: 0 auto;
    }

    .setup-intro {
      text-align: center;
      padding-top: 32px;

      .icon-container {
        ion-icon {
          font-size: 80px;
        }
      }

      h1 {
        margin: 24px 0 12px;
        font-size: 1.75rem;
        font-weight: 700;
      }

      p {
        color: var(--ion-color-medium);
        margin-bottom: 32px;
      }
    }

    .method-card {
      margin: 0 0 16px;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: translateY(-2px);
      }

      ion-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
      }

      .method-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: var(--ion-color-primary);
        display: flex;
        align-items: center;
        justify-content: center;

        ion-icon {
          font-size: 24px;
          color: white;
        }
      }

      .method-content {
        flex: 1;

        h3 {
          margin: 0 0 4px;
          font-size: 1rem;
          font-weight: 600;
        }

        p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--ion-color-medium);
        }
      }
    }

    .totp-setup {
      h2 {
        text-align: center;
        margin: 0 0 24px;
        font-size: 1.5rem;
        font-weight: 700;
      }
    }

    .steps {
      margin-bottom: 24px;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;

      .step-number {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--ion-color-primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        flex-shrink: 0;
      }

      p {
        margin: 4px 0 0;
        color: var(--ion-color-medium);
      }
    }

    .qr-container {
      display: flex;
      justify-content: center;
      margin: 24px 0;
      padding: 16px;
      background: white;
      border-radius: 12px;

      img {
        max-width: 200px;
        height: auto;
      }
    }

    .qr-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px;

      p {
        color: var(--ion-color-medium);
      }
    }

    .secret-key {
      text-align: center;
      margin-bottom: 24px;

      .label {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin-bottom: 8px;
      }

      code {
        display: block;
        padding: 12px;
        background: var(--ion-color-light);
        border-radius: 8px;
        font-family: monospace;
        font-size: 1rem;
        letter-spacing: 2px;
        word-break: break-all;
      }
    }

    ion-list {
      background: transparent;
      margin-bottom: 16px;

      ion-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
      }
    }

    .error-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    .success-screen {
      text-align: center;
      padding-top: 48px;

      .success-icon {
        ion-icon {
          font-size: 80px;
        }
      }

      h2 {
        margin: 24px 0 12px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      p {
        color: var(--ion-color-medium);
        margin-bottom: 32px;
      }
    }
  `],
})
export class MfaSetupPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private toastController = inject(ToastController);

  isEnrolling = signal(false);
  isVerifying = signal(false);
  enrollmentStarted = signal(false);
  setupComplete = signal(false);
  errorMessage = signal<string | null>(null);
  qrCode = signal<string | null>(null);
  secret = signal<string | null>(null);
  factorId = signal<string | null>(null);
  canSkip = signal(false); // For future: allow skipping based on profile settings

  verifyForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]],
  });

  codeError = signal('');

  constructor() {
    addIcons({ shieldCheckmarkOutline, qrCodeOutline, phonePortraitOutline, checkmarkCircle });
  }

  ngOnInit(): void {
    // Check if MFA is already enrolled
    this.checkExistingMfa();
  }

  private async checkExistingMfa(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.mfa.listFactors();

      if (error) {
        console.error('Error checking MFA factors:', error);
        return;
      }

      // Check if user already has verified TOTP factor
      const verifiedTotp = data.totp.find(f => f.status === 'verified');
      if (verifiedTotp) {
        // Already enrolled, redirect to dashboard
        this.router.navigate(['/tabs/dashboard']);
      }
    } catch (err) {
      console.error('Error checking MFA:', err);
    }
  }

  async startTotpEnrollment(): Promise<void> {
    this.isEnrolling.set(true);
    this.errorMessage.set(null);

    try {
      const { data, error } = await this.supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'FitOS Authenticator',
      });

      if (error) throw error;

      this.factorId.set(data.id);
      this.qrCode.set(data.totp.qr_code);
      this.secret.set(data.totp.secret);
      this.enrollmentStarted.set(true);
    } catch (error: any) {
      console.error('Error enrolling TOTP:', error);
      this.errorMessage.set(error.message || 'Failed to start MFA enrollment');
    } finally {
      this.isEnrolling.set(false);
    }
  }

  async verifyTotp(): Promise<void> {
    if (this.verifyForm.invalid || !this.factorId()) return;

    this.isVerifying.set(true);
    this.errorMessage.set(null);

    try {
      const code = this.verifyForm.get('code')?.value;

      // First challenge to get challenge ID
      const { data: challengeData, error: challengeError } = await this.supabase.auth.mfa.challenge({
        factorId: this.factorId()!,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge with the TOTP code
      const { error: verifyError } = await this.supabase.auth.mfa.verify({
        factorId: this.factorId()!,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      // Success!
      this.setupComplete.set(true);
      this.enrollmentStarted.set(false);

      const toast = await this.toastController.create({
        message: 'Two-factor authentication enabled successfully!',
        duration: 3000,
        position: 'top',
        color: 'success',
      });
      await toast.present();
    } catch (error: any) {
      console.error('Error verifying TOTP:', error);
      this.errorMessage.set(error.message || 'Invalid verification code. Please try again.');
      this.verifyForm.reset();
    } finally {
      this.isVerifying.set(false);
    }
  }

  async copySecret(): Promise<void> {
    if (this.secret()) {
      try {
        await navigator.clipboard.writeText(this.secret()!);
        const toast = await this.toastController.create({
          message: 'Secret key copied to clipboard',
          duration: 2000,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  }

  cancelSetup(): void {
    this.enrollmentStarted.set(false);
    this.qrCode.set(null);
    this.secret.set(null);
    this.factorId.set(null);
    this.verifyForm.reset();
  }

  skipForNow(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  continueToDashboard(): void {
    this.router.navigate(['/tabs/dashboard']);
  }
}
