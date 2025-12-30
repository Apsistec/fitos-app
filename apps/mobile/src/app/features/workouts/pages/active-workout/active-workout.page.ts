import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonText,
  IonBadge,
  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline, addCircleOutline, trashOutline } from 'ionicons/icons';
import { WorkoutSessionService, SetLog } from '../../../../core/services/workout-session.service';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { RestTimerComponent } from '../../../../shared/components/rest-timer/rest-timer.component';

interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  completedSets: number;
  currentSet: number;
  sets: SetLog[];
}

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonText,
    IonBadge,
    IonSpinner,
    RestTimerComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ workoutName() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="completeWorkout()" [disabled]="!canComplete()">
            <ion-icon slot="icon-only" name="checkmark-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <div class="workout-progress">
          <ion-text color="medium">
            <small>Exercise {{ currentExerciseIndex() + 1 }} of {{ exercises().length }}</small>
          </ion-text>
          <ion-text color="primary">
            <small>{{ formatDuration(elapsedTime()) }}</small>
          </ion-text>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading workout...</p>
        </div>
      } @else if (currentExercise()) {
        <div class="workout-container">
          <!-- Current Exercise Card -->
          <ion-card class="exercise-card">
            <ion-card-header>
              <div class="exercise-header">
                <ion-card-title>{{ currentExercise()!.exerciseName }}</ion-card-title>
                <ion-badge [color]="getProgressColor(currentExercise()!)">
                  {{ currentExercise()!.completedSets }} / {{ currentExercise()!.targetSets }} sets
                </ion-badge>
              </div>
            </ion-card-header>

            <ion-card-content>
              <div class="exercise-meta">
                <div class="meta-item">
                  <span class="label">Target:</span>
                  <span class="value">{{ currentExercise()!.targetSets }} × {{ currentExercise()!.targetReps }}</span>
                </div>
                <div class="meta-item">
                  <span class="label">Rest:</span>
                  <span class="value">{{ currentExercise()!.restSeconds }}s</span>
                </div>
              </div>

              <!-- Set Number Indicator -->
              <div class="set-indicator">
                <ion-text color="primary">
                  <h3>Set {{ currentExercise()!.currentSet }}</h3>
                </ion-text>
              </div>

              <!-- Log Set Form -->
              <ion-list class="log-form">
                <ion-item>
                  <ion-label position="stacked">Reps</ion-label>
                  <ion-input
                    type="number"
                    [(ngModel)]="currentReps"
                    placeholder="{{ currentExercise()!.targetReps }}"
                    min="0"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label position="stacked">Weight (lbs)</ion-label>
                  <ion-input
                    type="number"
                    [(ngModel)]="currentWeight"
                    placeholder="0"
                    min="0"
                    step="2.5"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label position="stacked">RPE (1-10)</ion-label>
                  <ion-input
                    type="number"
                    [(ngModel)]="currentRpe"
                    placeholder="7"
                    min="1"
                    max="10"
                  ></ion-input>
                </ion-item>
              </ion-list>

              <ion-button
                expand="block"
                (click)="logSet()"
                [disabled]="!canLogSet()"
                class="log-button"
              >
                <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                Log Set
              </ion-button>

              <!-- Logged Sets -->
              @if (currentExercise()!.sets.length > 0) {
                <div class="logged-sets">
                  <h4>Logged Sets</h4>
                  @for (set of currentExercise()!.sets; track set.setNumber) {
                    <div class="set-row">
                      <span class="set-number">Set {{ set.setNumber }}</span>
                      <span class="set-data">
                        {{ set.reps }} reps
                        @if (set.weight) {
                          × {{ set.weight }} lbs
                        }
                        @if (set.rpe) {
                          · RPE {{ set.rpe }}
                        }
                      </span>
                    </div>
                  }
                </div>
              }

              <!-- Navigation Buttons -->
              <div class="exercise-nav">
                @if (currentExerciseIndex() > 0) {
                  <ion-button fill="outline" (click)="previousExercise()">
                    Previous Exercise
                  </ion-button>
                }
                @if (currentExercise()!.completedSets >= currentExercise()!.targetSets) {
                  <ion-button
                    [fill]="currentExerciseIndex() < exercises().length - 1 ? 'solid' : 'outline'"
                    (click)="nextExercise()"
                  >
                    {{ currentExerciseIndex() < exercises().length - 1 ? 'Next Exercise' : 'Finish' }}
                  </ion-button>
                }
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      }

      <!-- Rest Timer -->
      @if (showRestTimer()) {
        <app-rest-timer
          [restSeconds]="restTime()"
          (complete)="onRestComplete()"
          (skip)="onRestSkip()"
        ></app-rest-timer>
      }
    </ion-content>
  `,
  styles: [`
    .workout-progress {
      display: flex;
      justify-content: space-between;
      padding: 8px 16px;
    }

    .workout-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--ion-color-medium);
    }

    .exercise-card {
      margin: 0 0 80px 0;
    }

    .exercise-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .exercise-meta {
      display: flex;
      gap: 24px;
      margin: 16px 0;
      padding: 12px 0;
      border-top: 1px solid var(--ion-color-light);
      border-bottom: 1px solid var(--ion-color-light);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-item .label {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      font-weight: 600;
    }

    .meta-item .value {
      font-size: 1rem;
      font-weight: 500;
    }

    .set-indicator {
      text-align: center;
      margin: 24px 0 16px 0;
    }

    .set-indicator h3 {
      margin: 0;
      font-size: 1.5rem;
    }

    .log-form {
      margin: 16px 0;
    }

    .log-form ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
    }

    .log-button {
      margin: 24px 0 16px 0;
    }

    .logged-sets {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid var(--ion-color-light);
    }

    .logged-sets h4 {
      margin: 0 0 12px 0;
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .set-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--ion-color-light);
    }

    .set-number {
      font-weight: 600;
      color: var(--ion-color-medium);
    }

    .set-data {
      font-size: 0.9rem;
    }

    .exercise-nav {
      display: flex;
      gap: 8px;
      margin-top: 24px;
    }

    .exercise-nav ion-button {
      flex: 1;
      margin: 0;
    }
  `]
})
export class ActiveWorkoutPage implements OnInit, OnDestroy {
  assignedWorkoutId?: string;

  // State
  loading = signal(false);
  workoutName = signal('Workout');
  exercises = signal<ExerciseProgress[]>([]);
  currentExerciseIndex = signal(0);
  showRestTimer = signal(false);
  restTime = signal(90);
  elapsedTime = signal(0);

  // Form fields
  currentReps: number | null = null;
  currentWeight: number | null = null;
  currentRpe: number | null = null;

  // Computed
  currentExercise = computed(() => {
    const exercises = this.exercises();
    const index = this.currentExerciseIndex();
    return exercises[index] || null;
  });

  private timerInterval?: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: WorkoutSessionService,
    private assignmentService: AssignmentService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ checkmarkOutline, closeOutline, addCircleOutline, trashOutline });
  }

  async ngOnInit() {
    this.assignedWorkoutId = this.route.snapshot.paramMap.get('id') || undefined;

    if (this.assignedWorkoutId) {
      await this.loadWorkout();
      await this.startSession();
      this.startTimer();
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  async loadWorkout() {
    // Load assignment details
    // For now, mock data - in production would load from AssignmentService
    this.workoutName.set('Upper Body Push');
    this.exercises.set([
      {
        exerciseId: '1',
        exerciseName: 'Barbell Bench Press',
        targetSets: 4,
        targetReps: '8-10',
        restSeconds: 120,
        completedSets: 0,
        currentSet: 1,
        sets: []
      },
      {
        exerciseId: '2',
        exerciseName: 'Dumbbell Press',
        targetSets: 3,
        targetReps: '10-12',
        restSeconds: 90,
        completedSets: 0,
        currentSet: 1,
        sets: []
      }
    ]);
  }

  async startSession() {
    if (!this.assignedWorkoutId) return;

    const session = await this.sessionService.startSession(this.assignedWorkoutId);
    if (!session) {
      this.showToast('Failed to start workout', 'danger');
    }
  }

  canLogSet(): boolean {
    return this.currentReps !== null && this.currentReps > 0;
  }

  async logSet() {
    const exercise = this.currentExercise();
    if (!exercise || !this.canLogSet()) return;

    const setLog: SetLog = {
      exerciseId: exercise.exerciseId,
      setNumber: exercise.currentSet,
      reps: this.currentReps!,
      weight: this.currentWeight || undefined,
      rpe: this.currentRpe || undefined
    };

    const result = await this.sessionService.logSet(setLog);

    if (result) {
      // Update local state
      this.exercises.update(exercises => {
        const updated = [...exercises];
        const current = updated[this.currentExerciseIndex()];
        current.sets.push(setLog);
        current.completedSets++;
        current.currentSet++;
        return updated;
      });

      // Reset form
      this.currentReps = null;
      this.currentWeight = null;
      this.currentRpe = null;

      // Show rest timer if more sets remaining
      if (exercise.completedSets + 1 < exercise.targetSets) {
        this.restTime.set(exercise.restSeconds);
        this.showRestTimer.set(true);
      } else {
        this.showToast('Exercise complete!', 'success');
      }
    } else {
      this.showToast('Failed to log set', 'danger');
    }
  }

  onRestComplete() {
    this.showRestTimer.set(false);
    this.showToast('Rest complete!');
  }

  onRestSkip() {
    this.showRestTimer.set(false);
  }

  previousExercise() {
    if (this.currentExerciseIndex() > 0) {
      this.currentExerciseIndex.update(i => i - 1);
    }
  }

  nextExercise() {
    if (this.currentExerciseIndex() < this.exercises().length - 1) {
      this.currentExerciseIndex.update(i => i + 1);
    } else {
      this.completeWorkout();
    }
  }

  canComplete(): boolean {
    return this.exercises().every(e => e.completedSets > 0);
  }

  async completeWorkout() {
    const alert = await this.alertController.create({
      header: 'Complete Workout',
      message: 'Are you ready to finish this workout?',
      inputs: [
        {
          name: 'rating',
          type: 'number',
          placeholder: 'Rate your workout (1-10)',
          min: 1,
          max: 10
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Notes (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Finish',
          handler: async (data) => {
            const success = await this.sessionService.completeSession(
              data.rating ? parseInt(data.rating) : undefined,
              data.notes || undefined
            );

            if (success) {
              this.showToast('Workout completed!', 'success');
              this.router.navigate(['/tabs/dashboard']);
            } else {
              this.showToast('Failed to complete workout', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getProgressColor(exercise: ExerciseProgress): string {
    const progress = exercise.completedSets / exercise.targetSets;
    if (progress >= 1) return 'success';
    if (progress >= 0.5) return 'warning';
    return 'medium';
  }

  startTimer() {
    this.timerInterval = window.setInterval(() => {
      this.elapsedTime.update(t => t + 1);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
