import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonInput,
  IonTextarea,
  IonItem,
  IonSpinner,
  IonText,
  IonModal,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, saveOutline, searchOutline } from 'ionicons/icons';

// Register icons at file level
addIcons({ addOutline, saveOutline, searchOutline });
import { WorkoutService, ExerciseConfiguration } from '../../../../core/services/workout.service';
import { ExerciseService } from '../../../../core/services/exercise.service';
import { ExerciseConfigComponent, ExerciseConfig } from '../../../../shared/components/exercise-config/exercise-config.component';
import { ExerciseCardComponent } from '../../../../shared/components/exercise-card/exercise-card.component';
import { Database } from '@fitos/shared';

type Exercise = Database['public']['Tables']['exercises']['Row'];

@Component({
  selector: 'app-workout-builder',
  imports: [

    FormsModule,
    DragDropModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon,
    IonInput,
    IonTextarea,
    IonItem,
    IonSpinner,
    IonText,
    IonModal,
    ExerciseConfigComponent,
    ExerciseCardComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditMode() ? 'Edit Workout' : 'New Workout' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="saveWorkout()" [disabled]="saving() || !canSave()">
            @if (saving()) {
              <ion-spinner name="circular"></ion-spinner>
            } @else {
              <ion-icon slot="icon-only" name="save-outline"></ion-icon>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading workout...</p>
        </div>
      } @else {
        <div class="builder-container">
          <!-- Workout Metadata -->
          <div class="metadata-section">
            <ion-item lines="none">
              <ion-input
                [(ngModel)]="workoutName"
                type="text"
                label="Workout Name"
                labelPlacement="floating"
                fill="outline"
                placeholder="e.g., Upper Body Push"
                helperText="Required - Enter a descriptive name"
                required
              />
            </ion-item>

            <ion-item lines="none">
              <ion-textarea
                [(ngModel)]="workoutDescription"
                label="Description"
                labelPlacement="floating"
                fill="outline"
                placeholder="Add notes about this workout..."
                helperText="Optional - Add workout notes or instructions"
                [autoGrow]="true"
                rows="3"
              />
            </ion-item>

            @if (exercises().length > 0) {
              <div class="estimated-duration">
                <ion-text color="medium">
                  <small>
                    Estimated Duration: {{ formatDuration(calculateDuration()) }}
                  </small>
                </ion-text>
              </div>
            }
          </div>

          <!-- Exercises List -->
          <div class="exercises-section">
            <div class="section-header">
              <h3>Exercises ({{ exercises().length }})</h3>
              <ion-button (click)="openExercisePicker()">
                <ion-icon slot="start" name="add-outline"></ion-icon>
                Add Exercise
              </ion-button>
            </div>

            @if (exercises().length === 0) {
              <div class="empty-state">
                <p>No exercises added yet</p>
                <ion-button fill="outline" (click)="openExercisePicker()">
                  <ion-icon slot="start" name="add-outline"></ion-icon>
                  Add First Exercise
                </ion-button>
              </div>
            } @else {
              <div
                cdkDropList
                class="exercises-list"
                (cdkDropListDropped)="drop($event)"
              >
                @for (exercise of exercises(); track exercise.id) {
                  <div cdkDrag class="draggable-item">
                    <app-exercise-config
                      [config]="exercise"
                      (configChange)="onExerciseConfigChange($event)"
                      (remove)="removeExercise(exercise.id!)"
                    ></app-exercise-config>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Exercise Picker Modal -->
      <ion-modal
        [isOpen]="showExercisePicker()"
        (didDismiss)="closeExercisePicker()"
      >
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Add Exercise</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="closeExercisePicker()">Close</ion-button>
              </ion-buttons>
            </ion-toolbar>
            <ion-toolbar>
              <ion-input
                [(ngModel)]="exerciseSearchQuery"
                (ngModelChange)="searchExercises()"
                type="search"
                label="Search"
                labelPlacement="floating"
                fill="outline"
                placeholder="Search exercises..."
                helperText="Search by name or muscle group"
                debounce="300"
              >
                <ion-icon slot="start" name="search-outline"></ion-icon>
              </ion-input>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <div class="exercise-picker-content">
              @if (exerciseService.loading()) {
                <div class="loading-container">
                  <ion-spinner></ion-spinner>
                </div>
              } @else if (exerciseService.filteredExercises().length === 0) {
                <div class="empty-state">
                  <p>No exercises found</p>
                </div>
              } @else {
                @for (exercise of exerciseService.filteredExercises(); track exercise.id) {
                  <app-exercise-card
                    [exercise]="exercise"
                    [showAddButton]="true"
                    (addClick)="addExercise($event)"
                  ></app-exercise-card>
                }
              }
            </div>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [`
    .builder-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 16px;
    }

    .metadata-section {
      margin-bottom: 24px;
    }

    .estimated-duration {
      padding: 8px 16px;
      text-align: right;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .exercises-section {
      margin-bottom: 24px;
    }

    .exercises-list {
      min-height: 100px;
    }

    .draggable-item {
      cursor: move;
    }

    .cdk-drag-preview {
      opacity: 0.8;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .exercises-list.cdk-drop-list-dragging .draggable-item:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      text-align: center;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      font-size: 1.1rem;
      margin-bottom: 16px;
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

    .exercise-picker-content {
      padding: 16px;
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
    }
  `]
})
export class WorkoutBuilderPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workoutService = inject(WorkoutService);
  exerciseService = inject(ExerciseService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // State
  workoutName = '';
  workoutDescription = '';
  exercises = signal<ExerciseConfig[]>([]);
  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);
  templateId?: string;

  // Exercise picker
  showExercisePicker = signal(false);
  exerciseSearchQuery = '';

  async ngOnInit() {
    // Load exercises for picker
    await this.exerciseService.loadExercises();

    // Check if editing existing template
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.templateId = id;
      this.isEditMode.set(true);
      await this.loadTemplate(id);
    }
  }

  async loadTemplate(id: string) {
    this.loading.set(true);

    const template = await this.workoutService.loadTemplate(id);
    if (template) {
      this.workoutName = template.name;
      this.workoutDescription = template.description || '';

      // Convert template exercises to ExerciseConfig
      const configs: ExerciseConfig[] = template.exercises.map((ex: any, index) => ({
        id: `${ex.id}`,
        exerciseId: ex.exercise_id,
        exercise: ex.exercise,
        order: index,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.rest_seconds,
        notes: ex.notes || undefined,
        rpe: ex.rpe_target || undefined,
        tempo: ex.tempo || undefined
      }));

      this.exercises.set(configs);
    }

    this.loading.set(false);
  }

  openExercisePicker() {
    this.showExercisePicker.set(true);
  }

  closeExercisePicker() {
    this.showExercisePicker.set(false);
    this.exerciseSearchQuery = '';
    this.exerciseService.clearFilters();
  }

  searchExercises() {
    this.exerciseService.setFilters({
      searchQuery: this.exerciseSearchQuery || undefined
    });
  }

  addExercise(exercise: Exercise) {
    const newConfig: ExerciseConfig = {
      id: `temp-${Date.now()}`,
      exerciseId: exercise.id,
      exercise: exercise,
      order: this.exercises().length,
      sets: 3,
      reps: '10',
      restSeconds: 90
    };

    this.exercises.update(exercises => [...exercises, newConfig]);
    this.closeExercisePicker();

    this.showToast('Exercise added');
  }

  removeExercise(id: string) {
    this.exercises.update(exercises =>
      exercises
        .filter(ex => ex.id !== id)
        .map((ex, index) => ({ ...ex, order: index }))
    );
  }

  onExerciseConfigChange(config: ExerciseConfig) {
    this.exercises.update(exercises =>
      exercises.map(ex => ex.id === config.id ? config : ex)
    );
  }

  drop(event: CdkDragDrop<ExerciseConfig[]>) {
    const exercises = [...this.exercises()];
    moveItemInArray(exercises, event.previousIndex, event.currentIndex);

    // Update order indices
    exercises.forEach((ex, index) => {
      ex.order = index;
    });

    this.exercises.set(exercises);
  }

  calculateDuration(): number {
    return this.exercises().reduce((total, ex) => {
      let reps = 10;
      if (ex.reps.includes('-')) {
        const [min, max] = ex.reps.split('-').map(Number);
        reps = (min + max) / 2;
      } else if (!isNaN(Number(ex.reps))) {
        reps = Number(ex.reps);
      }

      const workTime = ex.sets * reps * 3;
      const restTime = ex.sets * ex.restSeconds;

      return total + workTime + restTime;
    }, 0);
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  canSave(): boolean {
    return this.workoutName.trim().length > 0 && this.exercises().length > 0;
  }

  async saveWorkout() {
    if (!this.canSave()) {
      this.showToast('Please add a name and at least one exercise', 'warning');
      return;
    }

    this.saving.set(true);

    try {
      const exerciseConfigs: ExerciseConfiguration[] = this.exercises().map(ex => ({
        exerciseId: ex.exerciseId,
        order: ex.order,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        notes: ex.notes,
        rpe: ex.rpe,
        tempo: ex.tempo
      }));

      let result;
      if (this.isEditMode() && this.templateId) {
        result = await this.workoutService.updateTemplate(
          this.templateId,
          this.workoutName.trim(),
          this.workoutDescription.trim() || null,
          exerciseConfigs
        );
      } else {
        result = await this.workoutService.createTemplate(
          this.workoutName.trim(),
          this.workoutDescription.trim() || null,
          exerciseConfigs
        );
      }

      if (result) {
        this.showToast(`Workout ${this.isEditMode() ? 'updated' : 'created'} successfully!`, 'success');
        this.router.navigate(['/tabs/workouts']);
      } else {
        this.showToast('Failed to save workout', 'danger');
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      this.showToast('An error occurred while saving', 'danger');
    } finally {
      this.saving.set(false);
    }
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
