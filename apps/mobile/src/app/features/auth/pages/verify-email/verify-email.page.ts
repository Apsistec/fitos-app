import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Email Verification</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="verification-container">
        @if (verifying()) {
          <div class="state-card">
            <ion-spinner name="crescent" class="large-spinner"></ion-spinner>
            <p class="state-text">Verifying your email address...</p>
          </div>
        } @else if (verified()) {
          <div class="state-card">
            <div class="icon-wrap icon-wrap--success">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
            </div>
            <h2>Email Verified!</h2>
            <p class="state-text">Your email has been successfully verified.</p>
            <p class="state-text">You can now sign in to your account.</p>
            <ion-button expand="block" (click)="goToLogin()" class="action-btn">
              Go to Login
            </ion-button>
          </div>
        } @else if (error()) {
          <div class="state-card">
            <div class="icon-wrap icon-wrap--error">
              <ion-icon name="close-circle-outline"></ion-icon>
            </div>
            <h2>Verification Failed</h2>
            <p class="state-text">{{ errorMessage() }}</p>
            @if (isExpiredLink()) {
              <p class="state-text">You can request a new verification email from the login page.</p>
            }
            <ion-button expand="block" (click)="goToLogin()" class="action-btn">
              Go to Login
            </ion-button>
          </div>
        } @else {
          <div class="state-card">
            <div class="icon-wrap icon-wrap--info">
              <ion-icon name="mail-outline"></ion-icon>
            </div>
            <h2>Check Your Email</h2>
            <p class="state-text">We've sent a verification link to your email address.</p>
            <p class="state-text">Please click the link in the email to verify your account.</p>
            <ion-button expand="block" (click)="goToLogin()" class="action-btn">
              Back to Login
            </ion-button>
          </div>
        }
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

    .verification-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 24px;
    }

    .state-card {
      max-width: 400px;
      width: 100%;
      text-align: center;
      padding: 40px 24px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .large-spinner {
      width: 48px;
      height: 48px;
      margin-bottom: 24px;
    }

    .icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;

      ion-icon {
        font-size: 36px;
      }
    }

    .icon-wrap--success {
      background: rgba(16, 185, 129, 0.1);
      ion-icon { color: #10B981; }
    }

    .icon-wrap--error {
      background: rgba(239, 68, 68, 0.1);
      ion-icon { color: #EF4444; }
    }

    .icon-wrap--info {
      background: rgba(16, 185, 129, 0.1);
      ion-icon { color: var(--ion-color-primary, #10B981); }
    }

    h2 {
      margin: 0 0 12px;
      font-size: 22px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .state-text {
      margin: 0 0 8px;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      line-height: 1.6;
    }

    .action-btn {
      margin-top: 24px;
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      font-size: 16px;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
  `],
})
export class VerifyEmailPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  verifying = signal(false);
  verified = signal(false);
  error = signal(false);
  errorMessage = signal<string>('');
  isExpiredLink = signal(false);

  constructor() {
    addIcons({ mailOutline, checkmarkCircleOutline, closeCircleOutline });
  }

  ngOnInit() {
    // Check if there's a verification token or error in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');

    // Handle error cases first
    if (errorCode) {
      this.error.set(true);
      if (errorCode === 'otp_expired') {
        this.isExpiredLink.set(true);
        this.errorMessage.set('This verification link has expired.');
      } else {
        this.errorMessage.set(errorDescription?.replace(/\+/g, ' ') || 'Verification failed.');
      }
      return;
    }

    if (accessToken && type === 'signup') {
      this.verifyEmail();
    }
  }

  async verifyEmail() {
    this.verifying.set(true);

    try {
      // The Supabase client automatically handles the verification
      // when the page loads with the token in the URL hash
      await new Promise(resolve => setTimeout(resolve, 2000)); // Give it time to process

      const session = await this.authService.session();

      if (session) {
        this.verified.set(true);
        this.verifying.set(false);

        // Auto-redirect after 3 seconds
        setTimeout(() => {
          this.goToLogin();
        }, 3000);
      } else {
        this.error.set(true);
        this.verifying.set(false);
        this.errorMessage.set('Verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Email verification error:', err);
      this.error.set(true);
      this.verifying.set(false);
      this.errorMessage.set('An error occurred during verification.');
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
