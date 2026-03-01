import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { AppointmentService } from './appointment.service';
import { WorkoutSessionService } from './workout-session.service';
import { NutritionService } from './nutrition.service';
import { MessagingService } from './messaging.service';
import type { Appointment } from '@fitos/shared';
import type { Message, Conversation } from './messaging.service';

export interface NextSessionData {
  appointment: Appointment;
  trainerName: string;
  trainerAvatarUrl: string | null;
  serviceName: string;
  countdownLabel: string;
  minutesUntil: number;
}

export interface WeeklyProgressData {
  workoutsCompleted: number;
  workoutsPlanned: number;
  streak: number;
}

export interface NutritionSnapshotData {
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  carbsConsumed: number;
  carbsTarget: number;
  fatConsumed: number;
  fatTarget: number;
}

export interface MessagePreviewData {
  conversation: Conversation;
  lastMessage: Message;
}

@Injectable({ providedIn: 'root' })
export class ClientDashboardService {
  private auth = inject(AuthService);
  private appointmentService = inject(AppointmentService);
  private sessionService = inject(WorkoutSessionService);
  private nutritionService = inject(NutritionService);
  private messagingService = inject(MessagingService);

  // State signals
  nextSession = signal<NextSessionData | null>(null);
  weeklyProgress = signal<WeeklyProgressData>({ workoutsCompleted: 0, workoutsPlanned: 5, streak: 0 });
  nutritionSnapshot = signal<NutritionSnapshotData | null>(null);
  messagePreview = signal<MessagePreviewData | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Countdown label that stays fresh (recomputed from nextSession)
  countdownLabel = computed(() => {
    const session = this.nextSession();
    if (!session) return '';
    return this.buildCountdownLabel(session.appointment.start_at);
  });

  /** Load all client dashboard data in parallel */
  async load(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      const [appointments, weeklyCount, streak, nutritionData, conversations] = await Promise.all([
        this.appointmentService.getClientAppointments(userId, 1),
        this.sessionService.getWorkoutCount(userId, 7),
        this.sessionService.getCurrentStreak(userId),
        this.nutritionService.getDailySummary(userId, today),
        this.messagingService.loadConversations(),
      ]);

      // Next session
      const upcomingAppt = appointments[0] ?? null;
      if (upcomingAppt) {
        this.nextSession.set({
          appointment: upcomingAppt,
          trainerName: (upcomingAppt as Record<string, unknown>)['trainer_name'] as string || 'Your Trainer',
          trainerAvatarUrl: (upcomingAppt as Record<string, unknown>)['trainer_avatar_url'] as string | null || null,
          serviceName: (upcomingAppt as Record<string, unknown>)['service_name'] as string || 'Session',
          countdownLabel: this.buildCountdownLabel(upcomingAppt.start_at),
          minutesUntil: this.minutesUntil(upcomingAppt.start_at),
        });
      } else {
        this.nextSession.set(null);
      }

      // Weekly progress — assume 5 planned as default (trainer-assigned workouts not easily counted here)
      this.weeklyProgress.set({
        workoutsCompleted: weeklyCount,
        workoutsPlanned: 5,
        streak,
      });

      // Nutrition snapshot
      if (nutritionData) {
        this.nutritionSnapshot.set({
          caloriesConsumed: nutritionData.calories || 0,
          caloriesTarget: nutritionData.targets?.calories || 2000,
          proteinConsumed: nutritionData.protein || 0,
          proteinTarget: nutritionData.targets?.protein || 150,
          carbsConsumed: nutritionData.carbs || 0,
          carbsTarget: nutritionData.targets?.carbs || 200,
          fatConsumed: nutritionData.fat || 0,
          fatTarget: nutritionData.targets?.fat || 65,
        });
      } else {
        this.nutritionSnapshot.set(null);
      }

      // Message preview — most recent conversation with a last message
      const convWithMsg = conversations.find((c) => c.lastMessage !== null);
      if (convWithMsg?.lastMessage) {
        this.messagePreview.set({ conversation: convWithMsg, lastMessage: convWithMsg.lastMessage });
      } else {
        this.messagePreview.set(null);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('[ClientDashboardService] load error:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  private minutesUntil(startAt: string): number {
    return Math.round((new Date(startAt).getTime() - Date.now()) / 60000);
  }

  buildCountdownLabel(startAt: string): string {
    const mins = this.minutesUntil(startAt);
    if (mins < 0) return 'In progress';
    if (mins < 60) return `In ${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours < 24) return remainMins > 0 ? `In ${hours}h ${remainMins}m` : `In ${hours}h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Tomorrow' : `In ${days} days`;
  }
}
