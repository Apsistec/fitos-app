import {  Component, OnInit, signal, inject , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonList,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barbellOutline,
  timeOutline,
  calendarOutline,
  trophyOutline,
} from 'ionicons/icons';
import { WorkoutSessionService } from '../../../../core/services/workout-session.service';
import { Database } from '@fitos/shared';

type WorkoutSession = Database['public']['Tables']['workouts']['Row'];
type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row'];
type WorkoutWithTemplate = WorkoutSession & { template: WorkoutTemplate | null };

addIcons({ barbellOutline, timeOutline, calendarOutline, trophyOutline });

@Component({
  selector: 'app-workout-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonList
],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Workout History</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading workout history...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <p class="error-message">{{ error() }}</p>
          <ion-button (click)="loadHistory()">Retry</ion-button>
        </div>
      } @else {
        <div class="history-container">
          @if (workouts().length === 0) {
            <div class="empty-state">
              <ion-icon name="barbell-outline" class="empty-icon"></ion-icon>
              <p>No completed workouts yet</p>
              <p class="empty-subtitle">Your workout history will appear here</p>
            </div>
          } @else {
            <div class="stats-summary">
              <div class="stat-card">
                <ion-icon name="trophy-outline"></ion-icon>
                <div class="stat-content">
                  <div class="stat-value">{{ workouts().length }}</div>
                  <div class="stat-label">Completed</div>
                </div>
              </div>
            </div>

            <ion-list lines="none">
              @for (workout of workouts(); track workout.id) {
                <ion-card button (click)="viewWorkout(workout.id)">
                  <ion-card-header>
                    <div class="card-header">
                      <ion-card-title>{{ workout.template?.name || 'Workout' }}</ion-card-title>
                      @if (workout.rating) {
                        <ion-badge color="primary">
                          {{ workout.rating }}/5
                        </ion-badge>
                      }
                    </div>
                  </ion-card-header>

                  <ion-card-content>
                    <div class="workout-details">
                      <div class="detail-item">
                        <ion-icon name="calendar-outline"></ion-icon>
                        <span>{{ workout.completed_at ? formatDate(workout.completed_at) : '-' }}</span>
                      </div>

                      @if (workout.started_at && workout.completed_at) {
                        <div class="detail-item">
                          <ion-icon name="time-outline"></ion-icon>
                          <span>{{ calculateDuration(workout.started_at, workout.completed_at) }}</span>
                        </div>
                      }

                      @if (workout.template?.estimated_duration_minutes) {
                        <div class="detail-item">
                          <ion-icon name="barbell-outline"></ion-icon>
                          <span>{{ workout.template?.estimated_duration_minutes }} min planned</span>
                        </div>
                      }
                    </div>

                    @if (workout.notes) {
                      <div class="workout-notes">
                        <p>{{ workout.notes }}</p>
                      </div>
                    }
                  </ion-card-content>
                </ion-card>
              }
            </ion-list>

            @if (hasMore()) {
              <div class="load-more">
                <ion-button
                  expand="block"
                  fill="outline"
                  (click)="loadMore()"
                  [disabled]="loadingMore()"
                >
                  @if (loadingMore()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else {
                    Load More
                  }
                </ion-button>
              </div>
            }
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .loading-container,
    .error-container,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      padding: 20px;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    .error-message {
      color: #FCA5A5;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .empty-state {
      gap: 12px;
    }

    .empty-icon {
      font-size: 48px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .empty-state p {
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
      font-size: 14px;
    }

    .empty-subtitle {
      font-size: 13px !important;
    }

    .history-container {
      padding: 16px;
    }

    .stats-summary {
      margin-bottom: 20px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stat-card ion-icon {
      font-size: 36px;
      color: var(--ion-color-primary, #10B981);
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      line-height: 1;
      font-family: 'Space Mono', monospace;
    }

    .stat-label {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
      margin-top: 4px;
      font-weight: 500;
    }

    ion-list {
      padding: 0;
      margin: 0;
      background: transparent;
    }

    ion-card {
      margin: 0 0 12px 0;
      cursor: pointer;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    ion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.08);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin: 0;
      flex: 1;
    }

    .workout-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .detail-item ion-icon {
      font-size: 16px;
    }

    .workout-notes {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .workout-notes p {
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
      font-style: italic;
    }

    .load-more {
      margin-top: 16px;
      padding: 0;
    }

    .load-more ion-button {
      margin: 0;
      --border-radius: 8px;
      --border-color: rgba(255, 255, 255, 0.1);
      --color: var(--fitos-text-primary, #F5F5F5);
      font-weight: 600;
    }
  `]
})
export class WorkoutHistoryPage implements OnInit {
  private sessionService = inject(WorkoutSessionService);
  private router = inject(Router);

  // State
  workouts = signal<WorkoutWithTemplate[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  error = signal<string | null>(null);
  hasMore = signal(true);

  private currentPage = 0;
  private pageSize = 20;

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.loading.set(true);
    this.error.set(null);
    this.currentPage = 0;

    try {
      const data = await this.sessionService.getWorkoutHistory(this.pageSize, 0);
      this.workouts.set(data);
      this.hasMore.set(data.length === this.pageSize);
    } catch (err) {
      this.error.set('Failed to load workout history');
      console.error('Error loading workout history:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;

    this.loadingMore.set(true);
    this.currentPage++;

    try {
      const offset = this.currentPage * this.pageSize;
      const data = await this.sessionService.getWorkoutHistory(this.pageSize, offset);

      this.workouts.update(current => [...current, ...data]);
      this.hasMore.set(data.length === this.pageSize);
    } catch (err) {
      console.error('Error loading more workouts:', err);
    } finally {
      this.loadingMore.set(false);
    }
  }

  async handleRefresh(event: RefresherCustomEvent) {
    await this.loadHistory();
    event.target.complete();
  }

  viewWorkout(workoutId: string) {
    this.router.navigate(['/tabs/workouts/history', workoutId]);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  calculateDuration(startedAt: string, completedAt: string): string {
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}
