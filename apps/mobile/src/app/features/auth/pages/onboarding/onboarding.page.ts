import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonSpinner,
  IonIcon,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  businessOutline,
  globeOutline,
  arrowForward,
  checkmarkCircle,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonIcon,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonProgressBar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Complete Your Profile</ion-title>
      </ion-toolbar>
      <ion-progress-bar [value]="progressValue()"></ion-progress-bar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="onboarding-container">
        <!-- Step 1: Basic Info -->
        @if (currentStep() === 1) {
          <div class="step-header">
            <h2>Welcome to FitOS! 👋</h2>
            <p>Let's set up your profile.</p>
          </div>

          <form [formGroup]="profileForm">
            <ion-list lines="none">
              <ion-item>
                <ion-icon name="person-outline" slot="start" color="medium"></ion-icon>
                <ion-input
                  formControlName="fullName"
                  type="text"
                  placeholder="Full Name"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-icon name="globe-outline" slot="start" color="medium"></ion-icon>
                <ion-select
                  formControlName="timezone"
                  placeholder="Timezone"
                  interface="action-sheet"
                >
                  <ion-select-option value="America/New_York">Eastern Time</ion-select-option>
                  <ion-select-option value="America/Chicago">Central Time</ion-select-option>
                  <ion-select-option value="America/Denver">Mountain Time</ion-select-option>
                  <ion-select-option value="America/Los_Angeles">Pacific Time</ion-select-option>
                  <ion-select-option value="America/Phoenix">Arizona Time</ion-select-option>
                  <ion-select-option value="Pacific/Honolulu">Hawaii Time</ion-select-option>
                  <ion-select-option value="Europe/London">London</ion-select-option>
                  <ion-select-option value="Europe/Paris">Paris</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>Units</ion-label>
                <ion-select formControlName="unitsSystem" interface="popover">
                  <ion-select-option value="imperial">Imperial (lbs, ft)</ion-select-option>
                  <ion-select-option value="metric">Metric (kg, cm)</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
          </form>
        }

        <!-- Step 2: Trainer Business Info -->
        @if (currentStep() === 2 && isTrainer()) {
          <div class="step-header">
            <h2>About Your Business</h2>
            <p>Help clients learn about you.</p>
          </div>

          <form [formGroup]="trainerForm">
            <ion-list lines="none">
              <ion-item>
                <ion-icon name="business-outline" slot="start" color="medium"></ion-icon>
                <ion-input
                  formControlName="businessName"
                  type="text"
                  placeholder="Business Name (optional)"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-textarea
                  formControlName="bio"
                  placeholder="Tell clients about yourself..."
                  [autoGrow]="true"
                  rows="4"
                ></ion-textarea>
              </ion-item>

              <ion-item>
                <ion-select
                  formControlName="specializations"
                  placeholder="Specializations"
                  [multiple]="true"
                  interface="alert"
                >
                  <ion-select-option value="strength">Strength Training</ion-select-option>
                  <ion-select-option value="weight_loss">Weight Loss</ion-select-option>
                  <ion-select-option value="bodybuilding">Bodybuilding</ion-select-option>
                  <ion-select-option value="athletic">Athletic Performance</ion-select-option>
                  <ion-select-option value="rehabilitation">Rehabilitation</ion-select-option>
                  <ion-select-option value="nutrition">Nutrition Coaching</ion-select-option>
                  <ion-select-option value="mobility">Mobility & Flexibility</ion-select-option>
                  <ion-select-option value="seniors">Senior Fitness</ion-select-option>
                  <ion-select-option value="youth">Youth Training</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
          </form>
        }

        <!-- Step 2: Client Goals (if client) -->
        @if (currentStep() === 2 && !isTrainer()) {
          <div class="step-header">
            <h2>Your Fitness Goals</h2>
            <p>What are you working towards?</p>
          </div>

          <form [formGroup]="clientForm">
            <ion-list lines="none">
              <ion-item>
                <ion-select
                  formControlName="goals"
                  placeholder="Select your goals"
                  [multiple]="true"
                  interface="alert"
                >
                  <ion-select-option value="lose_weight">Lose Weight</ion-select-option>
                  <ion-select-option value="build_muscle">Build Muscle</ion-select-option>
                  <ion-select-option value="get_stronger">Get Stronger</ion-select-option>
                  <ion-select-option value="improve_endurance">Improve Endurance</ion-select-option>
                  <ion-select-option value="flexibility">Increase Flexibility</ion-select-option>
                  <ion-select-option value="general_fitness">General Fitness</ion-select-option>
                  <ion-select-option value="sports_performance">Sports Performance</ion-select-option>
                  <ion-select-option value="rehabilitation">Injury Recovery</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>Fitness Level</ion-label>
                <ion-select formControlName="fitnessLevel" interface="popover">
                  <ion-select-option value="beginner">Beginner</ion-select-option>
                  <ion-select-option value="intermediate">Intermediate</ion-select-option>
                  <ion-select-option value="advanced">Advanced</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
          </form>
        }

        <!-- Step 3: Complete -->
        @if (currentStep() === 3) {
          <div class="complete-step">
            <ion-icon name="checkmark-circle" color="success"></ion-icon>
            <h2>You're all set!</h2>
            <p>
              @if (isTrainer()) {
                Start creating workouts and inviting clients.
              } @else {
                Track your workouts and nutrition to reach your goals.
              }
            </p>
          </div>
        }

        <!-- Error Message -->
        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
          </ion-note>
        }

        <!-- Navigation Buttons -->
        <div class="navigation-buttons">
          @if (currentStep() < 3) {
            <ion-button
              expand="block"
              (click)="nextStep()"
              [disabled]="loading() || !canProceed()"
            >
              @if (loading()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                Continue
                <ion-icon name="arrow-forward" slot="end"></ion-icon>
              }
            </ion-button>
          }

          @if (currentStep() === 3) {
            <ion-button expand="block" (click)="finish()">
              Get Started
              <ion-icon name="arrow-forward" slot="end"></ion-icon>
            </ion-button>
          }

          @if (currentStep() === 1) {
            <ion-button fill="clear" expand="block" (click)="skip()">
              Skip for now
            </ion-button>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .onboarding-container {
      max-width: 500px;
      margin: 0 auto;
      padding-top: 24px;
    }

    .step-header {
      margin-bottom: 32px;

      h2 {
        margin: 0 0 8px;
        font-size: 1.75rem;
        font-weight: 700;
      }

      p {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 1rem;
      }
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

    .error-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    .complete-step {
      text-align: center;
      padding: 48px 0;

      ion-icon {
        font-size: 80px;
        margin-bottom: 24px;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 1.75rem;
        font-weight: 700;
      }

      p {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 1rem;
      }
    }

    .navigation-buttons {
      margin-top: 32px;

      ion-button {
        margin-bottom: 12px;
      }
    }
  `],
})
export class OnboardingPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  currentStep = signal(1);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  isTrainer = computed(() => this.authService.isTrainer());
  totalSteps = computed(() => 3);
  progressValue = computed(() => this.currentStep() / this.totalSteps());

  profileForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    timezone: ['America/Chicago'],
    unitsSystem: ['imperial'],
  });

  trainerForm: FormGroup = this.fb.group({
    businessName: [''],
    bio: [''],
    specializations: [[]],
  });

  clientForm: FormGroup = this.fb.group({
    goals: [[]],
    fitnessLevel: ['beginner'],
  });

  constructor() {
    addIcons({ 
      personOutline, 
      businessOutline,
      globeOutline,
      arrowForward,
      checkmarkCircle,
    });
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 1:
        return this.profileForm.valid;
      case 2:
        return true; // Optional step
      default:
        return true;
    }
  }

  async nextStep(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      if (this.currentStep() === 1) {
        // Save profile
        await this.saveProfile();
      } else if (this.currentStep() === 2) {
        // Save role-specific data
        if (this.isTrainer()) {
          await this.saveTrainerProfile();
        } else {
          await this.saveClientProfile();
        }
      }

      this.currentStep.update((s) => s + 1);
    } catch (error) {
      this.errorMessage.set((error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  private async saveProfile(): Promise<void> {
    const { fullName, timezone, unitsSystem } = this.profileForm.value;
    const { error } = await this.authService.updateProfile({
      fullName,
      timezone,
      unitsSystem,
    });
    if (error) throw error;
  }

  private async saveTrainerProfile(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    const { businessName, bio, specializations } = this.trainerForm.value;
    
    const { error } = await this.supabase
      .from('trainer_profiles')
      .update({
        business_name: businessName,
        bio,
        specializations,
      })
      .eq('id', userId);

    if (error) throw error;
  }

  private async saveClientProfile(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    const { goals, fitnessLevel } = this.clientForm.value;
    
    const { error } = await this.supabase
      .from('client_profiles')
      .update({
        goals,
        fitness_level: fitnessLevel,
        onboarding_completed: true,
      })
      .eq('id', userId);

    if (error) throw error;
  }

  skip(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  finish(): void {
    this.router.navigate(['/tabs/dashboard']);
  }
}
