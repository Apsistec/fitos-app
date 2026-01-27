import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Email Verification</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="verification-container">
        @if (verifying()) {
          <ion-card>
            <ion-card-header>
              <ion-card-title class="ion-text-center">
                <ion-spinner name="crescent"></ion-spinner>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content class="ion-text-center">
              <p>Verifying your email address...</p>
            </ion-card-content>
          </ion-card>
        } @else if (verified()) {
          <ion-card color="success">
            <ion-card-header>
              <ion-card-title class="ion-text-center">
                <ion-icon name="checkmark-circle-outline" size="large"></ion-icon>
                <h2>Email Verified!</h2>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content class="ion-text-center">
              <p>Your email has been successfully verified.</p>
              <p>You can now sign in to your account.</p>
              <ion-button expand="block" (click)="goToLogin()">
                Go to Login
              </ion-button>
            </ion-card-content>
          </ion-card>
        } @else if (error()) {
          <ion-card color="danger">
            <ion-card-header>
              <ion-card-title class="ion-text-center">
                <ion-icon name="close-circle-outline" size="large"></ion-icon>
                <h2>Verification Failed</h2>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content class="ion-text-center">
              <p>{{ errorMessage() }}</p>
              @if (isExpiredLink()) {
                <p>You can request a new verification email from the login page.</p>
              }
              <ion-button expand="block" (click)="goToLogin()">
                Go to Login
              </ion-button>
            </ion-card-content>
          </ion-card>
        } @else {
          <ion-card>
            <ion-card-header>
              <ion-card-title class="ion-text-center">
                <ion-icon name="mail-outline" size="large"></ion-icon>
                <h2>Check Your Email</h2>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content class="ion-text-center">
              <p>We've sent a verification link to your email address.</p>
              <p>Please click the link in the email to verify your account.</p>
              <ion-button expand="block" (click)="goToLogin()">
                Back to Login
              </ion-button>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .verification-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100%;
      padding: 20px;
    }

    ion-card {
      max-width: 500px;
      width: 100%;
    }

    ion-icon[size="large"] {
      font-size: 64px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 8px 0;
    }

    p {
      margin: 12px 0;
      line-height: 1.6;
    }

    ion-button {
      margin-top: 20px;
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
