import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonProgressBar,
  IonButtons,
  IonRefresher,
  IonRefresherContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  barbellOutline,
  nutritionOutline,
  trendingUpOutline,
  chevronForward,
  personOutline,
  checkmarkCircle,
  timeOutline,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';
import type { Workout } from '@fitos/shared';

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    TitleCasePipe,
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonBadge,
    IonProgressBar,
    IonButtons,
    IonRefresher,
    IonRefresherContent,
    IonGrid,
    IonRow,
    IonCol,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          @if (greeting()) {
            {{ greeting() }}, {{ firstName() }}
          } @else {
            Dashboard
          }
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

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="dashboard-content">
        <ion-grid>
          <ion-row>
            <!-- Today's Workout Card - Full width on mobile, 2/3 on tablet+, 1/2 on desktop -->
            <ion-col size="12" sizeMd="8" sizeLg="6">
              <ion-card class="today-workout-card">
                <ion-card-header>
                  <ion-card-subtitle>Today</ion-card-subtitle>
                  <ion-card-title>
                    @if (todayWorkout()) {
                      {{ todayWorkout()?.name }}
                    } @else {
                      No Workout Scheduled
                    }
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  @if (todayWorkout()) {
                    <div class="workout-meta">
                      <span>
                        <ion-icon name="time-outline"></ion-icon>
                        ~45 min
                      </span>
                      <ion-badge [color]="getStatusColor(todayWorkout()?.status)">
                        {{ todayWorkout()?.status | titlecase }}
                      </ion-badge>
                    </div>
                    <ion-button expand="block" [routerLink]="['/tabs/workouts/active', todayWorkout()?.id]">
                      @if (todayWorkout()?.status === 'scheduled') {
                        Start Workout
                      } @else if (todayWorkout()?.status === 'in_progress') {
                        Continue Workout
                      } @else {
                        View Details
                      }
                    </ion-button>
                  } @else {
                    <p class="no-workout-text">Rest day or no workout assigned for today.</p>
                    @if (isTrainer()) {
                      <ion-button expand="block" fill="outline" routerLink="/tabs/workouts/builder">
                        <ion-icon name="add-outline" slot="start"></ion-icon>
                        Create Workout
                      </ion-button>
                    }
                  }
                </ion-card-content>
              </ion-card>
            </ion-col>

            <!-- Quick Stats - Stacked on mobile, side-by-side on tablet+, vertical on desktop -->
            <ion-col size="6" sizeMd="4" sizeLg="3">
              <ion-card class="stat-card">
                <ion-card-content>
                  <div class="stat-value">{{ weeklyWorkouts() }}</div>
                  <div class="stat-label">Workouts This Week</div>
                </ion-card-content>
              </ion-card>
            </ion-col>

            <ion-col size="6" sizeMd="4" sizeLg="3">
              <ion-card class="stat-card">
                <ion-card-content>
                  <div class="stat-value">{{ currentStreak() }}</div>
                  <div class="stat-label">Day Streak 🔥</div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>

          <!-- Nutrition Summary (if client) -->
          @if (!isTrainer()) {
            <ion-row>
              <ion-col size="12" sizeMd="6" sizeLg="6">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle>Today's Nutrition</ion-card-subtitle>
                    <ion-card-title class="nutrition-title">
                      {{ caloriesConsumed() }} / {{ caloriesTarget() }} cal
                    </ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <ion-progress-bar
                      [value]="caloriesProgress()"
                      class="nutrition-progress"
                    ></ion-progress-bar>

                    <div class="macros-row">
                      <div class="macro">
                        <span class="macro-value protein-color">{{ proteinConsumed() }}g</span>
                        <span class="macro-label">Protein</span>
                      </div>
                      <div class="macro">
                        <span class="macro-value carbs-color">{{ carbsConsumed() }}g</span>
                        <span class="macro-label">Carbs</span>
                      </div>
                      <div class="macro">
                        <span class="macro-value fat-color">{{ fatConsumed() }}g</span>
                        <span class="macro-label">Fat</span>
                      </div>
                    </div>

                    <ion-button expand="block" fill="outline" routerLink="/tabs/nutrition/add">
                      <ion-icon name="add-outline" slot="start"></ion-icon>
                      Log Food
                    </ion-button>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          }

          <!-- Trainer: Recent Clients Activity -->
          @if (isTrainer()) {
            <ion-row>
              <ion-col size="12" sizeMd="6" sizeLg="6">
                <ion-card>
                  <ion-card-header>
                    <ion-card-subtitle>Client Activity</ion-card-subtitle>
                    <ion-card-title>Recent Updates</ion-card-title>
                  </ion-card-header>
                  <ion-card-content class="no-padding">
                    <ion-list lines="full">
                      @for (activity of recentActivity(); track activity.id) {
                        <ion-item [routerLink]="['/tabs/clients', activity.clientId]">
                          <ion-avatar slot="start">
                            <img [src]="activity.avatarUrl || 'assets/default-avatar.png'" />
                          </ion-avatar>
                          <ion-label>
                            <h3>{{ activity.clientName }}</h3>
                            <p>{{ activity.message }}</p>
                          </ion-label>
                          <ion-icon name="chevron-forward" slot="end" color="medium"></ion-icon>
                        </ion-item>
                      } @empty {
                        <ion-item>
                          <ion-label class="ion-text-center">
                            <p>No recent activity</p>
                          </ion-label>
                        </ion-item>
                      }
                    </ion-list>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          }

          <!-- Upcoming Workouts -->
          <ion-row>
            <ion-col size="12" sizeMd="6" sizeLg="6">
              <ion-card>
                <ion-card-header>
                  <ion-card-subtitle>Coming Up</ion-card-subtitle>
                  <ion-card-title>This Week</ion-card-title>
                </ion-card-header>
                <ion-card-content class="no-padding">
                  <ion-list lines="full">
                    @for (workout of upcomingWorkouts(); track workout.id) {
                      <ion-item [routerLink]="['/tabs/workouts/history', workout.id]">
                        <ion-icon name="barbell-outline" slot="start" color="primary"></ion-icon>
                        <ion-label>
                          <h3>{{ workout.name }}</h3>
                          <p>{{ workout.scheduledDate | date:'EEEE, MMM d' }}</p>
                        </ion-label>
                        <ion-icon name="chevron-forward" slot="end" color="medium"></ion-icon>
                      </ion-item>
                    } @empty {
                      <ion-item>
                        <ion-label class="ion-text-center">
                          <p>No upcoming workouts</p>
                        </ion-label>
                      </ion-item>
                    }
                  </ion-list>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  `,
  styles: [`
    .dashboard-content {
      padding: 8px;

      @media (min-width: 768px) {
        padding: 16px;
      }

      @media (min-width: 992px) {
        padding: 24px;
      }
    }

    ion-grid {
      max-width: 1200px;
      margin: 0 auto;
    }

    ion-card {
      margin: 0;
      height: 100%;
    }

    .today-workout-card {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-tertiary) 100%);
      color: white;

      ion-card-subtitle {
        color: rgba(255, 255, 255, 0.8);
      }

      ion-card-title {
        color: white;
        font-size: 1.5rem;
      }

      .workout-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;

        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }

      ion-button {
        --background: white;
        --color: var(--ion-color-primary);
      }

      .no-workout-text {
        margin: 0 0 16px;
        opacity: 0.9;
      }
    }

    .stat-card {
      ion-card-content {
        text-align: center;
        padding: 20px 16px;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--ion-color-primary);

        @media (min-width: 768px) {
          font-size: 2.5rem;
        }
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--ion-color-medium);
        margin-top: 4px;
      }
    }

    .nutrition-title {
      font-size: 1.5rem !important;
    }

    .nutrition-progress {
      margin-bottom: 16px;
    }

    .macros-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 16px;
      text-align: center;

      .macro-value {
        display: block;
        font-size: 1.25rem;
        font-weight: 600;
      }

      .macro-label {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
      }
    }

    .no-padding {
      padding: 0;
    }

    ion-list {
      background: transparent;
    }
  `],
})
export class DashboardPage implements OnInit {
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);

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

  // Data signals
  todayWorkout = signal<Workout | null>(null);
  weeklyWorkouts = signal(0);
  currentStreak = signal(0);
  upcomingWorkouts = signal<Workout[]>([]);
  
  // Nutrition (real data from backend)
  caloriesConsumed = signal(0);
  caloriesTarget = signal(0);
  caloriesProgress = computed(() => {
    const target = this.caloriesTarget();
    return target > 0 ? Math.min(this.caloriesConsumed() / target, 1) : 0;
  });
  proteinConsumed = signal(0);
  carbsConsumed = signal(0);
  fatConsumed = signal(0);

  // Trainer activity
  recentActivity = signal<Array<{
    id: string;
    clientId: string;
    clientName: string;
    avatarUrl: string;
    message: string;
  }>>([]);

  constructor() {
    addIcons({
      addOutline,
      barbellOutline,
      nutritionOutline,
      trendingUpOutline,
      chevronForward,
      personOutline,
      checkmarkCircle,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    // TODO: Load actual data from Supabase
    // Set to defaults until backend data is available
    this.upcomingWorkouts.set([]);
    this.weeklyWorkouts.set(0);
    this.currentStreak.set(0);
    this.todayWorkout.set(null);

    // TODO: Load nutrition data if client
    // TODO: Load client activity if trainer
  }

  getStatusColor(status: string | undefined): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'skipped':
        return 'medium';
      default:
        return 'primary';
    }
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadDashboardData();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
