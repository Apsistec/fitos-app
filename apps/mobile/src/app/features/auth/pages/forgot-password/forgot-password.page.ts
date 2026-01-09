import { Component, inject, signal, computed } from '@angular/core';
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
  IonNote,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
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
    IonItem,
    IonList,
    IonSpinner,
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
            <ion-item lines="none">
              <ion-input
                formControlName="email"
                type="email"
                label="Email"
                labelPlacement="floating"
                fill="outline"
                placeholder="you@example.com"
                autocomplete="email"
                helperText="Enter your registered email address"
                [errorText]="emailError()"
              />
            </ion-item>
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
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
      }
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

  // Computed error message for reactive errorText binding
  emailError = computed(() => {
    const control = this.forgotForm.get('email');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    return '';
  });

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
