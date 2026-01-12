import { Component, inject, signal, input, output, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonText,
  IonInput,
  IonSegment,
  IonSegmentButton,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  timeOutline,
  trendingUpOutline,
  flashOutline,
  checkmarkCircleOutline,
  addOutline,
  removeOutline,
} from 'ionicons/icons';
import { HapticService } from '@app/core/services/haptic.service';

export interface ExerciseSuggestion {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  restSeconds: number;
  reason: string; // AI explanation for suggestion
  confidence: number; // 0-1
}

export interface QuickLogTemplate {
  id: string;
  name: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: number;
    weight?: number;
  }>;
  lastUsed?: Date;
  useCount: number;
}

export interface SmartDefault {
  exerciseId: string;
  suggestedWeight: number;
  suggestedReps: number;
  suggestedSets: number;
  progression: 'increase' | 'maintain' | 'deload';
  progressionReason: string;
}

/**
 * SmartLogWorkoutComponent - AI-powered workout logging
 *
 * Features:
 * - Exercise suggestions based on workout plan and history
 * - Progressive overload recommendations
 * - Quick-log templates for common workouts
 * - Context-aware defaults (auto-fills based on last session)
 * - Rest timer suggestions
 * - Form tips and cues
 * - Voice logging integration
 */
@Component({
  selector: 'app-smart-log-workout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel,
    IonText,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="smart-log-container">
      <!-- Quick Log Templates -->
      @if (quickTemplates().length > 0 && !selectedTemplate()) {
        <ion-card class="templates-card">
          <ion-card-header>
            <div class="card-header-with-icon">
              <ion-icon name="flash-outline"></ion-icon>
              <ion-card-title>Quick Log Templates</ion-card-title>
            </div>
          </ion-card-header>
          <ion-card-content>
            <div class="template-chips">
              @for (template of quickTemplates(); track template.id) {
                <ion-chip (click)="selectTemplate(template)" class="template-chip">
                  <ion-label>{{ template.name }}</ion-label>
                  <ion-badge slot="end">{{ template.exercises.length }}</ion-badge>
                </ion-chip>
              }
            </div>
            <ion-text color="medium">
              <p class="hint-text">Tap a template to quickly log a common workout</p>
            </ion-text>
          </ion-card-content>
        </ion-card>
      }

      <!-- AI Exercise Suggestions -->
      @if (exerciseSuggestions().length > 0 && viewMode() === 'suggestions') {
        <ion-card class="suggestions-card">
          <ion-card-header>
            <div class="card-header-with-icon">
              <ion-icon name="sparkles-outline"></ion-icon>
              <ion-card-title>AI Suggestions</ion-card-title>
            </div>
          </ion-card-header>
          <ion-card-content>
            @for (suggestion of exerciseSuggestions(); track suggestion.exerciseId) {
              <div class="suggestion-item">
                <div class="suggestion-header">
                  <h3>{{ suggestion.exerciseName }}</h3>
                  <ion-badge [color]="getConfidenceColor(suggestion.confidence)">
                    {{ formatConfidence(suggestion.confidence) }}% confident
                  </ion-badge>
                </div>

                <div class="suggestion-details">
                  <div class="detail-row">
                    <span class="detail-label">Suggested:</span>
                    <span class="detail-value">
                      {{ suggestion.sets }} × {{ suggestion.reps }}
                      @if (suggestion.weight) {
                        @ {{ suggestion.weight }} lbs
                      }
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Rest:</span>
                    <span class="detail-value">{{ formatRestTime(suggestion.restSeconds) }}</span>
                  </div>
                </div>

                <div class="suggestion-reason">
                  <ion-icon name="sparkles-outline"></ion-icon>
                  <p>{{ suggestion.reason }}</p>
                </div>

                <ion-button
                  expand="block"
                  fill="outline"
                  (click)="acceptSuggestion(suggestion)"
                >
                  <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
                  Use This Suggestion
                </ion-button>
              </div>
            }
          </ion-card-content>
        </ion-card>
      }

      <!-- Smart Defaults for Exercise -->
      @if (smartDefaults().length > 0 && viewMode() === 'defaults') {
        <ion-card class="defaults-card">
          <ion-card-header>
            <div class="card-header-with-icon">
              <ion-icon name="trending-up-outline"></ion-icon>
              <ion-card-title>Progressive Overload</ion-card-title>
            </div>
          </ion-card-header>
          <ion-card-content>
            @for (default of smartDefaults(); track default.exerciseId) {
              <div class="default-item">
                <div class="default-header">
                  <h3>{{ getExerciseName(default.exerciseId) }}</h3>
                  <ion-badge [color]="getProgressionColor(default.progression)">
                    {{ default.progression }}
                  </ion-badge>
                </div>

                <div class="default-metrics">
                  <div class="metric-chip">
                    <span class="metric-label">Weight:</span>
                    <span class="metric-value">{{ default.suggestedWeight }} lbs</span>
                  </div>
                  <div class="metric-chip">
                    <span class="metric-label">Reps:</span>
                    <span class="metric-value">{{ default.suggestedReps }}</span>
                  </div>
                  <div class="metric-chip">
                    <span class="metric-label">Sets:</span>
                    <span class="metric-value">{{ default.suggestedSets }}</span>
                  </div>
                </div>

                <div class="progression-reason">
                  <ion-text color="medium">
                    <p>{{ default.progressionReason }}</p>
                  </ion-text>
                </div>
              </div>
            }
          </ion-card-content>
        </ion-card>
      }

      <!-- View Mode Toggle -->
      @if (exerciseSuggestions().length > 0 || smartDefaults().length > 0) {
        <ion-segment [(ngModel)]="viewMode" (ionChange)="onViewModeChange()">
          <ion-segment-button value="suggestions">
            <ion-icon name="sparkles-outline"></ion-icon>
            <ion-label>Suggestions</ion-label>
          </ion-segment-button>
          <ion-segment-button value="defaults">
            <ion-icon name="trending-up-outline"></ion-icon>
            <ion-label>Progressive Overload</ion-label>
          </ion-segment-button>
        </ion-segment>
      }

      <!-- Quick Actions -->
      <div class="quick-actions">
        <ion-button expand="block" (click)="startVoiceLog()">
          <ion-icon slot="start" name="mic-outline"></ion-icon>
          Voice Log Workout
        </ion-button>
        <ion-button expand="block" fill="outline" (click)="manualLog()">
          Manual Entry
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .smart-log-container {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-4);
    }

    .card-header-with-icon {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);

      ion-icon {
        font-size: 24px;
        color: var(--fitos-accent-primary);
      }

      ion-card-title {
        margin: 0;
      }
    }

    .templates-card {
      background: linear-gradient(135deg, var(--fitos-bg-secondary) 0%, var(--fitos-bg-tertiary) 100%);
    }

    .template-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--fitos-space-2);
      margin-bottom: var(--fitos-space-3);
    }

    .template-chip {
      cursor: pointer;
      transition: all var(--fitos-duration-fast);

      &:active {
        transform: scale(0.95);
      }

      ion-badge {
        margin-left: var(--fitos-space-2);
      }
    }

    .hint-text {
      margin: 0;
      font-size: var(--fitos-text-xs);
      font-style: italic;
    }

    .suggestions-card,
    .defaults-card {
      border: 1px solid var(--fitos-border-subtle);
    }

    .suggestion-item,
    .default-item {
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-lg);
      margin-bottom: var(--fitos-space-3);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .suggestion-header,
    .default-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--fitos-space-3);

      h3 {
        margin: 0;
        font-size: var(--fitos-text-lg);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      ion-badge {
        font-size: var(--fitos-text-xs);
      }
    }

    .suggestion-details {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-2);
      margin-bottom: var(--fitos-space-3);

      .detail-row {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-2);

        .detail-label {
          font-size: var(--fitos-text-sm);
          font-weight: 600;
          color: var(--fitos-text-secondary);
          min-width: 80px;
        }

        .detail-value {
          font-size: var(--fitos-text-base);
          font-weight: 700;
          color: var(--fitos-text-primary);
        }
      }
    }

    .suggestion-reason {
      display: flex;
      gap: var(--fitos-space-2);
      padding: var(--fitos-space-3);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: var(--fitos-radius-md);
      margin-bottom: var(--fitos-space-3);

      ion-icon {
        font-size: 16px;
        color: var(--ion-color-primary);
        flex-shrink: 0;
        margin-top: 2px;
      }

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
        line-height: 1.5;
        color: var(--fitos-text-primary);
      }
    }

    .default-metrics {
      display: flex;
      gap: var(--fitos-space-2);
      flex-wrap: wrap;
      margin-bottom: var(--fitos-space-3);

      .metric-chip {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-1);
        padding: var(--fitos-space-2) var(--fitos-space-3);
        background: var(--fitos-bg-secondary);
        border-radius: var(--fitos-radius-md);

        .metric-label {
          font-size: var(--fitos-text-xs);
          font-weight: 600;
          color: var(--fitos-text-secondary);
        }

        .metric-value {
          font-size: var(--fitos-text-base);
          font-weight: 700;
          color: var(--fitos-text-primary);
        }
      }
    }

    .progression-reason {
      padding: var(--fitos-space-2) 0;

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
        line-height: 1.5;
      }
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary);
      margin: var(--fitos-space-4) 0;

      ion-segment-button {
        --indicator-color: var(--fitos-accent-primary);
        --color: var(--fitos-text-secondary);
        --color-checked: var(--fitos-accent-primary);
        min-height: 48px;
      }
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-2);
      margin-top: var(--fitos-space-4);

      ion-button {
        margin: 0;
      }
    }
  `],
})
export class SmartLogWorkoutComponent implements OnInit {
  private haptic = inject(HapticService);

  // Inputs
  workoutPlanId = input<string | undefined>(undefined);
  userId = input.required<string>();

  // Outputs
  suggestionAccepted = output<ExerciseSuggestion>();
  templateSelected = output<QuickLogTemplate>();
  voiceLogStarted = output<void>();
  manualLogStarted = output<void>();

  // State
  exerciseSuggestions = signal<ExerciseSuggestion[]>([]);
  smartDefaults = signal<SmartDefault[]>([]);
  quickTemplates = signal<QuickLogTemplate[]>([]);
  selectedTemplate = signal<QuickLogTemplate | null>(null);
  viewMode = signal<'suggestions' | 'defaults'>('suggestions');

  constructor() {
    addIcons({
      sparklesOutline,
      timeOutline,
      trendingUpOutline,
      flashOutline,
      checkmarkCircleOutline,
      addOutline,
      removeOutline,
    });
  }

  ngOnInit(): void {
    this.loadSmartData();
  }

  async loadSmartData(): Promise<void> {
    // Load exercise suggestions
    await this.loadExerciseSuggestions();

    // Load smart defaults
    await this.loadSmartDefaults();

    // Load quick templates
    await this.loadQuickTemplates();
  }

  async loadExerciseSuggestions(): Promise<void> {
    // TODO: Call AI backend for personalized suggestions
    // Mock data for now
    const mockSuggestions: ExerciseSuggestion[] = [
      {
        exerciseId: 'bench_press',
        exerciseName: 'Barbell Bench Press',
        sets: 4,
        reps: 8,
        weight: 190,
        restSeconds: 180,
        reason: 'Based on your last session (185 lbs × 8), you\'re ready to progress. Increase by 5 lbs while maintaining form.',
        confidence: 0.92,
      },
      {
        exerciseId: 'squat',
        exerciseName: 'Back Squat',
        sets: 4,
        reps: 6,
        weight: 225,
        restSeconds: 240,
        reason: 'Your strength trend shows consistent progress. This weight targets your 6RM range effectively.',
        confidence: 0.88,
      },
    ];

    this.exerciseSuggestions.set(mockSuggestions);
  }

  async loadSmartDefaults(): Promise<void> {
    // TODO: Calculate based on workout history and progression rules
    // Mock data for now
    const mockDefaults: SmartDefault[] = [
      {
        exerciseId: 'bench_press',
        suggestedWeight: 190,
        suggestedReps: 8,
        suggestedSets: 4,
        progression: 'increase',
        progressionReason: 'You\'ve hit 3 consecutive sessions at 185 lbs. Time to progress!',
      },
      {
        exerciseId: 'deadlift',
        suggestedWeight: 315,
        suggestedReps: 5,
        suggestedSets: 3,
        progression: 'maintain',
        progressionReason: 'Focus on perfecting form at this weight before increasing.',
      },
    ];

    this.smartDefaults.set(mockDefaults);
  }

  async loadQuickTemplates(): Promise<void> {
    // TODO: Load from user's most-used workout combinations
    // Mock data for now
    const mockTemplates: QuickLogTemplate[] = [
      {
        id: 'template_1',
        name: 'Push Day',
        exercises: [
          { exerciseId: 'bench_press', exerciseName: 'Bench Press', sets: 4, reps: 8, weight: 185 },
          { exerciseId: 'ohp', exerciseName: 'Overhead Press', sets: 3, reps: 10, weight: 95 },
          { exerciseId: 'tricep_dips', exerciseName: 'Tricep Dips', sets: 3, reps: 12 },
        ],
        lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        useCount: 24,
      },
      {
        id: 'template_2',
        name: 'Pull Day',
        exercises: [
          { exerciseId: 'deadlift', exerciseName: 'Deadlift', sets: 3, reps: 5, weight: 315 },
          { exerciseId: 'pullups', exerciseName: 'Pull-ups', sets: 4, reps: 10 },
          { exerciseId: 'rows', exerciseName: 'Barbell Rows', sets: 4, reps: 8, weight: 135 },
        ],
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        useCount: 22,
      },
      {
        id: 'template_3',
        name: 'Leg Day',
        exercises: [
          { exerciseId: 'squat', exerciseName: 'Back Squat', sets: 4, reps: 6, weight: 225 },
          { exerciseId: 'leg_press', exerciseName: 'Leg Press', sets: 3, reps: 12, weight: 360 },
          { exerciseId: 'lunges', exerciseName: 'Walking Lunges', sets: 3, reps: 10 },
        ],
        lastUsed: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        useCount: 20,
      },
    ];

    this.quickTemplates.set(mockTemplates);
  }

  async selectTemplate(template: QuickLogTemplate): Promise<void> {
    await this.haptic.light();
    this.selectedTemplate.set(template);
    this.templateSelected.emit(template);
  }

  async acceptSuggestion(suggestion: ExerciseSuggestion): Promise<void> {
    await this.haptic.success();
    this.suggestionAccepted.emit(suggestion);
  }

  onViewModeChange(): void {
    this.haptic.light();
  }

  async startVoiceLog(): Promise<void> {
    await this.haptic.light();
    this.voiceLogStarted.emit();
  }

  async manualLog(): Promise<void> {
    await this.haptic.light();
    this.manualLogStarted.emit();
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'primary';
    return 'warning';
  }

  getProgressionColor(progression: 'increase' | 'maintain' | 'deload'): string {
    const colors = {
      increase: 'success',
      maintain: 'primary',
      deload: 'warning',
    };
    return colors[progression];
  }

  formatConfidence(confidence: number): number {
    return Math.round(confidence * 100);
  }

  formatRestTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }

  getExerciseName(exerciseId: string): string {
    // TODO: Look up from exercise database
    return exerciseId.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
