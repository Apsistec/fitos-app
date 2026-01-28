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
  IonNote,
  IonBackButton,
  IonButtons,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fitnessOutline, checkmarkCircle, closeCircle } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
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
    IonNote,
    IonBackButton,
    IonButtons,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/register"></ion-back-button>
        </ion-buttons>
        <ion-title>Trainer Registration</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="register-container">
        <!-- Header -->
        <div class="register-header">
          <div class="logo">
            <ion-icon name="fitness-outline" color="primary"></ion-icon>
          </div>
          <h1>Become a FitOS Trainer</h1>
          <p class="subtitle">Create programs, track clients, and grow your business</p>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
          </ion-note>
        }

        <!-- Registration Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-fields">
            <ion-input
              formControlName="fullName"
              type="text"
              label="Full Name"
              labelPlacement="floating"
              fill="outline"
              placeholder="John Doe"
              autocomplete="name"
              autocapitalize="words"
              helperText="Your name as it will appear to clients"
              [errorText]="fullNameError()"
              [class.ion-valid]="registerForm.get('fullName')?.valid && registerForm.get('fullName')?.touched"
              [class.ion-invalid]="registerForm.get('fullName')?.invalid && registerForm.get('fullName')?.touched"
              [class.ion-touched]="registerForm.get('fullName')?.touched"
              (ionBlur)="capitalizeFullName()"
            />

            <ion-input
              formControlName="email"
              type="email"
              label="Email"
              labelPlacement="floating"
              fill="outline"
              placeholder="you@example.com"
              autocomplete="email"
              helperText="We'll use this for account verification"
              [errorText]="emailError()"
              [class.ion-valid]="registerForm.get('email')?.valid && registerForm.get('email')?.touched"
              [class.ion-invalid]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
              [class.ion-touched]="registerForm.get('email')?.touched"
            />

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
          >
            @if (isSubmitting()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Create Trainer Account
            }
          </ion-button>
        </form>

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
    .register-container {
      max-width: 400px;
      margin: 0 auto;
    }

    .register-header {
      text-align: center;
      margin-bottom: 24px;

      .logo {
        ion-icon {
          font-size: 56px;
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
    }

    .form-fields {
      margin-bottom: 24px;

      ion-input {
        margin-bottom: 16px;
      }
    }

    .password-requirements {
      padding: 12px 16px;
      margin-bottom: 16px;
      background: var(--ion-color-light);
      border-radius: 8px;

      .requirement {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        color: var(--ion-color-danger);
        margin-bottom: 4px;

        &:last-child {
          margin-bottom: 0;
        }

        ion-icon {
          font-size: 16px;
        }

        &.met {
          color: var(--ion-color-success);
        }
      }
    }

    .terms {
      margin-top: 24px;
      text-align: center;

      p {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        margin: 0;
      }

      a {
        color: var(--ion-color-primary);
        text-decoration: none;
      }
    }

    .signin-link {
      text-align: center;
      margin-top: 24px;

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
export class TrainerRegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  isSubmitting = signal(false);
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
    addIcons({ fitnessOutline, checkmarkCircle, closeCircle });
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
    } catch (err) {
      this.isSubmitting.set(false);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    }
  }
}
