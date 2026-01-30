import {  Component, inject, signal, computed , ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonSpinner,
  IonIcon,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonSpinner,
    IonIcon,
    IonBackButton,
    IonButtons,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Reset Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="forgot-container">
        <div class="forgot-header">
          <div class="icon-wrap">
            <ion-icon name="mail-outline"></ion-icon>
          </div>
          <h2>Forgot your password?</h2>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="message message--error">
            {{ errorMessage() }}
          </div>
        }

        <!-- Success Message -->
        @if (successMessage()) {
          <div class="message message--success">
            {{ successMessage() }}
          </div>
        }

        <!-- Form -->
        <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="forgot-form">
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

          <ion-button
            expand="block"
            type="submit"
            [disabled]="forgotForm.invalid || loading()"
            class="submit-btn"
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
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .forgot-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 16px 24px 32px;
    }

    .forgot-header {
      text-align: center;
      margin-bottom: 32px;

      h2 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
        line-height: 1.5;
      }
    }

    .icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(16, 185, 129, 0.1);
      margin: 0 auto 16px;

      ion-icon {
        font-size: 28px;
        color: var(--ion-color-primary, #10B981);
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
    }

    .message--success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #6EE7B7;
    }

    .forgot-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
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

    .submit-btn {
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      font-size: 16px;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .back-link {
      text-align: center;
      margin-top: 24px;

      a {
        color: var(--ion-color-primary, #10B981);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        transition: opacity 0.2s;

        &:hover { opacity: 0.8; }
      }
    }
  `],
})
export class ForgotPasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  constructor() {
    addIcons({ mailOutline });
  }

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
