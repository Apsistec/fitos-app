import { Component, OnInit, signal, inject } from '@angular/core';
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
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barbellOutline,
  timeOutline,
  calendarOutline,
  trophyOutline,
} from 'ionicons/icons';
import { WorkoutSessionService } from '../../../../core/services/workout-session.service';

addIcons({ barbellOutline, timeOutline, calendarOutline, trophyOutline });

@Component({
  selector: 'app-workout-history',
  standalone: true,
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
    IonList,
    IonItem,
    IonLabel,
  ],
  template: `
    <ion-header>
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
                        <span>{{ formatDate(workout.completed_at) }}</span>
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
                          <span>{{ workout.template.estimated_duration_minutes }} min planned</span>
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
      color: var(--ion-color-medium);
    }

    .error-message {
      color: var(--ion-color-danger);
      margin-bottom: 16px;
    }

    .empty-state {
      gap: 12px;
    }

    .empty-icon {
      font-size: 80px;
      color: var(--ion-color-medium);
      opacity: 0.5;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      margin: 0;
      font-size: 1.1rem;
    }

    .empty-subtitle {
      font-size: 0.9rem !important;
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
      background: var(--ion-color-light);
      border-radius: 12px;
    }

    .stat-card ion-icon {
      font-size: 40px;
      color: var(--ion-color-primary);
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--ion-color-dark);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
      margin-top: 4px;
    }

    ion-list {
      padding: 0;
      margin: 0;
    }

    ion-card {
      margin: 0 0 12px 0;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    ion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    ion-card-title {
      font-size: 1.1rem;
      font-weight: 600;
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
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    .detail-item ion-icon {
      font-size: 18px;
    }

    .workout-notes {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--ion-color-light);
    }

    .workout-notes p {
      font-size: 0.875rem;
      color: var(--ion-color-dark);
      margin: 0;
      font-style: italic;
    }

    .load-more {
      margin-top: 16px;
      padding: 0;
    }

    .load-more ion-button {
      margin: 0;
    }
  `]
})
export class WorkoutHistoryPage implements OnInit {
  private sessionService = inject(WorkoutSessionService);
  private router = inject(Router);

  // State
  workouts = signal<any[]>([]);
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

  async handleRefresh(event: any) {
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
