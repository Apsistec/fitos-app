import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  IonSegment,
  IonSegmentButton,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  mailOutline, 
  lockClosedOutline,
  fitnessOutline,
  peopleOutline,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import type { UserRole } from '@fitos/shared';

@Component({
  selector: 'app-register',
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
    IonSegment,
    IonSegmentButton,
    IonBackButton,
    IonButtons,
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
          </ion-segment>
          <p class="role-description">
            @if (selectedRole() === 'trainer') {
              Create programs, track clients, and grow your business.
            } @else {
              Track workouts, nutrition, and work with your trainer.
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
            <ion-item>
              <ion-icon name="person-outline" slot="start" color="medium"></ion-icon>
              <ion-input
                formControlName="fullName"
                type="text"
                placeholder="Full Name"
                autocomplete="name"
              ></ion-input>
            </ion-item>
            @if (registerForm.get('fullName')?.touched && registerForm.get('fullName')?.errors) {
              <ion-note color="danger" class="field-error">
                Please enter your name
              </ion-note>
            }

            <ion-item>
              <ion-icon name="mail-outline" slot="start" color="medium"></ion-icon>
              <ion-input
                formControlName="email"
                type="email"
                placeholder="Email"
                autocomplete="email"
              ></ion-input>
            </ion-item>
            @if (registerForm.get('email')?.touched && registerForm.get('email')?.errors) {
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
                autocomplete="new-password"
              ></ion-input>
            </ion-item>
            @if (registerForm.get('password')?.touched && registerForm.get('password')?.errors) {
              <ion-note color="danger" class="field-error">
                Password must be at least 8 characters
              </ion-note>
            }

            <ion-item>
              <ion-icon name="lock-closed-outline" slot="start" color="medium"></ion-icon>
              <ion-input
                formControlName="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                autocomplete="new-password"
              ></ion-input>
            </ion-item>
            @if (registerForm.get('confirmPassword')?.touched && registerForm.errors?.['passwordMismatch']) {
              <ion-note color="danger" class="field-error">
                Passwords do not match
              </ion-note>
            }
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

  constructor() {
    addIcons({ 
      personOutline, 
      mailOutline, 
      lockClosedOutline,
      fitnessOutline,
      peopleOutline,
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
        'Account created! Please check your email to verify your account.'
      );
      // In development without email verification, redirect to onboarding
      setTimeout(() => {
        this.router.navigate(['/onboarding']);
      }, 2000);
    }
  }
}
