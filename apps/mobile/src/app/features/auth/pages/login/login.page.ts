import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonSpinner,
  IonIcon,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logoGoogle, logoApple, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonText,
    IonSpinner,
    IonIcon,
    IonNote,
  ],
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
            <ion-item>
              <ion-icon name="mail-outline" slot="start" color="medium"></ion-icon>
              <ion-input
                formControlName="email"
                type="email"
                placeholder="Email"
                autocomplete="email"
              ></ion-input>
            </ion-item>
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.errors) {
              <ion-note color="danger" class="field-error">
                Please enter a valid email address
              </ion-note>
            }

            <ion-item>
              <ion-icon name="lock-closed-outline" slot="start" color="medium"></ion-icon>
              <ion-input
                formControlName="password"
                type="password"
                placeholder="Password"
                autocomplete="current-password"
              ></ion-input>
            </ion-item>
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.errors) {
              <ion-note color="danger" class="field-error">
                Password is required
              </ion-note>
            }
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
      margin-bottom: 8px;

      ion-item {
        --background: var(--ion-color-light);
        --border-radius: 8px;
        margin-bottom: 12px;
      }
    }

    .field-error {
      display: block;
      font-size: 0.75rem;
      margin: -8px 0 12px 16px;
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

  constructor() {
    addIcons({ logoGoogle, logoApple, mailOutline, lockClosedOutline });
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
