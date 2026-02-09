import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fitnessOutline, checkmarkCircle, closeCircle, logoGoogle, logoApple } from 'ionicons/icons';
import { AuthService } from '../../../../../core/services/auth.service';
import { passwordComplexityValidator, capitalizeWords, checkPasswordRequirements } from '../../../validators/password.validator';

@Component({
  selector: 'app-trainer-register',
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
    IonInputPasswordToggle,
    IonSpinner,
    IonIcon,
    IonBackButton,
    IonButtons,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/register"></ion-back-button>
        </ion-buttons>
        <ion-title>Trainer Registration</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="register-container">
        <!-- Header -->
        <div class="register-header">
          <div class="icon-wrap">
            <ion-icon name="fitness-outline"></ion-icon>
          </div>
          <h1>Become a FitOS Trainer</h1>
          <p class="subtitle">Create programs, track clients, and grow your business</p>
        </div>

        <!-- Role Badge -->
        <div class="role-badge">
          <ion-icon name="fitness-outline"></ion-icon>
          <span>Trainer</span>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="message message--error">
            {{ errorMessage() }}
          </div>
        }

        <!-- Registration Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
          <div class="form-group">
            <ion-input
              formControlName="fullName"
              type="text"
              label="Full Name"
              labelPlacement="floating"
              fill="outline"
              placeholder="John Doe"
              autocomplete="name"
              autocapitalize="words"
              [errorText]="fullNameError()"
              [class.ion-valid]="registerForm.get('fullName')?.valid && registerForm.get('fullName')?.touched"
              [class.ion-invalid]="registerForm.get('fullName')?.invalid && registerForm.get('fullName')?.touched"
              [class.ion-touched]="registerForm.get('fullName')?.touched"
              (ionBlur)="capitalizeFullName()"
            />
          </div>

          <div class="form-group">
            <ion-input
              formControlName="email"
              type="email"
              label="Email"
              labelPlacement="floating"
              fill="outline"
              placeholder="you@example.com"
              autocomplete="email"
              [errorText]="emailError()"
              [class.ion-valid]="registerForm.get('email')?.valid && registerForm.get('email')?.touched"
              [class.ion-invalid]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
              [class.ion-touched]="registerForm.get('email')?.touched"
            />
          </div>

          <div class="form-group">
            <ion-input
              formControlName="password"
              type="password"
              label="Password"
              labelPlacement="floating"
              fill="outline"
              placeholder="Create a strong password"
              autocomplete="new-password"
              [errorText]="passwordError()"
              [counter]="true"
              [minlength]="8"
              [class.ion-valid]="registerForm.get('password')?.valid && registerForm.get('password')?.touched"
              [class.ion-invalid]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
              [class.ion-touched]="registerForm.get('password')?.touched"
              (ionInput)="onPasswordInput($event)"
            >
              <ion-input-password-toggle slot="end" />
            </ion-input>
          </div>

          <!-- Password Requirements -->
          @if (passwordValue()) {
            <div class="password-requirements">
              <div class="requirement" [class.met]="passwordRequirements().minLength">
                <ion-icon [name]="passwordRequirements().minLength ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                <span>At least 8 characters</span>
              </div>
              <div class="requirement" [class.met]="passwordRequirements().hasUppercase">
                <ion-icon [name]="passwordRequirements().hasUppercase ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                <span>One uppercase letter</span>
              </div>
              <div class="requirement" [class.met]="passwordRequirements().hasLowercase">
                <ion-icon [name]="passwordRequirements().hasLowercase ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                <span>One lowercase letter</span>
              </div>
              <div class="requirement" [class.met]="passwordRequirements().hasNumber">
                <ion-icon [name]="passwordRequirements().hasNumber ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                <span>One number</span>
              </div>
              <div class="requirement" [class.met]="passwordRequirements().hasSpecial">
                <ion-icon [name]="passwordRequirements().hasSpecial ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                <span>One special character (!&#64;#$%^&*)</span>
              </div>
            </div>
          }

          <div class="form-group">
            <ion-input
              formControlName="confirmPassword"
              type="password"
              label="Confirm Password"
              labelPlacement="floating"
              fill="outline"
              placeholder="Re-enter your password"
              autocomplete="new-password"
              [errorText]="confirmPasswordError()"
              [class.ion-valid]="confirmPasswordValue() && passwordValue() === confirmPasswordValue() && confirmPasswordTouched()"
              [class.ion-invalid]="confirmPasswordValue() && passwordValue() !== confirmPasswordValue() && confirmPasswordTouched()"
              [class.ion-touched]="confirmPasswordTouched()"
              (ionInput)="onConfirmPasswordInput($event)"
              (ionBlur)="onConfirmPasswordBlur()"
            >
              <ion-input-password-toggle slot="end" />
            </ion-input>
          </div>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="registerForm.invalid || isSubmitting()"
            class="submit-btn"
          >
            @if (isSubmitting()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Create Trainer Account
            }
          </ion-button>
        </form>

        <!-- Divider -->
        <div class="divider">
          <div class="divider__line"></div>
          <span class="divider__text">or sign up with</span>
          <div class="divider__line"></div>
        </div>

        <!-- Social Sign Up -->
        <div class="social-buttons">
          <ion-button
            expand="block"
            fill="outline"
            color="medium"
            (click)="signUpWithGoogle()"
            [disabled]="isSubmitting() || isSigningUpWithGoogle()"
            class="social-btn"
          >
            @if (isSigningUpWithGoogle()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon name="logo-google" slot="start"></ion-icon>
              Continue with Google
            }
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            color="medium"
            disabled
            class="social-btn"
          >
            <ion-icon name="logo-apple" slot="start"></ion-icon>
            Continue with Apple (Coming Soon)
          </ion-button>
        </div>

        <!-- Terms -->
        <div class="terms">
          <p>
            By creating an account, you agree to our
            <a href="#">Terms of Service</a> and
            <a href="#">Privacy Policy</a>.
          </p>
        </div>

        <!-- Sign In Link -->
        <div class="signin-link">
          <p>
            Already have an account?
            <a routerLink="/auth/login/trainer">Sign in</a>
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

    .register-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 16px 24px 32px;
    }

    .register-header {
      text-align: center;
      margin-bottom: 24px;

      h1 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .subtitle {
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

    .role-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.25);
      width: fit-content;
      margin: 0 auto 24px;

      ion-icon {
        color: var(--ion-color-primary, #10B981);
        font-size: 16px;
      }

      span {
        color: var(--ion-color-primary, #10B981);
        font-size: 13px;
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
    }

    .register-form {
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

    .password-requirements {
      padding: 12px 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);

      .requirement {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 6px;

        &:last-child { margin-bottom: 0; }

        ion-icon { font-size: 16px; }

        &.met {
          color: var(--ion-color-primary, #10B981);
        }
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
      padding: 24px 0;
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
    }

    .terms {
      margin-top: 24px;
      text-align: center;

      p {
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
        margin: 0;
        line-height: 1.5;
      }

      a {
        color: var(--ion-color-primary, #10B981);
        text-decoration: none;
      }
    }

    .signin-link {
      text-align: center;
      margin-top: 24px;

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      a {
        color: var(--ion-color-primary, #10B981);
        text-decoration: none;
        font-weight: 500;
        margin-left: 4px;
      }
    }
  `],
})
export class TrainerRegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  isSubmitting = signal(false);
  isSigningUpWithGoogle = signal(false);
  errorMessage = signal<string | null>(null);
  passwordValue = signal('');
  confirmPasswordValue = signal('');
  confirmPasswordTouched = signal(false);

  registerForm: FormGroup = this.fb.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordComplexityValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator,
    }
  );

  passwordRequirements = computed(() => {
    return checkPasswordRequirements(this.passwordValue());
  });

  onPasswordInput(event: CustomEvent): void {
    this.passwordValue.set(event.detail.value || '');
  }

  onConfirmPasswordInput(event: CustomEvent): void {
    this.confirmPasswordValue.set(event.detail.value || '');
  }

  onConfirmPasswordBlur(): void {
    this.confirmPasswordTouched.set(true);
  }

  fullNameError = computed(() => {
    const control = this.registerForm.get('fullName');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Full name is required';
    return '';
  });

  emailError = computed(() => {
    const control = this.registerForm.get('email');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    return '';
  });

  passwordError = computed(() => {
    const control = this.registerForm.get('password');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Password is required';
    if (control.errors && !control.hasError('required')) return 'Password does not meet requirements';
    return '';
  });

  confirmPasswordError = computed(() => {
    if (!this.confirmPasswordTouched()) return '';
    if (!this.confirmPasswordValue()) return 'Please confirm your password';
    if (this.passwordValue() !== this.confirmPasswordValue()) {
      return 'Passwords do not match';
    }
    return '';
  });

  constructor() {
    addIcons({ fitnessOutline, checkmarkCircle, closeCircle, logoGoogle, logoApple });
  }

  async signUpWithGoogle(): Promise<void> {
    this.isSigningUpWithGoogle.set(true);
    this.errorMessage.set(null);

    const { error } = await this.authService.signUpWithProvider('google', 'trainer');

    if (error) {
      this.isSigningUpWithGoogle.set(false);
      this.errorMessage.set(error.message);
    }
    // If no error, user will be redirected to Google OAuth
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  capitalizeFullName(): void {
    const control = this.registerForm.get('fullName');
    if (control?.value) {
      control.setValue(capitalizeWords(control.value));
    }
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      const { fullName, email, password } = this.registerForm.value;

      const { error, rateLimited } = await this.authService.signUp(
        email,
        password,
        'trainer',
        fullName
      );

      this.isSubmitting.set(false);

      if (error) {
        let errorMsg = error.message || 'Failed to create account. Please try again.';
        if (errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
          errorMsg = 'Network error: Unable to connect to server.';
        }
        this.errorMessage.set(errorMsg);

        const toast = await this.toastController.create({
          message: errorMsg,
          duration: 5000,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
      } else {
        // Navigate to login page first
        await this.router.navigate(['/auth/login/trainer']);

        // Show alert that user must dismiss
        const message = rateLimited
          ? `Your account has been created!\n\nDue to email rate limiting, we couldn't send a verification email right now. Please use "Resend verification email" on the login page.`
          : `Your account has been created!\n\nWe've sent a verification link to ${email}.\n\nPlease check your email (including spam folder) and click the link to verify your account before signing in.`;

        const alert = await this.alertController.create({
          header: 'Verify Your Email',
          message,
          backdropDismiss: false,
          buttons: ['Got it'],
        });
        await alert.present();
      }
    } catch {
      this.isSubmitting.set(false);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    }
  }
}
