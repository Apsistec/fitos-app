import {  Component, inject, signal, computed, OnInit , ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonBackButton,
  IonInput,
  IonTextarea,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonNote,
  IonIcon,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline,
  closeCircle,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import { ExerciseService } from '../../../../core/services/exercise.service';
import { Database } from '@fitos/shared';

type ExerciseCategory = Database['public']['Enums']['exercise_category'];
type MuscleGroup = Database['public']['Enums']['muscle_group'];

const CATEGORIES: { value: ExerciseCategory; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
  { value: 'balance', label: 'Balance' },
  { value: 'plyometric', label: 'Plyometric' },
];

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'forearms', label: 'Forearms' },
  { value: 'core', label: 'Core' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'calves', label: 'Calves' },
  { value: 'full_body', label: 'Full Body' },
];

const COMMON_EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable Machine',
  'Smith Machine',
  'Resistance Bands',
  'Pull-up Bar',
  'Bench',
  'Medicine Ball',
  'TRX',
  'Bodyweight',
  'Machine',
];

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exercise-form',
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonBackButton,
    IonInput,
    IonTextarea,
    IonItem,
    IonList,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonNote,
    IonIcon,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts/exercises"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditMode() ? 'Edit Exercise' : 'New Exercise' }}</ion-title>
        <ion-buttons slot="end">
          @if (isEditMode()) {
            <ion-button color="danger" (click)="deleteExercise()" aria-label="Delete exercise">
              <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="form-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading exercise...</p>
          </div>
        } @else {
          <form [formGroup]="exerciseForm" (ngSubmit)="onSubmit()">
            <!-- Name -->
            <ion-list lines="none">
              <ion-item lines="none">
                <ion-input
                  formControlName="name"
                  type="text"
                  label="Exercise Name"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="e.g., Incline Dumbbell Press"
                  [errorText]="nameError()"
                />
              </ion-item>

              <!-- Category -->
              <ion-item lines="none">
                <ion-select
                  formControlName="category"
                  label="Category"
                  labelPlacement="floating"
                  fill="outline"
                  interface="action-sheet"
                >
                  @for (cat of categories; track cat.value) {
                    <ion-select-option [value]="cat.value">{{ cat.label }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <!-- Primary Muscle -->
              <ion-item lines="none">
                <ion-select
                  formControlName="primaryMuscle"
                  label="Primary Muscle Group"
                  labelPlacement="floating"
                  fill="outline"
                  interface="action-sheet"
                >
                  @for (muscle of muscleGroups; track muscle.value) {
                    <ion-select-option [value]="muscle.value">{{ muscle.label }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <!-- Secondary Muscles -->
              <ion-item lines="none">
                <ion-select
                  formControlName="secondaryMuscles"
                  label="Secondary Muscles"
                  labelPlacement="floating"
                  fill="outline"
                  interface="alert"
                  [multiple]="true"
                >
                  @for (muscle of muscleGroups; track muscle.value) {
                    <ion-select-option [value]="muscle.value">{{ muscle.label }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <!-- Equipment -->
              <ion-item lines="none">
                <ion-select
                  formControlName="equipment"
                  label="Equipment"
                  labelPlacement="floating"
                  fill="outline"
                  interface="alert"
                  [multiple]="true"
                >
                  @for (equip of commonEquipment; track equip) {
                    <ion-select-option [value]="equip">{{ equip }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <!-- Description -->
              <ion-item lines="none">
                <ion-textarea
                  formControlName="description"
                  label="Description"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Brief description of the exercise..."
                  [autoGrow]="true"
                  rows="2"
                  [counter]="true"
                  [maxlength]="200"
                />
              </ion-item>

              <!-- Instructions -->
              <ion-item lines="none">
                <ion-textarea
                  formControlName="instructions"
                  label="Instructions"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Step-by-step instructions..."
                  [autoGrow]="true"
                  rows="4"
                  [counter]="true"
                  [maxlength]="1000"
                />
              </ion-item>

              <!-- Video URL -->
              <ion-item lines="none">
                <ion-input
                  formControlName="videoUrl"
                  type="url"
                  label="Video URL (Optional)"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="https://youtube.com/watch?v=..."
                  helperText="YouTube or Vimeo URL"
                />
              </ion-item>
            </ion-list>

            <!-- Error Message -->
            @if (error()) {
              <ion-note color="danger" class="error-message">
                {{ error() }}
              </ion-note>
            }

            <!-- Submit Button -->
            <div class="form-actions">
              <ion-button
                expand="block"
                type="submit"
                [disabled]="exerciseForm.invalid || saving()"
              >
                @if (saving()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else {
                  <ion-icon name="save-outline" slot="start"></ion-icon>
                  {{ isEditMode() ? 'Update Exercise' : 'Create Exercise' }}
                }
              </ion-button>
            </div>
          </form>
        }
      </div>
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

    .form-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;

      p {
        margin-top: 16px;
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 14px;
      }
    }

    ion-list {
      background: transparent;

      ion-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
        margin-bottom: 16px;
      }
    }

    ion-input, ion-textarea, ion-select {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 8px;
      --highlight-color-focused: var(--ion-color-primary, #10B981);
      font-size: 16px;
    }

    .error-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #FCA5A5;
      font-size: 14px;
    }

    .form-actions {
      margin-top: 24px;
    }

    .form-actions ion-button {
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      font-size: 16px;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
  `],
})
export class ExerciseFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private exerciseService = inject(ExerciseService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // State
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  exerciseId = signal<string | null>(null);

  // Computed
  isEditMode = computed(() => !!this.exerciseId());

  // Form options
  categories = CATEGORIES;
  muscleGroups = MUSCLE_GROUPS;
  commonEquipment = COMMON_EQUIPMENT;

  // Form
  exerciseForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    category: ['strength', Validators.required],
    primaryMuscle: ['chest', Validators.required],
    secondaryMuscles: [[]],
    equipment: [[]],
    description: [''],
    instructions: [''],
    videoUrl: [''],
  });

  // Error messages
  nameError = computed(() => {
    const control = this.exerciseForm.get('name');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Exercise name is required';
    if (control.hasError('minlength')) return 'Name must be at least 3 characters';
    return '';
  });

  constructor() {
    addIcons({
      saveOutline,
      closeCircle,
      addOutline,
      trashOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.exerciseId.set(id);
      await this.loadExercise(id);
    }
  }

  private async loadExercise(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const exercise = await this.exerciseService.getExercise(id);
      if (!exercise) {
        throw new Error('Exercise not found');
      }

      // Can only edit custom exercises
      if (exercise.is_system) {
        throw new Error('Cannot edit system exercises');
      }

      this.exerciseForm.patchValue({
        name: exercise.name,
        category: exercise.category,
        primaryMuscle: exercise.primary_muscle,
        secondaryMuscles: exercise.secondary_muscles || [],
        equipment: exercise.equipment || [],
        description: exercise.description || '',
        instructions: exercise.instructions || '',
        videoUrl: exercise.video_url || '',
      });
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.exerciseForm.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.exerciseForm.value;
    const exerciseData = {
      name: formValue.name,
      category: formValue.category,
      primary_muscle: formValue.primaryMuscle,
      secondary_muscles: formValue.secondaryMuscles,
      equipment: formValue.equipment,
      description: formValue.description || null,
      instructions: formValue.instructions || null,
      video_url: formValue.videoUrl || null,
    };

    try {
      if (this.isEditMode()) {
        const updated = await this.exerciseService.updateExercise(
          this.exerciseId()!,
          exerciseData
        );
        if (!updated) throw new Error('Failed to update exercise');
        await this.showToast('Exercise updated successfully');
      } else {
        const created = await this.exerciseService.createExercise(exerciseData);
        if (!created) throw new Error('Failed to create exercise');
        await this.showToast('Exercise created successfully');
      }

      this.router.navigate(['/tabs/workouts/exercises']);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  async deleteExercise(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Exercise',
      message: 'Are you sure you want to delete this exercise? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            this.saving.set(true);
            const success = await this.exerciseService.deleteExercise(this.exerciseId()!);
            this.saving.set(false);

            if (success) {
              await this.showToast('Exercise deleted');
              this.router.navigate(['/tabs/workouts/exercises']);
            } else {
              this.error.set('Failed to delete exercise');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }
}
