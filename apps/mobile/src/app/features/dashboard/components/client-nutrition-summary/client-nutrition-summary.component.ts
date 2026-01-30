import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule} from '@ionic/angular';
import { RouterLink } from '@angular/router';

export interface NutritionSummary {
  calories: { consumed: number; target: number };
  protein: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  fat: { consumed: number; target: number };
}

@Component({
  selector: 'app-client-nutrition-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, RouterLink],
  template: `
    @if (summary(); as summary) {
      <ion-card class="nutrition-card">
        <ion-card-header>
          <div class="header-content">
            <ion-card-title>Today's Nutrition</ion-card-title>
            <ion-button fill="clear" size="small" routerLink="/tabs/nutrition" aria-label="Add food">
              <ion-icon slot="icon-only" name="add"></ion-icon>
            </ion-button>
          </div>
        </ion-card-header>

        <ion-card-content>
          <!-- Calories -->
          <div class="macro-item primary">
            <div class="macro-header">
              <span class="macro-label">Calories</span>
              <span class="macro-values" [class.over-target]="isOverTarget(summary.calories.consumed, summary.calories.target)">
                {{ summary.calories.consumed }} / {{ summary.calories.target }}
              </span>
            </div>
            <div class="progress-bar-wrapper">
              <div
                class="progress-bar progress-calories"
                [class.over-target]="isOverTarget(summary.calories.consumed, summary.calories.target)"
                [style.width.%]="getProgressPercentage(summary.calories.consumed, summary.calories.target)">
              </div>
            </div>
          </div>

          <!-- Macros -->
          <div class="macros-grid">
            <div class="macro-item">
              <div class="macro-header">
                <span class="macro-label">Protein</span>
                <span class="macro-values" [class.over-target]="isOverTarget(summary.protein.consumed, summary.protein.target)">
                  {{ summary.protein.consumed }}g / {{ summary.protein.target }}g
                </span>
              </div>
              <div class="progress-bar-wrapper">
                <div
                  class="progress-bar progress-protein"
                  [class.over-target]="isOverTarget(summary.protein.consumed, summary.protein.target)"
                  [style.width.%]="getProgressPercentage(summary.protein.consumed, summary.protein.target)">
                </div>
              </div>
            </div>

            <div class="macro-item">
              <div class="macro-header">
                <span class="macro-label">Carbs</span>
                <span class="macro-values" [class.over-target]="isOverTarget(summary.carbs.consumed, summary.carbs.target)">
                  {{ summary.carbs.consumed }}g / {{ summary.carbs.target }}g
                </span>
              </div>
              <div class="progress-bar-wrapper">
                <div
                  class="progress-bar progress-carbs"
                  [class.over-target]="isOverTarget(summary.carbs.consumed, summary.carbs.target)"
                  [style.width.%]="getProgressPercentage(summary.carbs.consumed, summary.carbs.target)">
                </div>
              </div>
            </div>

            <div class="macro-item">
              <div class="macro-header">
                <span class="macro-label">Fat</span>
                <span class="macro-values" [class.over-target]="isOverTarget(summary.fat.consumed, summary.fat.target)">
                  {{ summary.fat.consumed }}g / {{ summary.fat.target }}g
                </span>
              </div>
              <div class="progress-bar-wrapper">
                <div
                  class="progress-bar progress-fat"
                  [class.over-target]="isOverTarget(summary.fat.consumed, summary.fat.target)"
                  [style.width.%]="getProgressPercentage(summary.fat.consumed, summary.fat.target)">
                </div>
              </div>
            </div>
          </div>

          <ion-button expand="block" fill="outline" routerLink="/tabs/nutrition" class="view-button">
            View Details
          </ion-button>
        </ion-card-content>
      </ion-card>
    } @else {
      <ion-card class="empty-card">
        <ion-card-content class="empty-content">
          <ion-icon name="nutrition-outline" class="empty-icon"></ion-icon>
          <h3>No Nutrition Data</h3>
          <p>Start logging your meals to track your nutrition.</p>
          <ion-button fill="outline" routerLink="/tabs/nutrition">
            Log Meal
          </ion-button>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: [`
    .nutrition-card {
      margin: 0;
      max-width: 800px;
      width: 100%;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;

      ion-card-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      ion-button {
        --color: var(--ion-color-primary, #10B981);
      }
    }

    .macro-item {
      margin-bottom: 14px;

      &.primary {
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 16px;
      }
    }

    .macro-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .macro-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .macro-values {
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);

      &.over-target {
        color: var(--fitos-nutrition-over, #8B5CF6);
        font-weight: 600;
      }
    }

    .macros-grid {
      display: grid;
      gap: 12px;
    }

    /* Custom progress bars with adherence-neutral colors */
    .progress-bar-wrapper {
      width: 100%;
      height: 6px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.3s ease;

      &.over-target {
        background: var(--fitos-nutrition-over, #8B5CF6) !important;
      }
    }

    .progress-calories {
      background: var(--fitos-nutrition-calories, #10B981);
    }

    .progress-protein {
      background: var(--fitos-nutrition-protein, #6366F1);
    }

    .progress-carbs {
      background: var(--fitos-nutrition-carbs, #F59E0B);
    }

    .progress-fat {
      background: var(--fitos-nutrition-fat, #EC4899);
    }

    .view-button {
      margin-top: 14px;
      --border-radius: 8px;
      --border-color: rgba(255, 255, 255, 0.1);
      --color: var(--fitos-text-primary, #F5F5F5);
      font-weight: 600;
      font-size: 14px;
      height: 40px;
    }

    .empty-card {
      margin: 0;
      max-width: 800px;
      width: 100%;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .empty-content {
      text-align: center;
      padding: 32px 16px;

      .empty-icon {
        font-size: 48px;
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        margin-bottom: 20px;
        font-size: 14px;
      }

      ion-button {
        --border-radius: 8px;
        --border-color: rgba(255, 255, 255, 0.1);
        font-weight: 600;
      }
    }
  `],
})
export class ClientNutritionSummaryComponent {
  summary = input<NutritionSummary | null>();

  /**
   * Returns progress percentage capped at 100%
   * Adherence-neutral: over-target values are shown differently via CSS, not capped
   */
  getProgressPercentage(consumed: number, target: number): number {
    if (target === 0) return 0;
    const percentage = (consumed / target) * 100;
    return Math.min(percentage, 100);
  }

  /**
   * Checks if value is over target (>110% for tolerance)
   * Used to apply purple color for over-target values
   */
  isOverTarget(consumed: number, target: number): boolean {
    if (target === 0) return false;
    return consumed / target > 1.1;
  }
}
