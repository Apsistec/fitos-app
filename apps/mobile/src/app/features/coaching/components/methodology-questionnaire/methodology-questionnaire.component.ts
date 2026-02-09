import { Component, inject, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonTextarea,
  IonButton,
  IonIcon,
  IonText,
  IonChip,
  IonInput,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline, addCircleOutline, closeCircleOutline, informationCircleOutline } from 'ionicons/icons';
import { TrainerMethodologyService, CreateMethodologyInput } from '../../../../core/services/trainer-methodology.service';
import { HapticService } from '../../../../core/services/haptic.service';

/**
 * MethodologyQuestionnaireComponent - Capture trainer's coaching philosophy
 *
 * Features:
 * - Structured questionnaire for training philosophy
 * - Nutrition approach preferences
 * - Communication style definition
 * - Key phrases and words to avoid
 * - Real-time preview of methodology
 *
 * Usage:
 * ```html
 * <app-methodology-questionnaire
 *   (completed)="handleCompletion($event)">
 * </app-methodology-questionnaire>
 * ```
 */
@Component({
  selector: 'app-methodology-questionnaire',
  standalone: true,
  imports: [
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonTextarea,
    IonButton,
    IonIcon,
    IonText,
    IonChip,
    IonInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="methodology-questionnaire">
      <ion-card-header>
        <ion-card-title>Your Coaching Methodology</ion-card-title>
        <ion-card-subtitle>
          Help the AI understand your unique coaching style
        </ion-card-subtitle>
      </ion-card-header>

      <ion-card-content>
        <!-- Training Philosophy -->
        <div class="section">
          <div class="section-header">
            <ion-icon name="information-circle-outline" color="primary"></ion-icon>
            <h3>Training Philosophy</h3>
          </div>
          <ion-text color="medium">
            <p class="hint">How do you approach programming and progression?</p>
          </ion-text>
          <ion-item lines="none" class="form-item">
            <ion-textarea
              [(ngModel)]="formData.training_philosophy"
              rows="6"
              placeholder="Example: I focus on progressive overload with a periodization model. I believe in high frequency training for compound movements, and I emphasize technique over weight. Recovery is built into every program."
              [autoGrow]="true"
            ></ion-textarea>
          </ion-item>
        </div>

        <!-- Nutrition Approach -->
        <div class="section">
          <div class="section-header">
            <ion-icon name="information-circle-outline" color="primary"></ion-icon>
            <h3>Nutrition Approach</h3>
          </div>
          <ion-text color="medium">
            <p class="hint">What's your philosophy on diet and nutrition?</p>
          </ion-text>
          <ion-item lines="none" class="form-item">
            <ion-textarea
              [(ngModel)]="formData.nutrition_approach"
              rows="6"
              placeholder="Example: I believe in flexible dieting and adherence over perfection. I avoid terms like 'cheat meals' and focus on sustainability. Macros are important but so is food quality and meal timing around training."
              [autoGrow]="true"
            ></ion-textarea>
          </ion-item>
        </div>

        <!-- Communication Style -->
        <div class="section">
          <div class="section-header">
            <ion-icon name="information-circle-outline" color="primary"></ion-icon>
            <h3>Communication Style</h3>
          </div>
          <ion-text color="medium">
            <p class="hint">How do you communicate with clients?</p>
          </ion-text>
          <ion-item lines="none" class="form-item">
            <ion-textarea
              [(ngModel)]="formData.communication_style"
              rows="6"
              placeholder="Example: I'm direct but supportive. I use humor to keep things light but I'm serious about technique and safety. I celebrate small wins and use analogies to explain concepts. I avoid jargon unless I explain it first."
              [autoGrow]="true"
            ></ion-textarea>
          </ion-item>
        </div>

        <!-- Key Phrases -->
        <div class="section">
          <div class="section-header">
            <ion-icon name="information-circle-outline" color="primary"></ion-icon>
            <h3>Key Phrases You Use</h3>
          </div>
          <ion-text color="medium">
            <p class="hint">Catchphrases or sayings you frequently use</p>
          </ion-text>

          @if (keyPhrases().length > 0) {
            <div class="chips-container">
              @for (phrase of keyPhrases(); track phrase) {
                <ion-chip (click)="removeKeyPhrase(phrase)">
                  <ion-label>{{ phrase }}</ion-label>
                  <ion-icon name="close-circle-outline"></ion-icon>
                </ion-chip>
              }
            </div>
          }

          <ion-item lines="none" class="form-item">
            <ion-input
              [(ngModel)]="newKeyPhrase"
              placeholder='e.g., "trust the process", "consistency is key"'
              (keyup.enter)="addKeyPhrase()"
            ></ion-input>
            <ion-button slot="end" fill="clear" (click)="addKeyPhrase()" aria-label="Add key phrase">
              <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
            </ion-button>
          </ion-item>
        </div>

        <!-- Avoid Phrases -->
        <div class="section">
          <div class="section-header">
            <ion-icon name="information-circle-outline" color="primary"></ion-icon>
            <h3>Words/Phrases to Avoid</h3>
          </div>
          <ion-text color="medium">
            <p class="hint">Language you don't want the AI to use</p>
          </ion-text>

          @if (avoidPhrases().length > 0) {
            <div class="chips-container">
              @for (phrase of avoidPhrases(); track phrase) {
                <ion-chip color="danger" (click)="removeAvoidPhrase(phrase)">
                  <ion-label>{{ phrase }}</ion-label>
                  <ion-icon name="close-circle-outline"></ion-icon>
                </ion-chip>
              }
            </div>
          }

          <ion-item lines="none" class="form-item">
            <ion-input
              [(ngModel)]="newAvoidPhrase"
              placeholder='e.g., "cheat meal", "burn calories", "bad foods"'
              (keyup.enter)="addAvoidPhrase()"
            ></ion-input>
            <ion-button slot="end" fill="clear" (click)="addAvoidPhrase()" aria-label="Add avoid phrase">
              <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
            </ion-button>
          </ion-item>
        </div>

        <!-- Actions -->
        <div class="actions">
          <ion-button
            expand="block"
            (click)="save()"
            [disabled]="!canSave() || saving()"
          >
            <ion-icon slot="start" name="save-outline"></ion-icon>
            {{ saving() ? 'Saving...' : 'Save Methodology' }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .methodology-questionnaire {
      margin: 0;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-card-subtitle {
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 13px;
    }

    .section {
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      ion-icon {
        font-size: 24px;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .hint {
      margin: 0 0 12px 0;
      font-size: 13px;
    }

    .form-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
      margin-bottom: 8px;
    }

    ion-textarea {
      --background: var(--fitos-bg-tertiary, #262626);
      --padding-start: 12px;
      --padding-end: 12px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      min-height: 120px;
      font-size: 14px;
    }

    ion-input {
      --background: var(--fitos-bg-tertiary, #262626);
      --padding-start: 12px;
      --padding-end: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      font-size: 14px;
    }

    .chips-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;

      ion-chip {
        cursor: pointer;
        transition: opacity 0.2s;

        &:hover {
          opacity: 0.8;
        }
      }
    }

    .actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      ion-button {
        margin: 0;
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }
  `]
})
export class MethodologyQuestionnaireComponent {
  private methodologyService = inject(TrainerMethodologyService);
  private haptic = inject(HapticService);

  // Outputs
  completed = output<void>();

  // Form state
  formData: CreateMethodologyInput = {
    training_philosophy: '',
    nutrition_approach: '',
    communication_style: '',
    key_phrases: [],
    avoid_phrases: []
  };

  keyPhrases = signal<string[]>([]);
  avoidPhrases = signal<string[]>([]);
  newKeyPhrase = '';
  newAvoidPhrase = '';
  saving = signal(false);

  constructor() {
    addIcons({ saveOutline, addCircleOutline, closeCircleOutline, informationCircleOutline });
  }

  addKeyPhrase(): void {
    const phrase = this.newKeyPhrase.trim();
    if (phrase && !this.keyPhrases().includes(phrase)) {
      this.keyPhrases.update(phrases => [...phrases, phrase]);
      this.formData.key_phrases = this.keyPhrases();
      this.newKeyPhrase = '';
      this.haptic.light();
    }
  }

  removeKeyPhrase(phrase: string): void {
    this.keyPhrases.update(phrases => phrases.filter(p => p !== phrase));
    this.formData.key_phrases = this.keyPhrases();
    this.haptic.light();
  }

  addAvoidPhrase(): void {
    const phrase = this.newAvoidPhrase.trim();
    if (phrase && !this.avoidPhrases().includes(phrase)) {
      this.avoidPhrases.update(phrases => [...phrases, phrase]);
      this.formData.avoid_phrases = this.avoidPhrases();
      this.newAvoidPhrase = '';
      this.haptic.light();
    }
  }

  removeAvoidPhrase(phrase: string): void {
    this.avoidPhrases.update(phrases => phrases.filter(p => p !== phrase));
    this.formData.avoid_phrases = this.avoidPhrases();
    this.haptic.light();
  }

  canSave(): boolean {
    // At minimum, require training philosophy and communication style
    return !!(
      this.formData.training_philosophy?.trim() &&
      this.formData.communication_style?.trim()
    );
  }

  async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }

    this.saving.set(true);

    try {
      // Check if methodology already exists
      const existing = await this.methodologyService.getMyMethodology();

      let success: boolean;
      if (existing) {
        // Update existing
        const result = await this.methodologyService.updateMethodology(this.formData);
        success = !!result;
      } else {
        // Create new
        const result = await this.methodologyService.createMethodology(this.formData);
        success = !!result;
      }

      if (success) {
        await this.haptic.success();
        this.completed.emit();
      } else {
        await this.haptic.error();
      }
    } catch (error) {
      console.error('Error saving methodology:', error);
      await this.haptic.error();
    } finally {
      this.saving.set(false);
    }
  }
}
