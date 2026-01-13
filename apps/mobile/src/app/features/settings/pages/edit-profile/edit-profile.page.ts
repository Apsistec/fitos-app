import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonSpinner,
  IonAvatar,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonBadge,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, checkmarkCircle, settingsOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonSpinner,
    IonAvatar,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
    IonBadge,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>My Profile</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/tabs/settings" aria-label="Open settings">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="profile-container">
        <!-- Avatar Section -->
        <div class="avatar-section">
          <ion-avatar class="profile-avatar">
            @if (avatarUrl()) {
              <img [src]="avatarUrl()" alt="Profile" />
            } @else {
              <div class="avatar-placeholder">{{ initials() }}</div>
            }
          </ion-avatar>
          <ion-button fill="clear" size="small" (click)="changePhoto()">
            <ion-icon slot="start" name="camera-outline"></ion-icon>
            Change Photo
          </ion-button>
        </div>

        <!-- Profile Form -->
        <form [formGroup]="profileForm">

          <!-- Basic Information -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Basic Information</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item class="form-item">
                  <div class="input-container">
                    <ion-label class="field-label">Full Name</ion-label>
                    <ion-input
                      formControlName="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      class="field-input"
                    ></ion-input>
                  </div>
                </ion-item>

                <ion-item class="form-item">
                  <div class="input-container">
                    <ion-label class="field-label">Email</ion-label>
                    <div class="email-row">
                      <ion-input
                        [value]="email()"
                        type="email"
                        disabled
                        class="field-input"
                      ></ion-input>
                      <ion-button fill="clear" size="small" routerLink="/tabs/settings/change-email">
                        Change
                      </ion-button>
                    </div>
                  </div>
                </ion-item>

                <ion-item button detail (click)="changePassword()" class="form-item">
                  <ion-label>
                    <h3>Change Password</h3>
                    <p>Send password reset link to your email</p>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Preferences -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Preferences</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item class="form-item">
                  <div class="input-container">
                    <ion-label class="field-label">Timezone</ion-label>
                    <ion-select formControlName="timezone" placeholder="Select timezone" class="field-input">
                      <ion-select-option value="America/New_York">Eastern Time</ion-select-option>
                      <ion-select-option value="America/Chicago">Central Time</ion-select-option>
                      <ion-select-option value="America/Denver">Mountain Time</ion-select-option>
                      <ion-select-option value="America/Los_Angeles">Pacific Time</ion-select-option>
                      <ion-select-option value="America/Anchorage">Alaska Time</ion-select-option>
                      <ion-select-option value="Pacific/Honolulu">Hawaii Time</ion-select-option>
                    </ion-select>
                  </div>
                </ion-item>

                <ion-item class="form-item">
                  <div class="input-container">
                    <ion-label class="field-label">Units</ion-label>
                    <ion-select formControlName="unitsSystem" placeholder="Select units" class="field-input">
                      <ion-select-option value="imperial">Imperial (lbs, ft/in)</ion-select-option>
                      <ion-select-option value="metric">Metric (kg, cm)</ion-select-option>
                    </ion-select>
                  </div>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Address (for subscription) -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Address</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item class="form-item">
                  <div class="input-container">
                    <ion-label class="field-label">Street Address</ion-label>
                    <ion-input
                      formControlName="streetAddress"
                      type="text"
                      placeholder="Enter street address"
                      class="field-input"
                    ></ion-input>
                  </div>
                </ion-item>

                <ion-item class="form-item">
                  <div class="input-container">
                    <ion-label class="field-label">City</ion-label>
                    <ion-input
                      formControlName="city"
                      type="text"
                      placeholder="Enter city"
                      class="field-input"
                    ></ion-input>
                  </div>
                </ion-item>

                <div class="address-row">
                  <ion-item class="form-item form-item-half">
                    <div class="input-container">
                      <ion-label class="field-label">State</ion-label>
                      <ion-input
                        formControlName="state"
                        type="text"
                        placeholder="State"
                        class="field-input"
                      ></ion-input>
                    </div>
                  </ion-item>

                  <ion-item class="form-item form-item-half">
                    <div class="input-container">
                      <ion-label class="field-label">ZIP Code</ion-label>
                      <ion-input
                        formControlName="zipCode"
                        type="text"
                        placeholder="ZIP"
                        class="field-input"
                      ></ion-input>
                    </div>
                  </ion-item>
                </div>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Subscription Info (Read-only) -->
          @if (subscriptionInfo()) {
            <ion-card>
              <ion-card-header>
                <ion-card-title>Subscription</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="subscription-info">
                  <div class="info-row">
                    <span class="field-label">Plan</span>
                    <ion-text class="field-value">
                      {{ subscriptionInfo()?.planName || 'Free' }}
                      @if (subscriptionInfo()?.isActive) {
                        <ion-badge color="success">Active</ion-badge>
                      }
                    </ion-text>
                  </div>
                  <div class="info-row">
                    <span class="field-label">Status</span>
                    <ion-text class="field-value">{{ subscriptionInfo()?.status || 'N/A' }}</ion-text>
                  </div>
                  @if (subscriptionInfo()?.nextBillingDate) {
                    <div class="info-row">
                      <span class="field-label">Next Billing</span>
                      <ion-text class="field-value">{{ subscriptionInfo()?.nextBillingDate | date }}</ion-text>
                    </div>
                  }
                  <ion-button expand="block" fill="clear" routerLink="/tabs/settings/my-subscription">
                    Manage Subscription
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          }

          <!-- Bio & Fitness Info (Clients only) -->
          @if (isClient()) {
            <ion-card>
              <ion-card-header>
                <ion-card-title>About Me</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none">
                  <ion-item class="form-item">
                    <div class="input-container">
                      <ion-label class="field-label">Bio</ion-label>
                      <ion-textarea
                        formControlName="bio"
                        placeholder="Tell us about your fitness journey..."
                        rows="4"
                        class="field-input"
                      ></ion-textarea>
                    </div>
                  </ion-item>

                  <ion-item class="form-item">
                    <div class="input-container">
                      <ion-label class="field-label">Fitness Goals</ion-label>
                      <ion-textarea
                        formControlName="fitnessGoals"
                        placeholder="What are your fitness goals?"
                        rows="3"
                        class="field-input"
                      ></ion-textarea>
                    </div>
                  </ion-item>

                  <ion-item class="form-item">
                    <div class="input-container">
                      <ion-label class="field-label">Dietary Preferences</ion-label>
                      <ion-select formControlName="dietaryPreferences" multiple placeholder="Select preferences" class="field-input">
                        <ion-select-option value="vegetarian">Vegetarian</ion-select-option>
                        <ion-select-option value="vegan">Vegan</ion-select-option>
                        <ion-select-option value="pescatarian">Pescatarian</ion-select-option>
                        <ion-select-option value="keto">Keto</ion-select-option>
                        <ion-select-option value="paleo">Paleo</ion-select-option>
                        <ion-select-option value="gluten-free">Gluten-Free</ion-select-option>
                        <ion-select-option value="dairy-free">Dairy-Free</ion-select-option>
                      </ion-select>
                    </div>
                  </ion-item>

                  <ion-item class="form-item">
                    <div class="input-container">
                      <ion-label class="field-label">Activity Level</ion-label>
                      <ion-select formControlName="activityLevel" placeholder="Select activity level" class="field-input">
                        <ion-select-option value="sedentary">Sedentary (Little/no exercise)</ion-select-option>
                        <ion-select-option value="light">Light (1-3 days/week)</ion-select-option>
                        <ion-select-option value="moderate">Moderate (3-5 days/week)</ion-select-option>
                        <ion-select-option value="active">Active (6-7 days/week)</ion-select-option>
                        <ion-select-option value="very-active">Very Active (Intense daily)</ion-select-option>
                      </ion-select>
                    </div>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          }

          <!-- Save Button -->
          <div class="form-actions">
            <ion-button
              expand="block"
              (click)="saveProfile()"
              [disabled]="saving() || profileForm.invalid"
              size="large"
            >
              @if (saving()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                <ion-icon slot="start" name="checkmark-circle"></ion-icon>
                Save Changes
              }
            </ion-button>
          </div>
        </form>
      </div>
    </ion-content>
  `,
  styles: [`
    .profile-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 16px;
      padding-bottom: 80px;
    }

    .avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px 0;
    }

    .profile-avatar {
      width: 120px;
      height: 120px;
      border: 4px solid var(--ion-color-primary);
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-primary);
      color: white;
      font-size: 48px;
      font-weight: 600;
    }

    ion-card {
      margin: 16px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    ion-card-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .form-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      margin-bottom: 20px;
    }

    .input-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .field-input {
      font-size: 16px;
      color: var(--ion-text-color);
      --padding-start: 12px;
      --padding-end: 12px;
      border: 1px solid var(--ion-color-light);
      border-radius: 8px;
      min-height: 44px;
    }

    .field-value {
      font-size: 16px;
      color: var(--ion-text-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .email-row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .address-row {
      display: flex;
      gap: 12px;
    }

    .form-item-half {
      flex: 1;
    }

    .subscription-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--ion-color-light);
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .form-actions {
      padding: 24px 0;
      position: sticky;
      bottom: 0;
      background: var(--ion-background-color);
      z-index: 10;
    }

    ion-list {
      padding: 0;
    }

    ion-textarea {
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      border: 1px solid var(--ion-color-light);
      border-radius: 8px;
    }
  `],
})
export class EditProfilePage implements OnInit {
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private alertController = inject(AlertController);

  saving = signal(false);
  avatarUrl = signal<string | null>(null);
  email = signal('');
  initials = signal('');
  subscriptionInfo = signal<any>(null);
  isClient = this.authService.isClient;

  profileForm: FormGroup;

  constructor() {
    addIcons({ cameraOutline, checkmarkCircle, settingsOutline });

    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      timezone: ['America/New_York'],
      unitsSystem: ['imperial'],
      streetAddress: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      bio: [''],
      fitnessGoals: [''],
      dietaryPreferences: [[]],
      activityLevel: [''],
    });
  }

  async ngOnInit() {
    await this.loadProfile();
    await this.loadSubscription();
  }

  async loadProfile() {
    const profile = this.authService.profile();
    if (profile) {
      this.profileForm.patchValue({
        fullName: profile.fullName || '',
        timezone: profile.timezone || 'America/New_York',
        unitsSystem: profile.unitsSystem || 'imperial',
        streetAddress: profile.streetAddress || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zipCode || '',
      });

      // Load bio and fitness info from client_profiles if user is a client
      if (this.isClient()) {
        const { data: clientProfile } = await this.supabase.client
          .from('client_profiles')
          .select('bio, fitness_goals, dietary_preferences, activity_level')
          .eq('id', profile.id)
          .single();

        if (clientProfile) {
          this.profileForm.patchValue({
            bio: clientProfile.bio || '',
            fitnessGoals: clientProfile.fitness_goals || '',
            dietaryPreferences: clientProfile.dietary_preferences || [],
            activityLevel: clientProfile.activity_level || '',
          });
        }
      }

      this.email.set(profile.email || '');
      this.avatarUrl.set(profile.avatarUrl || null);
      this.initials.set(this.getInitials(profile.fullName || ''));
    }
  }

  async loadSubscription() {
    // TODO: Load subscription info from database
    // For now, set a placeholder
    this.subscriptionInfo.set({
      planName: 'Free',
      status: 'Active',
      isActive: false,
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  async saveProfile() {
    if (this.profileForm.invalid || this.saving()) return;

    this.saving.set(true);

    try {
      const userId = this.authService.user()?.id;
      if (!userId) throw new Error('Not authenticated');

      const {
        fullName,
        timezone,
        unitsSystem,
        streetAddress,
        city,
        state,
        zipCode,
        bio,
        fitnessGoals,
        dietaryPreferences,
        activityLevel,
      } = this.profileForm.value;

      const { error } = await this.supabase.client
        .from('profiles')
        .update({
          full_name: fullName,
          timezone,
          units_system: unitsSystem,
          street_address: streetAddress,
          city,
          state,
          zip_code: zipCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Update client profile bio and fitness info if applicable
      if (this.isClient()) {
        await this.supabase.client
          .from('client_profiles')
          .update({
            bio: bio || null,
            fitness_goals: fitnessGoals || null,
            dietary_preferences: dietaryPreferences || [],
            activity_level: activityLevel || null,
          })
          .eq('id', userId);
      }

      const toast = await this.toastController.create({
        message: 'Profile updated successfully',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();

      // Reload auth profile
      await this.authService.initAuthListener();

      this.router.navigate(['/tabs/settings']);
    } catch (error) {
      console.error('Error saving profile:', error);
      const toast = await this.toastController.create({
        message: 'Failed to update profile',
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      this.saving.set(false);
    }
  }

  async changePhoto() {
    // TODO: Implement photo upload with Capacitor Camera
    const toast = await this.toastController.create({
      message: 'Photo upload coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async changePassword() {
    const alert = await this.alertController.create({
      header: 'Change Password',
      message: 'We\'ll send you a password reset link to your email.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Send Link',
          handler: async () => {
            try {
              const email = this.authService.profile()?.email;
              if (!email) return;

              const { error } = await this.supabase.client.auth.resetPasswordForEmail(email);
              if (error) throw error;

              const toast = await this.toastController.create({
                message: 'Password reset link sent to your email',
                duration: 3000,
                color: 'success',
                position: 'bottom',
              });
              await toast.present();
            } catch (error) {
              console.error('Error sending reset link:', error);
              const toast = await this.toastController.create({
                message: 'Failed to send reset link',
                duration: 3000,
                color: 'danger',
                position: 'bottom',
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }
}
