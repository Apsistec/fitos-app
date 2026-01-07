import { Component, inject, signal, computed } from '@angular/core';
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
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonIcon,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  fitnessOutline,
  peopleOutline,
  businessOutline,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import type { UserRole } from '@fitos/shared';

@Component({
  selector: 'app-register',
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
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonIcon,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonBackButton,
    IonButtons
],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Create Account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="register-container">
        <!-- Role Selection -->
        <div class="role-selection">
          <h2>I am a...</h2>
          <ion-segment [value]="selectedRole()" (ionChange)="onRoleChange($event)">
            <ion-segment-button value="trainer">
              <ion-icon name="fitness-outline"></ion-icon>
              <ion-label>Trainer</ion-label>
            </ion-segment-button>
            <ion-segment-button value="client">
              <ion-icon name="people-outline"></ion-icon>
              <ion-label>Client</ion-label>
            </ion-segment-button>
            <ion-segment-button value="gym_owner">
              <ion-icon name="business-outline"></ion-icon>
              <ion-label>Gym Owner</ion-label>
            </ion-segment-button>
          </ion-segment>
          <p class="role-description">
            @if (selectedRole() === 'trainer') {
              Create programs, track clients, and grow your business.
            } @else if (selectedRole() === 'client') {
              Track workouts, nutrition, and work with your trainer.
            } @else {
              Manage your facility, trainers, and members.
            }
          </p>
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

        <!-- Registration Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <ion-list lines="none">
            <ion-item lines="none">
              <ion-input
                formControlName="fullName"
                type="text"
                label="Full Name"
                labelPlacement="floating"
                fill="outline"
                placeholder="John Doe"
                autocomplete="name"
                helperText="Enter your full name"
                [errorText]="fullNameError()"
              />
            </ion-item>

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
                placeholder="At least 8 characters"
                autocomplete="new-password"
                helperText="Choose a strong password (min 8 characters)"
                [errorText]="passwordError()"
                [counter]="true"
                [minlength]="8"
              >
                <ion-input-password-toggle slot="end" />
              </ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-input
                formControlName="confirmPassword"
                type="password"
                label="Confirm Password"
                labelPlacement="floating"
                fill="outline"
                placeholder="Re-enter your password"
                autocomplete="new-password"
                helperText="Re-enter your password to confirm"
                [errorText]="confirmPasswordError()"
              >
                <ion-input-password-toggle slot="end" />
              </ion-input>
            </ion-item>
          </ion-list>

          <ion-button
            expand="block"
            type="submit"
            [disabled]="registerForm.invalid || loading()"
          >
            @if (loading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Create Account
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
            <a routerLink="/auth/login">Sign in</a>
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

    .role-selection {
      margin-bottom: 24px;

      h2 {
        margin: 0 0 16px;
        font-size: 1.25rem;
        font-weight: 600;
      }

      ion-segment {
        --background: var(--ion-color-light);
      }

      ion-segment-button {
        --indicator-color: var(--ion-color-primary);

        ion-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }
      }

      .role-description {
        margin: 12px 0 0;
        font-size: 0.875rem;
        color: var(--ion-color-medium);
        text-align: center;
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
export class RegisterPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  selectedRole = signal<UserRole>('trainer');

  registerForm: FormGroup = this.fb.group(
    {
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: this.passwordMatchValidator,
    }
  );

  // Computed error messages for ion-input errorText property
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
    if (control.hasError('minlength')) return 'Password must be at least 8 characters';
    return '';
  });

  confirmPasswordError = computed(() => {
    const control = this.registerForm.get('confirmPassword');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Please confirm your password';
    if (this.registerForm.hasError('passwordMismatch') && control.touched) {
      return 'Passwords do not match';
    }
    return '';
  });

  constructor() {
    addIcons({
      fitnessOutline,
      peopleOutline,
      businessOutline,
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onRoleChange(event: CustomEvent): void {
    this.selectedRole.set(event.detail.value as UserRole);
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { fullName, email, password } = this.registerForm.value;
    const { error } = await this.authService.signUp(
      email,
      password,
      this.selectedRole(),
      fullName
    );

    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
    } else {
      this.successMessage.set(
        'Account created! Please check your email to verify your account before logging in.'
      );
      // Don't auto-redirect since email verification is required
      // User will be automatically logged in when they click the verification link
    }
  }
}
