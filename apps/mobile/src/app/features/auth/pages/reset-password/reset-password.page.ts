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
  IonItem,
  IonList,
  IonSpinner,
  IonNote,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle } from 'ionicons/icons';
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
    IonItem,
    IonList,
    IonSpinner,
    IonNote,
    IonIcon,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Set New Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="reset-container">
        <div class="reset-header">
          <h2>Create a new password</h2>
          <p>Enter a strong password for your account.</p>
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

        @if (!successMessage()) {
          <!-- Form -->
          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
            <ion-list lines="none">
              <ion-item lines="none">
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
              </ion-item>

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

              <ion-item lines="none">
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
              </ion-item>
            </ion-list>

            <ion-button
              expand="block"
              type="submit"
              [disabled]="resetForm.invalid || isSubmitting()"
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
    .reset-container {
      max-width: 400px;
      margin: 0 auto;
    }

    .reset-header {
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
