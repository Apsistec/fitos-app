import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonList,
  IonSpinner,
  IonIcon,
  IonNote,
  IonBackButton,
  IonButtons,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, logoApple, peopleOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-client-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonList,
    IonSpinner,
    IonIcon,
    IonNote,
    IonBackButton,
    IonButtons,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Client Login</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="login-container">
        <!-- Logo and Title -->
        <div class="login-header">
          <div class="logo">
            <ion-icon name="people-outline" color="primary"></ion-icon>
          </div>
          <h1>Welcome Back</h1>
          <p class="subtitle">Sign in to track your fitness journey</p>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
            @if (showResendLink()) {
              <br><br>
              <a href="#" (click)="resendVerification($event)" class="resend-link">
                @if (resendingEmail()) {
                  Sending...
                } @else {
                  Resend verification email
                }
              </a>
            }
          </ion-note>
        }

        <!-- Success Message -->
        @if (successMessage()) {
          <ion-note color="success" class="success-message">
            {{ successMessage() }}
          </ion-note>
        }

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <ion-list lines="none">
            <ion-item lines="none">
              <ion-input
                formControlName="email"
                type="email"
                label="Email"
                labelPlacement="floating"
                fill="outline"
                placeholder="you@example.com"
                autocomplete="email"
                helperText="Enter your email address"
                [errorText]="emailError()"
              />
            </ion-item>

            <ion-item lines="none">
              <ion-input
                formControlName="password"
                type="password"
                label="Password"
                labelPlacement="floating"
                fill="outline"
                placeholder="Enter your password"
                autocomplete="current-password"
                helperText="Your account password"
                [errorText]="passwordError()"
              >
                <ion-input-password-toggle slot="end" />
              </ion-input>
            </ion-item>
          </ion-list>

          <div class="forgot-password">
            <a routerLink="/auth/forgot-password">Forgot password?</a>
          </div>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="loginForm.invalid || loading()"
          >
            @if (loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Sign In
            }
          </ion-button>
        </form>

        <!-- Divider -->
        <div class="divider">
          <span>or continue with</span>
        </div>

        <!-- Social Login -->
        <div class="social-buttons">
          <ion-button
            expand="block"
            fill="outline"
            (click)="signInWithGoogle()"
            [disabled]="loading()"
          >
            <ion-icon name="logo-google" slot="start"></ion-icon>
            Google
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            color="dark"
            (click)="signInWithApple()"
            [disabled]="loading()"
          >
            <ion-icon name="logo-apple" slot="start"></ion-icon>
            Apple
          </ion-button>
        </div>

        <!-- Sign Up Link -->
        <div class="signup-link">
          <p>
            New to FitOS?
            <a routerLink="/auth/register/client">Create account</a>
          </p>
        </div>

        <!-- Trainer Invite Note -->
        <div class="invite-note">
          <p>Have an invite code from your trainer? You can enter it after signing up.</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 0 auto;
      padding-top: 24px;
    }

    .login-header {
      text-align: center;
      margin-bottom: 32px;

      .logo {
        ion-icon {
          font-size: 64px;
        }
      }

      h1 {
        margin: 16px 0 8px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .subtitle {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 0.9rem;
      }
    }

    .error-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);

      .resend-link {
        color: var(--ion-color-primary);
        text-decoration: underline;
        cursor: pointer;
      }
    }

    .success-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    ion-list {
      background: transparent;
      margin-bottom: 16px;

      ion-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
        margin-bottom: 16px;
      }
    }

    .forgot-password {
      text-align: right;
      margin-bottom: 24px;

      a {
        color: var(--ion-color-primary);
        text-decoration: none;
        font-size: 0.875rem;
      }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 24px 0;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--ion-color-light-shade);
      }

      span {
        padding: 0 16px;
        color: var(--ion-color-medium);
        font-size: 0.875rem;
      }
    }

    .social-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .signup-link {
      text-align: center;
      margin-top: 32px;

      p {
        margin: 0;
        color: var(--ion-color-medium);
      }

      a {
        color: var(--ion-color-primary);
        text-decoration: none;
        font-weight: 600;
      }
    }

    .invite-note {
      text-align: center;
      margin-top: 16px;

      p {
        margin: 0;
        font-size: 0.8rem;
        color: var(--ion-color-medium);
      }
    }
  `],
})
export class ClientLoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastController = inject(ToastController);

  loading = signal(false);
  resendingEmail = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showResendLink = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  emailError = computed(() => {
    const control = this.loginForm.get('email');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    return '';
  });

  passwordError = computed(() => {
    const control = this.loginForm.get('password');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Password is required';
    return '';
  });

  constructor() {
    addIcons({ logoGoogle, logoApple, peopleOutline });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.showResendLink.set(false);

    const { email, password } = this.loginForm.value;
    const { error } = await this.authService.signIn(email, password);

    this.loading.set(false);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        this.errorMessage.set('Please verify your email address before signing in.');
        this.showResendLink.set(true);
      } else {
        this.errorMessage.set(error.message);
      }
    }
  }

  async resendVerification(event: Event): Promise<void> {
    event.preventDefault();

    const email = this.loginForm.get('email')?.value;
    if (!email) {
      this.errorMessage.set('Please enter your email address first.');
      return;
    }

    this.resendingEmail.set(true);

    const { error } = await this.authService.resendVerificationEmail(email);

    this.resendingEmail.set(false);

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        const toast = await this.toastController.create({
          message: 'Email rate limit reached. Please wait a few minutes.',
          duration: 5000,
          position: 'bottom',
          color: 'warning',
        });
        await toast.present();
      } else {
        const toast = await this.toastController.create({
          message: error.message,
          duration: 5000,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
      }
    } else {
      this.errorMessage.set(null);
      this.showResendLink.set(false);
      this.successMessage.set(`Verification email sent to ${email}.`);

      const toast = await this.toastController.create({
        message: 'Verification email sent!',
        duration: 3000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.errorMessage.set(null);
    const { error } = await this.authService.signInWithProvider('google');
    if (error) {
      this.errorMessage.set(error.message);
    }
  }

  async signInWithApple(): Promise<void> {
    this.errorMessage.set(null);
    const { error } = await this.authService.signInWithProvider('apple');
    if (error) {
      this.errorMessage.set(error.message);
    }
  }
}
