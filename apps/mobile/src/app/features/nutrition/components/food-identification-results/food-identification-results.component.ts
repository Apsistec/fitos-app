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
import { IdentifiedFood } from '../../../../core/services/photo-nutrition.service';
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
    IonLabel,
    IonNote,
    IonList,
    IonRange
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
      gap: 16px;
      padding: 16px;
    }

    .results-header {
      text-align: center;

      h2 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .food-count {
        margin: 0;
        font-size: 13px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .totals-card {
      margin: 0;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;

      .totals-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        text-align: center;
      }

      .total-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .total-value {
        font-family: 'Space Mono', monospace;
        font-size: 20px;
        font-weight: 700;
      }

      .total-label {
        font-size: 11px;
        color: var(--fitos-text-tertiary, #737373);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }
    }

    .food-list {
      background: transparent;
      padding: 0;
      margin: 0;
    }

    .food-card {
      margin: 0 0 12px;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .food-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .food-title-section {
      flex: 1;

      ion-card-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
        margin-bottom: 4px;
      }

      ion-note {
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .food-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .confidence-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 8px;
    }

    .icon-button {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--fitos-text-tertiary, #737373);
      transition: color 150ms ease;

      ion-icon {
        font-size: 24px;
      }

      &:hover {
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .confidence-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid #F59E0B;
      border-radius: 8px;
      margin-bottom: 12px;

      ion-icon {
        font-size: 20px;
        color: #F59E0B;
        flex-shrink: 0;
      }

      span {
        flex: 1;
        font-size: 13px;
        color: #F59E0B;
      }

      .edit-button {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #F59E0B;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 150ms ease;

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
      margin-bottom: 16px;
    }

    .serving-label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .portion-adjuster {
      padding: 8px 0;

      ion-range {
        --bar-background: var(--fitos-bg-tertiary, #262626);
        --bar-background-active: var(--ion-color-primary, #10B981);
        --knob-background: var(--ion-color-primary, #10B981);
        --knob-size: 24px;
        --pin-background: var(--ion-color-primary, #10B981);
        --pin-color: white;
      }
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      padding: 12px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
      text-align: center;
    }

    .macro-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .macro-value {
      font-family: 'Space Mono', monospace;
      font-size: 14px;
      font-weight: 700;
    }

    .macro-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .edited-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-top: 12px;
      padding: 8px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 6px;
      font-size: 12px;
      color: #10B981;

      ion-icon {
        font-size: 14px;
      }
    }

    .confirm-section {
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      ion-button {
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }

    /* Adherence-neutral colors */
    .calories-color { color: #6366F1; }
    .protein-color { color: #22C55E; }
    .carbs-color { color: #F59E0B; }
    .fat-color { color: #EC4899; }
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
