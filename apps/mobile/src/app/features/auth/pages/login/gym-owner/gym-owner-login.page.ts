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
  IonSpinner,
  IonIcon,
  IonBackButton,
  IonButtons,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, logoApple, businessOutline } from 'ionicons/icons';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-gym-owner-login',
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
    IonSpinner,
    IonIcon,
    IonBackButton,
    IonButtons,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Gym Owner Login</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="login-container">
        <!-- Role Badge -->
        <div class="role-badge">
          <ion-icon name="business-outline"></ion-icon>
          <span>Gym Owner</span>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="message message--error">
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
          </div>
        }

        <!-- Success Message -->
        @if (successMessage()) {
          <div class="message message--success">
            {{ successMessage() }}
          </div>
        }

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <ion-input
              formControlName="email"
              type="email"
              label="Email Address"
              labelPlacement="floating"
              fill="outline"
              placeholder="you@example.com"
              autocomplete="email"
              [errorText]="emailError()"
            />
          </div>

          <div class="form-group">
            <ion-input
              formControlName="password"
              type="password"
              label="Password"
              labelPlacement="floating"
              fill="outline"
              placeholder="Enter your password"
              autocomplete="current-password"
              [errorText]="passwordError()"
            >
              <ion-input-password-toggle slot="end" />
            </ion-input>
          </div>

          <div class="forgot-password">
            <a routerLink="/auth/forgot-password">Forgot password?</a>
          </div>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="loginForm.invalid || loading()"
            class="submit-btn"
          >
            @if (loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Log In
            }
          </ion-button>
        </form>

        <!-- Divider -->
        <div class="divider">
          <div class="divider__line"></div>
          <span class="divider__text">or</span>
          <div class="divider__line"></div>
        </div>

        <!-- Social Login -->
        <div class="social-buttons">
          <ion-button
            expand="block"
            fill="outline"
            color="medium"
            (click)="signInWithGoogle()"
            [disabled]="loading()"
            class="social-btn"
          >
            <ion-icon name="logo-google" slot="start"></ion-icon>
            Continue with Google
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            color="medium"
            (click)="signInWithApple()"
            [disabled]="loading()"
            class="social-btn"
          >
            <ion-icon name="logo-apple" slot="start"></ion-icon>
            Continue with Apple
          </ion-button>
        </div>

        <!-- Sign Up Link -->
        <div class="signup-link">
          <p>
            Don't have an account?
            <a routerLink="/auth/register/gym-owner">Register your gym</a>
          </p>
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

    .login-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 16px 24px 32px;
      display: flex;
      flex-direction: column;
    }

    .role-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.25);
      width: fit-content;
      margin: 0 auto 40px;

      ion-icon {
        color: var(--fitos-accent-secondary, #8B5CF6);
        font-size: 18px;
      }

      span {
        color: var(--fitos-accent-secondary, #8B5CF6);
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .message {
      padding: 12px 16px;
      margin-bottom: 20px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
    }

    .message--error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #FCA5A5;

      .resend-link {
        color: var(--ion-color-primary, #10B981);
        text-decoration: underline;
        cursor: pointer;
      }
    }

    .message--success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #6EE7B7;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-group {
      ion-input {
        --background: var(--fitos-bg-tertiary, #262626);
        --border-radius: 8px;
        --highlight-color-focused: var(--ion-color-primary, #10B981);
        --border-color: transparent;
        font-size: 16px;
      }
    }

    .forgot-password {
      text-align: right;
      margin-top: -4px;

      a {
        color: var(--ion-color-primary, #10B981);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: opacity 0.2s;

        &:hover { opacity: 0.8; }
      }
    }

    .submit-btn {
      margin-top: 8px;
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      font-size: 16px;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .divider {
      display: flex;
      align-items: center;
      padding: 28px 0;
    }

    .divider__line {
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
    }

    .divider__text {
      padding: 0 16px;
      color: var(--fitos-text-tertiary, #737373);
      font-size: 14px;
      font-weight: 500;
    }

    .social-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .social-btn {
      --border-radius: 8px;
      --border-color: rgba(255, 255, 255, 0.1);
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      height: 48px;
      font-weight: 500;
      font-size: 14px;

      &:hover { --background: rgba(255, 255, 255, 0.05); }
    }

    .signup-link {
      text-align: center;
      margin-top: 32px;

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      a {
        color: var(--ion-color-primary, #10B981);
        text-decoration: none;
        font-weight: 700;
        margin-left: 4px;
      }
    }
  `],
})
export class GymOwnerLoginPage {
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
    addIcons({ logoGoogle, logoApple, businessOutline });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.showResendLink.set(false);

    const { email, password } = this.loginForm.value;
    const { error } = await this.authService.signIn(email, password, 'gym_owner');

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
