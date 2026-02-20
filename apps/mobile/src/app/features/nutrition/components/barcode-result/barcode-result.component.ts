import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonNote,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { flameOutline, checkmarkCircleOutline, closeOutline, nutritionOutline } from 'ionicons/icons';
import { BarcodeFoodResult } from '../../../../core/services/barcode-scanner.service';

export interface BarcodeLogRequest {
  food: BarcodeFoodResult;
  servings: number;
  mealType: string;
}

@Component({
  selector: 'app-barcode-result',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonNote,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-card class="result-card">
      <ion-card-header>
        <div class="result-header">
          <div class="food-identity">
            <ion-card-title class="food-name">{{ food.food_name }}</ion-card-title>
            @if (food.brand) {
              <ion-note class="brand">{{ food.brand }}</ion-note>
            }
            @if (food.serving_size && food.serving_unit) {
              <ion-note class="serving-note">
                Per {{ food.serving_size }}{{ food.serving_unit }}
              </ion-note>
            }
          </div>
          <ion-badge color="primary" class="calorie-badge">
            <ion-icon name="flame-outline"></ion-icon>
            {{ adjustedCalories() }} kcal
          </ion-badge>
        </div>
      </ion-card-header>

      <ion-card-content>
        <!-- Macro grid -->
        <div class="macros-grid">
          <div class="macro-item macro-protein">
            <div class="macro-value">{{ adjustedMacro(food.protein) }}g</div>
            <div class="macro-label">Protein</div>
          </div>
          <div class="macro-item macro-carbs">
            <div class="macro-value">{{ adjustedMacro(food.carbs) }}g</div>
            <div class="macro-label">Carbs</div>
          </div>
          <div class="macro-item macro-fat">
            <div class="macro-value">{{ adjustedMacro(food.fat) }}g</div>
            <div class="macro-label">Fat</div>
          </div>
        </div>

        @if (food.fiber != null || food.sugar != null || food.sodium != null) {
          <div class="extras-row">
            @if (food.fiber != null) {
              <span class="extra-item">Fiber: {{ adjustedMacro(food.fiber!) }}g</span>
            }
            @if (food.sugar != null) {
              <span class="extra-item">Sugar: {{ adjustedMacro(food.sugar!) }}g</span>
            }
            @if (food.sodium != null) {
              <span class="extra-item">Sodium: {{ adjustedSodium() }}mg</span>
            }
          </div>
        }

        <!-- Servings input -->
        <div class="serving-row">
          <ion-item class="serving-input-item" lines="none">
            <ion-label position="stacked">Servings</ion-label>
            <ion-input
              type="number"
              [(ngModel)]="servingsInput"
              (ionInput)="onServingsChange()"
              min="0.25"
              max="20"
              step="0.25"
              inputmode="decimal"
            ></ion-input>
          </ion-item>

          <ion-item class="meal-type-item" lines="none">
            <ion-label position="stacked">Meal</ion-label>
            <ion-select [(ngModel)]="mealType" interface="popover">
              <ion-select-option value="breakfast">Breakfast</ion-select-option>
              <ion-select-option value="lunch">Lunch</ion-select-option>
              <ion-select-option value="snack">Snack</ion-select-option>
              <ion-select-option value="dinner">Dinner</ion-select-option>
            </ion-select>
          </ion-item>
        </div>

        <!-- Source attribution -->
        <div class="source-row">
          <ion-note class="source-note">Source: {{ sourceLabel() }}</ion-note>
        </div>

        <!-- Action buttons -->
        <div class="action-buttons">
          <ion-button
            fill="outline"
            color="medium"
            (click)="onCancel()"
            class="cancel-btn"
          >
            <ion-icon slot="start" name="close-outline"></ion-icon>
            Cancel
          </ion-button>
          <ion-button
            expand="block"
            (click)="onLog()"
            class="log-btn"
          >
            <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
            Log Food
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .result-card {
      margin: 16px;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .food-identity {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .food-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      line-height: 1.3;
    }

    .brand, .serving-note {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .calorie-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      flex-shrink: 0;
      font-family: 'Space Mono', monospace;
      font-size: 14px;
      --border-radius: 20px;
    }

    .calorie-badge ion-icon {
      font-size: 14px;
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 16px 0 12px;
    }

    .macro-item {
      text-align: center;
      padding: 10px 8px;
      border-radius: 10px;
      background: var(--fitos-bg-tertiary, #262626);
    }

    .macro-value {
      font-size: 16px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .macro-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    .macro-protein .macro-value { color: #60A5FA; }
    .macro-carbs  .macro-value  { color: #FBBF24; }
    .macro-fat    .macro-value  { color: #F472B6; }

    .extras-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .extra-item {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      background: var(--fitos-bg-tertiary, #262626);
      padding: 4px 8px;
      border-radius: 6px;
    }

    .serving-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 4px 0 8px;
    }

    .serving-input-item, .meal-type-item {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 10px;
      border-radius: 10px;
      --padding-start: 12px;
      --padding-end: 12px;
    }

    .source-row {
      margin-bottom: 16px;
    }

    .source-note {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: capitalize;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
    }

    .cancel-btn {
      --border-radius: 10px;
    }

    .log-btn {
      --border-radius: 10px;
      font-weight: 700;
    }
  `],
})
export class BarcodeResultComponent {
  @Input({ required: true }) food!: BarcodeFoodResult;
  @Output() log = new EventEmitter<BarcodeLogRequest>();
  @Output() cancel = new EventEmitter<void>();

  servingsInput = 1;
  mealType = this.inferMealType();

  constructor() {
    addIcons({ flameOutline, checkmarkCircleOutline, closeOutline, nutritionOutline });
  }

  onServingsChange() {
    // servingsInput is two-way bound; computed values update via method calls
  }

  adjustedCalories(): number {
    return Math.round(this.food.calories * this.servingsInput);
  }

  adjustedMacro(value: number): number {
    return Math.round(value * this.servingsInput * 10) / 10;
  }

  adjustedSodium(): number {
    return Math.round((this.food.sodium ?? 0) * this.servingsInput);
  }

  sourceLabel(): string {
    const map: Record<string, string> = {
      openfoodfacts: 'Open Food Facts',
      usda: 'USDA FoodData Central',
      fatsecret: 'FatSecret',
      manual: 'Manual Entry',
    };
    return map[this.food.source] ?? this.food.source;
  }

  onLog(): void {
    const servings = Math.max(0.25, Math.min(20, this.servingsInput || 1));
    this.log.emit({ food: this.food, servings, mealType: this.mealType });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private inferMealType(): string {
    const hour = new Date().getHours();
    if (hour >= 5  && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    if (hour >= 18 && hour < 22) return 'dinner';
    return 'snack';
  }
}
