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
            <ion-button fill="clear" size="small" routerLink="/tabs/nutrition">
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
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .macro-item {
      margin-bottom: 1rem;

      &.primary {
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--fitos-border-subtle);
        margin-bottom: 1.5rem;
      }
    }

    .macro-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .macro-label {
      font-weight: 500;
      color: var(--fitos-text-primary);
    }

    .macro-values {
      font-family: var(--fitos-font-mono);
      font-size: 0.9rem;
      color: var(--fitos-text-secondary);

      &.over-target {
        color: var(--fitos-nutrition-over);
        font-weight: 600;
      }
    }

    .macros-grid {
      display: grid;
      gap: 1rem;
    }

    /* Custom progress bars with adherence-neutral colors */
    .progress-bar-wrapper {
      width: 100%;
      height: 8px;
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-full);
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      border-radius: var(--fitos-radius-full);
      transition: width 0.3s var(--fitos-ease-default);

      &.over-target {
        background: var(--fitos-nutrition-over) !important;
      }
    }

    .progress-calories {
      background: var(--fitos-nutrition-calories);
    }

    .progress-protein {
      background: var(--fitos-nutrition-protein);
    }

    .progress-carbs {
      background: var(--fitos-nutrition-carbs);
    }

    .progress-fat {
      background: var(--fitos-nutrition-fat);
    }

    .view-button {
      margin-top: 1rem;
    }

    .empty-card {
      margin: 0;
      max-width: 800px;
      width: 100%;
    }

    .empty-content {
      text-align: center;
      padding: 2rem 1rem;

      .empty-icon {
        font-size: 4rem;
        color: var(--ion-color-medium);
        margin-bottom: 1rem;
      }

      h3 {
        margin: 0 0 0.5rem 0;
        color: var(--fitos-text-primary);
      }

      p {
        color: var(--fitos-text-secondary);
        margin-bottom: 1.5rem;
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
