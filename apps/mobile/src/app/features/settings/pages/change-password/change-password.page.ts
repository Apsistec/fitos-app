import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonInput,
  IonInputPasswordToggle,
  IonSpinner,
  IonIcon,
  IonNote,
  IonCard,
  IonCardContent,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { keyOutline, checkmarkCircle, closeCircle, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { passwordComplexityValidator, checkPasswordRequirements } from '@app/features/auth/validators/password.validator';

@Component({
  selector: 'app-change-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonInput,
    IonInputPasswordToggle,
    IonSpinner,
    IonIcon,
    IonNote,
    IonCard,
    IonCardContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings/privacy"></ion-back-button>
        </ion-buttons>
        <ion-title>Change Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="change-password-container">
        <!-- Header -->
        <div class="header">
          <div class="icon-container">
            <ion-icon name="key-outline" color="primary"></ion-icon>
          </div>
          <h1>Update Your Password</h1>
          <p>Choose a strong password to keep your account secure</p>
        </div>

        <!-- Error/Success Message -->
        @if (errorMessage()) {
          <ion-note color="danger" class="message">
            {{ errorMessage() }}
          </ion-note>
        }

        @if (successMessage()) {
          <ion-note color="success" class="message success">
            <ion-icon name="checkmark-circle"></ion-icon>
            {{ successMessage() }}
          </ion-note>
        }

        <!-- Password Form -->
        <ion-card>
          <ion-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
              <div class="form-fields">
                <ion-input
                  formControlName="newPassword"
                  type="password"
                  label="New Password"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Enter new password"
                  autocomplete="new-password"
                  [errorText]="newPasswordError()"
                  [counter]="true"
                  [minlength]="8"
                  [class.ion-valid]="passwordForm.get('newPassword')?.valid && passwordForm.get('newPassword')?.touched"
                  [class.ion-invalid]="passwordForm.get('newPassword')?.invalid && passwordForm.get('newPassword')?.touched"
                  [class.ion-touched]="passwordForm.get('newPassword')?.touched"
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
                      <span>One special character (!@#$%^&*)</span>
                    </div>
                  </div>
                }

                <ion-input
                  formControlName="confirmPassword"
                  type="password"
                  label="Confirm New Password"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Re-enter new password"
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
                [disabled]="passwordForm.invalid || isSaving() || passwordValue() !== confirmPasswordValue()"
              >
                @if (isSaving()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else {
                  Update Password
                }
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>

        <!-- Security Tips -->
        <div class="security-tips">
          <h3>
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            Security Tips
          </h3>
          <ul>
            <li>Use a unique password you don't use elsewhere</li>
            <li>Consider using a password manager</li>
            <li>Enable two-factor authentication for extra security</li>
            <li>Never share your password with anyone</li>
          </ul>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .change-password-container {
      max-width: 500px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      padding: 24px 0;

      .icon-container {
        ion-icon {
          font-size: 64px;
        }
      }

      h1 {
        margin: 16px 0 8px;
        font-size: 1.5rem;
        font-weight: 700;
      }

      p {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 0.9rem;
      }
    }

    .message {
      display: block;
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);

      &.success {
        background: rgba(var(--ion-color-success-rgb), 0.1);
        display: flex;
        align-items: center;
        gap: 8px;

        ion-icon {
          font-size: 20px;
        }
      }
    }

    ion-card {
      margin: 0 0 24px;
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

    .security-tips {
      padding: 16px;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 12px;
      margin-bottom: 24px;

      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 12px;
        font-size: 1rem;
        font-weight: 600;

        ion-icon {
          font-size: 20px;
          color: var(--ion-color-primary);
        }
      }

      ul {
        margin: 0;
        padding-left: 20px;

        li {
          font-size: 0.85rem;
          color: var(--ion-color-dark);
          margin-bottom: 6px;
          line-height: 1.4;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  `],
})
export class ChangePasswordPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);

  isSaving = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  passwordValue = signal('');
  confirmPasswordValue = signal('');
  confirmPasswordTouched = signal(false);

  passwordForm: FormGroup = this.fb.group(
    {
      newPassword: ['', [Validators.required, passwordComplexityValidator]],
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

  newPasswordError = computed(() => {
    const control = this.passwordForm.get('newPassword');
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
    addIcons({ keyOutline, checkmarkCircle, closeCircle, shieldCheckmarkOutline });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.passwordForm.invalid || this.passwordValue() !== this.confirmPasswordValue()) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const { newPassword } = this.passwordForm.value;

      const { error } = await this.authService.changePassword(newPassword);

      this.isSaving.set(false);

      if (error) {
        this.errorMessage.set(error.message || 'Failed to update password. Please try again.');
      } else {
        this.successMessage.set('Password updated successfully!');
        this.passwordForm.reset();
        this.passwordValue.set('');
        this.confirmPasswordValue.set('');
        this.confirmPasswordTouched.set(false);

        const toast = await this.toastController.create({
          message: 'Password updated successfully!',
          duration: 3000,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();

        // Navigate back after a short delay
        setTimeout(() => {
          this.router.navigate(['/tabs/settings/privacy']);
        }, 1500);
      }
    } catch (err) {
      this.isSaving.set(false);
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    }
  }
}
