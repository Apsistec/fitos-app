import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonNote,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';

interface NotifPrefs {
  session_reminder_60min: boolean;
  session_reminder_15min: boolean;
  workout_reminder_enabled: boolean;
  workout_reminder_time: string;
  nutrition_checkin_enabled: boolean;
  nutrition_checkin_time: string;
  pr_celebrations: boolean;
  weekly_summary: boolean;
}

const DEFAULTS: NotifPrefs = {
  session_reminder_60min: true,
  session_reminder_15min: true,
  workout_reminder_enabled: true,
  workout_reminder_time: '08:00:00',
  nutrition_checkin_enabled: false,
  nutrition_checkin_time: '12:00:00',
  pr_celebrations: true,
  weekly_summary: true,
};

@Component({
  selector: 'app-client-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Notification Preferences</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (isLoading()) {
        <div class="loading-state">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      } @else {
        <!-- Session Reminders -->
        <ion-list class="settings-section">
          <div class="section-label">Session Reminders</div>

          <ion-item>
            <ion-label>
              <h3>60-Minute Reminder</h3>
              <p>Notify me 60 minutes before a session</p>
            </ion-label>
            <ion-toggle
              slot="end"
              [checked]="prefs().session_reminder_60min"
              (ionChange)="update('session_reminder_60min', $event.detail.checked)"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>
              <h3>15-Minute Reminder</h3>
              <p>Notify me 15 minutes before a session</p>
            </ion-label>
            <ion-toggle
              slot="end"
              [checked]="prefs().session_reminder_15min"
              (ionChange)="update('session_reminder_15min', $event.detail.checked)"
            ></ion-toggle>
          </ion-item>
        </ion-list>

        <!-- Workout Reminders -->
        <ion-list class="settings-section">
          <div class="section-label">Workout Reminders</div>

          <ion-item>
            <ion-label>
              <h3>Daily Workout Reminder</h3>
              <p>Remind me to log my workout each day</p>
            </ion-label>
            <ion-toggle
              slot="end"
              [checked]="prefs().workout_reminder_enabled"
              (ionChange)="update('workout_reminder_enabled', $event.detail.checked)"
            ></ion-toggle>
          </ion-item>

          @if (prefs().workout_reminder_enabled) {
            <ion-item>
              <ion-label>Reminder Time</ion-label>
              <ion-note slot="end">
                <input
                  type="time"
                  class="time-input"
                  [value]="prefs().workout_reminder_time.slice(0, 5)"
                  (change)="update('workout_reminder_time', $any($event.target).value + ':00')"
                />
              </ion-note>
            </ion-item>
          }
        </ion-list>

        <!-- Nutrition Check-In -->
        <ion-list class="settings-section">
          <div class="section-label">Nutrition Check-In</div>

          <ion-item>
            <ion-label>
              <h3>Daily Nutrition Reminder</h3>
              <p>Remind me to log my meals</p>
            </ion-label>
            <ion-toggle
              slot="end"
              [checked]="prefs().nutrition_checkin_enabled"
              (ionChange)="update('nutrition_checkin_enabled', $event.detail.checked)"
            ></ion-toggle>
          </ion-item>

          @if (prefs().nutrition_checkin_enabled) {
            <ion-item>
              <ion-label>Check-In Time</ion-label>
              <ion-note slot="end">
                <input
                  type="time"
                  class="time-input"
                  [value]="prefs().nutrition_checkin_time.slice(0, 5)"
                  (change)="update('nutrition_checkin_time', $any($event.target).value + ':00')"
                />
              </ion-note>
            </ion-item>
          }
        </ion-list>

        <!-- Celebrations & Summary -->
        <ion-list class="settings-section">
          <div class="section-label">Celebrations & Summary</div>

          <ion-item>
            <ion-label>
              <h3>Personal Record Celebrations</h3>
              <p>Get notified when you hit a new PR</p>
            </ion-label>
            <ion-toggle
              slot="end"
              [checked]="prefs().pr_celebrations"
              (ionChange)="update('pr_celebrations', $event.detail.checked)"
            ></ion-toggle>
          </ion-item>

          <ion-item>
            <ion-label>
              <h3>Weekly Progress Summary</h3>
              <p>Receive a weekly recap of your progress</p>
            </ion-label>
            <ion-toggle
              slot="end"
              [checked]="prefs().weekly_summary"
              (ionChange)="update('weekly_summary', $event.detail.checked)"
            ></ion-toggle>
          </ion-item>
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 700; }

    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }

    .settings-section {
      margin: 16px 16px 0;
      border-radius: 12px;
      overflow: hidden;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .section-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--fitos-text-tertiary, #6B6B6B);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 14px 16px 6px;
    }

    ion-item {
      --background: transparent;
      --border-color: rgba(255, 255, 255, 0.06);
      h3 { font-size: 14px; font-weight: 600; color: var(--fitos-text-primary, #F5F5F5); }
      p { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0; }
    }

    ion-toggle {
      --track-background-checked: #10B981;
    }

    .time-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--fitos-text-primary, #F5F5F5);
      font-size: 14px;
      font-weight: 600;
    }
  `],
})
export class ClientNotificationsPage implements OnInit {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private toastCtrl = inject(ToastController);

  isLoading = signal(true);
  isSaving = signal(false);
  prefs = signal<NotifPrefs>({ ...DEFAULTS });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) { this.isLoading.set(false); return; }

    const { data } = await this.supabase.client
      .from('client_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      this.prefs.set({
        session_reminder_60min: data['session_reminder_60min'],
        session_reminder_15min: data['session_reminder_15min'],
        workout_reminder_enabled: data['workout_reminder_enabled'],
        workout_reminder_time: data['workout_reminder_time'],
        nutrition_checkin_enabled: data['nutrition_checkin_enabled'],
        nutrition_checkin_time: data['nutrition_checkin_time'],
        pr_celebrations: data['pr_celebrations'],
        weekly_summary: data['weekly_summary'],
      });
    }
    this.isLoading.set(false);
  }

  async update<K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    // Optimistic update
    this.prefs.update((p) => ({ ...p, [key]: value }));

    const { error } = await this.supabase.client
      .from('client_notification_preferences')
      .upsert({ user_id: userId, ...this.prefs() }, { onConflict: 'user_id' });

    if (error) {
      console.error('[ClientNotificationsPage] save error', error);
      const toast = await this.toastCtrl.create({ message: 'Failed to save setting', duration: 2000, color: 'warning', position: 'bottom' });
      await toast.present();
    }
  }
}
