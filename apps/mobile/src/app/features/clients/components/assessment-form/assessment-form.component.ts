import {
  Component,
  OnInit,
  Input,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonRange,
  IonTextarea,
  IonBadge,
  IonList,
  IonSpinner,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  saveOutline,
  informationCircleOutline,
} from 'ionicons/icons';

import { AutonomyService } from '../../../../core/services/autonomy.service';
import {
  WorkoutKnowledge,
  NutritionKnowledge,
  BehaviorConsistency,
  CreateAssessmentInput,
} from '../../../../core/services/autonomy.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * AssessmentFormComponent - Modal for creating/editing autonomy assessments
 *
 * Provides category-by-category scoring interface with:
 * - Sliders for each score (0-100)
 * - Real-time overall score calculation
 * - Readiness level preview
 * - Evidence/notes fields
 * - Recommended action display
 */
@Component({
  selector: 'app-assessment-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonRange,
    IonTextarea,
    IonBadge,
    IonList,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Autonomy Assessment</ion-title>
        <ion-button slot="end" fill="clear" (click)="close()">
          <ion-icon slot="icon-only" name="close-outline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="assessment-form">
        <!-- Preview Card -->
        <ion-card class="preview-card">
          <ion-card-content>
            <div class="score-preview">
              <div class="score-number">{{ overallScore() }}</div>
              <div class="score-label">
                <ion-badge [color]="readinessColor()">
                  {{ readinessLevel() }}
                </ion-badge>
                <p class="recommended-action">{{ recommendedAction() }}</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Workout Knowledge (35% weight) -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              Workout Knowledge
              <ion-badge color="primary">35% Weight</ion-badge>
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-label position="stacked">
                  Form & Technique
                  <p class="help-text">Demonstrates proper form without constant correction</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="workoutKnowledge.form"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="primary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ workoutKnowledge.form }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Periodization Understanding
                  <p class="help-text">Knows when to deload, progress, or modify volume</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="workoutKnowledge.periodization"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="primary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ workoutKnowledge.periodization }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Workout Modification
                  <p class="help-text">Can adapt workouts for equipment, time, or recovery</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="workoutKnowledge.modification"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="primary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ workoutKnowledge.modification }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Exercise Selection
                  <p class="help-text">Chooses appropriate exercises for goals</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="workoutKnowledge.exercise_selection"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="primary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ workoutKnowledge.exercise_selection }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Nutrition Knowledge (25% weight) -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              Nutrition Knowledge
              <ion-badge color="secondary">25% Weight</ion-badge>
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-label position="stacked">
                  Tracking Accuracy
                  <p class="help-text">Logs food with correct portions and timing</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="nutritionKnowledge.tracking_accuracy"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="secondary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ nutritionKnowledge.tracking_accuracy }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Portion Estimation
                  <p class="help-text">Estimates servings without constant measuring</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="nutritionKnowledge.portion_estimation"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="secondary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ nutritionKnowledge.portion_estimation }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Nutritional Flexibility
                  <p class="help-text">Makes smart swaps and adjustments as needed</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="nutritionKnowledge.flexibility"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="secondary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ nutritionKnowledge.flexibility }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Meal Planning
                  <p class="help-text">Plans meals ahead to meet targets</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="nutritionKnowledge.meal_planning"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="secondary"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ nutritionKnowledge.meal_planning }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Behavior Consistency (40% weight) -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              Behavior Consistency
              <ion-badge color="success">40% Weight</ion-badge>
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-label position="stacked">
                  90-Day Workout Adherence
                  <p class="help-text">Consistency over last 3 months</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="behaviorConsistency.workout_90d"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="success"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ behaviorConsistency.workout_90d }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  90-Day Nutrition Tracking
                  <p class="help-text">Nutrition logging consistency</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="behaviorConsistency.nutrition_90d"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="success"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ behaviorConsistency.nutrition_90d }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Self-Initiated Actions
                  <p class="help-text">Proactively makes adjustments without prompting</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="behaviorConsistency.self_initiated"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="success"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ behaviorConsistency.self_initiated }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  Recovery Awareness
                  <p class="help-text">Recognizes fatigue and adjusts intensity</p>
                </ion-label>
                <ion-range
                  [(ngModel)]="behaviorConsistency.recovery_awareness"
                  [min]="0"
                  [max]="100"
                  [step]="5"
                  [pin]="true"
                  color="success"
                  (ionChange)="onScoreChange()"
                />
                <ion-label slot="end">{{ behaviorConsistency.recovery_awareness }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Notes -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Notes (Optional)</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-textarea
              [(ngModel)]="notes"
              placeholder="Add any notes about this assessment..."
              rows="4"
              [counter]="true"
              maxlength="1000"
            />
          </ion-card-content>
        </ion-card>

        <!-- Actions -->
        <div class="actions">
          <ion-button
            expand="block"
            size="large"
            (click)="saveAssessment()"
            [disabled]="saving()"
          >
            @if (saving()) {
              <ion-spinner slot="start" />
              Saving...
            } @else {
              <ion-icon slot="start" name="save-outline" />
              Save Assessment
            }
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .assessment-form {
        padding: 16px;
        max-width: 800px;
        margin: 0 auto;
        padding-bottom: 48px;
      }

      .preview-card {
        margin-bottom: 16px;
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
      }

      .score-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 12px 0;
      }

      .score-number {
        font-size: 64px;
        font-weight: 700;
        line-height: 1;
        font-family: 'Space Mono', monospace;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .score-label {
        text-align: left;

        ion-badge {
          margin-bottom: 8px;
          font-size: 13px;
        }

        .recommended-action {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
          font-weight: 500;
        }
      }

      ion-card {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
      }

      ion-card-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);

        ion-badge {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }
      }

      ion-list {
        background: transparent;
      }

      ion-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .help-text {
        font-size: 11px;
        color: var(--fitos-text-tertiary, #737373);
        margin: 4px 0 0 0;
        font-style: italic;
      }

      ion-range {
        padding: 8px 0;
      }

      .actions {
        margin-top: 16px;

        ion-button {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
      }
    `,
  ],
})
export class AssessmentFormComponent implements OnInit {
  @Input() clientId = '';

  private autonomyService = inject(AutonomyService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  // Form state
  workoutKnowledge: WorkoutKnowledge = {
    form: 0,
    periodization: 0,
    modification: 0,
    exercise_selection: 0,
  };

  nutritionKnowledge: NutritionKnowledge = {
    tracking_accuracy: 0,
    portion_estimation: 0,
    flexibility: 0,
    meal_planning: 0,
  };

  behaviorConsistency: BehaviorConsistency = {
    workout_90d: 0,
    nutrition_90d: 0,
    self_initiated: 0,
    recovery_awareness: 0,
  };

  notes = '';
  saving = signal(false);

  // Computed values
  overallScore = signal(0);
  readinessLevel = signal<string>('LEARNING');
  readinessColor = signal<string>('medium');
  recommendedAction = signal<string>('Continue current approach');

  constructor() {
    addIcons({
      closeOutline,
      saveOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    // Initial calculation
    this.onScoreChange();
  }

  onScoreChange(): void {
    const score = this.autonomyService.calculateScore(
      this.workoutKnowledge,
      this.nutritionKnowledge,
      this.behaviorConsistency
    );

    this.overallScore.set(score);

    const level = this.autonomyService.getReadinessLevel(score);
    this.readinessLevel.set(level.toUpperCase());

    // Set color based on level
    if (score >= 80) {
      this.readinessColor.set('success');
    } else if (score >= 65) {
      this.readinessColor.set('warning');
    } else if (score >= 40) {
      this.readinessColor.set('primary');
    } else {
      this.readinessColor.set('medium');
    }

    // Set recommended action
    const action = this.autonomyService.getRecommendedAction(level);
    switch (action) {
      case 'offer_graduation':
        this.recommendedAction.set('🎉 Ready for graduation!');
        break;
      case 'reduce_frequency':
        this.recommendedAction.set('Consider reducing check-in frequency');
        break;
      case 'increase_independence':
        this.recommendedAction.set('Give more autonomy');
        break;
      default:
        this.recommendedAction.set('Continue current approach');
    }
  }

  async saveAssessment(): Promise<void> {
    this.saving.set(true);

    try {
      const trainerId = this.authService.user()?.id;
      if (!trainerId) {
        throw new Error('No trainer ID found');
      }

      const input: CreateAssessmentInput = {
        client_id: this.clientId,
        workout_knowledge: this.workoutKnowledge,
        nutrition_knowledge: this.nutritionKnowledge,
        behavior_consistency: this.behaviorConsistency,
        notes: this.notes || undefined,
      };

      const assessment = await this.autonomyService.createAssessment(
        trainerId,
        input
      );

      if (!assessment) {
        throw new Error('Failed to create assessment');
      }

      await this.showToast('Assessment saved successfully!', 'success');
      this.modalCtrl.dismiss(assessment, 'saved');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save assessment';
      await this.showToast(errorMessage, 'danger');
      console.error('Error saving assessment:', err);
    } finally {
      this.saving.set(false);
    }
  }

  close(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
