import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonItem,
  IonLabel,
  IonNote,
  IonList,
  IonRange,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeCircleOutline,
  checkmarkCircleOutline,
  createOutline,
  warningOutline,
} from 'ionicons/icons';
import { IdentifiedFood } from '@app/core/services/photo-nutrition.service';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

@Component({
  selector: 'app-food-identification-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonItem,
    IonLabel,
    IonNote,
    IonList,
    IonRange,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="food-results">
      <!-- Results Header -->
      <div class="results-header">
        <h2>Identified Foods</h2>
        <p class="food-count">{{ foods().length }} item(s) detected</p>
      </div>

      <!-- Summary Totals -->
      <ion-card class="totals-card">
        <ion-card-content>
          <div class="totals-grid">
            <div class="total-item">
              <span class="total-value calories-color">{{ totalCalories() }}</span>
              <span class="total-label">Calories</span>
            </div>
            <div class="total-item">
              <span class="total-value protein-color">{{ totalProtein() }}g</span>
              <span class="total-label">Protein</span>
            </div>
            <div class="total-item">
              <span class="total-value carbs-color">{{ totalCarbs() }}g</span>
              <span class="total-label">Carbs</span>
            </div>
            <div class="total-item">
              <span class="total-value fat-color">{{ totalFat() }}g</span>
              <span class="total-label">Fat</span>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Food Items List -->
      <ion-list class="food-list">
        @for (food of foods(); track food.foodName; let i = $index) {
          <ion-card class="food-card">
            <ion-card-header>
              <div class="food-header">
                <div class="food-title-section">
                  <ion-card-title>{{ food.foodName }}</ion-card-title>
                  @if (food.brandName) {
                    <ion-note>{{ food.brandName }}</ion-note>
                  }
                </div>
                <div class="food-actions">
                  <!-- Confidence Badge -->
                  <ion-badge
                    [color]="getConfidenceColor(food.confidence)"
                    class="confidence-badge"
                  >
                    {{ (food.confidence * 100).toFixed(0) }}%
                  </ion-badge>
                  <!-- Remove Button -->
                  <button class="icon-button" (click)="removeFood(i)">
                    <ion-icon name="close-circle-outline"></ion-icon>
                  </button>
                </div>
              </div>
            </ion-card-header>

            <ion-card-content>
              <!-- Confidence Warning -->
              @if (food.confidence < 0.8) {
                <div class="confidence-warning">
                  <ion-icon name="warning-outline"></ion-icon>
                  <span>Low confidence - tap to edit</span>
                  <button class="edit-button" (click)="editFood(i)">
                    <ion-icon name="create-outline"></ion-icon>
                    Edit
                  </button>
                </div>
              }

              <!-- Serving Size -->
              <div class="serving-section">
                <ion-label class="serving-label">
                  Serving Size: {{ food.servingQty }} {{ food.servingUnit }}
                </ion-label>

                <!-- Portion Adjuster -->
                <div class="portion-adjuster">
                  <ion-range
                    [min]="0.25"
                    [max]="3"
                    [step]="0.25"
                    [value]="1"
                    [pin]="true"
                    [pinFormatter]="formatPin"
                    (ionChange)="adjustPortion(i, $event)"
                  >
                    <ion-label slot="start">¼</ion-label>
                    <ion-label slot="end">3×</ion-label>
                  </ion-range>
                </div>
              </div>

              <!-- Macros Grid -->
              <div class="macros-grid">
                <div class="macro-item">
                  <span class="macro-value calories-color">{{ food.calories }}</span>
                  <span class="macro-label">cal</span>
                </div>
                <div class="macro-item">
                  <span class="macro-value protein-color">{{ food.protein }}g</span>
                  <span class="macro-label">protein</span>
                </div>
                <div class="macro-item">
                  <span class="macro-value carbs-color">{{ food.carbs }}g</span>
                  <span class="macro-label">carbs</span>
                </div>
                <div class="macro-item">
                  <span class="macro-value fat-color">{{ food.fat }}g</span>
                  <span class="macro-label">fat</span>
                </div>
              </div>

              <!-- Edited Indicator -->
              @if (food.isEdited) {
                <div class="edited-badge">
                  <ion-icon name="create-outline"></ion-icon>
                  <span>Adjusted</span>
                </div>
              }
            </ion-card-content>
          </ion-card>
        }
      </ion-list>

      <!-- Confirm Button -->
      <div class="confirm-section">
        <ion-button
          expand="block"
          size="large"
          color="success"
          (click)="confirmFoods()"
          [disabled]="foods().length === 0"
        >
          <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
          Log {{ foods().length }} Food(s)
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .food-results {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-4);
      padding: var(--fitos-space-4);
    }

    .results-header {
      text-align: center;

      h2 {
        margin: 0 0 var(--fitos-space-2);
        font-size: var(--fitos-text-2xl);
        font-weight: 700;
        color: var(--fitos-text-primary);
      }

      .food-count {
        margin: 0;
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-tertiary);
      }
    }

    .totals-card {
      margin: 0;
      --background: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);

      .totals-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--fitos-space-4);
        text-align: center;
      }

      .total-item {
        display: flex;
        flex-direction: column;
        gap: var(--fitos-space-1);
      }

      .total-value {
        font-family: var(--fitos-font-mono);
        font-size: var(--fitos-text-xl);
        font-weight: 700;
      }

      .total-label {
        font-size: var(--fitos-text-xs);
        color: var(--fitos-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .food-list {
      background: transparent;
      padding: 0;
      margin: 0;
    }

    .food-card {
      margin: 0 0 var(--fitos-space-3);
      --background: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-subtle);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .food-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--fitos-space-3);
    }

    .food-title-section {
      flex: 1;

      ion-card-title {
        font-size: var(--fitos-text-lg);
        font-weight: 600;
        color: var(--fitos-text-primary);
        margin-bottom: var(--fitos-space-1);
      }

      ion-note {
        font-size: var(--fitos-text-xs);
        color: var(--fitos-text-tertiary);
      }
    }

    .food-actions {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
    }

    .confidence-badge {
      font-size: var(--fitos-text-xs);
      font-weight: 600;
      padding: 4px 8px;
    }

    .icon-button {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--fitos-text-tertiary);
      transition: color var(--fitos-duration-fast);

      ion-icon {
        font-size: 24px;
      }

      &:hover {
        color: var(--fitos-text-primary);
      }
    }

    .confidence-warning {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      padding: var(--fitos-space-3);
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid var(--fitos-status-warning);
      border-radius: var(--fitos-radius-md);
      margin-bottom: var(--fitos-space-3);

      ion-icon {
        font-size: 20px;
        color: var(--fitos-status-warning);
        flex-shrink: 0;
      }

      span {
        flex: 1;
        font-size: var(--fitos-text-sm);
        color: var(--fitos-status-warning);
      }

      .edit-button {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-1);
        background: var(--fitos-status-warning);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: var(--fitos-radius-sm);
        font-size: var(--fitos-text-xs);
        font-weight: 600;
        cursor: pointer;
        transition: opacity var(--fitos-duration-fast);

        &:active {
          opacity: 0.8;
        }

        ion-icon {
          font-size: 16px;
          color: white;
        }
      }
    }

    .serving-section {
      margin-bottom: var(--fitos-space-4);
    }

    .serving-label {
      display: block;
      margin-bottom: var(--fitos-space-2);
      font-size: var(--fitos-text-sm);
      font-weight: 600;
      color: var(--fitos-text-secondary);
    }

    .portion-adjuster {
      padding: var(--fitos-space-2) 0;

      ion-range {
        --bar-background: var(--fitos-bg-tertiary);
        --bar-background-active: var(--fitos-accent-primary);
        --knob-background: var(--fitos-accent-primary);
        --knob-size: 24px;
        --pin-background: var(--fitos-accent-primary);
        --pin-color: white;
      }
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--fitos-space-3);
      padding: var(--fitos-space-3);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-md);
      text-align: center;
    }

    .macro-item {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-1);
    }

    .macro-value {
      font-family: var(--fitos-font-mono);
      font-size: var(--fitos-text-base);
      font-weight: 700;
    }

    .macro-label {
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
    }

    .edited-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--fitos-space-1);
      margin-top: var(--fitos-space-3);
      padding: var(--fitos-space-2);
      background: rgba(16, 185, 129, 0.1);
      border-radius: var(--fitos-radius-sm);
      font-size: var(--fitos-text-xs);
      color: var(--fitos-status-success);

      ion-icon {
        font-size: 14px;
      }
    }

    .confirm-section {
      padding-top: var(--fitos-space-4);
      border-top: 1px solid var(--fitos-border-subtle);
    }

    // Adherence-neutral colors
    .calories-color { color: var(--fitos-nutrition-calories); }
    .protein-color { color: var(--fitos-nutrition-protein); }
    .carbs-color { color: var(--fitos-nutrition-carbs); }
    .fat-color { color: var(--fitos-nutrition-fat); }
  `],
})
export class FoodIdentificationResultsComponent {
  // Inputs
  foods = input.required<IdentifiedFood[]>();

  // Outputs
  foodsConfirmed = output<IdentifiedFood[]>();
  foodRemoved = output<number>();
  foodEdited = output<{ index: number; food: IdentifiedFood }>();

  // Internal state for editing
  private editableFoods = signal<IdentifiedFood[]>([]);

  // Computed totals
  totalCalories = computed(() =>
    this.foods().reduce((sum, f) => sum + f.calories, 0)
  );
  totalProtein = computed(() =>
    this.foods().reduce((sum, f) => sum + f.protein, 0)
  );
  totalCarbs = computed(() =>
    this.foods().reduce((sum, f) => sum + f.carbs, 0)
  );
  totalFat = computed(() =>
    this.foods().reduce((sum, f) => sum + f.fat, 0)
  );

  constructor() {
    addIcons({
      closeCircleOutline,
      checkmarkCircleOutline,
      createOutline,
      warningOutline,
    });
  }

  /**
   * Get confidence badge color
   */
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.8) return 'primary';
    if (confidence >= 0.7) return 'warning';
    return 'danger';
  }

  /**
   * Format pin label for range slider
   */
  formatPin = (value: number): string => {
    return `${value}×`;
  };

  /**
   * Adjust portion size
   */
  async adjustPortion(index: number, event: any): Promise<void> {
    const multiplier = event.detail.value;
    const food = this.foods()[index];

    const adjustedFood: IdentifiedFood = {
      ...food,
      servingQty: Math.round(food.servingQty * multiplier * 100) / 100,
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier),
      carbs: Math.round(food.carbs * multiplier),
      fat: Math.round(food.fat * multiplier),
      isEdited: multiplier !== 1,
    };

    this.foodEdited.emit({ index, food: adjustedFood });
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  /**
   * Remove food from list
   */
  async removeFood(index: number): Promise<void> {
    this.foodRemoved.emit(index);
    await Haptics.impact({ style: ImpactStyle.Medium });
  }

  /**
   * Edit food manually
   */
  async editFood(index: number): Promise<void> {
    // TODO: Open modal for manual editing
    console.log('Edit food:', this.foods()[index]);
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  /**
   * Confirm and log all foods
   */
  async confirmFoods(): Promise<void> {
    this.foodsConfirmed.emit(this.foods());
    await Haptics.notification({ type: NotificationType.Success });
  }
}
