import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, saveOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
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
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Edit Profile</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="saveProfile()" [disabled]="saving() || profileForm.invalid">
            @if (saving()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon slot="icon-only" name="save-outline"></ion-icon>
            }
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
          <ion-list>
            <ion-item>
              <ion-label position="stacked">Full Name *</ion-label>
              <ion-input
                formControlName="fullName"
                type="text"
                placeholder="Enter your full name"
              ></ion-input>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Email</ion-label>
              <ion-input
                [value]="email()"
                type="email"
                disabled
              ></ion-input>
              <ion-button slot="end" fill="clear" size="small" routerLink="/tabs/settings/change-email">
                Change
              </ion-button>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Timezone</ion-label>
              <ion-select formControlName="timezone" placeholder="Select timezone">
                <ion-select-option value="America/New_York">Eastern Time</ion-select-option>
                <ion-select-option value="America/Chicago">Central Time</ion-select-option>
                <ion-select-option value="America/Denver">Mountain Time</ion-select-option>
                <ion-select-option value="America/Los_Angeles">Pacific Time</ion-select-option>
                <ion-select-option value="America/Anchorage">Alaska Time</ion-select-option>
                <ion-select-option value="Pacific/Honolulu">Hawaii Time</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Units System</ion-label>
              <ion-select formControlName="unitsSystem" placeholder="Select units">
                <ion-select-option value="imperial">Imperial (lbs, ft/in)</ion-select-option>
                <ion-select-option value="metric">Metric (kg, cm)</ion-select-option>
              </ion-select>
            </ion-item>

            @if (isClient()) {
              <ion-item>
                <ion-label position="stacked">Bio</ion-label>
                <ion-textarea
                  formControlName="bio"
                  placeholder="Tell us about your fitness journey..."
                  rows="4"
                ></ion-textarea>
              </ion-item>
            }
          </ion-list>

          <div class="form-actions">
            <ion-button
              expand="block"
              (click)="saveProfile()"
              [disabled]="saving() || profileForm.invalid"
            >
              @if (saving()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
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

    ion-list {
      margin-bottom: 24px;
    }

    .form-actions {
      padding: 16px 0;
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
    }
  `],
})
export class EditProfilePage implements OnInit {
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastController = inject(ToastController);

  saving = signal(false);
  avatarUrl = signal<string | null>(null);
  email = signal('');
  initials = signal('');
  isClient = this.authService.isClient;

  profileForm: FormGroup;

  constructor() {
    addIcons({ cameraOutline, saveOutline });

    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      timezone: ['America/New_York'],
      unitsSystem: ['imperial'],
      bio: [''],
    });
  }

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    const profile = this.authService.profile();
    if (profile) {
      this.profileForm.patchValue({
        fullName: profile.fullName || '',
        timezone: profile.timezone || 'America/New_York',
        unitsSystem: profile.unitsSystem || 'imperial',
      });

      this.email.set(profile.email || '');
      this.avatarUrl.set(profile.avatarUrl || null);
      this.initials.set(this.getInitials(profile.fullName || ''));
    }
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

      const { fullName, timezone, unitsSystem, bio } = this.profileForm.value;

      const { error } = await this.supabase.client
        .from('profiles')
        .update({
          full_name: fullName,
          timezone,
          units_system: unitsSystem,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Update client profile bio if applicable
      if (this.isClient() && bio) {
        await this.supabase.client
          .from('client_profiles')
          .update({ bio })
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
}
