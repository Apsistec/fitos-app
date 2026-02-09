import {  Component, OnInit, signal, inject , ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonSpinner,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barbellOutline,
  timeOutline,
  calendarOutline,
  star,
  checkmarkCircle,
} from 'ionicons/icons';
import { WorkoutSessionService } from '../../../../core/services/workout-session.service';
import { Database } from '@fitos/shared';

type WorkoutSession = Database['public']['Tables']['workouts']['Row'];
type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row'];
type WorkoutWithTemplate = WorkoutSession & { template: WorkoutTemplate | null };
type LoggedSet = Database['public']['Tables']['workout_sets']['Row'];

interface GroupedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
  totalVolume: number;
}

addIcons({
  barbellOutline,
  timeOutline,
  calendarOutline,
  star,
  checkmarkCircle,
});

@Component({
  selector: 'app-workout-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonSpinner,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon
],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts/history"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ workout()?.template?.name || 'Workout Details' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading workout details...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <p class="error-message">{{ error() }}</p>
          <ion-button (click)="loadWorkout()">Retry</ion-button>
        </div>
      } @else if (workout()) {
        <div class="detail-container">
          <!-- Summary Card -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Summary</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="summary-grid">
                <div class="summary-item">
                  <ion-icon name="calendar-outline"></ion-icon>
                  <div class="summary-content">
                    <div class="summary-label">Completed</div>
                    <div class="summary-value">{{ formatDate(workout()!.completed_at) }}</div>
                  </div>
                </div>

                @if (workout()!.started_at && workout()!.completed_at) {
                  <div class="summary-item">
                    <ion-icon name="time-outline"></ion-icon>
                    <div class="summary-content">
                      <div class="summary-label">Duration</div>
                      <div class="summary-value">{{ calculateDuration(workout()!.started_at, workout()!.completed_at) }}</div>
                    </div>
                  </div>
                }

                @if (workout()!.rating) {
                  <div class="summary-item">
                    <ion-icon name="star"></ion-icon>
                    <div class="summary-content">
                      <div class="summary-label">Rating</div>
                      <div class="summary-value">{{ workout()!.rating }}/5</div>
                    </div>
                  </div>
                }

                <div class="summary-item">
                  <ion-icon name="checkmark-circle"></ion-icon>
                  <div class="summary-content">
                    <div class="summary-label">Total Sets</div>
                    <div class="summary-value">{{ sets().length }}</div>
                  </div>
                </div>
              </div>

              @if (workout()!.notes) {
                <div class="workout-notes">
                  <h3>Notes</h3>
                  <p>{{ workout()!.notes }}</p>
                </div>
              }
            </ion-card-content>
          </ion-card>

          <!-- Exercises -->
          <div class="exercises-section">
            <h2 class="section-title">Exercises</h2>

            @if (groupedSets().length === 0) {
              <ion-card>
                <ion-card-content>
                  <p class="no-data">No sets logged for this workout</p>
                </ion-card-content>
              </ion-card>
            } @else {
              @for (exercise of groupedSets(); track exercise.exerciseId) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>{{ exercise.exerciseName }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="sets-table">
                      <div class="sets-header">
                        <span>Set</span>
                        <span>Reps</span>
                        <span>Weight</span>
                        @if (hasRpe(exercise)) {
                          <span>RPE</span>
                        }
                      </div>

                      @for (set of exercise.sets; track set.id) {
                        <div class="set-row">
                          <span class="set-number">{{ set.set_number }}</span>
                          <span class="set-reps">{{ set.reps_completed }}</span>
                          <span class="set-weight">
                            @if (set.weight_used) {
                              {{ set.weight_used }} lbs
                            } @else {
                              -
                            }
                          </span>
                          @if (hasRpe(exercise)) {
                            <span class="set-rpe">
                              @if (set.rpe) {
                                {{ set.rpe }}
                              } @else {
                                -
                              }
                            </span>
                          }
                        </div>
                      }
                    </div>

                    @if (exercise.totalVolume > 0) {
                      <div class="exercise-stats">
                        <div class="stat">
                          <span class="stat-label">Total Volume:</span>
                          <span class="stat-value">{{ exercise.totalVolume }} lbs</span>
                        </div>
                      </div>
                    }
                  </ion-card-content>
                </ion-card>
              }
            }
          </div>
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
    .error-container {
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

    .detail-container {
      padding: 16px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .summary-item ion-icon {
      font-size: 24px;
      color: var(--ion-color-primary, #10B981);
      flex-shrink: 0;
    }

    .summary-content {
      flex: 1;
      min-width: 0;
    }

    .summary-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      font-weight: 500;
    }

    .summary-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .workout-notes {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .workout-notes h3 {
      font-size: 12px;
      font-weight: 600;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
    }

    .workout-notes p {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
      font-style: italic;
      line-height: 1.5;
    }

    .exercises-section {
      margin-top: 20px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 12px 4px;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-card {
      margin: 0 0 12px 0;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .no-data {
      text-align: center;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
      padding: 20px;
      font-size: 14px;
    }

    .sets-table {
      margin-top: 12px;
    }

    .sets-header,
    .set-row {
      display: grid;
      grid-template-columns: 60px 1fr 1fr;
      gap: 12px;
      padding: 8px 0;
      font-size: 14px;
    }

    .sets-header {
      font-weight: 600;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.08);
    }

    .set-row {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .set-row:last-child {
      border-bottom: none;
    }

    .set-number {
      font-weight: 600;
      color: var(--ion-color-primary, #10B981);
      font-family: 'Space Mono', monospace;
    }

    .set-reps,
    .set-weight,
    .set-rpe {
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .exercise-stats {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stat {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-label {
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .stat-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--ion-color-primary, #10B981);
      font-family: 'Space Mono', monospace;
    }
  `]
})
export class WorkoutDetailPage implements OnInit {
  private sessionService = inject(WorkoutSessionService);
  private route = inject(ActivatedRoute);

  // State
  workout = signal<WorkoutWithTemplate | null>(null);
  sets = signal<LoggedSet[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  groupedSets = signal<GroupedExercise[]>([]);

  ngOnInit() {
    const workoutId = this.route.snapshot.paramMap.get('id');
    if (workoutId) {
      this.loadWorkout(workoutId);
    } else {
      this.error.set('Workout ID not provided');
    }
  }

  async loadWorkout(workoutId?: string) {
    const id = workoutId || this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Workout ID not provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.sessionService.getWorkoutDetail(id);

      if (!data) {
        this.error.set('Workout not found');
        return;
      }

      this.workout.set(data.workout);
      this.sets.set(data.sets);
      this.groupSetsByExercise(data.sets);
    } catch (err) {
      this.error.set('Failed to load workout details');
      console.error('Error loading workout:', err);
    } finally {
      this.loading.set(false);
    }
  }

  groupSetsByExercise(sets: LoggedSet[]) {
    const grouped = new Map<string, GroupedExercise>();

    sets.forEach(set => {
      const exerciseId = set.workout_exercise_id;
      if (!grouped.has(exerciseId)) {
        grouped.set(exerciseId, {
          exerciseId,
          exerciseName: 'Exercise',
          sets: [],
          totalVolume: 0,
        });
      }

      const group = grouped.get(exerciseId);
      if (group) {
        group.sets.push(set);

        if (set.weight_used && set.reps_completed) {
          group.totalVolume += set.weight_used * set.reps_completed;
        }
      }
    });

    this.groupedSets.set(Array.from(grouped.values()));
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
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

  hasRpe(exercise: GroupedExercise): boolean {
    return exercise.sets.some((s: LoggedSet) => s.rpe);
  }
}
