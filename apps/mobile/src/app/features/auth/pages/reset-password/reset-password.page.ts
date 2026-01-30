import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
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
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

// Password complexity validator
function passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;

  const errors: ValidationErrors = {};

  if (value.length < 8) {
    errors['minLength'] = true;
  }
  if (!/[A-Z]/.test(value)) {
    errors['noUppercase'] = true;
  }
  if (!/[a-z]/.test(value)) {
    errors['noLowercase'] = true;
  }
  if (!/[0-9]/.test(value)) {
    errors['noNumber'] = true;
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    errors['noSpecial'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonInputPasswordToggle,
    IonSpinner,
    IonIcon,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Set New Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="reset-container">
        <div class="reset-header">
          <div class="icon-wrap">
            <ion-icon name="lock-closed-outline"></ion-icon>
          </div>
          <h2>Create a new password</h2>
          <p>Enter a strong password for your account.</p>
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

        @if (!successMessage()) {
          <!-- Form -->
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="reset-form">
            <div class="form-group">
              <ion-input
                formControlName="password"
                type="password"
                label="New Password"
                labelPlacement="floating"
                fill="outline"
                placeholder="Create a strong password"
                autocomplete="new-password"
                [errorText]="passwordError()"
                [counter]="true"
                [minlength]="8"
              >
                <ion-input-password-toggle slot="end" />
              </ion-input>
            </div>

            <!-- Password Requirements -->
            @if (resetForm.get('password')?.value) {
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
              >
                <ion-input-password-toggle slot="end" />
              </ion-input>
            </div>

            <ion-button
              expand="block"
              type="submit"
              [disabled]="resetForm.invalid || isSubmitting()"
              class="submit-btn"
            >
              @if (isSubmitting()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                Update Password
              }
            </ion-button>
          </form>
        }
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

    .reset-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 16px 24px 32px;
    }

    .reset-header {
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

    .reset-form {
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
  `],
})
export class ResetPasswordPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  resetForm: FormGroup = this.fb.group(
    {
      password: ['', [Validators.required, passwordComplexityValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator,
    }
  );

  // Computed signal for password requirements visual feedback
  passwordRequirements = computed(() => {
    const password = this.resetForm.get('password')?.value || '';
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  });

  passwordError = computed(() => {
    const control = this.resetForm.get('password');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Password is required';
    if (control.errors && !control.hasError('required')) return 'Password does not meet requirements';
    return '';
  });

  confirmPasswordError = computed(() => {
    const control = this.resetForm.get('confirmPassword');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Please confirm your password';
    if (this.resetForm.hasError('passwordMismatch') && control.touched) {
      return 'Passwords do not match';
    }
    return '';
  });

  constructor() {
    addIcons({ checkmarkCircle, closeCircle });
  }

  ngOnInit(): void {
    // Check if we have a valid recovery session
    // The URL hash should contain the recovery token from the email link
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      this.errorMessage.set('Invalid or expired password reset link. Please request a new one.');
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { password } = this.resetForm.value;
    const { error } = await this.authService.updatePassword(password);

    this.isSubmitting.set(false);

    if (error) {
      this.errorMessage.set(error.message);
    } else {
      this.successMessage.set('Password updated successfully! Redirecting to login...');

      const toast = await this.toastController.create({
        message: 'Password updated successfully!',
        duration: 3000,
        position: 'top',
        color: 'success',
      });
      await toast.present();

      // Redirect to login after a short delay
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);
    }
  }
}
