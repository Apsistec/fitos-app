import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
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
  IonButton,
  IonIcon,
  IonRange,
  IonBadge,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  timeOutline,
  shieldCheckmarkOutline,
  flashOutline,
  locationOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';

import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { GeofenceService } from '../../../../core/services/geofence.service';
import { GymLocationPickerComponent, GymLocationSaved } from '../../components/gym-location-picker/gym-location-picker.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    IonButton,
    IonIcon,
    IonRange,
    IonBadge,
    GymLocationPickerComponent,
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
            <p>Loading preferences…</p>
          </div>
        } @else {

          <!-- ── Push permission banner ─────────────────────────────── -->
          @if (!notifService.permissionGranted()) {
            <div class="permission-banner">
              <ion-icon name="notifications-outline"></ion-icon>
              <div class="banner-text">
                <strong>Enable Push Notifications</strong>
                <p>Get real-time alerts for gym arrivals, workout reminders, and more.</p>
              </div>
              <ion-button
                size="small"
                (click)="requestPushPermission()"
                [disabled]="requestingPermission()"
              >
                @if (requestingPermission()) {
                  <ion-spinner slot="start" name="crescent"></ion-spinner>
                }
                Enable
              </ion-button>
            </div>
          } @else {
            <div class="permission-granted">
              <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
              <span>Push notifications enabled</span>
            </div>
          }

          <!-- ── Notification channels ──────────────────────────────── -->
          <ion-list>
            <ion-list-header>
              <ion-label>Channels</ion-label>
            </ion-list-header>

            <ion-item>
              <ion-label>
                <h3>Push Notifications</h3>
                <p>Receive notifications on this device</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [ngModel]="prefs().pushEnabled"
                (ngModelChange)="updatePref('pushEnabled', $event)"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Email Notifications</h3>
                <p>Receive updates via email</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [ngModel]="prefs().emailEnabled"
                (ngModelChange)="updatePref('emailEnabled', $event)"
              ></ion-toggle>
            </ion-item>
          </ion-list>

          <!-- ── Smart delivery ─────────────────────────────────────── -->
          <ion-list>
            <ion-list-header>
              <ion-label>Smart Delivery</ion-label>
            </ion-list-header>

            <ion-item>
              <ion-icon slot="start" name="flash-outline" class="item-icon"></ion-icon>
              <ion-label>
                <h3>JITAI Coaching</h3>
                <p>AI-timed nudges based on your behaviour patterns</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [ngModel]="prefs().jitaiEnabled"
                (ngModelChange)="updatePref('jitaiEnabled', $event)"
                [disabled]="!prefs().pushEnabled"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" name="location-outline" class="item-icon"></ion-icon>
              <ion-label>
                <h3>Gym Arrival Alerts</h3>
                <p>Notify when you arrive at a registered gym location</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [ngModel]="prefs().geofenceEnabled"
                (ngModelChange)="updatePref('geofenceEnabled', $event)"
                [disabled]="!prefs().pushEnabled"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" name="flash-outline" class="item-icon streak-icon"></ion-icon>
              <ion-label>
                <h3>Streak Risk Alerts</h3>
                <p>Nudge when you're about to break a streak</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [ngModel]="prefs().streakRiskEnabled"
                (ngModelChange)="updatePref('streakRiskEnabled', $event)"
                [disabled]="!prefs().pushEnabled"
              ></ion-toggle>
            </ion-item>
          </ion-list>

          <!-- ── Workout & Training ─────────────────────────────────── -->
          @if (isClient()) {
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
                  [ngModel]="prefs().workoutReminders"
                  (ngModelChange)="updatePref('workoutReminders', $event)"
                  [disabled]="!prefs().pushEnabled"
                ></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Nutrition Reminders</h3>
                  <p>Reminders to log meals and track nutrition</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [ngModel]="prefs().nutritionReminders"
                  (ngModelChange)="updatePref('nutritionReminders', $event)"
                  [disabled]="!prefs().pushEnabled"
                ></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Trainer Updates</h3>
                  <p>When your trainer sends you messages or workouts</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [ngModel]="prefs().trainerUpdates"
                  (ngModelChange)="updatePref('trainerUpdates', $event)"
                  [disabled]="!prefs().pushEnabled"
                ></ion-toggle>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Weekly Progress</h3>
                  <p>Summary of your weekly activity</p>
                </ion-label>
                <ion-toggle
                  slot="end"
                  [ngModel]="prefs().weeklyProgress"
                  (ngModelChange)="updatePref('weeklyProgress', $event)"
                  [disabled]="!prefs().emailEnabled"
                ></ion-toggle>
              </ion-item>
            </ion-list>
          }

          <!-- ── Client Activity (trainers) ─────────────────────────── -->
          @if (isTrainer()) {
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
                  [ngModel]="prefs().clientMilestones"
                  (ngModelChange)="updatePref('clientMilestones', $event)"
                  [disabled]="!prefs().pushEnabled"
                ></ion-toggle>
              </ion-item>
            </ion-list>
          }

          <!-- ── General ────────────────────────────────────────────── -->
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
                [ngModel]="prefs().messageNotifications"
                (ngModelChange)="updatePref('messageNotifications', $event)"
                [disabled]="!prefs().pushEnabled"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>Payment Notifications</h3>
                <p>Payment receipts and billing updates</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [ngModel]="prefs().paymentNotifications"
                (ngModelChange)="updatePref('paymentNotifications', $event)"
                [disabled]="!prefs().emailEnabled"
              ></ion-toggle>
            </ion-item>
          </ion-list>

          <!-- ── Quiet hours ─────────────────────────────────────────── -->
          <ion-list>
            <ion-list-header>
              <ion-label>Quiet Hours</ion-label>
            </ion-list-header>

            <ion-note class="section-hint">
              No notifications will be sent during this window.
            </ion-note>

            <ion-item>
              <ion-icon slot="start" name="time-outline" class="item-icon"></ion-icon>
              <ion-label>
                <h3>Start</h3>
              </ion-label>
              <!-- Native time input for simplicity -->
              <input
                type="time"
                class="time-input"
                [value]="prefs().quietHoursStart"
                (change)="onQuietHoursChange('quietHoursStart', $event)"
              />
            </ion-item>

            <ion-item>
              <ion-icon slot="start" name="time-outline" class="item-icon"></ion-icon>
              <ion-label>
                <h3>End</h3>
              </ion-label>
              <input
                type="time"
                class="time-input"
                [value]="prefs().quietHoursEnd"
                (change)="onQuietHoursChange('quietHoursEnd', $event)"
              />
            </ion-item>
          </ion-list>

          <!-- ── Daily limit ─────────────────────────────────────────── -->
          <ion-list>
            <ion-list-header>
              <ion-label>Daily Limit</ion-label>
            </ion-list-header>

            <ion-note class="section-hint">
              Maximum notifications per day. Effective limit today:
              <strong>{{ notifService.effectiveMaxDaily() }}</strong>
              @if (prefs().habitDecayEnabled) {
                (66-day decay active)
              }
            </ion-note>

            <ion-item>
              <ion-label>
                <h3>Max per day: {{ prefs().maxDailyNotifications }}</h3>
              </ion-label>
              <ion-range
                slot="end"
                class="limit-range"
                [min]="1"
                [max]="10"
                [step]="1"
                [value]="prefs().maxDailyNotifications"
                (ionChange)="onMaxDailyChange($event)"
              ></ion-range>
            </ion-item>

            <ion-item>
              <ion-label>
                <h3>66-Day Habit Decay</h3>
                <p>Reduce nudge frequency as habits form</p>
              </ion-label>
              <ion-toggle
                slot="end"
                [ngModel]="prefs().habitDecayEnabled"
                (ngModelChange)="updatePref('habitDecayEnabled', $event)"
              ></ion-toggle>
            </ion-item>
          </ion-list>

          <!-- ── Gym locations ───────────────────────────────────────── -->
          @if (prefs().geofenceEnabled) {
            <div class="gym-locations-section">
              <app-gym-location-picker
                (gymSaved)="onGymSaved($event)"
              ></app-gym-location-picker>
            </div>
          }

          <!-- ── Delivery stats ──────────────────────────────────────── -->
          <div class="stats-row">
            <div class="stat-chip">
              <ion-icon name="notifications-outline"></ion-icon>
              <span>{{ notifService.dailyCount() }} sent today</span>
            </div>
            <div class="stat-chip" [class.at-limit]="atDailyLimit()">
              <ion-icon [name]="atDailyLimit() ? 'alert-circle-outline' : 'shield-checkmark-outline'"></ion-icon>
              <span>{{ notifService.effectiveMaxDaily() - notifService.dailyCount() }} remaining</span>
            </div>
          </div>

        }
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      ion-header ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }
      ion-content {
        --background: var(--fitos-bg-primary, #0D0D0D);
      }
    }

    .notifications-container {
      max-width: 768px;
      margin: 0 auto;
      padding-bottom: 40px;
    }

    /* ── Loading ──────────────────────────────────────────────── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;

      p {
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    /* ── Permission banner ────────────────────────────────────── */
    .permission-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px;
      padding: 14px 16px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 12px;

      ion-icon {
        font-size: 24px;
        color: var(--ion-color-primary, #10B981);
        flex-shrink: 0;
      }

      .banner-text {
        flex: 1;

        strong {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
          margin-bottom: 2px;
        }

        p {
          margin: 0;
          font-size: 12px;
          color: var(--fitos-text-secondary, #A3A3A3);
          line-height: 1.4;
        }
      }
    }

    .permission-granted {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 16px 4px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);

      ion-icon {
        font-size: 16px;
      }
    }

    /* ── Lists ────────────────────────────────────────────────── */
    ion-list {
      --background: transparent;
      margin-bottom: 8px;
    }

    ion-item {
      --background: transparent;
    }

    ion-list-header {
      --background: transparent;
      padding-top: 24px;
      padding-bottom: 8px;

      ion-label {
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .section-hint {
      display: block;
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      padding: 0 16px 8px;
      line-height: 1.5;

      strong {
        color: var(--ion-color-primary, #10B981);
      }
    }

    .item-icon {
      color: var(--ion-color-primary, #10B981);
      font-size: 20px;
    }

    .streak-icon {
      color: #F59E0B;
    }

    /* ── Time picker ──────────────────────────────────────────── */
    .time-input {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: var(--fitos-text-primary, #F5F5F5);
      font-size: 14px;
      padding: 6px 10px;
      outline: none;
      cursor: pointer;

      &::-webkit-calendar-picker-indicator {
        filter: invert(1);
        opacity: 0.6;
      }
    }

    /* ── Range ────────────────────────────────────────────────── */
    .limit-range {
      max-width: 160px;
    }

    /* ── Gym locations section ────────────────────────────────── */
    .gym-locations-section {
      margin: 8px 16px 16px;
      padding: 16px;
      background: var(--fitos-bg-secondary, #171717);
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* ── Daily stats row ──────────────────────────────────────── */
    .stats-row {
      display: flex;
      gap: 8px;
      margin: 16px;
    }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 20px;
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);

      ion-icon {
        font-size: 14px;
        color: var(--ion-color-primary, #10B981);
      }

      &.at-limit {
        background: rgba(245, 158, 11, 0.1);
        color: #F59E0B;

        ion-icon {
          color: #F59E0B;
        }
      }
    }
  `],
})
export class NotificationsPage implements OnInit {
  private authService   = inject(AuthService);
  notifService          = inject(NotificationService);
  private geofence      = inject(GeofenceService);
  private toastCtrl     = inject(ToastController);

  loading              = signal(true);
  requestingPermission = signal(false);

  isClient = this.authService.isClient;
  isTrainer = this.authService.isTrainer;

  /** Local mirror of NotificationService preferences for two-way binding */
  prefs = this.notifService.preferences;

  atDailyLimit = computed(
    () => this.notifService.dailyCount() >= this.notifService.effectiveMaxDaily()
  );

  async ngOnInit() {
    await this.notifService.initialize();
    this.loading.set(false);
  }

  // ── Push permission ──────────────────────────────────────────────────────
  async requestPushPermission(): Promise<void> {
    this.requestingPermission.set(true);
    try {
      const granted = await this.notifService.requestPermission();
      if (granted) {
        await this.showToast('Push notifications enabled!', 'success');
      } else {
        await this.showToast(
          'Permission denied. Enable notifications in device Settings.',
          'warning',
          4000
        );
      }
    } finally {
      this.requestingPermission.set(false);
    }
  }

  // ── Preference updates ───────────────────────────────────────────────────
  async updatePref<K extends keyof ReturnType<typeof this.prefs>>(
    key: K,
    value: ReturnType<typeof this.prefs>[K]
  ): Promise<void> {
    await this.notifService.savePreferences({ [key]: value });
    await this.showToast('Preferences saved', 'success', 1500);
  }

  onQuietHoursChange(key: 'quietHoursStart' | 'quietHoursEnd', event: Event): void {
    const input = event.target as HTMLInputElement;
    this.notifService.savePreferences({ [key]: input.value });
  }

  onMaxDailyChange(event: CustomEvent): void {
    const val = (event.detail as { value: number }).value;
    this.notifService.savePreferences({ maxDailyNotifications: val });
  }

  // ── Gym location saved ───────────────────────────────────────────────────
  async onGymSaved(saved: GymLocationSaved): Promise<void> {
    await this.showToast(`"${saved.gym.name}" saved as gym location 📍`, 'success');
    // Start geofence tracking if not already active
    if (!this.geofence.isTracking()) {
      await this.geofence.startTracking();
    }
  }

  // ── Toast helper ─────────────────────────────────────────────────────────
  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger' = 'success',
    duration = 2000
  ): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, duration, position: 'bottom' });
    await toast.present();
  }

  constructor() {
    addIcons({
      notificationsOutline,
      timeOutline,
      shieldCheckmarkOutline,
      flashOutline,
      locationOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
    });
  }
}
