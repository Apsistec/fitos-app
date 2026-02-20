import {
  Component,
  inject,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonTextarea,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  closeOutline,
  checkmarkOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import {
  ProgressiveProfilingService,
} from '../../../../core/services/progressive-profiling.service';

/**
 * ProfilingPromptComponent
 * Sprint 53.2 — Phase 4D Smart Engagement
 *
 * Shows 1-2 progressive profiling questions on the dashboard after onboarding.
 * • One question at a time, cycling through them
 * • Dismissible (questions preserved for next session)
 * • Pre-built answer options for structured questions; free-text fallback
 * • Max 1-2 questions per session; hidden automatically when complete
 *
 * Usage:
 *   <app-profiling-prompt></app-profiling-prompt>
 */

interface QuestionConfig {
  type: 'select' | 'text';
  options?: string[];
  placeholder?: string;
}

const QUESTION_CONFIGS: Record<string, QuestionConfig> = {
  preferred_workout_time: {
    type: 'select',
    options: ['Early morning (5–8 AM)', 'Morning (8–11 AM)', 'Midday (11 AM–1 PM)', 'Afternoon (1–5 PM)', 'Evening (5–8 PM)', 'Night (8 PM+)'],
  },
  equipment_access: {
    type: 'select',
    options: ['Full gym', 'Home gym (some equipment)', 'Bodyweight only', 'Resistance bands', 'Dumbbells only'],
  },
  fitness_experience: {
    type: 'select',
    options: ['Less than 3 months', '3–12 months', '1–3 years', '3–5 years', '5+ years'],
  },
  primary_barrier: {
    type: 'select',
    options: ['Lack of time', 'Low energy/motivation', 'Not knowing what to do', 'Soreness or injury', 'Life gets in the way'],
  },
  support_style: {
    type: 'select',
    options: ['Accountability check-ins', 'Detailed feedback on form', 'Encouragement & celebration', 'Just track my numbers', 'Challenge me to push harder'],
  },
  injury_history: {
    type: 'text',
    placeholder: 'e.g. lower back, left knee (or "none")',
  },
  diet_style: {
    type: 'select',
    options: ['Trying to eat healthier', 'Tracking macros already', 'Meal prepping', 'No structure yet', 'Following a specific diet (keto, vegan, etc.)'],
  },
  social_sharing: {
    type: 'select',
    options: ['Yes, share everything', 'Share workouts only', 'Keep it private'],
  },
};

@Component({
  selector: 'app-profiling-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonTextarea,
    IonItem,
    IonSelect,
    IonSelectOption
],
  template: `
    @if (profilingService.isShowing() && currentQuestion()) {
      <ion-card class="profiling-card">
        <ion-card-content>
          <!-- Header -->
          <div class="prompt-header">
            <div class="prompt-badge">
              <ion-icon name="sparkles-outline"></ion-icon>
              <span>Quick Question</span>
            </div>
            <ion-button
              fill="clear"
              size="small"
              class="dismiss-btn"
              (click)="dismiss()"
              [disabled]="submitting()"
            >
              <ion-icon name="close-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>

          <!-- Progress dots -->
          @if (totalQuestions() > 1) {
            <div class="progress-dots">
              @for (q of allQuestions(); track q.id) {
                <div
                  class="dot"
                  [class.dot--active]="q.id === currentQuestion()!.id"
                  [class.dot--done]="answeredIds().has(q.id)"
                ></div>
              }
            </div>
          }

          <!-- Question -->
          <p class="question-text">{{ currentQuestion()!.question_text }}</p>

          <!-- Answer Input -->
          @if (questionConfig()?.type === 'select') {
            <ion-item class="select-item" lines="none">
              <ion-select
                [(ngModel)]="selectedAnswer"
                placeholder="Choose an answer…"
                class="answer-select"
                interface="action-sheet"
              >
                @for (opt of questionConfig()!.options!; track opt) {
                  <ion-select-option [value]="opt">{{ opt }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
          } @else {
            <ion-item class="textarea-item" lines="none">
              <ion-textarea
                [(ngModel)]="textAnswer"
                [placeholder]="questionConfig()?.placeholder ?? 'Type your answer…'"
                rows="2"
                class="answer-textarea"
                autoGrow="true"
              ></ion-textarea>
            </ion-item>
          }

          <!-- Actions -->
          <div class="prompt-actions">
            <ion-button
              fill="clear"
              size="small"
              class="skip-btn"
              (click)="skipCurrent()"
              [disabled]="submitting()"
            >
              Skip
            </ion-button>

            <ion-button
              expand="block"
              size="small"
              class="submit-btn"
              [disabled]="!hasAnswer() || submitting()"
              (click)="submitCurrent()"
            >
              @if (submitting()) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
              } @else {
                @if (isLastQuestion()) {
                  Done
                  <ion-icon name="checkmark-outline" slot="end"></ion-icon>
                } @else {
                  Next
                  <ion-icon name="chevron-forward-outline" slot="end"></ion-icon>
                }
              }
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: [`
    .profiling-card {
      margin: 0 0 16px;
      border-radius: 16px;
      background: linear-gradient(
        135deg,
        rgba(16, 185, 129, 0.06) 0%,
        rgba(139, 92, 246, 0.06) 100%
      );
      border: 1px solid rgba(16, 185, 129, 0.15);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);

      ion-card-content {
        padding: 16px;
      }
    }

    .prompt-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .prompt-badge {
      display: flex;
      align-items: center;
      gap: 6px;

      ion-icon {
        color: var(--fitos-accent-secondary, #8B5CF6);
        font-size: 14px;
      }

      span {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--fitos-accent-secondary, #8B5CF6);
      }
    }

    .dismiss-btn {
      --color: var(--fitos-text-tertiary, #737373);
      --padding-start: 4px;
      --padding-end: 4px;
      margin: 0;
      height: 28px;
      width: 28px;
    }

    .progress-dots {
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      transition: all 200ms ease;

      &.dot--active {
        width: 18px;
        border-radius: 3px;
        background: var(--ion-color-primary, #10B981);
      }

      &.dot--done {
        background: rgba(16, 185, 129, 0.4);
      }
    }

    .question-text {
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      line-height: 1.4;
    }

    .select-item,
    .textarea-item {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 10px;
      --padding-start: 0;
      --inner-padding-end: 0;
      border-radius: 10px;
      margin-bottom: 16px;
    }

    .answer-select {
      width: 100%;
      font-size: 14px;
      --padding-start: 14px;
      --padding-end: 14px;
      --padding-top: 12px;
      --padding-bottom: 12px;
    }

    .answer-textarea {
      --padding-start: 14px;
      --padding-end: 14px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      font-size: 14px;
      --color: var(--fitos-text-primary, #F5F5F5);
      --placeholder-color: var(--fitos-text-tertiary, #737373);
    }

    .prompt-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .skip-btn {
      --color: var(--fitos-text-tertiary, #737373);
      font-size: 13px;
      height: 36px;
      flex-shrink: 0;
    }

    .submit-btn {
      flex: 1;
      --border-radius: 8px;
      height: 40px;
      font-weight: 700;
      font-size: 14px;
    }
  `],
})
export class ProfilingPromptComponent implements OnInit {
  profilingService = inject(ProgressiveProfilingService);

  // State
  submitting     = signal(false);
  selectedAnswer = '';
  textAnswer     = '';
  answeredIds    = signal<Set<string>>(new Set());
  currentIndex   = signal(0);

  allQuestions = this.profilingService.currentQuestions;

  currentQuestion = () => {
    const qs = this.allQuestions();
    const idx = this.currentIndex();
    return qs[idx] ?? null;
  };

  totalQuestions = () => this.allQuestions().length;

  isLastQuestion = () => this.currentIndex() >= this.allQuestions().length - 1;

  questionConfig = (): QuestionConfig | null => {
    const q = this.currentQuestion();
    if (!q) return null;
    return QUESTION_CONFIGS[q.question_key] ?? { type: 'text', placeholder: 'Type your answer…' };
  };

  hasAnswer = (): boolean => {
    const cfg = this.questionConfig();
    if (!cfg) return false;
    return cfg.type === 'select' ? !!this.selectedAnswer : this.textAnswer.trim().length > 0;
  };

  constructor() {
    addIcons({ sparklesOutline, closeOutline, checkmarkOutline, chevronForwardOutline });
  }

  async ngOnInit(): Promise<void> {
    const shouldShow = await this.profilingService.shouldShowProfiling();
    if (shouldShow) {
      await this.profilingService.startSession();
    }
  }

  async submitCurrent(): Promise<void> {
    const q = this.currentQuestion();
    if (!q || !this.hasAnswer()) return;

    this.submitting.set(true);

    const cfg = this.questionConfig();
    const answer = cfg?.type === 'select' ? this.selectedAnswer : this.textAnswer.trim();

    await this.profilingService.submitAnswer(q.id, answer);

    // Track answered
    this.answeredIds.update(ids => new Set([...ids, q.id]));

    this.submitting.set(false);
    this.resetInputs();

    // Advance to next question in the session list
    // (submitAnswer removes from currentQuestions, so index stays 0 for next)
    // profilingService.currentQuestions signal already updated
  }

  async skipCurrent(): Promise<void> {
    const q = this.currentQuestion();
    if (!q) return;

    await this.profilingService.skipQuestion(q.id);
    this.resetInputs();
  }

  dismiss(): void {
    this.profilingService.dismiss();
    this.resetInputs();
  }

  private resetInputs(): void {
    this.selectedAnswer = '';
    this.textAnswer = '';
  }
}
