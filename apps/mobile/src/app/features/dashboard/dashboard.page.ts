import { Component, inject, computed, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonAvatar,
  IonButtons,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  personAddOutline,
  funnelOutline,
  barbellOutline,
  peopleOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { fadeInUp, listStagger } from '../../shared/animations';
import { AssignmentService } from '../../core/services/assignment.service';
import { ClientService } from '../../core/services/client.service';
import { WorkoutSessionService } from '../../core/services/workout-session.service';
import { NutritionService } from '../../core/services/nutrition.service';
import { ClientTodayWorkoutCardComponent } from './components/client-today-workout-card/client-today-workout-card.component';
import { ClientNutritionSummaryComponent, type NutritionSummary } from './components/client-nutrition-summary/client-nutrition-summary.component';
import { TrainerOverviewStatsComponent, type TrainerStats } from './components/trainer-overview-stats/trainer-overview-stats.component';
import { TrainerNeedsAttentionComponent, type ClientAlert } from './components/trainer-needs-attention/trainer-needs-attention.component';
import { TrainerActivityFeedComponent, type ActivityItem } from './components/trainer-activity-feed/trainer-activity-feed.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { UpcomingWorkoutsListComponent } from '../../shared/components/upcoming-workouts-list/upcoming-workouts-list.component';
import { WearableDataCardComponent } from '../../shared/components/wearable-data-card/wearable-data-card.component';
import { OwnerFacilityStatsComponent, type FacilityStats } from './components/owner-facility-stats/owner-facility-stats.component';
import { OwnerTrainerPerformanceComponent, type TrainerPerformance } from './components/owner-trainer-performance/owner-trainer-performance.component';
import { CRMDashboardWidgetComponent } from '../crm/components/crm-dashboard-widget.component';
import type { WorkoutWithExercises } from '../../core/services/workout.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonAvatar,
    IonButtons,
    IonRefresher,
    IonRefresherContent,
    ClientTodayWorkoutCardComponent,
    ClientNutritionSummaryComponent,
    TrainerOverviewStatsComponent,
    TrainerNeedsAttentionComponent,
    TrainerActivityFeedComponent,
    StatCardComponent,
    UpcomingWorkoutsListComponent,
    WearableDataCardComponent,
    OwnerFacilityStatsComponent,
    OwnerTrainerPerformanceComponent,
    CRMDashboardWidgetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [fadeInUp, listStagger],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>
          {{ greeting() }}, {{ firstName() }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/tabs/settings/profile" class="avatar-btn">
            <ion-avatar>
              @if (avatarUrl()) {
                <img [src]="avatarUrl()" alt="Profile" />
              } @else {
                <ion-icon name="person-outline"></ion-icon>
              }
            </ion-avatar>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @switch (userRole()) {
        @case ('client') {
        <!-- Client Dashboard -->
        <div class="client-dashboard" @fadeInUp>
          <!-- Today's Workout -->
          <app-client-today-workout-card [workout]="todayWorkout()" />

          <!-- Quick Stats -->
          <div class="stats-row">
            <app-stat-card
              label="This Week"
              [value]="weeklyWorkouts()"
              icon="barbell"
            />
            <app-stat-card
              label="Streak"
              [value]="currentStreak()"
              icon="flame-outline"
              [suffix]="currentStreak() > 0 ? '🔥' : ''"
            />
          </div>

          <!-- Nutrition Summary -->
          <app-client-nutrition-summary [summary]="nutritionSummary()" />

          <!-- Wearable Data -->
          <app-wearable-data-card />

          <!-- Upcoming Workouts -->
          <app-upcoming-workouts-list [workouts]="upcomingWorkouts()" />
        </div>
        }
        @case ('gym_owner') {
        <!-- Gym Owner Dashboard -->
        <div class="owner-dashboard" @fadeInUp>
          <!-- Facility Stats -->
          <app-owner-facility-stats [stats]="facilityStats()" />

          <!-- Trainer Performance -->
          <app-owner-trainer-performance [trainers]="trainerPerformance()" />

          <!-- Activity Feed -->
          <app-trainer-activity-feed [activities]="recentActivity()" />
        </div>
        }
        @case ('trainer') {
        <!-- Trainer Dashboard -->
        <div class="trainer-dashboard" @fadeInUp>
          <!-- Quick Actions Card -->
          <div class="quick-actions-card">
            <h2>Quick Actions</h2>
            <div class="actions-grid">
              <ion-button expand="block" fill="solid" routerLink="/tabs/clients/invite">
                <ion-icon name="person-add-outline" slot="start"></ion-icon>
                Invite Client
              </ion-button>
              <ion-button expand="block" fill="outline" routerLink="/tabs/crm">
                <ion-icon name="funnel-outline" slot="start"></ion-icon>
                View CRM
              </ion-button>
              <ion-button expand="block" fill="outline" routerLink="/tabs/workouts/create">
                <ion-icon name="barbell-outline" slot="start"></ion-icon>
                Create Workout
              </ion-button>
              <ion-button expand="block" fill="outline" routerLink="/tabs/clients">
                <ion-icon name="people-outline" slot="start"></ion-icon>
                My Clients
              </ion-button>
            </div>
          </div>

          <!-- Overview Stats -->
          <app-trainer-overview-stats [stats]="trainerStats()" />

          <!-- CRM Dashboard Widget -->
          <app-crm-dashboard-widget />

          <!-- Needs Attention -->
          <app-trainer-needs-attention [alerts]="clientAlerts()" />

          <!-- Activity Feed -->
          <app-trainer-activity-feed [activities]="recentActivity()" />
        </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .avatar-btn {
      ion-avatar {
        width: 34px;
        height: 34px;
        border: 2px solid rgba(16, 185, 129, 0.3);

        ion-icon {
          font-size: 18px;
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }
    }

    ion-content {
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px;
      --padding-bottom: 16px;
    }

    .client-dashboard,
    .trainer-dashboard,
    .owner-dashboard {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      width: 100%;
    }

    /* Ensure all cards have consistent width */
    app-client-today-workout-card,
    app-client-nutrition-summary,
    app-wearable-data-card,
    app-upcoming-workouts-list,
    app-trainer-overview-stats,
    app-trainer-needs-attention,
    app-trainer-activity-feed,
    app-owner-facility-stats,
    app-owner-trainer-performance,
    app-crm-dashboard-widget {
      width: 100%;
      max-width: 100%;
    }

    .quick-actions-card {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 20px;

      h2 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .actions-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;

        ion-button {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          --border-radius: 8px;
          height: 42px;
          --padding-start: 10px;
          --padding-end: 10px;
        }

        ion-button[fill="outline"] {
          --border-color: rgba(255, 255, 255, 0.1);
          --color: var(--fitos-text-primary, #F5F5F5);
          --background: transparent;
        }

        ion-icon {
          font-size: 16px;
        }
      }
    }

    @media (max-width: 576px) {
      .stats-row {
        grid-template-columns: 1fr;
      }

      .quick-actions-card .actions-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardPage implements OnInit {
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private assignmentService = inject(AssignmentService);
  private clientService = inject(ClientService);
  private sessionService = inject(WorkoutSessionService);
  private nutritionService = inject(NutritionService);

  // User info
  userRole = computed(() => this.authService.profile()?.role ?? 'client');
  isTrainer = computed(() => this.authService.isTrainer());
  isOwner = computed(() => this.authService.isOwner());
  firstName = computed(() => {
    const fullName = this.authService.profile()?.fullName || '';
    return fullName.split(' ')[0] || 'there';
  });
  avatarUrl = computed(() => this.authService.profile()?.avatarUrl);

  // Greeting based on time
  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  // Client data signals
  todayWorkout = signal<WorkoutWithExercises | null>(null);
  weeklyWorkouts = signal(0);
  currentStreak = signal(0);
  upcomingWorkouts = signal<any[]>([]);
  nutritionSummary = signal<NutritionSummary | null>(null);

  // Trainer data signals
  trainerStats = signal<TrainerStats>({
    totalClients: 0,
    activeClients: 0,
    workoutsToday: 0,
    weeklyRevenue: 0,
    clientChange: 0,
    revenueChange: 0,
  });
  clientAlerts = signal<ClientAlert[]>([]);
  recentActivity = signal<ActivityItem[]>([]);

  // Gym Owner data signals
  facilityStats = signal<FacilityStats>({
    totalClients: 0,
    totalTrainers: 0,
    monthlyRevenue: 0,
    activeWorkouts: 0,
    clientRetention: 0,
    revenueGrowth: 0,
  });
  trainerPerformance = signal<TrainerPerformance[]>([]);

  constructor() {
    addIcons({
      personOutline,
      personAddOutline,
      funnelOutline,
      barbellOutline,
      peopleOutline,
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      if (this.isOwner()) {
        await this.loadOwnerDashboard();
      } else if (this.isTrainer()) {
        await this.loadTrainerDashboard();
      } else {
        await this.loadClientDashboard();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  private async loadClientDashboard(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    try {
      // Load all client dashboard data in parallel
      const [todayWorkout, weeklyCount, streak, upcoming] = await Promise.all([
        this.sessionService.getTodayWorkout(userId),
        this.sessionService.getWorkoutCount(userId, 7),
        this.sessionService.getCurrentStreak(userId),
        this.sessionService.getUpcomingWorkouts(userId, 5),
      ]);

      this.todayWorkout.set(todayWorkout as any);
      this.weeklyWorkouts.set(weeklyCount);
      this.currentStreak.set(streak);
      this.upcomingWorkouts.set(upcoming);

      // Load nutrition summary
      const today = new Date().toISOString().split('T')[0];
      const nutritionData = await this.nutritionService.getDailySummary(userId, today);
      if (nutritionData) {
        this.nutritionSummary.set({
          calories: {
            consumed: nutritionData.calories || 0,
            target: nutritionData.targets?.calories || 2000,
          },
          protein: {
            consumed: nutritionData.protein || 0,
            target: nutritionData.targets?.protein || 150,
          },
          carbs: {
            consumed: nutritionData.carbs || 0,
            target: nutritionData.targets?.carbs || 200,
          },
          fat: {
            consumed: nutritionData.fat || 0,
            target: nutritionData.targets?.fat || 65,
          },
        });
      }
    } catch (error) {
      console.error('Error loading client dashboard:', error);
    }
  }

  private async loadTrainerDashboard(): Promise<void> {
    const trainerId = this.authService.user()?.id;
    if (!trainerId) return;

    try {
      // Load client stats and today's schedule in parallel
      const [clientStats, todaySchedule, recentActivity] = await Promise.all([
        this.clientService.getClientStats(trainerId),
        this.assignmentService.getTodaySchedule(trainerId),
        this.assignmentService.getRecentActivity(trainerId, 24),
      ]);

      this.trainerStats.set({
        totalClients: clientStats.total,
        activeClients: clientStats.active,
        workoutsToday: todaySchedule.length,
        weeklyRevenue: 0,
        clientChange: 0,
        revenueChange: 0,
      });

      // Map recent activity to the expected ActivityItem format
      this.recentActivity.set(recentActivity.map((a: any) => ({
        id: a.id,
        clientId: a.client_id || '',
        clientName: a.client_name || 'Client',
        type: a.status === 'completed' ? 'workout_completed' as const : 'checkin' as const,
        message: a.status === 'completed' ? 'Completed workout' : 'Started workout',
        timestamp: new Date(a.completed_at || a.started_at || a.created_at),
      })));

      // Load client alerts (clients who may need attention)
      await this.clientService.loadClients();
      const clients = this.clientService.clients();
      const alerts: ClientAlert[] = [];
      for (const client of clients) {
        // Check if client has been inactive (no workouts in 7+ days)
        const recentCount = await this.sessionService.getWorkoutCount(client.id, 7);
        if (recentCount === 0 && client.subscription_status === 'active') {
          alerts.push({
            id: client.id,
            clientId: client.id,
            clientName: client.full_name || client.email || 'Unknown',
            type: 'missed_workout',
            message: 'No workouts in the past 7 days',
            daysAgo: 7,
            severity: 'medium',
          });
        }
      }
      this.clientAlerts.set(alerts);
    } catch (error) {
      console.error('Error loading trainer dashboard:', error);
    }
  }

  private async loadOwnerDashboard(): Promise<void> {
    const ownerId = this.authService.user()?.id;
    if (!ownerId) return;

    try {
      // Load trainers that belong to this gym owner
      const { data: trainers, error: trainersError } = await this.supabase.client
        .from('profiles')
        .select('*')
        .eq('gym_owner_id', ownerId)
        .eq('role', 'trainer');

      if (trainersError) throw trainersError;

      const trainerList = trainers || [];
      let totalClients = 0;
      const trainerPerf: TrainerPerformance[] = [];

      for (const trainer of trainerList) {
        const { count } = await this.supabase.client
          .from('client_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('trainer_id', trainer.id);

        const clientCount = count || 0;
        totalClients += clientCount;

        trainerPerf.push({
          id: trainer.id,
          name: trainer.full_name || 'Unknown',
          avatarUrl: trainer.avatar_url,
          totalClients: clientCount,
          activeClients: clientCount,
          monthlyRevenue: 0,
          clientChange: 0,
        });
      }

      this.facilityStats.set({
        totalClients,
        totalTrainers: trainerList.length,
        monthlyRevenue: 0,
        activeWorkouts: 0,
        clientRetention: 0,
        revenueGrowth: 0,
      });

      this.trainerPerformance.set(trainerPerf);
      this.recentActivity.set([]);
    } catch (error) {
      console.error('Error loading owner dashboard:', error);
    }
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadDashboardData();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
