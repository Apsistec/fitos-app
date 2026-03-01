import { Component, inject, computed, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonSkeletonText,
  IonInput,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  personAddOutline,
  funnelOutline,
  barbellOutline,
  peopleOutline,
  calendarOutline,
  flameOutline,
  nutritionOutline,
  chatbubbleOutline,
  sendOutline,
  chevronForwardOutline,
  trophyOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { fadeInUp, listStagger } from '../../shared/animations';
import { AssignmentService } from '../../core/services/assignment.service';
import { ClientService } from '../../core/services/client.service';
import { WorkoutSessionService } from '../../core/services/workout-session.service';
import { NutritionService } from '../../core/services/nutrition.service';
import { MessagingService } from '../../core/services/messaging.service';
import { ClientDashboardService } from '../../core/services/client-dashboard.service';
import { ClientTodayWorkoutCardComponent } from './components/client-today-workout-card/client-today-workout-card.component';
import { ClientNutritionSummaryComponent, type NutritionSummary } from './components/client-nutrition-summary/client-nutrition-summary.component';
import { TrainerOverviewStatsComponent, type TrainerStats } from './components/trainer-overview-stats/trainer-overview-stats.component';
import { TrainerNeedsAttentionComponent, type ClientAlert } from './components/trainer-needs-attention/trainer-needs-attention.component';
import { TrainerActivityFeedComponent, type ActivityItem } from './components/trainer-activity-feed/trainer-activity-feed.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { UpcomingWorkoutsListComponent, type UpcomingWorkout } from '../../shared/components/upcoming-workouts-list/upcoming-workouts-list.component';
import { WearableDataCardComponent } from '../../shared/components/wearable-data-card/wearable-data-card.component';
import { OwnerFacilityStatsComponent, type FacilityStats } from './components/owner-facility-stats/owner-facility-stats.component';
import { OwnerTrainerPerformanceComponent, type TrainerPerformance } from './components/owner-trainer-performance/owner-trainer-performance.component';
import { CRMDashboardWidgetComponent } from '../crm/components/crm-dashboard-widget.component';
import { ProfilingPromptComponent } from './components/profiling-prompt/profiling-prompt.component';
import type { WorkoutWithExercises } from '../../core/services/workout.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    FormsModule,
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
    IonSkeletonText,
    IonInput,
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
    ProfilingPromptComponent,
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
        <!-- Client Dashboard (Sprint 63 redesign) -->
        <div class="client-dashboard" @fadeInUp>
          <!-- Progressive Profiling Prompt -->
          <app-profiling-prompt />

          <!-- 1. Next Session Card -->
          @if (clientDashboard.isLoading()) {
            <div class="dash-card skeleton-card">
              <ion-skeleton-text animated style="width:60%;height:14px;margin-bottom:8px;border-radius:6px"></ion-skeleton-text>
              <ion-skeleton-text animated style="width:90%;height:20px;border-radius:6px"></ion-skeleton-text>
            </div>
          } @else if (clientDashboard.nextSession()) {
            <div class="dash-card next-session-card" [routerLink]="['/tabs/schedule/client-appointment', clientDashboard.nextSession()!.appointment.id]">
              <div class="card-header-row">
                <div class="card-icon teal"><ion-icon name="calendar-outline"></ion-icon></div>
                <span class="card-title">Next Session</span>
                <span class="countdown-badge">{{ clientDashboard.nextSession()!.countdownLabel }}</span>
              </div>
              <div class="session-body">
                <div class="trainer-info">
                  <div class="trainer-avatar">
                    @if (clientDashboard.nextSession()!.trainerAvatarUrl) {
                      <img [src]="clientDashboard.nextSession()!.trainerAvatarUrl" alt="Trainer" />
                    } @else {
                      <ion-icon name="person-outline"></ion-icon>
                    }
                  </div>
                  <div class="session-details">
                    <p class="service-name">{{ clientDashboard.nextSession()!.serviceName }}</p>
                    <p class="session-time">{{ clientDashboard.nextSession()!.appointment.start_at | date:'EEE, MMM d · h:mm a' }}</p>
                  </div>
                </div>
                <ion-icon name="chevron-forward-outline" class="chevron"></ion-icon>
              </div>
            </div>
          } @else {
            <div class="dash-card next-session-card empty" routerLink="/tabs/schedule">
              <div class="card-header-row">
                <div class="card-icon teal"><ion-icon name="calendar-outline"></ion-icon></div>
                <span class="card-title">Next Session</span>
              </div>
              <p class="empty-label">No upcoming sessions — tap to book one.</p>
            </div>
          }

          <!-- 2. This Week Card -->
          @if (clientDashboard.isLoading()) {
            <div class="stats-row">
              <div class="dash-card stat-mini skeleton-card">
                <ion-skeleton-text animated style="width:80%;height:14px;border-radius:6px"></ion-skeleton-text>
              </div>
              <div class="dash-card stat-mini skeleton-card">
                <ion-skeleton-text animated style="width:80%;height:14px;border-radius:6px"></ion-skeleton-text>
              </div>
            </div>
          } @else {
            <div class="stats-row">
              <div class="dash-card stat-mini" routerLink="/tabs/workouts">
                <div class="stat-icon"><ion-icon name="barbell-outline"></ion-icon></div>
                <div class="stat-text">
                  <span class="stat-value">{{ clientDashboard.weeklyProgress().workoutsCompleted }}<span class="stat-denom">/{{ clientDashboard.weeklyProgress().workoutsPlanned }}</span></span>
                  <span class="stat-label">This Week</span>
                </div>
              </div>
              <div class="dash-card stat-mini">
                <div class="stat-icon flame"><ion-icon name="flame-outline"></ion-icon></div>
                <div class="stat-text">
                  <span class="stat-value">{{ clientDashboard.weeklyProgress().streak }}</span>
                  <span class="stat-label">Day Streak</span>
                </div>
              </div>
            </div>
          }

          <!-- 3. Nutrition Snapshot Card -->
          @if (clientDashboard.isLoading()) {
            <div class="dash-card skeleton-card">
              <ion-skeleton-text animated style="width:50%;height:14px;margin-bottom:8px;border-radius:6px"></ion-skeleton-text>
              <ion-skeleton-text animated style="width:100%;height:12px;border-radius:6px"></ion-skeleton-text>
            </div>
          } @else if (clientDashboard.nutritionSnapshot()) {
            <div class="dash-card nutrition-card" routerLink="/tabs/nutrition">
              <div class="card-header-row">
                <div class="card-icon purple"><ion-icon name="nutrition-outline"></ion-icon></div>
                <span class="card-title">Nutrition Today</span>
                <span class="nutrition-cal">{{ clientDashboard.nutritionSnapshot()!.caloriesConsumed | number:'1.0-0' }} / {{ clientDashboard.nutritionSnapshot()!.caloriesTarget | number:'1.0-0' }} kcal</span>
              </div>
              <div class="macro-bar-row">
                <div class="macro-bar">
                  <div class="macro-fill protein"
                    [style.width.%]="macroPercent(clientDashboard.nutritionSnapshot()!.proteinConsumed, clientDashboard.nutritionSnapshot()!.proteinTarget)">
                  </div>
                </div>
                <div class="macro-bar">
                  <div class="macro-fill carbs"
                    [style.width.%]="macroPercent(clientDashboard.nutritionSnapshot()!.carbsConsumed, clientDashboard.nutritionSnapshot()!.carbsTarget)">
                  </div>
                </div>
                <div class="macro-bar">
                  <div class="macro-fill fat"
                    [style.width.%]="macroPercent(clientDashboard.nutritionSnapshot()!.fatConsumed, clientDashboard.nutritionSnapshot()!.fatTarget)">
                  </div>
                </div>
              </div>
              <div class="macro-labels">
                <span class="macro-lbl protein">P {{ clientDashboard.nutritionSnapshot()!.proteinConsumed | number:'1.0-0' }}g</span>
                <span class="macro-lbl carbs">C {{ clientDashboard.nutritionSnapshot()!.carbsConsumed | number:'1.0-0' }}g</span>
                <span class="macro-lbl fat">F {{ clientDashboard.nutritionSnapshot()!.fatConsumed | number:'1.0-0' }}g</span>
              </div>
            </div>
          }

          <!-- 4. Message Preview Card -->
          @if (clientDashboard.isLoading()) {
            <div class="dash-card skeleton-card">
              <ion-skeleton-text animated style="width:40%;height:14px;margin-bottom:8px;border-radius:6px"></ion-skeleton-text>
              <ion-skeleton-text animated style="width:85%;height:14px;border-radius:6px"></ion-skeleton-text>
            </div>
          } @else if (clientDashboard.messagePreview()) {
            <div class="dash-card message-card">
              <div class="card-header-row">
                <div class="card-icon blue"><ion-icon name="chatbubble-outline"></ion-icon></div>
                <span class="card-title">{{ clientDashboard.messagePreview()!.conversation.otherUserName }}</span>
                <button class="see-all-btn" [routerLink]="['/tabs/messages']">See all</button>
              </div>
              <p class="message-preview-text">{{ clientDashboard.messagePreview()!.lastMessage.content }}</p>
              <div class="quick-reply-row">
                <input
                  class="quick-reply-input"
                  placeholder="Quick reply…"
                  [(ngModel)]="quickReplyText"
                  (keydown.enter)="sendQuickReply()"
                />
                <button class="send-btn" (click)="sendQuickReply()" [disabled]="!quickReplyText.trim()">
                  <ion-icon name="send-outline"></ion-icon>
                </button>
              </div>
            </div>
          }

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

    /* Sprint 63: Client dashboard cards */
    .dash-card {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 16px;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
      &:active { transform: scale(0.98); background: rgba(255,255,255,0.03); }
    }

    .skeleton-card { cursor: default; &:active { transform: none; } }

    .card-header-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      ion-icon { font-size: 16px; color: #fff; }
      &.teal { background: rgba(16, 185, 129, 0.2); ion-icon { color: #10B981; } }
      &.purple { background: rgba(139, 92, 246, 0.2); ion-icon { color: #8B5CF6; } }
      &.blue { background: rgba(59, 130, 246, 0.2); ion-icon { color: #3B82F6; } }
    }
    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      flex: 1;
    }

    /* Next Session */
    .countdown-badge {
      font-size: 12px;
      font-weight: 700;
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
      border-radius: 20px;
      padding: 3px 10px;
    }
    .session-body {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .trainer-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }
    .trainer-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
      ion-icon { font-size: 20px; color: var(--fitos-text-secondary, #A3A3A3); }
    }
    .session-details {
      .service-name { margin: 0 0 2px; font-size: 15px; font-weight: 600; color: var(--fitos-text-primary, #F5F5F5); }
      .session-time { margin: 0; font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); }
    }
    .chevron { font-size: 18px; color: var(--fitos-text-tertiary, #6B6B6B); flex-shrink: 0; }
    .empty-label { margin: 0; font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); }

    /* Stat mini cards */
    .stat-mini {
      display: flex;
      align-items: center;
      gap: 12px;
      .stat-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(16, 185, 129, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        ion-icon { font-size: 18px; color: #10B981; }
        &.flame { background: rgba(245, 158, 11, 0.15); ion-icon { color: #F59E0B; } }
      }
      .stat-text {
        display: flex;
        flex-direction: column;
        .stat-value {
          font-size: 22px;
          font-weight: 800;
          color: var(--fitos-text-primary, #F5F5F5);
          line-height: 1;
          .stat-denom { font-size: 14px; font-weight: 500; color: var(--fitos-text-secondary, #A3A3A3); }
        }
        .stat-label { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); margin-top: 2px; }
      }
    }

    /* Nutrition card */
    .nutrition-cal {
      font-size: 12px;
      font-weight: 600;
      color: var(--fitos-text-secondary, #A3A3A3);
    }
    .macro-bar-row {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .macro-bar {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      overflow: hidden;
      .macro-fill {
        height: 100%;
        border-radius: 3px;
        max-width: 100%;
        transition: width 0.4s ease;
        &.protein { background: #10B981; }
        &.carbs { background: #3B82F6; }
        &.fat { background: #F59E0B; }
      }
    }
    .macro-labels {
      display: flex;
      gap: 16px;
      .macro-lbl {
        font-size: 11px;
        font-weight: 600;
        &.protein { color: #10B981; }
        &.carbs { color: #3B82F6; }
        &.fat { color: #F59E0B; }
      }
    }

    /* Message card */
    .message-preview-text {
      margin: 0 0 12px;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .see-all-btn {
      background: none;
      border: none;
      font-size: 13px;
      color: #10B981;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }
    .quick-reply-row {
      display: flex;
      gap: 8px;
      align-items: center;
      .quick-reply-input {
        flex: 1;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        color: var(--fitos-text-primary, #F5F5F5);
        font-size: 14px;
        padding: 8px 14px;
        outline: none;
        &::placeholder { color: var(--fitos-text-tertiary, #6B6B6B); }
      }
      .send-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #10B981;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        &:disabled { opacity: 0.4; cursor: not-allowed; }
        ion-icon { font-size: 16px; color: #fff; }
      }
    }

    /* Ensure all cards have consistent width */
    app-profiling-prompt,
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
  private subscriptionService = inject(SubscriptionService);
  private messagingService = inject(MessagingService);
  private toastCtrl = inject(ToastController);

  // Sprint 63: Client dashboard service
  clientDashboard = inject(ClientDashboardService);
  quickReplyText = '';

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
  upcomingWorkouts = signal<UpcomingWorkout[]>([]);
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
      calendarOutline,
      flameOutline,
      nutritionOutline,
      chatbubbleOutline,
      sendOutline,
      chevronForwardOutline,
      trophyOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  macroPercent(consumed: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((consumed / target) * 100));
  }

  async sendQuickReply(): Promise<void> {
    const text = this.quickReplyText.trim();
    if (!text) return;
    const preview = this.clientDashboard.messagePreview();
    if (!preview) return;
    try {
      await this.messagingService.sendMessage(preview.conversation.otherUserId, text);
      this.quickReplyText = '';
      const toast = await this.toastCtrl.create({ message: 'Message sent', duration: 1500, position: 'bottom', color: 'success' });
      await toast.present();
    } catch {
      const toast = await this.toastCtrl.create({ message: 'Failed to send', duration: 2000, position: 'bottom', color: 'danger' });
      await toast.present();
    }
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

    // Sprint 63: Load new client dashboard service
    this.clientDashboard.load();

    try {
      // Load all client dashboard data in parallel
      const [todayWorkout, weeklyCount, streak, upcoming] = await Promise.all([
        this.sessionService.getTodayWorkout(userId),
        this.sessionService.getWorkoutCount(userId, 7),
        this.sessionService.getCurrentStreak(userId),
        this.sessionService.getUpcomingWorkouts(userId, 5),
      ]);

      this.todayWorkout.set(todayWorkout as unknown as WorkoutWithExercises);
      this.weeklyWorkouts.set(weeklyCount);
      this.currentStreak.set(streak);
      this.upcomingWorkouts.set(upcoming as UpcomingWorkout[]);

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

      // Load subscription data for revenue
      await this.subscriptionService.loadTrainerSubscriptions();
      const monthlyRevenue = this.subscriptionService.monthlyRevenue() / 100; // cents to dollars
      const weeklyRevenue = Math.round(monthlyRevenue / 4.33); // approximate weekly

      this.trainerStats.set({
        totalClients: clientStats.total,
        activeClients: clientStats.active,
        workoutsToday: todaySchedule.length,
        weeklyRevenue,
        clientChange: 0,
        revenueChange: 0,
      });

      // Map recent activity to the expected ActivityItem format
      this.recentActivity.set(recentActivity.map((a) => ({
        id: String(a.workout?.id || ''),
        clientId: a.clientName || '',
        clientName: a.clientName || 'Client',
        type: 'workout_completed' as const,
        message: 'Completed workout',
        timestamp: new Date(a.completedAt || a.workout?.created_at || new Date()),
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

      let totalMonthlyRevenue = 0;

      for (const trainer of trainerList) {
        // Get client count
        const { count } = await this.supabase.client
          .from('client_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('trainer_id', trainer.id);

        const clientCount = count || 0;
        totalClients += clientCount;

        // Get trainer's subscription revenue
        const { data: trainerSubs } = await this.supabase.client
          .from('subscriptions')
          .select('amount_cents, interval')
          .eq('trainer_id', trainer.id)
          .eq('status', 'active');

        const trainerRevenue = (trainerSubs || []).reduce((sum: number, sub: { amount_cents: number; interval: string }) => {
          let monthly = sub.amount_cents;
          if (sub.interval === 'week') monthly *= 4;
          if (sub.interval === 'year') monthly /= 12;
          return sum + monthly;
        }, 0) / 100; // cents to dollars

        totalMonthlyRevenue += trainerRevenue;

        trainerPerf.push({
          id: trainer.id,
          name: trainer.full_name || 'Unknown',
          avatarUrl: trainer.avatar_url,
          totalClients: clientCount,
          activeClients: clientCount,
          monthlyRevenue: trainerRevenue,
          clientChange: 0,
        });
      }

      // Calculate active workouts this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: workoutCount } = await this.supabase.client
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Calculate retention rate
      const retentionRate = totalClients > 0
        ? Math.round((totalClients / Math.max(totalClients + 1, totalClients)) * 100)
        : 0;

      this.facilityStats.set({
        totalClients,
        totalTrainers: trainerList.length,
        monthlyRevenue: totalMonthlyRevenue,
        activeWorkouts: workoutCount || 0,
        clientRetention: retentionRate,
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
