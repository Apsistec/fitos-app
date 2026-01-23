import {
  Component,
  Input,
  ChangeDetectionStrategy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonProgressBar,
  IonBadge,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  schoolOutline,
  checkmarkCircleOutline,
  timeOutline,
  sparklesOutline,
} from 'ionicons/icons';

import {
  AutonomyAssessment,
  ReadinessLevel,
} from '../../../../core/services/autonomy.service';

interface ReadinessConfig {
  label: string;
  color: string;
  icon: string;
  description: string;
}

/**
 * AutonomyIndicatorComponent - Visual display of client independence readiness
 *
 * Shows:
 * - Overall autonomy score with progress bar
 * - Readiness level badge
 * - Category breakdowns (workout, nutrition, behavior)
 * - Trend indicator
 * - Next assessment date
 */
@Component({
  selector: 'app-autonomy-indicator',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonProgressBar,
    IonBadge,
    IonIcon
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="autonomy-indicator-card">
      <ion-card-header>
        <div class="header-content">
          <div>
            <ion-card-title>
              <ion-icon name="trending-up-outline" />
              Independence Readiness
            </ion-card-title>
            @if (assessment) {
              <ion-card-subtitle>
                Last assessed {{ formatDate(assessment.assessed_at) }}
              </ion-card-subtitle>
            }
          </div>
          @if (assessment) {
            <ion-badge [color]="readinessConfig().color">
              {{ readinessConfig().label }}
            </ion-badge>
          }
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (assessment) {
          <!-- Overall Score -->
          <div class="score-section">
            <div class="score-header">
              <span class="score-label">Overall Score</span>
              <span class="score-value">{{ assessment.overall_score }}/100</span>
            </div>
            <ion-progress-bar
              [value]="assessment.overall_score / 100"
              [color]="getProgressColor(assessment.overall_score)"
            />
            <p class="score-description">{{ readinessConfig().description }}</p>
          </div>

          <!-- Category Breakdown -->
          <div class="categories">
            <h4>Category Scores</h4>

            <!-- Behavior Consistency (40% weight) -->
            <div class="category-item">
              <div class="category-header">
                <span class="category-name">
                  <ion-icon name="checkmark-circle-outline" />
                  Behavior Consistency
                </span>
                <span class="category-weight">40%</span>
              </div>
              <div class="category-scores">
                <div class="score-chip">
                  Workout: {{ assessment.behavior_consistency.workout_90d }}
                </div>
                <div class="score-chip">
                  Nutrition: {{ assessment.behavior_consistency.nutrition_90d }}
                </div>
                <div class="score-chip">
                  Self-Initiated:
                  {{ assessment.behavior_consistency.self_initiated }}
                </div>
              </div>
            </div>

            <!-- Workout Knowledge (35% weight) -->
            <div class="category-item">
              <div class="category-header">
                <span class="category-name">
                  <ion-icon name="barbell-outline" />
                  Workout Knowledge
                </span>
                <span class="category-weight">35%</span>
              </div>
              <div class="category-scores">
                <div class="score-chip">
                  Form: {{ assessment.workout_knowledge.form }}
                </div>
                <div class="score-chip">
                  Periodization: {{ assessment.workout_knowledge.periodization }}
                </div>
                <div class="score-chip">
                  Modification: {{ assessment.workout_knowledge.modification }}
                </div>
              </div>
            </div>

            <!-- Nutrition Knowledge (25% weight) -->
            <div class="category-item">
              <div class="category-header">
                <span class="category-name">
                  <ion-icon name="nutrition-outline" />
                  Nutrition Knowledge
                </span>
                <span class="category-weight">25%</span>
              </div>
              <div class="category-scores">
                <div class="score-chip">
                  Tracking: {{ assessment.nutrition_knowledge.tracking_accuracy }}
                </div>
                <div class="score-chip">
                  Portions: {{ assessment.nutrition_knowledge.portion_estimation }}
                </div>
                <div class="score-chip">
                  Flexibility: {{ assessment.nutrition_knowledge.flexibility }}
                </div>
              </div>
            </div>
          </div>

          <!-- Next Assessment -->
          @if (assessment.next_assessment_at) {
            <div class="next-assessment">
              <ion-icon name="time-outline" />
              <span>
                Next assessment due
                {{ formatDate(assessment.next_assessment_at) }}
              </span>
            </div>
          }

          <!-- Notes -->
          @if (assessment.notes) {
            <div class="notes">
              <h4>Notes</h4>
              <p>{{ assessment.notes }}</p>
            </div>
          }
        } @else {
          <!-- No Assessment Yet -->
          <div class="empty-state">
            <ion-icon name="school-outline" />
            <h3>No Assessment Yet</h3>
            <p>
              Track this client's progress toward independence by creating their
              first autonomy assessment.
            </p>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .autonomy-indicator-card {
        margin: 0 0 var(--fitos-space-4) 0;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--fitos-space-3);

        ion-card-title {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-lg);
          margin-bottom: var(--fitos-space-1);

          ion-icon {
            font-size: 20px;
            color: var(--fitos-accent-primary);
          }
        }

        ion-badge {
          font-size: var(--fitos-font-size-sm);
          padding: 6px 12px;
          border-radius: 12px;
        }
      }

      .score-section {
        margin-bottom: var(--fitos-space-5);
      }

      .score-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--fitos-space-2);

        .score-label {
          font-size: var(--fitos-font-size-base);
          font-weight: 600;
          color: var(--fitos-text-primary);
        }

        .score-value {
          font-size: var(--fitos-font-size-2xl);
          font-weight: 700;
          color: var(--fitos-accent-primary);
        }
      }

      ion-progress-bar {
        height: 12px;
        border-radius: 6px;
        margin-bottom: var(--fitos-space-2);
      }

      .score-description {
        font-size: var(--fitos-font-size-sm);
        color: var(--fitos-text-secondary);
        margin: 0;
        font-style: italic;
      }

      .categories {
        h4 {
          font-size: var(--fitos-font-size-sm);
          font-weight: 600;
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-3) 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .category-item {
        padding: var(--fitos-space-3);
        background: var(--fitos-bg-secondary);
        border-radius: var(--fitos-border-radius);
        margin-bottom: var(--fitos-space-3);

        &:last-child {
          margin-bottom: var(--fitos-space-4);
        }
      }

      .category-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--fitos-space-2);

        .category-name {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-sm);
          font-weight: 600;
          color: var(--fitos-text-primary);

          ion-icon {
            font-size: 16px;
            color: var(--fitos-accent-primary);
          }
        }

        .category-weight {
          font-size: var(--fitos-font-size-xs);
          color: var(--fitos-text-tertiary);
          background: var(--fitos-bg-tertiary);
          padding: 2px 8px;
          border-radius: 8px;
        }
      }

      .category-scores {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fitos-space-2);
      }

      .score-chip {
        font-size: var(--fitos-font-size-xs);
        padding: 4px 10px;
        background: var(--fitos-bg-primary);
        border: 1px solid var(--fitos-border-color);
        border-radius: 12px;
        color: var(--fitos-text-secondary);
      }

      .next-assessment {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-2);
        padding: var(--fitos-space-3);
        background: var(--fitos-bg-secondary);
        border-radius: var(--fitos-border-radius);
        font-size: var(--fitos-font-size-sm);
        color: var(--fitos-text-secondary);
        margin-bottom: var(--fitos-space-4);

        ion-icon {
          font-size: 18px;
          color: var(--fitos-accent-primary);
          flex-shrink: 0;
        }
      }

      .notes {
        padding-top: var(--fitos-space-4);
        border-top: 1px solid var(--fitos-border-color);

        h4 {
          font-size: var(--fitos-font-size-sm);
          font-weight: 600;
          color: var(--fitos-text-primary);
          margin: 0 0 var(--fitos-space-2) 0;
        }

        p {
          font-size: var(--fitos-font-size-sm);
          color: var(--fitos-text-secondary);
          margin: 0;
          line-height: 1.5;
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--fitos-space-8) var(--fitos-space-4);
        min-height: 200px;

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-3);
        }

        h3 {
          font-size: var(--fitos-font-size-lg);
          font-weight: 600;
          color: var(--fitos-text-primary);
          margin: 0 0 var(--fitos-space-2) 0;
        }

        p {
          font-size: var(--fitos-font-size-sm);
          color: var(--fitos-text-secondary);
          margin: 0;
          max-width: 400px;
          line-height: 1.5;
        }
      }
    `,
  ],
})
export class AutonomyIndicatorComponent {
  @Input() assessment: AutonomyAssessment | null = null;

  // Readiness level configurations
  private readonly readinessConfigs: Record<ReadinessLevel, ReadinessConfig> = {
    learning: {
      label: 'Learning',
      color: 'medium',
      icon: 'school-outline',
      description:
        'Building foundational knowledge and establishing consistent habits.',
    },
    progressing: {
      label: 'Progressing',
      color: 'primary',
      icon: 'trending-up-outline',
      description:
        'Developing independence with increasing confidence and competence.',
    },
    near_ready: {
      label: 'Near Ready',
      color: 'warning',
      icon: 'sparkles-outline',
      description:
        'Demonstrating strong independence. Consider reducing coaching frequency.',
    },
    ready: {
      label: 'Ready',
      color: 'success',
      icon: 'checkmark-circle-outline',
      description:
        'Fully capable of independent training. Ready for graduation to maintenance mode.',
    },
  };

  // Computed readiness config
  readinessConfig = computed<ReadinessConfig>(() => {
    if (!this.assessment) {
      return this.readinessConfigs.learning;
    }
    return this.readinessConfigs[this.assessment.readiness_level];
  });

  constructor() {
    addIcons({
      trendingUpOutline,
      schoolOutline,
      checkmarkCircleOutline,
      timeOutline,
      sparklesOutline,
    });
  }

  getProgressColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 65) return 'warning';
    if (score >= 40) return 'primary';
    return 'medium';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return 'last month';

    // Future dates
    if (diffDays < 0) {
      const futureDays = Math.abs(diffDays);
      if (futureDays <= 7) return `in ${futureDays} days`;
      if (futureDays <= 30) return `in ${Math.floor(futureDays / 7)} weeks`;
      return `in ${Math.floor(futureDays / 30)} months`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
