import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
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
  IonInput,
  IonText,
  IonBadge,
  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline, addCircleOutline, trashOutline } from 'ionicons/icons';

// Register icons at file level
addIcons({ checkmarkOutline, closeOutline, addCircleOutline, trashOutline });
import { WorkoutSessionService, SetLog } from '../../../../core/services/workout-session.service';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { RestTimerComponent } from '../../../../shared/components/rest-timer/rest-timer.component';
import { HapticService } from '../../../../core/services/haptic.service';
import { VoiceLoggerComponent } from '../../../../shared/components/voice-logger/voice-logger.component';
import { ParsedWorkoutCommand } from '../../../../core/services/voice.service';

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
  standalone: true,
  selector: 'app-active-workout',
  imports: [

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
    IonInput,
    IonText,
    IonBadge,
    IonSpinner,
    RestTimerComponent,
    VoiceLoggerComponent
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
                <ion-item lines="none">
                  <ion-input
                    type="number"
                    [(ngModel)]="currentReps"
                    label="Reps"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="{{ currentExercise()!.targetReps }}"
                    helperText="Number of repetitions completed"
                    min="0"
                  />
                </ion-item>

                <ion-item lines="none">
                  <ion-input
                    type="number"
                    [(ngModel)]="currentWeight"
                    label="Weight (lbs)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="0"
                    helperText="Weight used for this set"
                    min="0"
                    step="2.5"
                  />
                </ion-item>

                <ion-item lines="none">
                  <ion-input
                    type="number"
                    [(ngModel)]="currentRpe"
                    label="RPE (1-10)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="7"
                    helperText="Rate of Perceived Exertion (1=easy, 10=max)"
                    min="1"
                    max="10"
                  />
                </ion-item>
              </ion-list>

              <ion-button
                expand="block"
                (click)="haptic.light(); logSet()"
                [disabled]="!canLogSet()"
                class="log-button"
              >
                <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                Log Set
              </ion-button>

              <!-- Voice Logger -->
              <div class="voice-logger-container">
                <app-voice-logger
                  (commandParsed)="handleVoiceCommand($event)"
                ></app-voice-logger>
              </div>

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
                  <ion-button fill="outline" (click)="haptic.light(); previousExercise()">
                    Previous Exercise
                  </ion-button>
                }
                @if (currentExercise()!.completedSets >= currentExercise()!.targetSets) {
                  <ion-button
                    [fill]="currentExerciseIndex() < exercises().length - 1 ? 'solid' : 'outline'"
                    (click)="haptic.light(); nextExercise()"
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

    .voice-logger-container {
      margin: 24px 0;
      padding: 16px;
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-lg);
      border: 1px solid var(--fitos-border-subtle);
    }
  `]
})
export class ActiveWorkoutPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(WorkoutSessionService);
  private assignmentService = inject(AssignmentService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private haptic = inject(HapticService);

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

  // Track last set for repeat command
  lastSet: { reps: number; weight?: number; rpe?: number } | null = null;

  // Computed
  currentExercise = computed(() => {
    const exercises = this.exercises();
    const index = this.currentExerciseIndex();
    return exercises[index] || null;
  });

  private timerInterval?: number;

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
      // Haptic feedback on set completion
      await this.haptic.success();

      // Update local state
      this.exercises.update(exercises => {
        const updated = [...exercises];
        const current = updated[this.currentExerciseIndex()];
        current.sets.push(setLog);
        current.completedSets++;
        current.currentSet++;
        return updated;
      });

      // Store last set for repeat command
      this.lastSet = {
        reps: this.currentReps!,
        weight: this.currentWeight || undefined,
        rpe: this.currentRpe || undefined
      };

      // Reset form
      this.currentReps = null;
      this.currentWeight = null;
      this.currentRpe = null;

      // Show rest timer if more sets remaining
      if (exercise.completedSets + 1 < exercise.targetSets) {
        this.restTime.set(exercise.restSeconds);
        this.showRestTimer.set(true);
      } else {
        // Exercise complete - heavy haptic
        await this.haptic.heavy();
        this.showToast('Exercise complete!', 'success');
      }
    } else {
      await this.haptic.error();
      this.showToast('Failed to log set', 'danger');
    }
  }

  async onRestComplete() {
    await this.haptic.warning(); // Alert user rest is over
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
              // Heavy haptic on workout completion
              await this.haptic.heavy();
              this.showToast('Workout completed!', 'success');
              this.router.navigate(['/tabs/dashboard']);
            } else {
              await this.haptic.error();
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

  /**
   * Handle voice commands from VoiceLoggerComponent
   */
  async handleVoiceCommand(command: ParsedWorkoutCommand): Promise<void> {
    await this.haptic.light();

    switch (command.type) {
      case 'log_set':
        if (command.reps) {
          this.currentReps = command.reps;
          this.currentWeight = command.weight || null;
          // Auto-submit if we have complete data
          if (this.canLogSet()) {
            await this.logSet();
          }
        }
        break;

      case 'repeat':
        if (this.lastSet) {
          this.currentReps = this.lastSet.reps;
          this.currentWeight = this.lastSet.weight || null;
          this.currentRpe = this.lastSet.rpe || null;
          // Auto-submit the repeated set
          if (this.canLogSet()) {
            await this.logSet();
          }
        } else {
          this.showToast('No previous set to repeat', 'warning');
        }
        break;

      case 'skip':
        this.nextExercise();
        break;

      case 'next':
        this.nextExercise();
        break;

      case 'rest':
        if (command.duration) {
          this.restTime.set(command.duration);
          this.showRestTimer.set(true);
        }
        break;

      case 'done':
        await this.completeWorkout();
        break;

      case 'unknown':
        this.showToast('Command not recognized. Try "10 reps at 185" or "repeat"', 'warning');
        break;
    }
  }
}
