import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonSpinner,
  IonIcon,
  IonNote,
  IonCard,
  IonCardContent,
  IonModal,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  qrCodeOutline,
  checkmarkCircle,
  logoGoogle,
  logoApple,
  copyOutline,
  downloadOutline,
  warningOutline,
  fingerPrintOutline,
  trashOutline,
  mailOutline,
  personOutline,
  closeOutline,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';
import { PasskeyService, Passkey } from '@app/core/services/passkey.service';
import { OtpVerifyModalComponent } from '@app/shared/components/otp-verify-modal/otp-verify-modal.component';

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
    FormsModule,
    DatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonSpinner,
    IonIcon,
    IonNote,
    IonCard,
    IonCardContent,
    IonModal,
    OtpVerifyModalComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Setup Two-Factor Authentication</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="mfa-setup-container">
        @if (pageLoading()) {
          <div class="page-loading">
            <ion-spinner name="crescent"></ion-spinner>
          </div>
        } @else if (isManagementMode() && !enrollmentStarted() && !showRecoveryCodes() && !showPasskeyManagement() && !showGoogleManagement()) {
          <!-- MFA Management Mode - User already has MFA -->
          <div class="setup-intro">
            <div class="icon-container success">
              <ion-icon name="shield-checkmark-outline" color="success"></ion-icon>
            </div>
            <h1>Two-Factor Authentication</h1>
            <p>Your account is protected with two-factor authentication.</p>

            @if (errorMessage()) {
              <ion-note color="warning" class="setup-error-message">
                <ion-icon name="warning-outline"></ion-icon>
                {{ errorMessage() }}
              </ion-note>
            }

            <!-- Current MFA Status -->
            <ion-card class="status-card">
              <ion-card-content>
                <div class="status-row">
                  <ion-icon name="checkmark-circle" color="success"></ion-icon>
                  <div class="status-content">
                    <h3>Authenticator App</h3>
                    <p>Enabled and active</p>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Google - setup or manage -->
            <ion-card class="method-card google-card" (click)="handleGoogleClick()">
              <ion-card-content>
                <div class="method-icon google-icon">
                  <ion-icon name="logo-google"></ion-icon>
                </div>
                <div class="method-content">
                  @if (isGoogleLinked()) {
                    <h3>Google Account</h3>
                    <p>{{ googleIdentity()?.identity_data?.email || 'Connected' }}</p>
                  } @else {
                    <h3>Link Google Account</h3>
                    <p>Add your Google account for backup sign-in</p>
                  }
                </div>
                @if (isSigningInWithGoogle()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else if (isGoogleLinked()) {
                  <ion-icon name="checkmark-circle" color="success"></ion-icon>
                }
              </ion-card-content>
            </ion-card>

            <ion-card class="method-card apple-card disabled-card">
              <ion-card-content>
                <div class="method-icon apple-icon">
                  <ion-icon name="logo-apple"></ion-icon>
                </div>
                <div class="method-content">
                  <h3>Link Apple Account</h3>
                  <p>Coming soon</p>
                </div>
                <span class="coming-soon-badge">Coming Soon</span>
              </ion-card-content>
            </ion-card>

            <!-- Passkeys - setup or manage -->
            @if (passkeysSupported()) {
              <ion-card
                class="method-card passkey-card"
                [class.disabled-card]="!platformAuthAvailable()"
                (click)="handlePasskeyClick()"
              >
                <ion-card-content>
                  <div class="method-icon passkey-icon">
                    <ion-icon name="finger-print-outline"></ion-icon>
                  </div>
                  <div class="method-content">
                    <h3>Passkeys</h3>
                    @if (passkeys().length > 0) {
                      <p>{{ passkeys().length }} passkey(s) registered</p>
                    } @else if (platformAuthAvailable()) {
                      <p>Add Face ID, Touch ID, or Windows Hello</p>
                    } @else {
                      <p>Device doesn't support passkeys</p>
                    }
                  </div>
                  @if (isRegisteringPasskey()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else if (passkeys().length > 0) {
                    <ion-icon name="checkmark-circle" color="success"></ion-icon>
                  }
                </ion-card-content>
              </ion-card>
            }

            <!-- Recovery Codes -->
            <ion-button expand="block" fill="outline" (click)="regenerateRecoveryCodes()">
              <ion-icon name="download-outline" slot="start"></ion-icon>
              Regenerate Recovery Codes
            </ion-button>

            <!-- Remove MFA -->
            <ion-button expand="block" fill="clear" color="danger" (click)="confirmRemoveMfa()">
              @if (isRemovingMfa()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                Remove Two-Factor Authentication
              }
            </ion-button>

            <!-- Back to Settings -->
            <ion-button fill="clear" (click)="goBack()">
              Back to Settings
            </ion-button>
          </div>
        } @else if (!enrollmentStarted() && !showRecoveryCodes() && !showPasskeyManagement() && !showGoogleManagement() && !setupComplete() && !isManagementMode()) {
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

            <!-- Google - setup or manage -->
            <ion-card class="method-card google-card" (click)="handleGoogleClick()">
              <ion-card-content>
                <div class="method-icon google-icon">
                  <ion-icon name="logo-google"></ion-icon>
                </div>
                <div class="method-content">
                  @if (isGoogleLinked()) {
                    <h3>Google Account</h3>
                    <p>{{ googleIdentity()?.identity_data?.email || 'Connected' }}</p>
                  } @else {
                    <h3>Sign in with Google</h3>
                    <p>Use your Google account for secure authentication</p>
                  }
                </div>
                @if (isSigningInWithGoogle()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else if (isGoogleLinked()) {
                  <ion-icon name="checkmark-circle" color="success"></ion-icon>
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

            <!-- Passkeys - setup or manage -->
            @if (passkeysSupported()) {
              <ion-card
                class="method-card passkey-card"
                [class.disabled-card]="!platformAuthAvailable()"
                (click)="handlePasskeyClick()"
              >
                <ion-card-content>
                  <div class="method-icon passkey-icon">
                    <ion-icon name="finger-print-outline"></ion-icon>
                  </div>
                  <div class="method-content">
                    <h3>Passkeys</h3>
                    @if (passkeys().length > 0) {
                      <p>{{ passkeys().length }} passkey(s) registered</p>
                    } @else if (platformAuthAvailable()) {
                      <p>Use Face ID, Touch ID, or Windows Hello</p>
                    } @else {
                      <p>Device doesn't support passkeys</p>
                    }
                  </div>
                  @if (isRegisteringPasskey()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else if (passkeys().length > 0) {
                    <ion-icon name="checkmark-circle" color="success"></ion-icon>
                  }
                </ion-card-content>
              </ion-card>
            }

            @if (canSkip()) {
              <ion-button fill="clear" (click)="skipForNow()">
                Skip for now
              </ion-button>
            }
          </div>
        }

        @if (enrollmentStarted()) {
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
                  <ion-icon name="copy-outline" slot="start"></ion-icon>
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
              <p>Enter the 6-digit code from your app to verify</p>
            </div>

            <ion-button expand="block" (click)="openVerifyModal()">
              Enter Verification Code
            </ion-button>

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

        @if (showGoogleManagement()) {
          <!-- Google Account Management Screen -->
          <div class="google-management">
            <h2>Google Account</h2>
            <p class="subtitle">Manage your linked Google account</p>

            @if (googleIdentity(); as identity) {
              <ion-card class="status-card">
                <ion-card-content>
                  <div class="status-row">
                    <ion-icon name="logo-google" style="color: #4285F4; font-size: 28px;"></ion-icon>
                    <div class="status-content">
                      <h3>{{ identity.identity_data?.full_name || 'Google Account' }}</h3>
                      <p style="color: var(--ion-color-medium);">{{ identity.identity_data?.email || 'Connected' }}</p>
                    </div>
                    <ion-icon name="checkmark-circle" color="success"></ion-icon>
                  </div>
                </ion-card-content>
              </ion-card>

              <ion-button expand="block" fill="clear" color="danger" (click)="confirmUnlinkGoogle()">
                @if (isUnlinkingGoogle()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else {
                  Unlink Google Account
                }
              </ion-button>
            }

            <ion-button fill="clear" expand="block" (click)="showGoogleManagement.set(false)">
              Back
            </ion-button>
          </div>
        }

        @if (setupComplete() && !showRecoveryCodes() && !showPasskeyManagement() && !showGoogleManagement() && !isManagementMode()) {
          <!-- Success Screen - Only for initial MFA setup, not management mode -->
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

      <!-- TOTP Verification Modal -->
      <ion-modal
        #verifyModal
        [isOpen]="showVerifyModal()"
        (didDismiss)="onModalDismiss()"
        [breakpoints]="[0, 0.6, 0.85]"
        [initialBreakpoint]="0.6"
        [handle]="true"
      >
        <ng-template>
          <app-otp-verify-modal
            #otpVerifyModal
            title="Verify Authenticator"
            subtitle="Enter the 6-digit code from your authenticator app"
            helpText="The code refreshes every 30 seconds. Enter the current code shown in your app."
            [showRecoveryOption]="false"
            (verify)="verifyTotp($event)"
            (cancelled)="closeVerifyModal()"
          />
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [`
    .mfa-setup-container {
      max-width: 500px;
      margin: 0 auto;
    }

    .page-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 80px 0;
    }

    .setup-intro {
      text-align: center;
      padding-top: 32px;

      .icon-container {
        ion-icon {
          font-size: 80px;
        }

        &.success ion-icon {
          color: var(--ion-color-success);
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

    .section-header {
      margin: 24px 0 16px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }

    .status-card {
      margin: 0 0 24px;
      text-align: left;
      --background: rgba(var(--ion-color-success-rgb), 0.1);
      border: 1px solid rgba(var(--ion-color-success-rgb), 0.25);

      ion-card-content {
        padding: 16px;
      }

      .status-row {
        display: flex;
        align-items: center;
        gap: 12px;

        ion-icon {
          font-size: 28px;
        }

        .status-content {
          h3 {
            margin: 0 0 4px;
            font-size: 1rem;
            font-weight: 600;
            color: var(--ion-text-color);
          }

          p {
            margin: 0;
            font-size: 0.85rem;
            color: var(--ion-color-success);
          }
        }
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

    .linked-providers-section {
      text-align: left;
      margin-bottom: 24px;

      h3 {
        margin: 0 0 12px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--ion-color-medium);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .linked-providers-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .linked-provider-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(var(--ion-color-primary-rgb), 0.08);
        border: 1px solid rgba(var(--ion-color-primary-rgb), 0.15);
        border-radius: 12px;

        .provider-icon {
          font-size: 24px;

          &.google {
            color: #4285F4;
          }

          &.apple {
            color: #000000;
          }

          &.email {
            color: var(--ion-color-medium);
          }
        }

        .provider-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;

          .provider-name {
            font-weight: 600;
            font-size: 0.95rem;
            color: var(--ion-text-color);
          }

          .provider-email {
            font-size: 0.8rem;
            color: var(--ion-color-medium);
          }
        }

        .linked-check {
          font-size: 18px;
          opacity: 0.9;
        }
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
        margin-bottom: 8px;
      }
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

    .google-management {
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
    }
  `],
})
export class MfaSetupPage implements OnInit {
  @ViewChild('otpVerifyModal') otpVerifyModal!: OtpVerifyModalComponent;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);
  private passkeyService = inject(PasskeyService);

  pageLoading = signal(true);
  isEnrolling = signal(false);
  isSigningInWithGoogle = signal(false);
  isRegisteringPasskey = signal(false);
  enrollmentStarted = signal(false);
  setupComplete = signal(false);
  showRecoveryCodes = signal(false);
  showPasskeyManagement = signal(false);
  showVerifyModal = signal(false);
  recoveryCodes = signal<string[]>([]);
  savedCodesConfirmed = false;
  errorMessage = signal<string | null>(null);
  qrCode = signal<string | null>(null);
  secret = signal<string | null>(null);
  factorId = signal<string | null>(null);
  canSkip = signal(true);
  linkedIdentities = signal<any[]>([]);

  // Management mode - when user already has MFA set up
  isManagementMode = signal(false);
  existingFactorId = signal<string | null>(null);
  isRemovingMfa = signal(false);

  // Passkey signals
  passkeysSupported = this.passkeyService.isSupported;
  platformAuthAvailable = this.passkeyService.isPlatformAvailable;
  passkeys = this.passkeyService.passkeys;
  passkeyLoading = this.passkeyService.loading;

  // Google management
  showGoogleManagement = signal(false);
  isUnlinkingGoogle = signal(false);
  isGoogleLinked = computed(() =>
    this.linkedIdentities().some((i: any) => i.provider === 'google')
  );
  googleIdentity = computed(() =>
    this.linkedIdentities().find((i: any) => i.provider === 'google')
  );

  // Track initial identity count to detect OAuth returns
  private initialIdentityCount = 0;
  private hasCheckedOAuthReturn = false;

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      qrCodeOutline,
      checkmarkCircle,
      logoGoogle,
      logoApple,
      copyOutline,
      downloadOutline,
      warningOutline,
      fingerPrintOutline,
      trashOutline,
      mailOutline,
      personOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    this.initializePage();
  }

  private async initializePage(): Promise<void> {
    // Check for OAuth return before loading data
    const fragment = window.location.hash;
    const isOAuthReturn = fragment.includes('access_token') || fragment.includes('provider_token');

    // Load all data in parallel, then update UI once
    await Promise.all([
      this.checkExistingMfa(),
      this.loadPasskeysQuietly(),
      this.loadLinkedIdentities(),
    ]);

    this.pageLoading.set(false);

    // Show toast after page is rendered if returning from OAuth
    if (isOAuthReturn && !this.hasCheckedOAuthReturn) {
      this.hasCheckedOAuthReturn = true;
      await this.showSuccessToast('Account linked successfully!');
    }
  }

  private async loadLinkedIdentities(): Promise<void> {
    try {
      const { identities, error } = await this.authService.getLinkedIdentities();
      if (!error && identities) {
        this.linkedIdentities.set(identities);
      }
    } catch (err) {
      console.warn('Could not load linked identities:', err);
    }
  }

  getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      'google': 'Google',
      'apple': 'Apple',
      'facebook': 'Facebook',
      'github': 'GitHub',
      'twitter': 'Twitter',
      'email': 'Email',
    };
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      'google': 'logo-google',
      'apple': 'logo-apple',
      'facebook': 'logo-facebook',
      'github': 'logo-github',
      'twitter': 'logo-twitter',
      'email': 'mail-outline',
    };
    return icons[provider] || 'person-outline';
  }

  private async loadPasskeysQuietly(): Promise<void> {
    try {
      await this.passkeyService.loadPasskeys();
    } catch (err) {
      console.warn('Could not load passkeys:', err);
    }
  }

  private async checkExistingMfa(): Promise<void> {
    try {
      console.log('[MFA Setup] Checking existing MFA factors...');
      const { data, error } = await this.supabase.auth.mfa.listFactors();

      if (error) {
        console.error('[MFA Setup] Error from listFactors:', {
          message: error.message,
          name: error.name,
          status: (error as any).status,
          code: (error as any).code,
        });

        const errorMsg = (error.message || '').toLowerCase();

        if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx')) {
          this.errorMessage.set('The authentication system is experiencing issues. You can skip MFA setup for now and configure it later from Settings.');
        } else if (errorMsg.includes('mfa') && errorMsg.includes('not enabled')) {
          this.errorMessage.set('MFA is not currently available. You can skip this step.');
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          this.errorMessage.set('Network error. Please check your connection and try again.');
        } else {
          this.errorMessage.set('Unable to verify MFA status. You can skip for now and set up MFA later from Settings.');
        }

        this.canSkip.set(true);
        return;
      }

      console.log('[MFA Setup] MFA factors retrieved:', {
        totpCount: data.totp?.length || 0,
        phoneCount: data.phone?.length || 0,
      });

      const verifiedTotp = data.totp.find(f => f.status === 'verified');
      if (verifiedTotp) {
        // User already has MFA - switch to management mode
        console.log('[MFA Setup] User already has verified TOTP, switching to management mode');
        this.isManagementMode.set(true);
        this.existingFactorId.set(verifiedTotp.id);
        this.canSkip.set(false); // No skip button in management mode
      }
    } catch (err: any) {
      console.error('[MFA Setup] Unexpected error:', err);
      this.errorMessage.set('An unexpected error occurred. You can skip MFA setup for now.');
      this.canSkip.set(true);
    }
  }

  async startTotpEnrollment(): Promise<void> {
    this.isEnrolling.set(true);
    this.errorMessage.set(null);

    try {
      console.log('[MFA Setup] Starting TOTP enrollment...');

      const { data, error } = await this.supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'FitOS Authenticator',
        issuer: 'FitOS',
      });

      if (error) {
        console.error('[MFA Setup] TOTP enrollment error:', error);
        throw error;
      }

      console.log('[MFA Setup] TOTP enrollment successful, factor ID:', data.id);
      this.factorId.set(data.id);
      this.qrCode.set(data.totp.qr_code);
      this.secret.set(data.totp.secret);
      this.enrollmentStarted.set(true);
    } catch (error: any) {
      console.error('[MFA Setup] Error in startTotpEnrollment:', error);

      let message = 'Failed to start MFA enrollment';
      const errorMsg = (error?.message || '').toLowerCase();

      if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx')) {
        message = 'The authentication system is experiencing issues. You can skip MFA setup for now.';
      } else if (errorMsg.includes('mfa') && errorMsg.includes('not enabled')) {
        message = 'MFA is not enabled for this project. Please contact support.';
      } else if (errorMsg.includes('already enrolled') || errorMsg.includes('already exists')) {
        message = 'You already have an authenticator enrolled. Please use MFA verify instead.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
      } else {
        message = 'Unable to set up MFA at this time. You can skip for now and try again later from Settings.';
      }

      this.errorMessage.set(message);
      this.canSkip.set(true);
    } finally {
      this.isEnrolling.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    console.log('[MFA Setup] Linking Google account');
    this.isSigningInWithGoogle.set(true);
    this.errorMessage.set(null);

    try {
      // Use linkIdentity to add Google as an additional identity, not signInWithProvider
      // Redirect back to MFA setup after linking
      const { error } = await this.authService.linkIdentity('google', '/auth/mfa-setup');

      if (error) {
        console.error('[MFA Setup] Google link error:', error);
        throw error;
      }

      console.log('[MFA Setup] Google link initiated, waiting for OAuth redirect...');
    } catch (error: any) {
      console.error('[MFA Setup] Error linking Google account:', error);
      this.errorMessage.set(error.message || 'Failed to link Google account');
      this.isSigningInWithGoogle.set(false);
    }
  }

  openVerifyModal(): void {
    this.showVerifyModal.set(true);
  }

  closeVerifyModal(): void {
    this.showVerifyModal.set(false);
  }

  onModalDismiss(): void {
    this.showVerifyModal.set(false);
  }

  async verifyTotp(code: string): Promise<void> {
    if (!this.factorId()) return;

    try {
      // Challenge to get challenge ID
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
      this.otpVerifyModal?.setSuccess();

      // Short delay to show success state
      setTimeout(async () => {
        this.showVerifyModal.set(false);

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
      }, 500);

    } catch (error: any) {
      console.error('Error verifying TOTP:', error);
      this.otpVerifyModal?.setError('Invalid code. Please check your authenticator app and try again.');
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
  }

  skipForNow(): void {
    console.log('[MFA Setup] Skip for now clicked');
    this.authService.skipMfaSetup();
    this.router.navigate(['/tabs/dashboard']);
  }

  continueToDashboard(): void {
    this.authService.clearMfaSkipped();
    this.router.navigate(['/tabs/dashboard']);
  }

  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
        if (j === 3) code += '-';
      }
      codes.push(code);
    }

    return codes;
  }

  private async storeRecoveryCodes(codes: string[]): Promise<void> {
    try {
      const userId = this.authService.user()?.id;
      if (!userId) return;

      const hashedCodes = codes.map(code => this.simpleHash(code.replace('-', '')));

      const { error } = await this.supabase
        .from('mfa_recovery_codes')
        .upsert({
          user_id: userId,
          codes: hashedCodes,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error storing recovery codes:', error);
      }
    } catch (err) {
      console.error('Error storing recovery codes:', err);
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

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

  finishSetup(): void {
    this.showRecoveryCodes.set(false);

    // If user was in management mode, go back to management view with toast
    if (this.isManagementMode()) {
      this.showSuccessToast('Two-factor authentication updated!');
      // Stay on management view - don't navigate away
      return;
    }

    // For initial setup, navigate to dashboard
    this.setupComplete.set(true);
    this.router.navigate(['/tabs/dashboard']);
  }

  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color: 'success',
    });
    await toast.present();
  }

  async registerPasskey(): Promise<void> {
    if (this.isRegisteringPasskey()) return;

    this.isRegisteringPasskey.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.passkeyService.registerPasskey();

      if (result.success) {
        await this.showSuccessToast('Passkey registered successfully!');

        // Only show success screen and navigate if this is initial setup (not management mode)
        if (!this.isManagementMode() && this.passkeys().length === 1) {
          this.setupComplete.set(true);
        }
        // If in management mode, stay on the page to show updated passkey list
      } else {
        this.errorMessage.set(result.error || 'Failed to register passkey');
      }
    } catch (error: any) {
      console.error('Error registering passkey:', error);
      this.errorMessage.set(error.message || 'Failed to register passkey');
    } finally {
      this.isRegisteringPasskey.set(false);
    }
  }

  async deletePasskey(passkey: Passkey): Promise<void> {
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

  handleGoogleClick(): void {
    if (this.isGoogleLinked()) {
      this.showGoogleManagement.set(true);
    } else {
      this.signInWithGoogle();
    }
  }

  handlePasskeyClick(): void {
    if (!this.platformAuthAvailable()) return;

    if (this.passkeys().length > 0) {
      this.showPasskeyManagement.set(true);
    } else {
      this.registerPasskey();
    }
  }

  async confirmUnlinkGoogle(): Promise<void> {
    const confirmAlert = await this.alertController.create({
      header: 'Unlink Google Account?',
      message: 'You will no longer be able to sign in with this Google account.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Unlink',
          role: 'destructive',
          handler: () => {
            this.unlinkGoogle();
          },
        },
      ],
    });

    await confirmAlert.present();
  }

  private async unlinkGoogle(): Promise<void> {
    const identity = this.googleIdentity();
    if (!identity) return;

    this.isUnlinkingGoogle.set(true);

    try {
      const { error } = await this.authService.unlinkIdentity(identity.id);
      if (error) throw error;

      await this.showSuccessToast('Google account unlinked');
      await this.loadLinkedIdentities();
      this.showGoogleManagement.set(false);
    } catch (error: any) {
      console.error('Error unlinking Google:', error);
      this.errorMessage.set(error.message || 'Failed to unlink Google account');
    } finally {
      this.isUnlinkingGoogle.set(false);
    }
  }

  // Management mode methods
  goBack(): void {
    this.router.navigate(['/tabs/settings/privacy']);
  }

  async regenerateRecoveryCodes(): Promise<void> {
    const codes = this.generateRecoveryCodes();
    this.recoveryCodes.set(codes);
    await this.storeRecoveryCodes(codes);
    this.showRecoveryCodes.set(true);

    const toast = await this.toastController.create({
      message: 'New recovery codes generated. Save them now!',
      duration: 3000,
      position: 'top',
      color: 'warning',
    });
    await toast.present();
  }

  async confirmRemoveMfa(): Promise<void> {
    const confirmAlert = await this.alertController.create({
      header: 'Remove Two-Factor Authentication?',
      message: 'This will make your account less secure. You will need to set up 2FA again if you want to re-enable it.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.removeMfa();
          },
        },
      ],
    });

    await confirmAlert.present();
  }

  private async removeMfa(): Promise<void> {
    if (!this.existingFactorId()) return;

    this.isRemovingMfa.set(true);
    this.errorMessage.set(null);

    try {
      const { error } = await this.supabase.auth.mfa.unenroll({
        factorId: this.existingFactorId()!,
      });

      if (error) throw error;

      const toast = await this.toastController.create({
        message: 'Two-factor authentication removed',
        duration: 3000,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      // Switch back to setup mode
      this.isManagementMode.set(false);
      this.existingFactorId.set(null);
      this.canSkip.set(true);

    } catch (error: any) {
      console.error('Error removing MFA:', error);
      this.errorMessage.set(error.message || 'Failed to remove two-factor authentication');
    } finally {
      this.isRemovingMfa.set(false);
    }
  }
}
