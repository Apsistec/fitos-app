import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * NotificationService
 * Sprint 52: Context-Aware Notifications + Geofencing
 *
 * Central orchestrator for all FitOS notifications:
 * - Push (FCM via @capacitor/push-notifications)
 * - Local scheduled (via @capacitor/local-notifications)
 * - Delivery audit trail in Supabase notification_log
 * - 66-day habit decay model
 * - Fatigue / quiet hours enforcement
 * - Send-time personalisation
 */

export type NotificationType =
  | 'jitai'
  | 'geofence_arrival'
  | 'workout_reminder'
  | 'streak_risk'
  | 'nutrition_reminder'
  | 'message'
  | 'milestone'
  | 'payment'
  | 'weekly_progress'
  | 'trainer_update';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  /** Deep-link route path, e.g. '/tabs/workouts' */
  deepLink?: string;
  data?: Record<string, unknown>;
  /** Schedule for a future time (local notifications only) */
  scheduledAt?: Date;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  workoutReminders: boolean;
  nutritionReminders: boolean;
  trainerUpdates: boolean;
  clientMilestones: boolean;
  messageNotifications: boolean;
  paymentNotifications: boolean;
  weeklyProgress: boolean;
  geofenceEnabled: boolean;
  jitaiEnabled: boolean;
  streakRiskEnabled: boolean;
  maxDailyNotifications: number;
  quietHoursStart: string; // "HH:MM"
  quietHoursEnd: string;   // "HH:MM"
  habitDecayEnabled: boolean;
  daysSinceOnboarding: number;
  /** US-242: Snooze all notifications until this ISO timestamp (null = not snoozed) */
  snoozeUntil: string | null;
}

/** US-242 snooze duration presets */
export type SnoozeDuration = '1h' | '4h' | 'today' | 'week';

/**
 * EP-23 US-242: Notification template from the notification_templates table.
 * Templates are resolved server-side or in the Edge Function; this type is
 * used by the settings UI to display available template types.
 */
export interface NotificationTemplate {
  id: string;
  notificationType: NotificationType;
  label: string;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
  targetRoles: string[] | null;
  isDefault: boolean;
  trainerId: string | null;
}

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  workoutReminders: true,
  nutritionReminders: true,
  trainerUpdates: true,
  clientMilestones: true,
  messageNotifications: true,
  paymentNotifications: true,
  weeklyProgress: true,
  geofenceEnabled: true,
  jitaiEnabled: true,
  streakRiskEnabled: true,
  maxDailyNotifications: 3,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  habitDecayEnabled: true,
  daysSinceOnboarding: 0,
  snoozeUntil: null,
};

// 66-day habit decay: after 66 days max drops to 1/day
const HABIT_DECAY_DAYS = 66;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ── State signals ──────────────────────────────────────────────────────────
  private _fcmToken = signal<string | null>(null);
  private _preferences = signal<NotificationPreferences>(DEFAULT_PREFS);
  private _dailyCount = signal(0);
  private _permissionGranted = signal(false);
  private _initialized = signal(false);
  private _error = signal<string | null>(null);
  private _templates = signal<NotificationTemplate[]>([]);

  // Public readonly
  fcmToken           = this._fcmToken.asReadonly();
  preferences        = this._preferences.asReadonly();
  dailyCount         = this._dailyCount.asReadonly();
  permissionGranted  = this._permissionGranted.asReadonly();
  initialized        = this._initialized.asReadonly();
  error              = this._error.asReadonly();
  templates          = this._templates.asReadonly();

  // US-242: Computed snooze state
  isSnoozed = computed(() => {
    const snoozeUntil = this._preferences().snoozeUntil;
    if (!snoozeUntil) return false;
    return new Date(snoozeUntil) > new Date();
  });

  snoozeUntilLabel = computed(() => {
    const snoozeUntil = this._preferences().snoozeUntil;
    if (!snoozeUntil) return null;
    const until = new Date(snoozeUntil);
    if (until <= new Date()) return null;
    return until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Computed: effective max based on 66-day habit decay
  effectiveMaxDaily = computed(() => {
    const prefs = this._preferences();
    if (!prefs.habitDecayEnabled) return prefs.maxDailyNotifications;
    const progress = Math.min(1, prefs.daysSinceOnboarding / HABIT_DECAY_DAYS);
    // Decay from maxDaily → 1 linearly over 66 days
    const decayed = prefs.maxDailyNotifications - Math.floor(progress * (prefs.maxDailyNotifications - 1));
    return Math.max(1, decayed);
  });

  // ── Plugin lazy loaders ────────────────────────────────────────────────────
  private async getPushPlugin() {
    try {
      const mod = await (import('@capacitor/push-notifications' as string) as Promise<{
        PushNotifications: {
          checkPermissions: () => Promise<{ receive: string }>;
          requestPermissions: () => Promise<{ receive: string }>;
          register: () => Promise<void>;
          unregister: () => Promise<void>;
          addListener: (
            event: string,
            callback: (data: { value?: string; error?: string; notification?: unknown; actionId?: string }) => void
          ) => Promise<{ remove: () => Promise<void> }>;
          getDeliveredNotifications: () => Promise<{ notifications: unknown[] }>;
        };
      }>);
      return mod.PushNotifications;
    } catch {
      return null;
    }
  }

  private async getLocalPlugin() {
    try {
      const mod = await (import('@capacitor/local-notifications' as string) as Promise<{
        LocalNotifications: {
          checkPermissions: () => Promise<{ display: string }>;
          requestPermissions: () => Promise<{ display: string }>;
          schedule: (opts: {
            notifications: Array<{
              id: number;
              title: string;
              body: string;
              schedule?: { at: Date };
              extra?: Record<string, unknown>;
            }>;
          }) => Promise<{ notifications: Array<{ id: number }> }>;
          cancel: (opts: { notifications: Array<{ id: number }> }) => Promise<void>;
          addListener: (event: string, callback: (data: unknown) => void) => Promise<{ remove: () => Promise<void> }>;
        };
      }>);
      return mod.LocalNotifications;
    } catch {
      return null;
    }
  }

  // ── Initialize ─────────────────────────────────────────────────────────────
  async initialize(): Promise<void> {
    if (this._initialized()) return;

    try {
      // Load preferences from Supabase
      await this.loadPreferences();

      // Check/request push permissions
      const push = await this.getPushPlugin();
      if (push) {
        const status = await push.checkPermissions();
        if (status.receive === 'granted') {
          this._permissionGranted.set(true);
          await this.registerForPush(push);
        }
      }

      // Load today's delivery count
      await this.refreshDailyCount();

      this._initialized.set(true);
    } catch (err) {
      console.error('[NotificationService] initialize error:', err);
      this._error.set('Failed to initialize notifications');
    }
  }

  // ── Request permission ─────────────────────────────────────────────────────
  async requestPermission(): Promise<boolean> {
    const push = await this.getPushPlugin();
    if (!push) return false;

    try {
      const result = await push.requestPermissions();
      const granted = result.receive === 'granted';
      this._permissionGranted.set(granted);
      if (granted) {
        await this.registerForPush(push);
      }
      return granted;
    } catch (err) {
      console.error('[NotificationService] requestPermission error:', err);
      return false;
    }
  }

  // ── Register for remote push + capture FCM token ───────────────────────────
  private async registerForPush(push: Awaited<ReturnType<typeof this.getPushPlugin>>): Promise<void> {
    if (!push) return;

    try {
      // Listen for registration token
      await push.addListener('registration', async (data) => {
        if (data.value) {
          this._fcmToken.set(data.value);
          await this.saveFcmToken(data.value);
        }
      });

      await push.addListener('registrationError', (data) => {
        console.error('[NotificationService] push registration error:', data.error);
        this._error.set('Failed to register for push notifications');
      });

      // Handle foreground push
      await push.addListener('pushNotificationReceived', (data) => {
        console.log('[NotificationService] push received in foreground:', data);
      });

      // Handle push tap (opened)
      await push.addListener('pushNotificationActionPerformed', (data) => {
        if (data.actionId === 'tap' && data.notification) {
          this.handleNotificationOpened(data.notification);
        }
      });

      await push.register();
    } catch (err) {
      console.error('[NotificationService] registerForPush error:', err);
    }
  }

  // ── Send / schedule a notification ────────────────────────────────────────
  async send(payload: NotificationPayload): Promise<boolean> {
    const user = this.auth.user();
    if (!user) return false;

    // US-242: Snooze check — if snoozed and notification is not scheduled for future
    if (this.isSnoozed() && !payload.scheduledAt) {
      return false;
    }

    // Check if type is enabled in prefs
    if (!this.isTypeEnabled(payload.type)) {
      return false;
    }

    // Quiet hours check
    if (this.isInQuietHours()) {
      return false;
    }

    // Fatigue limit check
    const dailyCount = this._dailyCount();
    if (dailyCount >= this.effectiveMaxDaily()) {
      return false;
    }

    try {
      let delivered = false;

      if (payload.scheduledAt) {
        // Schedule local notification for a future time
        delivered = await this.scheduleLocal(payload);
      } else {
        // Immediate local notification (push comes from server, not client-initiated)
        delivered = await this.scheduleLocal(payload);
      }

      if (delivered) {
        this._dailyCount.update(c => c + 1);
        await this.logDelivery(user.id, payload);
      }

      return delivered;
    } catch (err) {
      console.error('[NotificationService] send error:', err);
      return false;
    }
  }

  // ── Schedule a local notification ─────────────────────────────────────────
  private async scheduleLocal(payload: NotificationPayload): Promise<boolean> {
    const local = await this.getLocalPlugin();
    if (!local) return false;

    try {
      const id = Date.now() % 2_147_483_647; // positive int32
      await local.schedule({
        notifications: [
          {
            id,
            title: payload.title,
            body: payload.body,
            schedule: payload.scheduledAt ? { at: payload.scheduledAt } : undefined,
            extra: {
              type: payload.type,
              deepLink: payload.deepLink ?? null,
              ...(payload.data ?? {}),
            },
          },
        ],
      });
      return true;
    } catch (err) {
      console.error('[NotificationService] scheduleLocal error:', err);
      return false;
    }
  }

  // ── Geofence arrival notification ─────────────────────────────────────────
  async sendGeofenceArrival(gymName: string): Promise<boolean> {
    if (!this._preferences().geofenceEnabled) return false;

    const messages = [
      { title: `You're at the gym 💪`, body: `Ready to crush your workout? Tap to log your session at ${gymName}.` },
      { title: `Gym time! 🏋️`, body: `${gymName} detected. Let's get after it — your workout is ready.` },
      { title: `Let's go! 🔥`, body: `Looks like you're at ${gymName}. Start your workout now.` },
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    return this.send({
      type: 'geofence_arrival',
      title: msg.title,
      body: msg.body,
      deepLink: '/tabs/workouts',
    });
  }

  // ── Streak risk notification ───────────────────────────────────────────────
  async sendStreakRisk(streakDays: number): Promise<boolean> {
    if (!this._preferences().streakRiskEnabled) return false;

    return this.send({
      type: 'streak_risk',
      title: `Keep your ${streakDays}-day streak alive 🔥`,
      body: `Log a workout or meal today to keep the momentum going.`,
      deepLink: '/tabs/dashboard',
    });
  }

  // ── Workout reminder notification ─────────────────────────────────────────
  async sendWorkoutReminder(scheduledAt?: Date): Promise<boolean> {
    if (!this._preferences().workoutReminders) return false;

    return this.send({
      type: 'workout_reminder',
      title: `Time to train 💪`,
      body: `Your workout is scheduled. Ready when you are.`,
      deepLink: '/tabs/workouts',
      scheduledAt,
    });
  }

  // ── Load preferences from Supabase ────────────────────────────────────────
  async loadPreferences(): Promise<NotificationPreferences> {
    try {
      const user = this.auth.user();
      if (!user) return DEFAULT_PREFS;

      const { data } = await this.supabase.client
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!data) {
        // Insert defaults
        await this.savePreferences(DEFAULT_PREFS);
        return DEFAULT_PREFS;
      }

      const prefs: NotificationPreferences = {
        pushEnabled: data.push_enabled,
        emailEnabled: data.email_enabled,
        workoutReminders: data.workout_reminders,
        nutritionReminders: data.nutrition_reminders,
        trainerUpdates: data.trainer_updates,
        clientMilestones: data.client_milestones,
        messageNotifications: data.message_notifications,
        paymentNotifications: data.payment_notifications,
        weeklyProgress: data.weekly_progress,
        geofenceEnabled: data.geofence_enabled,
        jitaiEnabled: data.jitai_enabled,
        streakRiskEnabled: data.streak_risk_enabled,
        maxDailyNotifications: data.max_daily_notifications,
        quietHoursStart: data.quiet_hours_start,
        quietHoursEnd: data.quiet_hours_end,
        habitDecayEnabled: data.habit_decay_enabled,
        daysSinceOnboarding: data.days_since_onboarding,
        snoozeUntil: (data as any).snooze_until ?? null,
      };

      this._preferences.set(prefs);
      return prefs;
    } catch (err) {
      console.error('[NotificationService] loadPreferences error:', err);
      return DEFAULT_PREFS;
    }
  }

  // ── Save preferences to Supabase ──────────────────────────────────────────
  async savePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    try {
      const user = this.auth.user();
      if (!user) return;

      const merged = { ...this._preferences(), ...prefs };
      this._preferences.set(merged);

      await this.supabase.client
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          push_enabled: merged.pushEnabled,
          email_enabled: merged.emailEnabled,
          workout_reminders: merged.workoutReminders,
          nutrition_reminders: merged.nutritionReminders,
          trainer_updates: merged.trainerUpdates,
          client_milestones: merged.clientMilestones,
          message_notifications: merged.messageNotifications,
          payment_notifications: merged.paymentNotifications,
          weekly_progress: merged.weeklyProgress,
          geofence_enabled: merged.geofenceEnabled,
          jitai_enabled: merged.jitaiEnabled,
          streak_risk_enabled: merged.streakRiskEnabled,
          max_daily_notifications: merged.maxDailyNotifications,
          quiet_hours_start: merged.quietHoursStart,
          quiet_hours_end: merged.quietHoursEnd,
          habit_decay_enabled: merged.habitDecayEnabled,
          days_since_onboarding: merged.daysSinceOnboarding,
          snooze_until: merged.snoozeUntil ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('[NotificationService] savePreferences error:', err);
    }
  }

  // ── US-242: Snooze / clear snooze ─────────────────────────────────────────

  /**
   * Snooze all notifications for the given duration.
   * Duration presets: '1h', '4h', 'today', 'week'
   */
  async snoozeNotifications(duration: SnoozeDuration): Promise<void> {
    const now = new Date();
    let until: Date;

    switch (duration) {
      case '1h':
        until = new Date(now.getTime() + 60 * 60_000);
        break;
      case '4h':
        until = new Date(now.getTime() + 4 * 60 * 60_000);
        break;
      case 'today':
        until = new Date(now);
        until.setHours(23, 59, 59, 999);
        break;
      case 'week':
        until = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
        break;
    }

    await this.savePreferences({ snoozeUntil: until.toISOString() });
  }

  /**
   * Clear snooze and resume notifications immediately.
   */
  async clearSnooze(): Promise<void> {
    await this.savePreferences({ snoozeUntil: null });
  }

  // ── EP-23: Load notification templates ────────────────────────────────────

  /**
   * Load system + trainer-specific notification templates from the DB.
   * Trainers can customise the wording of notifications; all roles can read defaults.
   */
  async loadTemplates(): Promise<NotificationTemplate[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('notification_templates')
        .select('*')
        .order('notification_type');

      if (error) throw error;

      const templates: NotificationTemplate[] = (data ?? []).map((row: any) => ({
        id: row.id,
        notificationType: row.notification_type as NotificationType,
        label: row.label,
        titleTemplate: row.title_template,
        bodyTemplate: row.body_template,
        variables: row.variables ?? [],
        targetRoles: row.target_roles ?? null,
        isDefault: row.is_default,
        trainerId: row.trainer_id ?? null,
      }));

      this._templates.set(templates);
      return templates;
    } catch (err) {
      console.error('[NotificationService] loadTemplates error:', err);
      return [];
    }
  }

  /**
   * Get the best matching template for a notification type.
   * Trainer-specific override takes precedence over system default.
   */
  getTemplate(type: NotificationType): NotificationTemplate | null {
    const all = this._templates();
    const userId = this.auth.user()?.id ?? null;
    // Prefer trainer-specific override
    const trainerOverride = all.find(t => t.notificationType === type && t.trainerId === userId);
    if (trainerOverride) return trainerOverride;
    // Fall back to system default
    return all.find(t => t.notificationType === type && t.isDefault) ?? null;
  }

  // ── Track notification opened ──────────────────────────────────────────────
  async trackOpened(notificationId: string, actionTaken?: string): Promise<void> {
    try {
      await this.supabase.client
        .from('notification_log')
        .update({
          opened_at: new Date().toISOString(),
          action_taken: actionTaken ?? 'tap',
        })
        .eq('id', notificationId);
    } catch (err) {
      console.error('[NotificationService] trackOpened error:', err);
    }
  }

  // ── Update send-time prediction ────────────────────────────────────────────
  async recordOpenTime(): Promise<void> {
    try {
      const user = this.auth.user();
      if (!user) return;

      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();

      // Simple exponential moving average update
      const { data } = await this.supabase.client
        .from('send_time_predictions')
        .select('predicted_best_hour, sample_size, confidence')
        .eq('user_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (data) {
        const n = data.sample_size + 1;
        // Running weighted average (favour recent opens)
        const alpha = 0.3;
        const newHour = Math.round(alpha * hour + (1 - alpha) * data.predicted_best_hour);
        const confidence = Math.min(0.95, data.confidence + 0.05);

        await this.supabase.client
          .from('send_time_predictions')
          .update({ predicted_best_hour: newHour, sample_size: n, confidence, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('day_of_week', dayOfWeek);
      } else {
        await this.supabase.client.from('send_time_predictions').insert({
          user_id: user.id,
          day_of_week: dayOfWeek,
          predicted_best_hour: hour,
          sample_size: 1,
          confidence: 0.3,
        });
      }
    } catch (err) {
      console.error('[NotificationService] recordOpenTime error:', err);
    }
  }

  // ── Get best send hour for today ───────────────────────────────────────────
  async getBestSendHour(): Promise<number> {
    try {
      const user = this.auth.user();
      if (!user) return 9; // default 9am

      const dayOfWeek = new Date().getDay();
      const { data } = await this.supabase.client
        .from('send_time_predictions')
        .select('predicted_best_hour')
        .eq('user_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .single();

      return data?.predicted_best_hour ?? 9;
    } catch {
      return 9;
    }
  }

  // ── Internal helpers ───────────────────────────────────────────────────────
  private isTypeEnabled(type: NotificationType): boolean {
    const p = this._preferences();
    switch (type) {
      case 'jitai':              return p.jitaiEnabled;
      case 'geofence_arrival':   return p.geofenceEnabled;
      case 'workout_reminder':   return p.workoutReminders;
      case 'streak_risk':        return p.streakRiskEnabled;
      case 'nutrition_reminder': return p.nutritionReminders;
      case 'message':            return p.messageNotifications;
      case 'milestone':          return p.clientMilestones;
      case 'payment':            return p.paymentNotifications;
      case 'weekly_progress':    return p.weeklyProgress;
      case 'trainer_update':     return p.trainerUpdates;
    }
  }

  private isInQuietHours(): boolean {
    const p = this._preferences();
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = p.quietHoursStart.split(':').map(Number);
    const [eh, em] = p.quietHoursEnd.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins   = eh * 60 + em;

    if (startMins > endMins) {
      // Wraps midnight
      return currentMins >= startMins || currentMins <= endMins;
    }
    return currentMins >= startMins && currentMins <= endMins;
  }

  private async refreshDailyCount(): Promise<void> {
    try {
      const user = this.auth.user();
      if (!user) return;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count } = await this.supabase.client
        .from('notification_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('delivered_at', startOfDay.toISOString());

      this._dailyCount.set(count ?? 0);
    } catch (err) {
      console.error('[NotificationService] refreshDailyCount error:', err);
    }
  }

  private async logDelivery(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      await this.supabase.client.from('notification_log').insert({
        user_id: userId,
        notification_type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? null,
        channel: 'local',
        delivered_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[NotificationService] logDelivery error:', err);
    }
  }

  private async saveFcmToken(token: string): Promise<void> {
    try {
      const user = this.auth.user();
      if (!user) return;

      await this.supabase.client
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', user.id);
    } catch (err) {
      console.error('[NotificationService] saveFcmToken error:', err);
    }
  }

  private handleNotificationOpened(notification: unknown): void {
    console.log('[NotificationService] notification opened:', notification);
    this.recordOpenTime();
  }
}
