import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline, createOutline, trashOutline } from 'ionicons/icons';
import { ParsedFood } from '../../../core/services/nutrition-parser.service';

// Register icons
addIcons({ checkmarkOutline, closeOutline, createOutline, trashOutline });

/**
 * FoodConfirmationComponent
 *
 * Shows parsed foods with editable portions and macros
 * Allows user to confirm or edit before logging
 *
 * @example
 * ```html
 * <app-food-confirmation
 *   [foods]="parsedFoods()"
 *   (confirm)="logFoods($event)"
 *   (cancel)="resetForm()"
 * />
 * ```
 */
@Component({
  selector: 'app-food-confirmation',
  standalone: true,
  imports: [
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="food-confirmation">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Confirm Foods</ion-card-title>
          <ion-text color="medium">
            <p class="subtitle">Review and edit before logging</p>
          </ion-text>
        </ion-card-header>

        <ion-card-content>
          @if (editableFoods().length === 0) {
            <ion-text color="medium">
              <p class="empty-state">No foods to confirm</p>
            </ion-text>
          } @else {
            <ion-list>
              @for (food of editableFoods(); track $index; let i = $index) {
                <div class="food-item">
                  <!-- Food Name -->
                  <div class="food-header">
                    <h3>{{ food.foodName }}</h3>
                    @if (food.brandName) {
                      <ion-badge color="medium">{{ food.brandName }}</ion-badge>
                    }
                    <ion-button
                      fill="clear"
                      size="small"
                      (click)="removeFood(i)"
                      class="delete-btn"
                    >
                      <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                    </ion-button>
                  </div>

                  <!-- Portion Size -->
                  <ion-item lines="none" class="portion-item">
                    <ion-label position="stacked">Portion</ion-label>
                    <div class="portion-inputs">
                      <ion-input
                        type="number"
                        [(ngModel)]="food.servingQty"
                        (ngModelChange)="recalculateMacros(i)"
                        step="0.25"
                        min="0.25"
                        class="qty-input"
                      />
                      <ion-input
                        type="text"
                        [(ngModel)]="food.servingUnit"
                        class="unit-input"
                      />
                    </div>
                  </ion-item>

                  <!-- Editable Macros -->
                  <div class="macros-grid">
                    <ion-item lines="none">
                      <ion-label position="stacked">Calories</ion-label>
                      <ion-input
                        type="number"
                        [(ngModel)]="food.calories"
                        min="0"
                      />
                    </ion-item>

                    <ion-item lines="none">
                      <ion-label position="stacked">Protein (g)</ion-label>
                      <ion-input
                        type="number"
                        [(ngModel)]="food.protein"
                        min="0"
                      />
                    </ion-item>

                    <ion-item lines="none">
                      <ion-label position="stacked">Carbs (g)</ion-label>
                      <ion-input
                        type="number"
                        [(ngModel)]="food.carbs"
                        min="0"
                      />
                    </ion-item>

                    <ion-item lines="none">
                      <ion-label position="stacked">Fat (g)</ion-label>
                      <ion-input
                        type="number"
                        [(ngModel)]="food.fat"
                        min="0"
                      />
                    </ion-item>
                  </div>

                  <!-- Confidence Indicator -->
                  @if (food.confidence < 0.7) {
                    <ion-text color="warning">
                      <p class="confidence-warning">
                        ⚠️ Low confidence ({{ (food.confidence * 100).toFixed(0) }}%) - please verify
                      </p>
                    </ion-text>
                  }
                </div>
              }
            </ion-list>

            <!-- Totals -->
            <div class="totals-section">
              <h4>Total</h4>
              <div class="totals-grid">
                <div class="total-item">
                  <span class="label">Calories</span>
                  <span class="value">{{ totalCalories() }}</span>
                </div>
                <div class="total-item">
                  <span class="label">Protein</span>
                  <span class="value">{{ totalProtein() }}g</span>
                </div>
                <div class="total-item">
                  <span class="label">Carbs</span>
                  <span class="value">{{ totalCarbs() }}g</span>
                </div>
                <div class="total-item">
                  <span class="label">Fat</span>
                  <span class="value">{{ totalFat() }}g</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <ion-button
                expand="block"
                (click)="confirmFoods()"
                [disabled]="editableFoods().length === 0"
              >
                <ion-icon slot="start" name="checkmark-outline"></ion-icon>
                Log {{ editableFoods().length }} {{ editableFoods().length === 1 ? 'Food' : 'Foods' }}
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                (click)="cancelConfirmation()"
              >
                <ion-icon slot="start" name="close-outline"></ion-icon>
                Cancel
              </ion-button>
            </div>
          }
        </ion-card-content>
      </ion-card>
    </div>
  `,
  styles: [`
    .food-confirmation {
      width: 100%;
    }

    .subtitle {
      margin: 4px 0 0 0;
      font-size: var(--fitos-text-sm);
    }

    .empty-state {
      text-align: center;
      padding: var(--fitos-space-8);
      font-style: italic;
    }

    .food-item {
      padding: var(--fitos-space-4) 0;
      border-bottom: 1px solid var(--fitos-border-subtle);

      &:last-child {
        border-bottom: none;
      }
    }

    .food-header {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      margin-bottom: var(--fitos-space-3);

      h3 {
        margin: 0;
        flex: 1;
        font-size: var(--fitos-text-lg);
        color: var(--fitos-text-primary);
      }

      .delete-btn {
        --padding-start: 8px;
        --padding-end: 8px;
      }
    }

    .portion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      margin-bottom: var(--fitos-space-3);
    }

    .portion-inputs {
      display: flex;
      gap: var(--fitos-space-2);
      width: 100%;

      .qty-input {
        flex: 1;
      }

      .unit-input {
        flex: 2;
      }
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--fitos-space-2);
      margin-top: var(--fitos-space-3);

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 0;
      }
    }

    .confidence-warning {
      margin: var(--fitos-space-2) 0 0 0;
      font-size: var(--fitos-text-sm);
    }

    .totals-section {
      margin-top: var(--fitos-space-6);
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-md);

      h4 {
        margin: 0 0 var(--fitos-space-3) 0;
        font-size: var(--fitos-text-base);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }
    }

    .totals-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--fitos-space-4);
    }

    .total-item {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-1);

      .label {
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-secondary);
      }

      .value {
        font-size: var(--fitos-text-xl);
        font-weight: 600;
        color: var(--fitos-text-primary);
        font-family: var(--fitos-font-mono);
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-2);
      margin-top: var(--fitos-space-6);

      ion-button {
        margin: 0;
      }
    }
  `],
})
export class FoodConfirmationComponent {
  // Inputs
  foods = input.required<ParsedFood[]>();

  // Outputs
  confirm = output<ParsedFood[]>();
  cancel = output<void>();

  // Editable copy of foods
  editableFoods = signal<ParsedFood[]>([]);

  // Track original portions for recalculation
  private originalPortions = new Map<number, { qty: number; macros: ParsedFood }>();

  constructor() {
    // Foods will be initialized in ngOnInit
  }

  ngOnInit() {
    // Create editable copy and store originals
    const foods = this.foods();
    this.editableFoods.set([...foods]);

    foods.forEach((food, index) => {
      this.originalPortions.set(index, {
        qty: food.servingQty,
        macros: { ...food }
      });
    });
  }

  /**
   * Recalculate macros when portion size changes
   */
  recalculateMacros(index: number): void {
    const foods = this.editableFoods();
    const food = foods[index];
    const original = this.originalPortions.get(index);

    if (!original) return;

    // Calculate multiplier based on portion change
    const multiplier = food.servingQty / original.qty;

    // Recalculate all macros
    food.calories = Math.round(original.macros.calories * multiplier);
    food.protein = Math.round(original.macros.protein * multiplier);
    food.carbs = Math.round(original.macros.carbs * multiplier);
    food.fat = Math.round(original.macros.fat * multiplier);

    // Trigger update
    this.editableFoods.set([...foods]);
  }

  /**
   * Remove a food from the list
   */
  removeFood(index: number): void {
    const foods = this.editableFoods();
    foods.splice(index, 1);
    this.editableFoods.set([...foods]);
    this.originalPortions.delete(index);
  }

  /**
   * Calculate total calories
   */
  totalCalories(): number {
    return this.editableFoods().reduce((sum, food) => sum + (food.calories || 0), 0);
  }

  /**
   * Calculate total protein
   */
  totalProtein(): number {
    return this.editableFoods().reduce((sum, food) => sum + (food.protein || 0), 0);
  }

  /**
   * Calculate total carbs
   */
  totalCarbs(): number {
    return this.editableFoods().reduce((sum, food) => sum + (food.carbs || 0), 0);
  }

  /**
   * Calculate total fat
   */
  totalFat(): number {
    return this.editableFoods().reduce((sum, food) => sum + (food.fat || 0), 0);
  }

  /**
   * Confirm and emit the edited foods
   */
  confirmFoods(): void {
    this.confirm.emit(this.editableFoods());
  }

  /**
   * Cancel confirmation
   */
  cancelConfirmation(): void {
    this.cancel.emit();
  }
}
