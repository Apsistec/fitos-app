import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  IonToggle,
  IonListHeader,
  IonNote,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

interface NotificationPreferences {
  workoutReminders: boolean;
  nutritionReminders: boolean;
  messageNotifications: boolean;
  weeklyProgress: boolean;
  trainerUpdates: boolean;
  clientMilestones: boolean;
  paymentNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonListHeader,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Notifications</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="notifications-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner></ion-spinner>
            <p>Loading preferences...</p>
          </div>
        } @else {
          <!-- Notification Channels -->
          <ion-list>
            <ion-list-header>
              <ion-label>Notification Channels</ion-label>
            </ion-list-header>

            <ion-item>
              <ion-label>
                <h3>Push Notifications</h3>
                <p>Receive notifications on this device</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [(ngModel)]="preferences().pushNotifications"
                (ionChange)="savePreferences()"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Email Notifications</h3>
                <p>Receive updates via email</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [(ngModel)]="preferences().emailNotifications"
                (ionChange)="savePreferences()"
              ></ion-toggle>
            </ion-item>
          </ion-list>

          @if (isClient()) {
            <!-- Client Notifications -->
            <ion-list>
              <ion-list-header>
                <ion-label>Workout & Training</ion-label>
              </ion-list-header>

              <ion-item>
                <ion-label>
                  <h3>Workout Reminders</h3>
                  <p>Get notified before scheduled workouts</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [(ngModel)]="preferences().workoutReminders"
                  (ionChange)="savePreferences()"
                  [disabled]="!preferences().pushNotifications"
                ></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Nutrition Reminders</h3>
                  <p>Reminders to log meals and track nutrition</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [(ngModel)]="preferences().nutritionReminders"
                  (ionChange)="savePreferences()"
                  [disabled]="!preferences().pushNotifications"
                ></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Trainer Updates</h3>
                  <p>When your trainer sends you messages or workouts</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [(ngModel)]="preferences().trainerUpdates"
                  (ionChange)="savePreferences()"
                  [disabled]="!preferences().pushNotifications"
                ></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Weekly Progress</h3>
                  <p>Summary of your weekly activity</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [(ngModel)]="preferences().weeklyProgress"
                  (ionChange)="savePreferences()"
                  [disabled]="!preferences().emailNotifications"
                ></ion-toggle>
              </ion-item>
            </ion-list>
          }

          @if (isTrainer()) {
            <!-- Trainer Notifications -->
            <ion-list>
              <ion-list-header>
                <ion-label>Client Activity</ion-label>
              </ion-list-header>

              <ion-item>
                <ion-label>
                  <h3>Client Milestones</h3>
                  <p>When clients reach important milestones</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [(ngModel)]="preferences().clientMilestones"
                  (ionChange)="savePreferences()"
                  [disabled]="!preferences().pushNotifications"
                ></ion-toggle>
              </ion-item>
            </ion-list>
          }

          <!-- General Notifications -->
          <ion-list>
            <ion-list-header>
              <ion-label>General</ion-label>
            </ion-list-header>

            <ion-item>
              <ion-label>
                <h3>Messages</h3>
                <p>New messages from trainers or clients</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [(ngModel)]="preferences().messageNotifications"
                (ionChange)="savePreferences()"
                [disabled]="!preferences().pushNotifications"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Payment Notifications</h3>
                <p>Payment receipts and billing updates</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [(ngModel)]="preferences().paymentNotifications"
                (ionChange)="savePreferences()"
                [disabled]="!preferences().emailNotifications"
              ></ion-toggle>
            </ion-item>
          </ion-list>

          <div class="notification-note">
            <ion-note>
              <p>
                <strong>Note:</strong> Some notifications are disabled because you've turned off
                @if (!preferences().pushNotifications && !preferences().emailNotifications) {
                  both push and email notifications
                } @else if (!preferences().pushNotifications) {
                  push notifications
                } @else {
                  email notifications
                }.
              </p>
            </ion-note>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .notifications-container {
      max-width: 768px;
      margin: 0 auto;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;

      p {
        color: var(--ion-color-medium);
      }
    }

    ion-list {
      margin-bottom: 24px;
    }

    ion-list-header {
      padding-top: 24px;
      padding-bottom: 8px;

      ion-label {
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--ion-color-medium);
      }
    }

    .notification-note {
      padding: 16px;
      margin: 16px;
      background: var(--ion-color-light);
      border-radius: 8px;

      ion-note {
        p {
          margin: 0;
          line-height: 1.5;
          color: var(--ion-color-medium);

          strong {
            color: var(--ion-color-dark);
          }
        }
      }
    }
  `],
})
export class NotificationsPage implements OnInit {
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private toastController = inject(ToastController);

  loading = signal(true);
  isClient = this.authService.isClient;
  isTrainer = this.authService.isTrainer;

  preferences = signal<NotificationPreferences>({
    workoutReminders: true,
    nutritionReminders: true,
    messageNotifications: true,
    weeklyProgress: true,
    trainerUpdates: true,
    clientMilestones: true,
    paymentNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
  });

  async ngOnInit() {
    await this.loadPreferences();
  }

  async loadPreferences() {
    try {
      const userId = this.authService.user()?.id;
      if (!userId) return;

      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data?.notification_preferences) {
        this.preferences.set({
          ...this.preferences(),
          ...data.notification_preferences,
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async savePreferences() {
    try {
      const userId = this.authService.user()?.id;
      if (!userId) return;

      const { error } = await this.supabase.client
        .from('profiles')
        .update({
          notification_preferences: this.preferences(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      const toast = await this.toastController.create({
        message: 'Preferences saved',
        duration: 1500,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();
    } catch (error) {
      console.error('Error saving preferences:', error);
      const toast = await this.toastController.create({
        message: 'Failed to save preferences',
        duration: 3000,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    }
  }
}
