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
  IonList,
  IonSpinner,
  IonIcon,
  IonNote,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
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
    IonList,
    IonSpinner,
    IonIcon,
    IonNote,
    IonBackButton,
    IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Reset Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="forgot-container">
        <div class="forgot-header">
          <h2>Forgot your password?</h2>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
          </ion-note>
        }

        <!-- Success Message -->
        @if (successMessage()) {
          <ion-note color="success" class="success-message">
            {{ successMessage() }}
          </ion-note>
        }

        <!-- Form -->
        <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
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
            @if (forgotForm.get('email')?.touched && forgotForm.get('email')?.errors) {
              <ion-note color="danger" class="field-error">
                Please enter a valid email address
              </ion-note>
            }
          </ion-list>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="forgotForm.invalid || loading()"
          >
            @if (loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Send Reset Link
            }
          </ion-button>
        </form>

        <!-- Back to Login -->
        <div class="back-link">
          <a routerLink="/auth/login">Back to sign in</a>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .forgot-container {
      max-width: 400px;
      margin: 0 auto;
    }

    .forgot-header {
      margin-bottom: 24px;

      h2 {
        margin: 0 0 8px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      p {
        margin: 0;
        color: var(--ion-color-medium);
      }
    }

    .error-message,
    .success-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
    }

    .error-message {
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    .success-message {
      background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    ion-list {
      background: transparent;
      margin-bottom: 24px;

      ion-item {
        --background: var(--ion-color-light);
        --border-radius: 8px;
      }
    }

    .field-error {
      display: block;
      font-size: 0.75rem;
      margin: 8px 0 0 16px;
    }

    .back-link {
      text-align: center;
      margin-top: 24px;

      a {
        color: var(--ion-color-primary);
        text-decoration: none;
      }
    }
  `],
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  forgotForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    addIcons({ mailOutline });
  }

  async onSubmit(): Promise<void> {
    if (this.forgotForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email } = this.forgotForm.value;
    const { error } = await this.authService.resetPassword(email);

    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
    } else {
      this.successMessage.set(
        'Password reset link sent! Check your email inbox.'
      );
    }
  }
}
