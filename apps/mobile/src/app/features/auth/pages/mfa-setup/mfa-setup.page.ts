import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
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
import { shieldCheckmarkOutline, qrCodeOutline, phonePortraitOutline, checkmarkCircle, logoGoogle, logoApple, copyOutline, downloadOutline, warningOutline, fingerPrintOutline, trashOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';
import { PasskeyService, Passkey } from '@app/core/services/passkey.service';

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
    FormsModule,
    DatePipe,
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

            @if (errorMessage()) {
              <ion-note color="warning" class="setup-error-message">
                <ion-icon name="warning-outline"></ion-icon>
                {{ errorMessage() }}
              </ion-note>
            }

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

            <ion-card class="method-card google-card" (click)="signInWithGoogle()">
              <ion-card-content>
                <div class="method-icon google-icon">
                  <ion-icon name="logo-google"></ion-icon>
                </div>
                <div class="method-content">
                  <h3>Sign in with Google</h3>
                  <p>Use your Google account for secure authentication</p>
                </div>
                @if (isSigningInWithGoogle()) {
                  <ion-spinner name="crescent"></ion-spinner>
                }
              </ion-card-content>
            </ion-card>

            <ion-card class="method-card apple-card disabled-card">
              <ion-card-content>
                <div class="method-icon apple-icon">
                  <ion-icon name="logo-apple"></ion-icon>
                </div>
                <div class="method-content">
                  <h3>Sign in with Apple</h3>
                  <p>Coming soon</p>
                </div>
                <span class="coming-soon-badge">Coming Soon</span>
              </ion-card-content>
            </ion-card>

            @if (passkeysSupported()) {
              <ion-card
                class="method-card passkey-card"
                [class.disabled-card]="!platformAuthAvailable()"
                (click)="platformAuthAvailable() ? registerPasskey() : null"
              >
                <ion-card-content>
                  <div class="method-icon passkey-icon">
                    <ion-icon name="finger-print-outline"></ion-icon>
                  </div>
                  <div class="method-content">
                    <h3>Passkey</h3>
                    @if (platformAuthAvailable()) {
                      <p>Use Face ID, Touch ID, or Windows Hello</p>
                    } @else {
                      <p>Device doesn't support passkeys</p>
                    }
                  </div>
                  @if (isRegisteringPasskey()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else if (passkeys().length > 0) {
                    <span class="passkey-count">{{ passkeys().length }}</span>
                  }
                </ion-card-content>
              </ion-card>

              @if (passkeys().length > 0) {
                <ion-button fill="clear" size="small" (click)="showPasskeyManagement.set(true)">
                  Manage Passkeys ({{ passkeys().length }})
                </ion-button>
              }
            }

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

        @if (showRecoveryCodes()) {
          <!-- Recovery Codes Screen -->
          <div class="recovery-codes-screen">
            <div class="warning-icon">
              <ion-icon name="warning-outline" color="warning"></ion-icon>
            </div>
            <h2>Save Your Recovery Codes</h2>
            <p class="warning-text">
              These codes can be used to access your account if you lose your authenticator device.
              <strong>Save them somewhere safe!</strong> Each code can only be used once.
            </p>

            <div class="recovery-codes-container">
              @for (code of recoveryCodes(); track code) {
                <div class="recovery-code">{{ code }}</div>
              }
            </div>

            <div class="recovery-actions">
              <ion-button fill="outline" (click)="copyRecoveryCodes()">
                <ion-icon name="copy-outline" slot="start"></ion-icon>
                Copy All
              </ion-button>
              <ion-button fill="outline" (click)="downloadRecoveryCodes()">
                <ion-icon name="download-outline" slot="start"></ion-icon>
                Download
              </ion-button>
            </div>

            <div class="confirmation-checkbox">
              <label>
                <input type="checkbox" [(ngModel)]="savedCodesConfirmed" />
                <span>I have saved my recovery codes in a safe place</span>
              </label>
            </div>

            <ion-button
              expand="block"
              [disabled]="!savedCodesConfirmed"
              (click)="finishSetup()"
            >
              Continue to Dashboard
            </ion-button>
          </div>
        }

        @if (showPasskeyManagement()) {
          <!-- Passkey Management Screen -->
          <div class="passkey-management">
            <h2>Manage Passkeys</h2>
            <p class="subtitle">Your registered passkeys for passwordless login</p>

            @if (passkeyLoading()) {
              <div class="loading-container">
                <ion-spinner name="crescent"></ion-spinner>
              </div>
            } @else {
              <div class="passkey-list">
                @for (passkey of passkeys(); track passkey.id) {
                  <ion-card class="passkey-item">
                    <ion-card-content>
                      <div class="passkey-info">
                        <ion-icon name="finger-print-outline" class="passkey-icon-small"></ion-icon>
                        <div class="passkey-details">
                          <h4>{{ passkey.name }}</h4>
                          <p>
                            Created {{ passkey.createdAt | date:'mediumDate' }}
                            @if (passkey.lastUsedAt) {
                              · Last used {{ passkey.lastUsedAt | date:'mediumDate' }}
                            }
                          </p>
                          @if (passkey.backedUp) {
                            <span class="synced-badge">Synced</span>
                          }
                        </div>
                      </div>
                      <ion-button fill="clear" color="danger" size="small" (click)="deletePasskey(passkey)">
                        <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                      </ion-button>
                    </ion-card-content>
                  </ion-card>
                } @empty {
                  <p class="no-passkeys">No passkeys registered yet</p>
                }
              </div>

              <ion-button expand="block" (click)="registerPasskey()">
                <ion-icon name="finger-print-outline" slot="start"></ion-icon>
                Add New Passkey
              </ion-button>
            }

            <ion-button fill="clear" expand="block" (click)="showPasskeyManagement.set(false)">
              Back
            </ion-button>
          </div>
        }

        @if (setupComplete() && !showRecoveryCodes() && !showPasskeyManagement()) {
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

    .setup-error-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      border-radius: 8px;
      background: rgba(var(--ion-color-warning-rgb), 0.15);
      font-size: 0.9rem;
      text-align: center;

      ion-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
    }

    .method-card {
      margin: 0 0 16px;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: translateY(-2px);
      }

      &.disabled-card {
        opacity: 0.6;
        cursor: not-allowed;
        pointer-events: none;

        &:hover {
          transform: none;
        }
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

        &.google-icon {
          background: #4285F4;
        }

        &.apple-icon {
          background: #000000;
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

      .coming-soon-badge {
        font-size: 0.7rem;
        padding: 4px 8px;
        background: var(--ion-color-medium);
        color: white;
        border-radius: 12px;
        text-transform: uppercase;
        font-weight: 600;
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

    .recovery-codes-screen {
      text-align: center;
      padding-top: 24px;

      .warning-icon {
        ion-icon {
          font-size: 64px;
        }
      }

      h2 {
        margin: 16px 0 12px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .warning-text {
        color: var(--ion-color-medium);
        margin-bottom: 24px;
        font-size: 0.9rem;
        line-height: 1.5;

        strong {
          color: var(--ion-color-warning-shade);
        }
      }
    }

    .recovery-codes-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 24px;
      padding: 16px;
      background: var(--ion-color-light);
      border-radius: 12px;
    }

    .recovery-code {
      font-family: monospace;
      font-size: 0.95rem;
      padding: 8px 12px;
      background: var(--ion-background-color);
      border-radius: 6px;
      letter-spacing: 1px;
      font-weight: 600;
    }

    .recovery-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 24px;

      ion-button {
        flex: 1;
        max-width: 150px;
      }
    }

    .confirmation-checkbox {
      margin-bottom: 24px;
      text-align: left;

      label {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;

        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          flex-shrink: 0;
        }

        span {
          font-size: 0.9rem;
          color: var(--ion-color-medium);
          line-height: 1.4;
        }
      }
    }

    .passkey-icon {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
    }

    .passkey-count {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--ion-color-success);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .passkey-management {
      h2 {
        text-align: center;
        margin: 0 0 8px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .subtitle {
        text-align: center;
        color: var(--ion-color-medium);
        margin-bottom: 24px;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 48px;
      }

      .passkey-list {
        margin-bottom: 24px;
      }

      .passkey-item {
        margin: 0 0 12px;

        ion-card-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
        }

        .passkey-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .passkey-icon-small {
          font-size: 32px;
          color: var(--ion-color-primary);
        }

        .passkey-details {
          h4 {
            margin: 0 0 4px;
            font-size: 1rem;
            font-weight: 600;
          }

          p {
            margin: 0;
            font-size: 0.8rem;
            color: var(--ion-color-medium);
          }

          .synced-badge {
            display: inline-block;
            margin-top: 4px;
            font-size: 0.7rem;
            padding: 2px 6px;
            background: var(--ion-color-success);
            color: white;
            border-radius: 8px;
            text-transform: uppercase;
            font-weight: 600;
          }
        }
      }

      .no-passkeys {
        text-align: center;
        color: var(--ion-color-medium);
        padding: 32px;
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
  private passkeyService = inject(PasskeyService);

  isEnrolling = signal(false);
  isVerifying = signal(false);
  isSigningInWithGoogle = signal(false);
  isRegisteringPasskey = signal(false);
  enrollmentStarted = signal(false);
  setupComplete = signal(false);
  showRecoveryCodes = signal(false);
  showPasskeyManagement = signal(false);
  recoveryCodes = signal<string[]>([]);
  savedCodesConfirmed = false;
  errorMessage = signal<string | null>(null);
  qrCode = signal<string | null>(null);
  secret = signal<string | null>(null);
  factorId = signal<string | null>(null);
  canSkip = signal(true); // Allow skipping MFA setup - can be made mandatory later via profile settings

  // Passkey signals
  passkeysSupported = this.passkeyService.isSupported;
  platformAuthAvailable = this.passkeyService.isPlatformAvailable;
  passkeys = this.passkeyService.passkeys;
  passkeyLoading = this.passkeyService.loading;

  verifyForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]],
  });

  codeError = signal('');

  constructor() {
    addIcons({ shieldCheckmarkOutline, qrCodeOutline, phonePortraitOutline, checkmarkCircle, logoGoogle, logoApple, copyOutline, downloadOutline, warningOutline, fingerPrintOutline, trashOutline });
  }

  ngOnInit(): void {
    // Check if MFA is already enrolled
    this.checkExistingMfa();
    // Load existing passkeys (don't block if it fails)
    this.loadPasskeysQuietly();
  }

  /**
   * Load passkeys without throwing errors that block the page
   */
  private async loadPasskeysQuietly(): Promise<void> {
    try {
      await this.passkeyService.loadPasskeys();
    } catch (err) {
      // Passkeys may not be available yet - that's OK
      console.warn('Could not load passkeys:', err);
    }
  }

  private async checkExistingMfa(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.mfa.listFactors();

      if (error) {
        // MFA might not be enabled in Supabase project - that's OK
        console.warn('MFA not available:', error.message);
        const errorMsg = (error.message || '').toLowerCase();
        // Check if it's an edge function or server error
        if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx') || errorMsg.includes('function') || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
          this.errorMessage.set('MFA service is temporarily unavailable. You can skip for now and set up MFA later from Settings.');
        }
        // Allow user to skip MFA setup if it's not configured
        this.canSkip.set(true);
        return;
      }

      // Check if user already has verified TOTP factor
      const verifiedTotp = data.totp.find(f => f.status === 'verified');
      if (verifiedTotp) {
        // Already enrolled, redirect to dashboard
        this.router.navigate(['/tabs/dashboard']);
      }
    } catch (err: any) {
      console.error('Error checking MFA:', err);
      const errorMsg = (err?.message || '').toLowerCase();
      // Check if it's an edge function or server error
      if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx') || errorMsg.includes('function') || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
        this.errorMessage.set('MFA service is temporarily unavailable. You can skip for now and set up MFA later from Settings.');
      }
      // Allow user to skip if MFA check fails
      this.canSkip.set(true);
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
      // Provide user-friendly error message
      let message = 'Failed to start MFA enrollment';
      const errorMsg = (error.message || '').toLowerCase();
      if (errorMsg.includes('mfa')) {
        message = 'MFA is not currently available. Please try again later or skip for now.';
        this.canSkip.set(true);
      } else if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx') || errorMsg.includes('function') || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
        message = 'MFA service is temporarily unavailable. You can skip for now and set up MFA later from Settings.';
        this.canSkip.set(true);
      } else {
        // Don't show raw technical errors to users
        message = 'Unable to set up MFA at this time. Please try again later or skip for now.';
        this.canSkip.set(true);
      }
      this.errorMessage.set(message);
    } finally {
      this.isEnrolling.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.isSigningInWithGoogle.set(true);
    this.errorMessage.set(null);

    try {
      const { error } = await this.authService.signInWithProvider('google');

      if (error) throw error;

      // OAuth will redirect, so we don't need to do anything here
      // The auth state change listener will handle the redirect after OAuth
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      this.errorMessage.set(error.message || 'Failed to sign in with Google');
      this.isSigningInWithGoogle.set(false);
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

      // Generate recovery codes
      const codes = this.generateRecoveryCodes();
      this.recoveryCodes.set(codes);

      // Store recovery codes in the database
      await this.storeRecoveryCodes(codes);

      // Show recovery codes screen
      this.showRecoveryCodes.set(true);
      this.enrollmentStarted.set(false);

      const toast = await this.toastController.create({
        message: 'Two-factor authentication enabled! Save your recovery codes.',
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

  /**
   * Generate 10 random recovery codes
   * Format: XXXX-XXXX (8 alphanumeric characters)
   */
  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 0, 1 to avoid confusion

    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
        if (j === 3) code += '-'; // Add hyphen in middle
      }
      codes.push(code);
    }

    return codes;
  }

  /**
   * Store hashed recovery codes in the database
   */
  private async storeRecoveryCodes(codes: string[]): Promise<void> {
    try {
      const userId = this.authService.user()?.id;
      if (!userId) return;

      // Hash the codes before storing (simple hash for now, should use bcrypt in production)
      const hashedCodes = codes.map(code => this.simpleHash(code.replace('-', '')));

      // Store in profiles table or a dedicated recovery_codes table
      const { error } = await this.supabase
        .from('mfa_recovery_codes')
        .upsert({
          user_id: userId,
          codes: hashedCodes,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error storing recovery codes:', error);
        // Don't throw - we still want to show the codes to the user
      }
    } catch (err) {
      console.error('Error storing recovery codes:', err);
    }
  }

  /**
   * Simple hash function (for demo - use bcrypt in production)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Copy all recovery codes to clipboard
   */
  async copyRecoveryCodes(): Promise<void> {
    const codes = this.recoveryCodes().join('\n');
    try {
      await navigator.clipboard.writeText(codes);
      const toast = await this.toastController.create({
        message: 'Recovery codes copied to clipboard',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  /**
   * Download recovery codes as a text file
   */
  downloadRecoveryCodes(): void {
    const codes = this.recoveryCodes();
    const content = `FitOS Recovery Codes
Generated: ${new Date().toLocaleDateString()}

IMPORTANT: Store these codes in a safe place.
Each code can only be used once.

${codes.join('\n')}

If you lose access to your authenticator app,
you can use one of these codes to sign in.
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fitos-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Finish setup and navigate to dashboard
   */
  finishSetup(): void {
    this.setupComplete.set(true);
    this.showRecoveryCodes.set(false);
    this.router.navigate(['/tabs/dashboard']);
  }

  /**
   * Register a new passkey
   */
  async registerPasskey(): Promise<void> {
    if (this.isRegisteringPasskey()) return;

    this.isRegisteringPasskey.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.passkeyService.registerPasskey();

      if (result.success) {
        const toast = await this.toastController.create({
          message: 'Passkey registered successfully!',
          duration: 3000,
          position: 'top',
          color: 'success',
        });
        await toast.present();

        // If this is the first passkey, show success
        if (this.passkeys().length === 1) {
          this.setupComplete.set(true);
        }
      } else {
        // Check if it's an edge function error and show user-friendly message
        const errorMsg = (result.error || 'Failed to register passkey').toLowerCase();
        if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx') || errorMsg.includes('failed to get') || errorMsg.includes('function') || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
          this.errorMessage.set('Passkey service is temporarily unavailable. You can skip for now and set up passkeys later from Settings.');
          this.canSkip.set(true);
        } else {
          // Show user-friendly message instead of technical error
          this.errorMessage.set('Unable to register passkey at this time. Please try again later or skip for now.');
          this.canSkip.set(true);
        }
      }
    } catch (error: any) {
      console.error('Error registering passkey:', error);
      const errorMsg = (error?.message || '').toLowerCase();
      if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx') || errorMsg.includes('failed to get') || errorMsg.includes('function') || errorMsg.includes('500') || errorMsg.includes('502') || errorMsg.includes('503')) {
        this.errorMessage.set('Passkey service is temporarily unavailable. You can skip for now and set up passkeys later from Settings.');
        this.canSkip.set(true);
      } else {
        // Show user-friendly message instead of technical error
        this.errorMessage.set('Unable to register passkey at this time. Please try again later or skip for now.');
        this.canSkip.set(true);
      }
    } finally {
      this.isRegisteringPasskey.set(false);
    }
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(passkey: Passkey): Promise<void> {
    // Confirm deletion
    const result = await this.passkeyService.deletePasskey(passkey.id);

    if (result.success) {
      const toast = await this.toastController.create({
        message: 'Passkey deleted',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } else {
      const toast = await this.toastController.create({
        message: result.error || 'Failed to delete passkey',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    }
  }
}
