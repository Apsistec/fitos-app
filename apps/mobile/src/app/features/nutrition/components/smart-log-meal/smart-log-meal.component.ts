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
  IonSegment,
  IonSegmentButton,
  IonBadge,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  restaurantOutline,
  timeOutline,
  flashOutline,
  cameraOutline,
  micOutline,
  nutritionOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { HapticService } from '../../../../core/services/haptic.service';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealTemplate {
  id: string;
  name: string;
  mealType: MealType;
  foods: Array<{
    foodId: string;
    foodName: string;
    quantity: number;
    unit: string;
  }>;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  lastUsed?: Date;
  useCount: number;
  tags?: string[];
}

export interface FoodSuggestion {
  foodId: string;
  foodName: string;
  quantity: number;
  unit: string;
  reason: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  fitsGoals: boolean;
  confidence: number;
}

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroProgress {
  current: MacroTarget;
  target: MacroTarget;
  remaining: MacroTarget;
  percentages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * SmartLogMealComponent - AI-powered nutrition logging
 *
 * Features:
 * - Meal templates for quick logging
 * - Context-aware food suggestions
 * - Macro-optimized recommendations
 * - Time-of-day smart defaults
 * - Photo nutrition integration
 * - Voice logging integration
 * - Macro progress visualization
 */
@Component({
  selector: 'app-smart-log-meal',
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
    IonSegment,
    IonSegmentButton,
    IonBadge,
    IonProgressBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="smart-meal-container">
      <!-- Macro Progress -->
      @if (macroProgress()) {
        <ion-card class="macro-progress-card">
          <ion-card-header>
            <div class="card-header-with-icon">
              <ion-icon name="nutrition-outline"></ion-icon>
              <ion-card-title>Today's Macros</ion-card-title>
            </div>
          </ion-card-header>
          <ion-card-content>
            <div class="macro-grid">
              <!-- Calories -->
              <div class="macro-item">
                <div class="macro-header">
                  <span class="macro-label">Calories</span>
                  <span class="macro-value">
                    {{ macroProgress()!.current.calories }} / {{ macroProgress()!.target.calories }}
                  </span>
                </div>
                <ion-progress-bar
                  [value]="macroProgress()!.percentages.calories / 100"
                  [color]="getProgressColor(macroProgress()!.percentages.calories)"
                ></ion-progress-bar>
                <span class="macro-remaining">{{ macroProgress()!.remaining.calories }} remaining</span>
              </div>

              <!-- Protein -->
              <div class="macro-item">
                <div class="macro-header">
                  <span class="macro-label">Protein</span>
                  <span class="macro-value">
                    {{ macroProgress()!.current.protein }}g / {{ macroProgress()!.target.protein }}g
                  </span>
                </div>
                <ion-progress-bar
                  [value]="macroProgress()!.percentages.protein / 100"
                  [color]="getProgressColor(macroProgress()!.percentages.protein)"
                ></ion-progress-bar>
                <span class="macro-remaining">{{ macroProgress()!.remaining.protein }}g remaining</span>
              </div>

              <!-- Carbs -->
              <div class="macro-item">
                <div class="macro-header">
                  <span class="macro-label">Carbs</span>
                  <span class="macro-value">
                    {{ macroProgress()!.current.carbs }}g / {{ macroProgress()!.target.carbs }}g
                  </span>
                </div>
                <ion-progress-bar
                  [value]="macroProgress()!.percentages.carbs / 100"
                  [color]="getProgressColor(macroProgress()!.percentages.carbs)"
                ></ion-progress-bar>
                <span class="macro-remaining">{{ macroProgress()!.remaining.carbs }}g remaining</span>
              </div>

              <!-- Fat -->
              <div class="macro-item">
                <div class="macro-header">
                  <span class="macro-label">Fat</span>
                  <span class="macro-value">
                    {{ macroProgress()!.current.fat }}g / {{ macroProgress()!.target.fat }}g
                  </span>
                </div>
                <ion-progress-bar
                  [value]="macroProgress()!.percentages.fat / 100"
                  [color]="getProgressColor(macroProgress()!.percentages.fat)"
                ></ion-progress-bar>
                <span class="macro-remaining">{{ macroProgress()!.remaining.fat }}g remaining</span>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      }

      <!-- Meal Type Selector -->
      <ion-segment [(ngModel)]="selectedMealType" (ionChange)="onMealTypeChange()">
        <ion-segment-button value="breakfast">
          <ion-label>Breakfast</ion-label>
        </ion-segment-button>
        <ion-segment-button value="lunch">
          <ion-label>Lunch</ion-label>
        </ion-segment-button>
        <ion-segment-button value="dinner">
          <ion-label>Dinner</ion-label>
        </ion-segment-button>
        <ion-segment-button value="snack">
          <ion-label>Snack</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- Meal Templates -->
      @if (filteredTemplates().length > 0 && viewMode() === 'templates') {
        <ion-card class="templates-card">
          <ion-card-header>
            <div class="card-header-with-icon">
              <ion-icon name="flash-outline"></ion-icon>
              <ion-card-title>Quick Log Templates</ion-card-title>
            </div>
          </ion-card-header>
          <ion-card-content>
            @for (template of filteredTemplates(); track template.id) {
              <div class="template-item" (click)="selectTemplate(template)">
                <div class="template-header">
                  <h3>{{ template.name }}</h3>
                  <ion-badge color="primary">
                    {{ template.macros.calories }} cal
                  </ion-badge>
                </div>

                <div class="template-macros">
                  <span class="macro-chip">P: {{ template.macros.protein }}g</span>
                  <span class="macro-chip">C: {{ template.macros.carbs }}g</span>
                  <span class="macro-chip">F: {{ template.macros.fat }}g</span>
                </div>

                <div class="template-foods">
                  @for (food of template.foods.slice(0, 3); track food.foodId) {
                    <ion-chip size="small" outline="true">
                      <ion-label>{{ food.foodName }}</ion-label>
                    </ion-chip>
                  }
                  @if (template.foods.length > 3) {
                    <ion-chip size="small" outline="true">
                      <ion-label>+{{ template.foods.length - 3 }} more</ion-label>
                    </ion-chip>
                  }
                </div>

                @if (template.tags && template.tags.length > 0) {
                  <div class="template-tags">
                    @for (tag of template.tags; track tag) {
                      <ion-chip size="small" color="medium">
                        <ion-label>{{ tag }}</ion-label>
                      </ion-chip>
                    }
                  </div>
                }
              </div>
            }
          </ion-card-content>
        </ion-card>
      }

      <!-- Food Suggestions -->
      @if (foodSuggestions().length > 0 && viewMode() === 'suggestions') {
        <ion-card class="suggestions-card">
          <ion-card-header>
            <div class="card-header-with-icon">
              <ion-icon name="sparkles-outline"></ion-icon>
              <ion-card-title>AI Suggestions</ion-card-title>
            </div>
          </ion-card-header>
          <ion-card-content>
            @for (suggestion of foodSuggestions(); track suggestion.foodId) {
              <div class="suggestion-item">
                <div class="suggestion-header">
                  <h3>{{ suggestion.foodName }}</h3>
                  <div class="suggestion-badges">
                    @if (suggestion.fitsGoals) {
                      <ion-badge color="success">Fits Goals</ion-badge>
                    }
                    <ion-badge [color]="getConfidenceColor(suggestion.confidence)">
                      {{ formatConfidence(suggestion.confidence) }}%
                    </ion-badge>
                  </div>
                </div>

                <div class="suggestion-quantity">
                  <span>{{ suggestion.quantity }} {{ suggestion.unit }}</span>
                </div>

                <div class="suggestion-macros">
                  <div class="macro-display">
                    <span class="macro-label">Calories:</span>
                    <span class="macro-value">{{ suggestion.macros.calories }}</span>
                  </div>
                  <div class="macro-display">
                    <span class="macro-label">P:</span>
                    <span class="macro-value">{{ suggestion.macros.protein }}g</span>
                  </div>
                  <div class="macro-display">
                    <span class="macro-label">C:</span>
                    <span class="macro-value">{{ suggestion.macros.carbs }}g</span>
                  </div>
                  <div class="macro-display">
                    <span class="macro-label">F:</span>
                    <span class="macro-value">{{ suggestion.macros.fat }}g</span>
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
                  Log This Food
                </ion-button>
              </div>
            }
          </ion-card-content>
        </ion-card>
      }

      <!-- View Mode Toggle -->
      @if (filteredTemplates().length > 0 || foodSuggestions().length > 0) {
        <ion-segment [(ngModel)]="viewMode" (ionChange)="onViewModeChange()">
          <ion-segment-button value="templates">
            <ion-icon name="flash-outline"></ion-icon>
            <ion-label>Templates</ion-label>
          </ion-segment-button>
          <ion-segment-button value="suggestions">
            <ion-icon name="sparkles-outline"></ion-icon>
            <ion-label>AI Suggestions</ion-label>
          </ion-segment-button>
        </ion-segment>
      }

      <!-- Quick Actions -->
      <div class="quick-actions">
        <ion-button expand="block" (click)="startPhotoLog()">
          <ion-icon slot="start" name="camera-outline"></ion-icon>
          Photo Nutrition
        </ion-button>
        <ion-button expand="block" fill="outline" (click)="startVoiceLog()">
          <ion-icon slot="start" name="mic-outline"></ion-icon>
          Voice Log Meal
        </ion-button>
        <ion-button expand="block" fill="outline" (click)="manualLog()">
          Manual Entry
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    .smart-meal-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .card-header-with-icon {
      display: flex;
      align-items: center;
      gap: 8px;

      ion-icon {
        font-size: 24px;
        color: var(--ion-color-primary, #10B981);
      }

      ion-card-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .macro-progress-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .macro-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .macro-item {
      .macro-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .macro-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        .macro-value {
          font-size: 13px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
          font-family: 'Space Mono', monospace;
        }
      }

      ion-progress-bar {
        height: 6px;
        border-radius: 9999px;
        margin-bottom: 4px;
      }

      .macro-remaining {
        font-size: 11px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary, #262626);
      margin: 16px 0;

      ion-segment-button {
        --indicator-color: var(--ion-color-primary, #10B981);
        --color: var(--fitos-text-secondary, #A3A3A3);
        --color-checked: var(--ion-color-primary, #10B981);
        min-height: 40px;
        font-size: 13px;
      }
    }

    .templates-card,
    .suggestions-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;

      ion-card-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .template-item {
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 150ms ease;

      &:last-child {
        margin-bottom: 0;
      }

      &:active {
        transform: scale(0.98);
        background: var(--fitos-bg-secondary, #1A1A1A);
      }

      .template-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      .template-macros {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;

        .macro-chip {
          padding: 4px 8px;
          background: var(--fitos-bg-primary, #0D0D0D);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--fitos-text-secondary, #A3A3A3);
          font-family: 'Space Mono', monospace;
        }
      }

      .template-foods,
      .template-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;

        ion-chip {
          margin: 0;
          font-size: 12px;
        }
      }
    }

    .suggestion-item {
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 12px;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .suggestion-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
          flex: 1;
        }

        .suggestion-badges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;

          ion-badge {
            font-size: 12px;
          }
        }
      }

      .suggestion-quantity {
        margin-bottom: 12px;

        span {
          font-size: 14px;
          font-weight: 600;
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }

      .suggestion-macros {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 12px;

        .macro-display {
          display: flex;
          align-items: center;
          gap: 4px;

          .macro-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--fitos-text-secondary, #A3A3A3);
          }

          .macro-value {
            font-size: 14px;
            font-weight: 700;
            color: var(--fitos-text-primary, #F5F5F5);
            font-family: 'Space Mono', monospace;
          }
        }
      }

      .suggestion-reason {
        display: flex;
        gap: 8px;
        padding: 12px;
        background: rgba(16, 185, 129, 0.1);
        border-radius: 8px;
        margin-bottom: 12px;

        ion-icon {
          font-size: 16px;
          color: var(--ion-color-primary, #10B981);
          flex-shrink: 0;
          margin-top: 2px;
        }

        p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;

      ion-button {
        margin: 0;
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
      }

      ion-button:first-child {
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }
  `],
})
export class SmartLogMealComponent implements OnInit {
  private haptic = inject(HapticService);

  // Inputs
  userId = input.required<string>();

  // Outputs
  templateSelected = output<MealTemplate>();
  suggestionAccepted = output<FoodSuggestion>();
  photoLogStarted = output<void>();
  voiceLogStarted = output<void>();
  manualLogStarted = output<void>();

  // State
  mealTemplates = signal<MealTemplate[]>([]);
  filteredTemplates = signal<MealTemplate[]>([]);
  foodSuggestions = signal<FoodSuggestion[]>([]);
  macroProgress = signal<MacroProgress | null>(null);
  selectedMealType = signal<MealType>('breakfast');
  viewMode = signal<'templates' | 'suggestions'>('templates');

  constructor() {
    addIcons({
      sparklesOutline,
      restaurantOutline,
      timeOutline,
      flashOutline,
      cameraOutline,
      micOutline,
      nutritionOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    this.loadSmartData();
    this.detectMealTypeFromTime();
  }

  detectMealTypeFromTime(): void {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) {
      this.selectedMealType.set('breakfast');
    } else if (hour >= 11 && hour < 15) {
      this.selectedMealType.set('lunch');
    } else if (hour >= 15 && hour < 21) {
      this.selectedMealType.set('dinner');
    } else {
      this.selectedMealType.set('snack');
    }
  }

  async loadSmartData(): Promise<void> {
    await this.loadMealTemplates();
    await this.loadFoodSuggestions();
    await this.loadMacroProgress();
  }

  async loadMealTemplates(): Promise<void> {
    // TODO: Load from user's saved templates
    const mockTemplates: MealTemplate[] = [
      {
        id: 'template_1',
        name: 'Protein Pancakes',
        mealType: 'breakfast',
        foods: [
          { foodId: 'pancakes', foodName: 'Protein Pancakes', quantity: 2, unit: 'pancakes' },
          { foodId: 'banana', foodName: 'Banana', quantity: 1, unit: 'medium' },
          { foodId: 'maple_syrup', foodName: 'Maple Syrup', quantity: 2, unit: 'tbsp' },
        ],
        macros: { calories: 420, protein: 35, carbs: 52, fat: 8 },
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        useCount: 18,
        tags: ['High Protein', 'Quick'],
      },
      {
        id: 'template_2',
        name: 'Chicken & Rice Bowl',
        mealType: 'lunch',
        foods: [
          { foodId: 'chicken_breast', foodName: 'Grilled Chicken Breast', quantity: 6, unit: 'oz' },
          { foodId: 'brown_rice', foodName: 'Brown Rice', quantity: 1, unit: 'cup' },
          { foodId: 'broccoli', foodName: 'Steamed Broccoli', quantity: 1, unit: 'cup' },
        ],
        macros: { calories: 520, protein: 52, carbs: 58, fat: 8 },
        lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        useCount: 32,
        tags: ['High Protein', 'Meal Prep'],
      },
      {
        id: 'template_3',
        name: 'Salmon Dinner',
        mealType: 'dinner',
        foods: [
          { foodId: 'salmon', foodName: 'Baked Salmon', quantity: 6, unit: 'oz' },
          { foodId: 'sweet_potato', foodName: 'Sweet Potato', quantity: 1, unit: 'medium' },
          { foodId: 'asparagus', foodName: 'Roasted Asparagus', quantity: 1, unit: 'cup' },
        ],
        macros: { calories: 485, protein: 42, carbs: 35, fat: 18 },
        lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        useCount: 15,
        tags: ['Omega-3', 'Balanced'],
      },
    ];

    this.mealTemplates.set(mockTemplates);
    this.filterTemplatesByMealType();
  }

  async loadFoodSuggestions(): Promise<void> {
    // TODO: Call AI backend for personalized suggestions
    const mockSuggestions: FoodSuggestion[] = [
      {
        foodId: 'greek_yogurt',
        foodName: 'Greek Yogurt',
        quantity: 1,
        unit: 'cup',
        reason: 'You need 25g more protein to hit your target. Greek yogurt provides high-quality protein with minimal carbs.',
        macros: { calories: 120, protein: 20, carbs: 9, fat: 0 },
        fitsGoals: true,
        confidence: 0.94,
      },
      {
        foodId: 'banana',
        foodName: 'Banana',
        quantity: 1,
        unit: 'medium',
        reason: 'Great pre-workout carb source to fuel your training session in 2 hours.',
        macros: { calories: 105, protein: 1, carbs: 27, fat: 0 },
        fitsGoals: true,
        confidence: 0.88,
      },
    ];

    this.foodSuggestions.set(mockSuggestions);
  }

  async loadMacroProgress(): Promise<void> {
    // TODO: Load from nutrition tracking service
    const mockProgress: MacroProgress = {
      current: { calories: 1250, protein: 95, carbs: 125, fat: 42 },
      target: { calories: 2100, protein: 160, carbs: 220, fat: 60 },
      remaining: { calories: 850, protein: 65, carbs: 95, fat: 18 },
      percentages: {
        calories: 59.5,
        protein: 59.4,
        carbs: 56.8,
        fat: 70.0,
      },
    };

    this.macroProgress.set(mockProgress);
  }

  filterTemplatesByMealType(): void {
    const mealType = this.selectedMealType();
    this.filteredTemplates.set(
      this.mealTemplates().filter(t => t.mealType === mealType)
    );
  }

  onMealTypeChange(): void {
    this.haptic.light();
    this.filterTemplatesByMealType();
  }

  onViewModeChange(): void {
    this.haptic.light();
  }

  async selectTemplate(template: MealTemplate): Promise<void> {
    await this.haptic.success();
    this.templateSelected.emit(template);
  }

  async acceptSuggestion(suggestion: FoodSuggestion): Promise<void> {
    await this.haptic.success();
    this.suggestionAccepted.emit(suggestion);
  }

  async startPhotoLog(): Promise<void> {
    await this.haptic.light();
    this.photoLogStarted.emit();
  }

  async startVoiceLog(): Promise<void> {
    await this.haptic.light();
    this.voiceLogStarted.emit();
  }

  async manualLog(): Promise<void> {
    await this.haptic.light();
    this.manualLogStarted.emit();
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'primary';
    if (percentage >= 50) return 'warning';
    return 'danger';
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'primary';
    return 'warning';
  }

  formatConfidence(confidence: number): number {
    return Math.round(confidence * 100);
  }
}
