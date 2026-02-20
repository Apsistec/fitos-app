import {  Component, OnInit, OnDestroy, signal, computed, inject , ChangeDetectionStrategy } from '@angular/core';
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
import { checkmarkOutline, closeOutline, addCircleOutline, trashOutline, scanOutline } from 'ionicons/icons';

// Register icons at file level
addIcons({ checkmarkOutline, closeOutline, addCircleOutline, trashOutline, scanOutline });
import { WorkoutSessionService, SetLog } from '../../../../core/services/workout-session.service';
import { AssignmentService } from '../../../../core/services/assignment.service';
import { WorkoutService } from '../../../../core/services/workout.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { RestTimerComponent } from '../../../../shared/components/rest-timer/rest-timer.component';
import { HapticService } from '../../../../core/services/haptic.service';
import { CelebrationService } from '../../../../core/services/celebration.service';
import { VoiceLoggerComponent } from '../../../../shared/components/voice-logger/voice-logger.component';
import { ParsedWorkoutCommand, VoiceService } from '../../../../core/services/voice.service';
import { EquipmentOcrComponent, OcrLogRequest } from '../../components/equipment-ocr/equipment-ocr.component';

interface TemplateExerciseRow {
  id: string;
  order_index?: number | null;
  exercise?: { name: string } | null;
  sets?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
}

interface WorkoutExerciseRow {
  id: string;
  exercise?: { name: string } | null;
  prescribed_sets?: number | null;
  prescribed_reps_min?: number | null;
  prescribed_reps_max?: number | null;
  prescribed_reps?: number | null;
  rest_seconds?: number | null;
}

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    VoiceLoggerComponent,
    EquipmentOcrComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ workoutName() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="completeWorkout()" [disabled]="!canComplete()" aria-label="Complete workout">
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
                <!-- Voice context indicator & switcher -->
                <div class="voice-context-bar">
                  <span class="voice-context-label">Voice mode:</span>
                  <div class="voice-context-chips">
                    <button
                      class="context-chip"
                      [class.active]="voice.currentContext() === 'workout'"
                      (click)="voice.setContext('workout')"
                    >
                      💪 Workout
                    </button>
                    <button
                      class="context-chip"
                      [class.active]="voice.currentContext() === 'nutrition'"
                      (click)="voice.setContext('nutrition')"
                    >
                      🥗 Nutrition
                    </button>
                  </div>
                </div>

                <app-voice-logger
                  (commandParsed)="handleVoiceCommand($event)"
                ></app-voice-logger>
              </div>

              <!-- Equipment OCR -->
              <div class="ocr-section">
                <button class="ocr-toggle" (click)="toggleEquipmentOcr()">
                  <ion-icon name="scan-outline"></ion-icon>
                  <span>{{ showEquipmentOcr() ? 'Hide Scanner' : 'Scan Cardio Equipment' }}</span>
                </button>
                @if (showEquipmentOcr()) {
                  <div class="ocr-container">
                    <app-equipment-ocr
                      [sessionId]="assignedWorkoutId"
                      (logged)="handleOcrLogged($event)"
                    ></app-equipment-ocr>
                  </div>
                }
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
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .workout-progress {
      display: flex;
      justify-content: space-between;
      padding: 8px 16px;
      font-size: 13px;
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
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    .exercise-card {
      margin: 0 0 80px 0;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .exercise-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    ion-card-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .exercise-meta {
      display: flex;
      gap: 24px;
      margin: 16px 0;
      padding: 12px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-item .label {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      font-weight: 600;
      text-transform: uppercase;
    }

    .meta-item .value {
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      font-family: 'Space Mono', monospace;
    }

    .set-indicator {
      text-align: center;
      margin: 24px 0 16px 0;
    }

    .set-indicator h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
    }

    .log-form {
      margin: 16px 0;
      background: transparent;
    }

    .log-form ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
    }

    ion-input {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 8px;
      --highlight-color-focused: var(--ion-color-primary, #10B981);
      font-size: 16px;
    }

    .log-button {
      margin: 24px 0 16px 0;
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      font-size: 16px;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .logged-sets {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid rgba(255, 255, 255, 0.08);
    }

    .logged-sets h4 {
      margin: 0 0 12px 0;
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .set-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .set-number {
      font-weight: 600;
      color: var(--fitos-text-tertiary, #737373);
      font-size: 13px;
    }

    .set-data {
      font-size: 14px;
      color: var(--fitos-text-primary, #F5F5F5);
      font-family: 'Space Mono', monospace;
    }

    .exercise-nav {
      display: flex;
      gap: 8px;
      margin-top: 24px;
    }

    .exercise-nav ion-button {
      flex: 1;
      margin: 0;
      --border-radius: 8px;
      font-weight: 600;
    }

    .voice-logger-container {
      margin: 24px 0;
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* ── Voice context bar ──────────────────────────────────── */
    .voice-context-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .voice-context-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .voice-context-chips {
      display: flex;
      gap: 6px;
    }

    .context-chip {
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: transparent;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms, border-color 150ms, color 150ms;
    }

    .context-chip.active {
      background: var(--ion-color-primary, #10B981);
      border-color: var(--ion-color-primary, #10B981);
      color: #fff;
    }

    /* ── Equipment OCR ─────────────────────────────────────── */
    .ocr-section {
      margin: 0 0 24px 0;
    }

    .ocr-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 10px 16px;
      background: transparent;
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 150ms, color 150ms;
    }

    .ocr-toggle ion-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .ocr-toggle:active {
      border-color: var(--ion-color-primary, #10B981);
      color: var(--ion-color-primary, #10B981);
    }

    .ocr-container {
      margin-top: 12px;
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
  `]
})
export class ActiveWorkoutPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(WorkoutSessionService);
  private assignmentService = inject(AssignmentService);
  private workoutService = inject(WorkoutService);
  private supabase = inject(SupabaseService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private celebration = inject(CelebrationService);
  haptic = inject(HapticService); // Public for template access
  voice = inject(VoiceService);  // Public for template access

  assignedWorkoutId?: string;

  // State
  loading = signal(false);
  workoutName = signal('Workout');
  exercises = signal<ExerciseProgress[]>([]);
  currentExerciseIndex = signal(0);
  showRestTimer = signal(false);
  showEquipmentOcr = signal(false);
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
    this.loading.set(true);

    try {
      if (!this.assignedWorkoutId) return;

      // Load the workout record with its template
      const { data: workout, error: workoutError } = await this.supabase.client
        .from('workouts')
        .select('*, template:workout_templates(*, exercises:workout_template_exercises(*, exercise:exercises(*)))')
        .eq('id', this.assignedWorkoutId)
        .single();

      if (workoutError || !workout) {
        this.showToast('Failed to load workout', 'danger');
        return;
      }

      this.workoutName.set(workout.name || workout.template?.name || 'Workout');

      // Build exercise list from template exercises
      const templateExercises = workout.template?.exercises || [];

      // Sort by order_index
      templateExercises.sort((a: TemplateExerciseRow, b: TemplateExerciseRow) => (a.order_index ?? 0) - (b.order_index ?? 0));

      const exerciseProgress: ExerciseProgress[] = templateExercises.map((te: TemplateExerciseRow) => ({
        exerciseId: te.id, // workout_template_exercise ID for set logging
        exerciseName: te.exercise?.name || 'Unknown Exercise',
        targetSets: te.sets || 3,
        targetReps: te.reps_min && te.reps_max
          ? (te.reps_min === te.reps_max ? `${te.reps_min}` : `${te.reps_min}-${te.reps_max}`)
          : `${te.reps_min || te.reps_max || 10}`,
        restSeconds: te.rest_seconds || 90,
        completedSets: 0,
        currentSet: 1,
        sets: []
      }));

      // If no template exercises, try loading from workout_exercises table
      if (exerciseProgress.length === 0) {
        const { data: workoutExercises } = await this.supabase.client
          .from('workout_exercises')
          .select('*, exercise:exercises(*)')
          .eq('workout_id', this.assignedWorkoutId)
          .order('order_index');

        if (workoutExercises && workoutExercises.length > 0) {
          workoutExercises.forEach((we: WorkoutExerciseRow) => {
            exerciseProgress.push({
              exerciseId: we.id,
              exerciseName: we.exercise?.name || 'Unknown Exercise',
              targetSets: we.prescribed_sets || 3,
              targetReps: we.prescribed_reps_min && we.prescribed_reps_max
                ? `${we.prescribed_reps_min}-${we.prescribed_reps_max}`
                : `${we.prescribed_reps || 10}`,
              restSeconds: we.rest_seconds || 90,
              completedSets: 0,
              currentSet: 1,
              sets: []
            });
          });
        }
      }

      this.exercises.set(exerciseProgress);

      // Load any previously logged sets (for resumed workouts)
      if (workout.status === 'in_progress') {
        const { data: existingSets } = await this.supabase.client
          .from('workout_sets')
          .select('*')
          .eq('workout_id', this.assignedWorkoutId)
          .order('set_number');

        if (existingSets && existingSets.length > 0) {
          this.exercises.update(exercises => {
            const updated = [...exercises];
            for (const set of existingSets) {
              const exerciseIdx = updated.findIndex(e => e.exerciseId === set.workout_exercise_id);
              if (exerciseIdx >= 0) {
                updated[exerciseIdx].sets.push({
                  exerciseId: set.workout_exercise_id,
                  setNumber: set.set_number,
                  reps: set.reps_completed || 0,
                  weight: set.weight_used || undefined,
                  rpe: set.rpe || undefined,
                });
                updated[exerciseIdx].completedSets = updated[exerciseIdx].sets.length;
                updated[exerciseIdx].currentSet = updated[exerciseIdx].completedSets + 1;
              }
            }
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Error loading workout:', error);
      this.showToast('Error loading workout', 'danger');
    } finally {
      this.loading.set(false);
    }
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

    // currentReps is guaranteed non-null after canLogSet() check
    const reps = this.currentReps as number;

    const setLog: SetLog = {
      exerciseId: exercise.exerciseId,
      setNumber: exercise.currentSet,
      reps,
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
        reps,
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
              // Navigate to workout complete page for celebration
              this.router.navigate(['/tabs/workouts/complete', this.assignedWorkoutId]);
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

  async showToast(message: string, color = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Toggle equipment OCR panel
   */
  toggleEquipmentOcr(): void {
    this.haptic.light();
    this.showEquipmentOcr.update(v => !v);
  }

  /**
   * Handle confirmed OCR result from EquipmentOcrComponent.
   * Maps parsed cardio data to a workout note and collapses the scanner.
   */
  async handleOcrLogged(request: OcrLogRequest): Promise<void> {
    await this.haptic.success();
    this.showEquipmentOcr.set(false);

    // Build a human-readable summary to attach as a note on the session
    const p = request.result.parsed;
    const parts: string[] = [`[${request.equipmentType}]`];
    if (p.duration_seconds != null) {
      const m = Math.floor(p.duration_seconds / 60);
      const s = p.duration_seconds % 60;
      parts.push(`${m}:${String(s).padStart(2, '0')}`);
    }
    if (p.distance_km != null)   parts.push(`${p.distance_km} km`);
    if (p.calories != null)      parts.push(`${p.calories} cal`);
    if (p.heart_rate != null)    parts.push(`${p.heart_rate} bpm`);

    const summary = parts.join(' · ');
    this.showToast(`Cardio logged: ${summary}`, 'success');
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
