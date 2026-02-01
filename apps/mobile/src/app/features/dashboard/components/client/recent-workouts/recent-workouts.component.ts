import { Component, Input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { WorkoutSessionService } from '../../../../../core/services/workout-session.service';

interface RecentWorkout {
  id: string;
  workout_template_id: string;
  workout_name: string;
  started_at: string;
  completed_at: string | null;
  duration_minutes: number | null;
  exercise_count: number;
  set_count: number;
}

@Component({
  selector: 'app-recent-workouts',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Recent Workouts</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="dots"></ion-spinner>
          </div>
        } @else if (workouts().length === 0) {
          <div class="empty-state">
            <ion-icon name="barbell-outline" size="large"></ion-icon>
            <p>No workouts yet</p>
            <ion-button fill="clear" routerLink="/workouts">
              Start Your First Workout
            </ion-button>
          </div>
        } @else {
          <div class="workout-list">
            @for (workout of workouts(); track workout.id) {
              <div class="workout-item" (click)="viewWorkout(workout)">
                <div class="workout-info">
                  <div class="workout-name">{{ workout.workout_name }}</div>
                  <div class="workout-meta">
                    {{ formatDate(workout.started_at) }} •
                    {{ workout.exercise_count }} exercises •
                    {{ workout.set_count }} sets
                    @if (workout.duration_minutes) {
                      • {{ workout.duration_minutes }}min
                    }
                  </div>
                </div>
                <ion-icon name="chevron-forward-outline"></ion-icon>
              </div>
            }
          </div>

          @if (workouts().length >= limit) {
            <ion-button expand="block" fill="clear" routerLink="/workouts/history">
              View All Workouts
            </ion-button>
          }
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;

      ion-icon {
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 16px;
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0 0 16px 0;
      }
    }

    .workout-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .workout-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;

      &:active {
        background: var(--fitos-bg-secondary, #1A1A1A);
      }
    }

    .workout-info {
      flex: 1;
      min-width: 0;
    }

    .workout-name {
      font-weight: 500;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .workout-meta {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    ion-button {
      margin-top: 16px;
    }
  `]
})
export class RecentWorkoutsComponent implements OnInit {
  @Input() userId?: string;
  @Input() limit = 5;

  workouts = signal<RecentWorkout[]>([]);
  loading = signal(true);

  constructor(
    private workoutSessionService: WorkoutSessionService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadRecentWorkouts();
  }

  private async loadRecentWorkouts() {
    try {
      const sessions = await this.workoutSessionService.getRecentSessions(this.userId, this.limit);
      this.workouts.set(sessions as RecentWorkout[]);
    } catch (error) {
      console.error('Error loading recent workouts:', error);
    } finally {
      this.loading.set(false);
    }
  }

  viewWorkout(workout: RecentWorkout) {
    this.router.navigate(['/workouts', workout.id]);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
