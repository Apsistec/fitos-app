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
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { shieldCheckmarkOutline, keyOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

@Component({
  selector: 'app-mfa-verify',
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
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Two-Factor Verification</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="mfa-verify-container">
        <!-- Header -->
        <div class="verify-header">
          <div class="icon-container">
            <ion-icon name="shield-checkmark-outline" color="primary"></ion-icon>
          </div>
          <h1>Verify Your Identity</h1>
          <p>Enter the 6-digit code from your authenticator app to continue.</p>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
          </ion-note>
        }

        <!-- Verification Form -->
        <form [formGroup]="verifyForm" (ngSubmit)="verifyCode()">
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
                autofocus="true"
              />
            </ion-item>
          </ion-list>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="verifyForm.invalid || isVerifying()"
          >
            @if (isVerifying()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Verify
            }
          </ion-button>
        </form>

        <!-- Help Text -->
        <div class="help-section">
          <p>Open your authenticator app (Google Authenticator, Authy, etc.) to get your verification code.</p>
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
    .mfa-verify-container {
      max-width: 400px;
      margin: 0 auto;
    }

    .verify-header {
      text-align: center;
      margin-bottom: 32px;
      padding-top: 32px;

      .icon-container {
        ion-icon {
          font-size: 72px;
        }
      }

      h1 {
        margin: 24px 0 12px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .error-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    ion-list {
      background: transparent;
      margin-bottom: 24px;

      ion-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
      }
    }

    .help-section {
      text-align: center;
      margin-top: 24px;

      p {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .signout-section {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--ion-color-light-shade);
    }
  `],
})
export class MfaVerifyPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private toastController = inject(ToastController);

  isVerifying = signal(false);
  errorMessage = signal<string | null>(null);
  factorId = signal<string | null>(null);

  verifyForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    addIcons({ shieldCheckmarkOutline, keyOutline });
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

  async verifyCode(): Promise<void> {
    if (this.verifyForm.invalid || !this.factorId()) return;

    this.isVerifying.set(true);
    this.errorMessage.set(null);

    try {
      const code = this.verifyForm.get('code')?.value;

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

      // Success! Navigate to dashboard
      const toast = await this.toastController.create({
        message: 'Verification successful!',
        duration: 2000,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      this.router.navigate(['/tabs/dashboard']);
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      this.errorMessage.set('Invalid verification code. Please try again.');
      this.verifyForm.reset();
    } finally {
      this.isVerifying.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
