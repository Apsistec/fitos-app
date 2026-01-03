import { Component, inject, computed, OnInit, signal } from '@angular/core';
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
import { personOutline } from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { fadeInUp, listStagger } from '@app/shared/animations';
import { AssignmentService } from '@app/core/services/assignment.service';
import { ClientService } from '@app/core/services/client.service';
import { WorkoutSessionService } from '@app/core/services/workout-session.service';
import { NutritionService } from '@app/core/services/nutrition.service';
import { ClientTodayWorkoutCardComponent } from './components/client-today-workout-card/client-today-workout-card.component';
import { ClientNutritionSummaryComponent, type NutritionSummary } from './components/client-nutrition-summary/client-nutrition-summary.component';
import { TrainerOverviewStatsComponent, type TrainerStats } from './components/trainer-overview-stats/trainer-overview-stats.component';
import { TrainerNeedsAttentionComponent, type ClientAlert } from './components/trainer-needs-attention/trainer-needs-attention.component';
import { TrainerActivityFeedComponent, type ActivityItem } from './components/trainer-activity-feed/trainer-activity-feed.component';
import { StatCardComponent } from '@app/shared/components/stat-card/stat-card.component';
import { UpcomingWorkoutsListComponent } from '@app/shared/components/upcoming-workouts-list/upcoming-workouts-list.component';
import type { WorkoutWithExercises } from '@app/core/services/workout.service';

@Component({
  selector: 'app-dashboard',
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
  ],
  animations: [fadeInUp, listStagger],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          {{ greeting() }}, {{ firstName() }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/tabs/settings">
            <ion-avatar style="width: 32px; height: 32px;">
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

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (!isTrainer()) {
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
              icon="flame"
              [suffix]="currentStreak() > 0 ? '🔥' : ''"
            />
          </div>

          <!-- Nutrition Summary -->
          <app-client-nutrition-summary [summary]="nutritionSummary()" />

          <!-- Upcoming Workouts -->
          <app-upcoming-workouts-list [workouts]="upcomingWorkouts()" />
        </div>
      } @else {
        <!-- Trainer Dashboard -->
        <div class="trainer-dashboard" @fadeInUp>
          <!-- Overview Stats -->
          <app-trainer-overview-stats [stats]="trainerStats()" />

          <!-- Needs Attention -->
          <app-trainer-needs-attention [alerts]="clientAlerts()" />

          <!-- Activity Feed -->
          <app-trainer-activity-feed [activities]="recentActivity()" />
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .client-dashboard,
    .trainer-dashboard {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    @media (max-width: 576px) {
      .stats-row {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardPage implements OnInit {
  private authService = inject(AuthService);
  private assignmentService = inject(AssignmentService);
  private clientService = inject(ClientService);
  private sessionService = inject(WorkoutSessionService);
  private nutritionService = inject(NutritionService);

  // User info
  isTrainer = computed(() => this.authService.isTrainer());
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

  constructor() {
    addIcons({ personOutline });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      if (this.isTrainer()) {
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

    // For now, set default/empty values
    // TODO: Implement actual service methods when backend is ready
    this.todayWorkout.set(null);
    this.weeklyWorkouts.set(0);
    this.currentStreak.set(0);
    this.upcomingWorkouts.set([]);
    this.nutritionSummary.set(null);

    // TODO: Uncomment when services are fully implemented
    /*
    const today = new Date().toISOString().split('T')[0];

    // Load today's workout assignment
    const assignments = await this.assignmentService.getAssignmentsForDate(userId, today);
    if (assignments.length > 0) {
      // Get the full workout details with exercises
      const workoutId = assignments[0].workout_template_id;
      // Fetch workout with exercises from WorkoutService
      this.todayWorkout.set(null);
    }

    // Load weekly workout count
    const sessions = await this.sessionService.getSessionsForDateRange(
      userId,
      this.getStartOfWeek(),
      today
    );
    this.weeklyWorkouts.set(sessions.filter((s: any) => s.status === 'completed').length);

    // Calculate streak (simplified - should be more robust)
    this.currentStreak.set(this.calculateStreak(sessions));

    // Load upcoming workouts
    const upcomingAssignments = await this.assignmentService.getAssignmentsForDateRange(
      userId,
      today,
      this.getEndOfWeek()
    );
    this.upcomingWorkouts.set(upcomingAssignments);

    // Load nutrition summary
    const nutritionData = await this.nutritionService.getDailySummary(userId, today);
    if (nutritionData) {
      this.nutritionSummary.set({
        calories: {
          consumed: nutritionData.total_calories || 0,
          target: nutritionData.target_calories || 2000,
        },
        protein: {
          consumed: nutritionData.total_protein || 0,
          target: nutritionData.target_protein || 150,
        },
        carbs: {
          consumed: nutritionData.total_carbs || 0,
          target: nutritionData.target_carbs || 200,
        },
        fat: {
          consumed: nutritionData.total_fat || 0,
          target: nutritionData.target_fat || 65,
        },
      });
    }
    */
  }

  private async loadTrainerDashboard(): Promise<void> {
    const trainerId = this.authService.user()?.id;
    if (!trainerId) return;

    // For now, set default/empty values
    // TODO: Implement actual service methods when backend is ready
    this.trainerStats.set({
      totalClients: 0,
      activeClients: 0,
      workoutsToday: 0,
      weeklyRevenue: 0,
      clientChange: 0,
      revenueChange: 0,
    });
    this.clientAlerts.set([]);
    this.recentActivity.set([]);

    // TODO: Uncomment when services are fully implemented
    /*
    // Load clients
    const clients = await this.clientService.getClients(trainerId);
    const activeClients = clients.filter((c: any) => c.status === 'active');

    // Load today's workouts for all clients
    const today = new Date().toISOString().split('T')[0];
    let workoutsToday = 0;
    for (const client of activeClients) {
      const assignments = await this.assignmentService.getAssignmentsForDate(client.id, today);
      workoutsToday += assignments.length;
    }

    // Set trainer stats
    this.trainerStats.set({
      totalClients: clients.length,
      activeClients: activeClients.length,
      workoutsToday,
      weeklyRevenue: 0, // TODO: Implement revenue tracking
      clientChange: 0, // TODO: Calculate from historical data
      revenueChange: 0, // TODO: Calculate from historical data
    });

    // Load client alerts
    // TODO: Implement actual alert logic based on missed workouts, low adherence, etc.
    this.clientAlerts.set([]);

    // Load recent activity
    // TODO: Implement actual activity feed from workout sessions
    this.recentActivity.set([]);
    */
  }

  private getStartOfWeek(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  private getEndOfWeek(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + 7; // Next Sunday
    const sunday = new Date(now.setDate(diff));
    return sunday.toISOString().split('T')[0];
  }

  private calculateStreak(sessions: any[]): number {
    // Simplified streak calculation
    // TODO: Implement proper streak logic considering scheduled vs completed workouts
    const completedDates = new Set(
      sessions
        .filter(s => s.status === 'completed')
        .map(s => s.started_at?.split('T')[0])
    );

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (completedDates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        // Allow grace for today
        break;
      }
    }

    return streak;
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadDashboardData();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
