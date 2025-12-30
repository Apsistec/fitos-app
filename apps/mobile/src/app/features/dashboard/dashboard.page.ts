import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [
    CommonModule,
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
        <!-- Today's Workout Card -->
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

        <!-- Quick Stats Row -->
        <div class="stats-row">
          <ion-card class="stat-card">
            <ion-card-content>
              <div class="stat-value">{{ weeklyWorkouts() }}</div>
              <div class="stat-label">Workouts This Week</div>
            </ion-card-content>
          </ion-card>

          <ion-card class="stat-card">
            <ion-card-content>
              <div class="stat-value">{{ currentStreak() }}</div>
              <div class="stat-label">Day Streak 🔥</div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Nutrition Summary (if client) -->
        @if (!isTrainer()) {
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
        }

        <!-- Trainer: Recent Clients Activity -->
        @if (isTrainer()) {
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
        }

        <!-- Upcoming Workouts -->
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
      </div>
    </ion-content>
  `,
  styles: [`
    .dashboard-content {
      padding: 16px;
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

    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      margin: 0;

      ion-card-content {
        text-align: center;
        padding: 16px;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--ion-color-primary);
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--ion-color-medium);
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
  
  // Nutrition (mock data for now)
  caloriesConsumed = signal(1250);
  caloriesTarget = signal(2000);
  caloriesProgress = computed(() => 
    Math.min(this.caloriesConsumed() / this.caloriesTarget(), 1)
  );
  proteinConsumed = signal(85);
  carbsConsumed = signal(120);
  fatConsumed = signal(45);

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
    // For now, using placeholder data
    
    // Mock upcoming workouts
    this.upcomingWorkouts.set([
      {
        id: '1',
        clientId: '',
        name: 'Upper Body Strength',
        scheduledDate: new Date(Date.now() + 86400000),
        status: 'scheduled',
        exercises: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Workout,
      {
        id: '2',
        clientId: '',
        name: 'Lower Body Power',
        scheduledDate: new Date(Date.now() + 86400000 * 3),
        status: 'scheduled',
        exercises: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Workout,
    ]);

    this.weeklyWorkouts.set(3);
    this.currentStreak.set(7);
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
