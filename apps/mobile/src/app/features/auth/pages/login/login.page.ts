import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonList,
  IonSpinner,
  IonIcon,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, logoApple, fitnessOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonList,
    IonSpinner,
    IonIcon,
    IonNote
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding">
      <div class="login-container">
        <!-- Logo and Title -->
        <div class="login-header">
          <div class="logo">
            <ion-icon name="fitness-outline" color="primary"></ion-icon>
          </div>
          <h1>Welcome to FitOS</h1>
          <p class="subtitle">Sign in to continue</p>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
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
            Don't have an account?
            <a routerLink="/auth/register">Sign up</a>
          </p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-container {
      max-width: 400px;
      margin: 0 auto;
      padding-top: 48px;
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
        font-size: 1.75rem;
        font-weight: 700;
      }

      .subtitle {
        margin: 0;
        color: var(--ion-color-medium);
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
  `],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  // Computed error messages for ion-input errorText property
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
    addIcons({ logoGoogle, logoApple, fitnessOutline });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    const { error } = await this.authService.signIn(email, password);

    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
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
