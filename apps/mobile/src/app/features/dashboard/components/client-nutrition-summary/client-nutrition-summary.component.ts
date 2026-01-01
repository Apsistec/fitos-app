import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
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
              <span class="macro-values">
                {{ summary.calories.consumed }} / {{ summary.calories.target }}
              </span>
            </div>
            <ion-progress-bar
              [value]="summary.calories.consumed / summary.calories.target"
              [color]="getProgressColor(summary.calories.consumed, summary.calories.target)"
            ></ion-progress-bar>
          </div>

          <!-- Macros -->
          <div class="macros-grid">
            <div class="macro-item">
              <div class="macro-header">
                <span class="macro-label">Protein</span>
                <span class="macro-values">
                  {{ summary.protein.consumed }}g / {{ summary.protein.target }}g
                </span>
              </div>
              <ion-progress-bar
                [value]="summary.protein.consumed / summary.protein.target"
                [color]="getProgressColor(summary.protein.consumed, summary.protein.target)"
              ></ion-progress-bar>
            </div>

            <div class="macro-item">
              <div class="macro-header">
                <span class="macro-label">Carbs</span>
                <span class="macro-values">
                  {{ summary.carbs.consumed }}g / {{ summary.carbs.target }}g
                </span>
              </div>
              <ion-progress-bar
                [value]="summary.carbs.consumed / summary.carbs.target"
                [color]="getProgressColor(summary.carbs.consumed, summary.carbs.target)"
              ></ion-progress-bar>
            </div>

            <div class="macro-item">
              <div class="macro-header">
                <span class="macro-label">Fat</span>
                <span class="macro-values">
                  {{ summary.fat.consumed }}g / {{ summary.fat.target }}g
                </span>
              </div>
              <ion-progress-bar
                [value]="summary.fat.consumed / summary.fat.target"
                [color]="getProgressColor(summary.fat.consumed, summary.fat.target)"
              ></ion-progress-bar>
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
        border-bottom: 1px solid var(--ion-color-light);
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
      color: var(--ion-color-dark);
    }

    .macro-values {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
    }

    .macros-grid {
      display: grid;
      gap: 1rem;
    }

    .view-button {
      margin-top: 1rem;
    }

    .empty-card {
      margin: 0;
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
        color: var(--ion-color-dark);
      }

      p {
        color: var(--ion-color-medium);
        margin-bottom: 1.5rem;
      }
    }
  `],
})
export class ClientNutritionSummaryComponent {
  summary = input<NutritionSummary | null>();

  getProgressColor(consumed: number, target: number): string {
    const percentage = consumed / target;

    // Use neutral colors as per adherence-neutral design
    if (percentage >= 0.9 && percentage <= 1.1) {
      return 'success'; // On target
    } else if (percentage >= 0.8 && percentage <= 1.2) {
      return 'warning'; // Close to target
    } else {
      return 'medium'; // Further from target (neutral, not red)
    }
  }
}
