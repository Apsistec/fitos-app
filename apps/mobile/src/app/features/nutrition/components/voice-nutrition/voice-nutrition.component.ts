import {  Component, output, effect, signal, OnDestroy , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonList,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  micOutline,
  mic,
  closeCircle,
  checkmarkCircle,
  createOutline,
  trashOutline,
} from 'ionicons/icons';
import { VoiceService } from '@app/core/services/voice.service';
import { NutritionParserService, ParsedFood } from '@app/core/services/nutrition-parser.service';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * VoiceNutritionComponent - Voice and AI-powered nutrition logging
 *
 * Features:
 * - Voice input for food descriptions
 * - Natural language parsing ("a fist-sized chicken breast and some rice")
 * - Editable food breakdown before confirmation
 * - Portion size estimation
 * - Multi-food entries
 *
 * Usage:
 * ```html
 * <app-voice-nutrition
 *   (foodsConfirmed)="handleFoods($event)">
 * </app-voice-nutrition>
 * ```
 */
@Component({
  selector: 'app-voice-nutrition',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    IonSpinner,
    IonText,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonList
],
  template: `
    <div class="voice-nutrition">
      <!-- Voice Input Section -->
      @if (!parsedFoods().length) {
        <div class="voice-section">
          <!-- Mic Button -->
          <div class="mic-container">
            @if (voiceService.isProcessing() || nutritionParser.isProcessing()) {
              <div class="mic-button processing">
                <ion-spinner name="circular"></ion-spinner>
              </div>
            } @else if (voiceService.isListening()) {
              <button class="mic-button listening" (click)="stopListening()">
                <ion-icon name="mic" class="pulse"></ion-icon>
                <div class="ripple"></div>
                <div class="ripple delay-1"></div>
                <div class="ripple delay-2"></div>
              </button>
            } @else {
              <button class="mic-button idle" (click)="startListening()">
                <ion-icon name="mic-outline"></ion-icon>
              </button>
            }
          </div>

          <!-- Transcript Display -->
          @if (voiceService.displayTranscript()) {
            <div class="transcript">
              <ion-text color="medium" class="label">You said:</ion-text>
              <p class="transcript-text">{{ voiceService.displayTranscript() }}</p>
            </div>
          } @else if (voiceService.isListening()) {
            <ion-text color="medium" class="listening-prompt">
              <ion-icon name="mic" class="prompt-icon"></ion-icon>
              Describe your meal...
            </ion-text>
          } @else {
            <div class="instructions">
              <h3>Tell me what you ate</h3>
              <p>Try: "a fist-sized chicken breast and some rice"</p>
              <p>Or: "2 eggs, toast, and coffee"</p>
            </div>
          }

          <!-- Error Display -->
          @if (voiceService.hasError() || nutritionParser.error()) {
            <div class="error-container">
              <ion-icon name="close-circle" color="danger"></ion-icon>
              <ion-text color="danger">
                {{ voiceService.error() || nutritionParser.error() }}
              </ion-text>
            </div>
          }
        </div>
      }

      <!-- Parsed Foods Breakdown -->
      @if (parsedFoods().length > 0) {
        <div class="foods-section">
          <div class="section-header">
            <h3>Confirm Your Foods</h3>
            <ion-button fill="clear" size="small" (click)="clearFoods()">
              <ion-icon slot="start" name="close-circle"></ion-icon>
              Clear
            </ion-button>
          </div>

          <ion-list class="foods-list">
            @for (food of parsedFoods(); track $index) {
              <ion-card class="food-card" [class.low-confidence]="food.confidence < 0.7">
                <ion-card-header>
                  <div class="food-header">
                    <div class="food-info">
                      <ion-card-title>{{ food.foodName }}</ion-card-title>
                      <ion-text color="medium" class="serving-info">
                        {{ food.servingQty }} {{ food.servingUnit }}
                        @if (food.brandName) {
                          <span class="brand">• {{ food.brandName }}</span>
                        }
                      </ion-text>
                    </div>
                    <button class="icon-button" (click)="removeFood($index)">
                      <ion-icon name="trash-outline" color="danger"></ion-icon>
                    </button>
                  </div>

                  <!-- Confidence Indicator -->
                  @if (food.confidence < 0.8) {
                    <div class="confidence-warning">
                      <ion-icon name="create-outline"></ion-icon>
                      <span>{{ (food.confidence * 100).toFixed(0) }}% match - tap to edit</span>
                    </div>
                  }
                </ion-card-header>

                <ion-card-content>
                  <div class="macros-grid">
                    <div class="macro-item">
                      <span class="macro-value calories">{{ food.calories }}</span>
                      <span class="macro-label">cal</span>
                    </div>
                    <div class="macro-item">
                      <span class="macro-value protein">{{ food.protein }}g</span>
                      <span class="macro-label">protein</span>
                    </div>
                    <div class="macro-item">
                      <span class="macro-value carbs">{{ food.carbs }}g</span>
                      <span class="macro-label">carbs</span>
                    </div>
                    <div class="macro-item">
                      <span class="macro-value fat">{{ food.fat }}g</span>
                      <span class="macro-label">fat</span>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            }
          </ion-list>

          <!-- Totals Summary -->
          <ion-card class="totals-card">
            <ion-card-content>
              <div class="totals-row">
                <span class="totals-label">Total:</span>
                <div class="totals-macros">
                  <span class="total-item">{{ totalCalories() }} cal</span>
                  <span class="total-item">{{ totalProtein() }}g P</span>
                  <span class="total-item">{{ totalCarbs() }}g C</span>
                  <span class="total-item">{{ totalFat() }}g F</span>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Confirm Button -->
          <ion-button expand="block" size="large" (click)="confirmFoods()" class="confirm-button">
            <ion-icon slot="start" name="checkmark-circle"></ion-icon>
            Log {{ parsedFoods().length }} Food{{ parsedFoods().length > 1 ? 's' : '' }}
          </ion-button>
        </div>
      }
    </div>
  `,
  styles: [`
    .voice-nutrition {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .voice-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      padding: 2rem 1rem;
    }

    .mic-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .mic-button {
      position: relative;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--fitos-duration-normal) var(--fitos-ease-default);

      ion-icon {
        font-size: 48px;
        z-index: 2;
      }

      &.idle {
        background: var(--fitos-bg-tertiary);
        color: var(--fitos-text-primary);

        &:hover {
          background: var(--fitos-bg-elevated);
          transform: scale(1.05);
          box-shadow: var(--fitos-glow-primary);
        }

        &:active {
          transform: scale(0.95);
        }
      }

      &.listening {
        background: var(--fitos-accent-primary);
        color: white;
        box-shadow: var(--fitos-glow-primary);

        ion-icon.pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      }

      &.processing {
        background: var(--fitos-bg-tertiary);
        color: var(--fitos-text-secondary);
      }
    }

    .ripple {
      position: absolute;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 2px solid var(--fitos-accent-primary);
      opacity: 0;
      animation: ripple 2s ease-out infinite;

      &.delay-1 {
        animation-delay: 0.5s;
      }

      &.delay-2 {
        animation-delay: 1s;
      }
    }

    @keyframes ripple {
      0% {
        transform: scale(1);
        opacity: 0.6;
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    .transcript,
    .instructions {
      text-align: center;
      max-width: 400px;
    }

    .transcript {
      background: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-subtle);
      border-radius: var(--fitos-radius-lg);
      padding: 1rem;

      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
        margin-bottom: 0.5rem;
      }

      .transcript-text {
        font-size: 1rem;
        line-height: 1.5;
        color: var(--fitos-text-primary);
        margin: 0;
        font-weight: 500;
      }
    }

    .instructions {
      h3 {
        margin: 0 0 1rem 0;
        color: var(--fitos-text-primary);
        font-size: 1.25rem;
      }

      p {
        margin: 0.5rem 0;
        color: var(--fitos-text-secondary);
        font-size: 0.875rem;
      }
    }

    .listening-prompt {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      animation: fade-in 0.3s ease-in;

      .prompt-icon {
        font-size: 1.25rem;
        animation: pulse 1.5s ease-in-out infinite;
      }
    }

    .error-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--fitos-status-error);
      border-radius: var(--fitos-radius-md);

      ion-icon {
        font-size: 1.25rem;
      }
    }

    .foods-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        color: var(--fitos-text-primary);
        font-size: 1.25rem;
      }
    }

    .foods-list {
      background: transparent;
      padding: 0;
    }

    .food-card {
      margin: 0 0 1rem 0;
      border: 1px solid var(--fitos-border-default);

      &.low-confidence {
        border-color: var(--fitos-status-warning);
      }
    }

    .food-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .food-info {
      flex: 1;

      ion-card-title {
        font-size: 1.125rem;
        margin-bottom: 0.25rem;
      }

      .serving-info {
        font-size: 0.875rem;

        .brand {
          color: var(--fitos-text-tertiary);
        }
      }
    }

    .icon-button {
      background: transparent;
      border: none;
      padding: 0.5rem;
      cursor: pointer;
      border-radius: var(--fitos-radius-md);

      &:hover {
        background: var(--fitos-bg-tertiary);
      }

      ion-icon {
        font-size: 1.25rem;
      }
    }

    .confidence-warning {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(245, 158, 11, 0.1);
      border-radius: var(--fitos-radius-sm);
      font-size: 0.75rem;
      color: var(--fitos-status-warning);

      ion-icon {
        font-size: 1rem;
      }
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      text-align: center;
    }

    .macro-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .macro-value {
      font-family: var(--fitos-font-mono);
      font-size: 1.25rem;
      font-weight: 700;

      &.calories { color: var(--fitos-nutrition-calories); }
      &.protein { color: var(--fitos-nutrition-protein); }
      &.carbs { color: var(--fitos-nutrition-carbs); }
      &.fat { color: var(--fitos-nutrition-fat); }
    }

    .macro-label {
      font-size: 0.75rem;
      color: var(--fitos-text-tertiary);
      text-transform: uppercase;
    }

    .totals-card {
      margin: 0;
      background: var(--fitos-bg-tertiary);
      border: 1px solid var(--fitos-border-default);
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .totals-label {
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .totals-macros {
      display: flex;
      gap: 1rem;
      font-family: var(--fitos-font-mono);
      font-weight: 600;
    }

    .total-item {
      color: var(--fitos-text-primary);
    }

    .confirm-button {
      margin-top: 0.5rem;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ripple,
      .pulse,
      ion-icon.pulse,
      .prompt-icon {
        animation: none !important;
      }

      .mic-button {
        transition: none !important;
      }
    }
  `],
})
export class VoiceNutritionComponent implements OnDestroy {
  // Outputs
  foodsConfirmed = output<ParsedFood[]>();

  // State
  parsedFoods = signal<ParsedFood[]>([]);

  // Computed totals
  totalCalories = () => this.parsedFoods().reduce((sum, f) => sum + f.calories, 0);
  totalProtein = () => this.parsedFoods().reduce((sum, f) => sum + f.protein, 0);
  totalCarbs = () => this.parsedFoods().reduce((sum, f) => sum + f.carbs, 0);
  totalFat = () => this.parsedFoods().reduce((sum, f) => sum + f.fat, 0);

  constructor(
    public voiceService: VoiceService,
    public nutritionParser: NutritionParserService
  ) {
    addIcons({ micOutline, mic, closeCircle, checkmarkCircle, createOutline, trashOutline });

    // Auto-parse when voice transcript is finalized
    effect(() => {
      const transcript = this.voiceService.transcript();
      if (transcript && !this.voiceService.isListening()) {
        this.parseTranscript(transcript);
      }
    });
  }

  async startListening(): Promise<void> {
    const hasPermission = await this.voiceService.requestPermission();
    if (!hasPermission) {
      return;
    }

    await this.voiceService.startListening({
      keywords: ['chicken', 'rice', 'eggs', 'protein', 'shake', 'fist', 'handful'],
      endpointing: 500, // Stop after 500ms of silence (longer than workout)
    });

    await this.hapticFeedback();
  }

  stopListening(): void {
    this.voiceService.stopListening();
  }

  async parseTranscript(transcript: string): Promise<void> {
    try {
      const foods = await this.nutritionParser.parseNaturalLanguage(transcript);
      this.parsedFoods.set(foods);
      await this.hapticFeedback(ImpactStyle.Medium);
    } catch (error) {
      console.error('Error parsing food:', error);
    }
  }

  removeFood(index: number): void {
    const current = this.parsedFoods();
    this.parsedFoods.set(current.filter((_, i) => i !== index));
  }

  clearFoods(): void {
    this.parsedFoods.set([]);
  }

  confirmFoods(): void {
    const foods = this.parsedFoods();
    if (foods.length === 0) return;

    this.foodsConfirmed.emit(foods);
    this.hapticFeedback(ImpactStyle.Heavy);
  }

  private async hapticFeedback(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
    try {
      await Haptics.impact({ style });
    } catch {
      // Haptics not available, ignore
    }
  }

  ngOnDestroy(): void {
    this.stopListening();
  }
}
