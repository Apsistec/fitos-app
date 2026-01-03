import { Component, inject, signal, computed } from '@angular/core';
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
  arrowForward,
  checkmarkCircle,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

@Component({
  selector: 'app-onboarding',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonItem,
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
              <ion-item lines="none">
                <ion-input
                  formControlName="fullName"
                  type="text"
                  label="Full Name"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="John Doe"
                  helperText="Enter your full name"
                  [errorText]="fullNameError()"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-select
                  formControlName="timezone"
                  label="Timezone"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Select your timezone"
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

              <ion-item lines="none">
                <ion-select
                  formControlName="unitsSystem"
                  label="Units"
                  labelPlacement="floating"
                  fill="outline"
                  interface="popover"
                >
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
              <ion-item lines="none">
                <ion-input
                  formControlName="businessName"
                  type="text"
                  label="Business Name"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Your Fitness Business"
                  helperText="Optional - Your business or brand name"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-textarea
                  formControlName="bio"
                  label="About You"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Tell clients about yourself..."
                  helperText="Share your experience and training philosophy"
                  [autoGrow]="true"
                  rows="4"
                  [counter]="true"
                  [maxlength]="500"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-select
                  formControlName="specializations"
                  label="Specializations"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Select your specialties"
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

        <!-- Step 2: Gym Owner Facility Setup -->
        @if (currentStep() === 2 && isOwner()) {
          <div class="step-header">
            <h2>Your Facility</h2>
            <p>Set up your gym or fitness center.</p>
          </div>

          <form [formGroup]="facilityForm">
            <ion-list lines="none">
              <ion-item lines="none">
                <ion-input
                  formControlName="facilityName"
                  type="text"
                  label="Facility Name"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="My Gym"
                  helperText="The name of your gym or fitness center"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-textarea
                  formControlName="description"
                  label="Description"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Tell members about your facility..."
                  helperText="Optional - Describe your gym's offerings"
                  [autoGrow]="true"
                  rows="3"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-input
                  formControlName="address"
                  type="text"
                  label="Street Address"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="123 Main St"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-input
                  formControlName="city"
                  type="text"
                  label="City"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Chicago"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-input
                  formControlName="state"
                  type="text"
                  label="State"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="IL"
                />
              </ion-item>

              <ion-item lines="none">
                <ion-input
                  formControlName="zipCode"
                  type="text"
                  label="ZIP Code"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="60601"
                />
              </ion-item>
            </ion-list>
          </form>
        }

        <!-- Step 2: Client Goals (if client) -->
        @if (currentStep() === 2 && !isTrainerOrOwner()) {
          <div class="step-header">
            <h2>Your Fitness Goals</h2>
            <p>What are you working towards?</p>
          </div>

          <form [formGroup]="clientForm">
            <ion-list lines="none">
              <ion-item lines="none">
                <ion-select
                  formControlName="goals"
                  label="Goals"
                  labelPlacement="floating"
                  fill="outline"
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

              <ion-item lines="none">
                <ion-select
                  formControlName="fitnessLevel"
                  label="Fitness Level"
                  labelPlacement="floating"
                  fill="outline"
                  interface="popover"
                >
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
              @if (isOwner()) {
                Manage your facility and grow your training team.
              } @else if (isTrainer()) {
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
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
        margin-bottom: 16px;
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
  isOwner = computed(() => this.authService.isOwner());
  isTrainerOrOwner = computed(() => this.isTrainer() || this.isOwner());
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

  facilityForm: FormGroup = this.fb.group({
    facilityName: ['', Validators.required],
    description: [''],
    address: [''],
    city: [''],
    state: [''],
    zipCode: [''],
  });

  // Computed error message for full name
  fullNameError = computed(() => {
    const control = this.profileForm.get('fullName');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Full name is required';
    return '';
  });

  constructor() {
    addIcons({
      arrowForward,
      checkmarkCircle,
    });
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 1:
        return this.profileForm.valid;
      case 2:
        // Gym owners must fill in facility name
        if (this.isOwner()) {
          return this.facilityForm.get('facilityName')?.valid ?? false;
        }
        return true; // Optional step for trainers/clients
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
        if (this.isOwner()) {
          await this.saveFacility();
        } else if (this.isTrainer()) {
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

  private async saveFacility(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    const { facilityName, description, address, city, state, zipCode } = this.facilityForm.value;

    // Create the facility
    const { data: facility, error: facilityError } = await this.supabase
      .from('facilities')
      .insert({
        owner_id: userId,
        name: facilityName,
        description: description || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
      })
      .select()
      .single();

    if (facilityError) throw facilityError;

    // Link the owner's profile to the facility
    const { error: profileError } = await this.supabase
      .from('profiles')
      .update({ facility_id: facility.id })
      .eq('id', userId);

    if (profileError) throw profileError;

    // Also update trainer_profiles with facility_id
    const { error: trainerError } = await this.supabase
      .from('trainer_profiles')
      .update({ facility_id: facility.id })
      .eq('id', userId);

    if (trainerError) throw trainerError;
  }

  skip(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  finish(): void {
    this.router.navigate(['/tabs/dashboard']);
  }
}
