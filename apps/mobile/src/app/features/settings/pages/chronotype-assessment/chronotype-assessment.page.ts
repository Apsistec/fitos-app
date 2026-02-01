import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonRadioGroup,
  IonRadio,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonIcon,
  IonProgressBar,
  IonChip,
  IonBackButton,
  IonButtons,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sunnyOutline,
  moonOutline,
  timeOutline,
  checkmarkCircle,
  arrowForward,
  arrowBack,
  informationCircle,
} from 'iconicons/icons';
import {
  ChronotypeService,
  ChronotypeQuestion,
  ChronotypeResult,
} from '../../../../core/services/chronotype.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LoadingService } from '../../../../core/services/loading.service';

/**
 * Chronotype Assessment Page
 *
 * 5-question MEQ-based assessment to determine user's chronotype
 * (morning person, evening person, or intermediate).
 *
 * Sprint 35: Chronotype Optimization
 */
@Component({
  selector: 'app-chronotype-assessment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonRadioGroup,
    IonRadio,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonIcon,
    IonProgressBar,
    IonChip,
    IonBackButton,
    IonButtons,
    IonText,
  ],
  styles: [
    `
      ion-header {
        ion-toolbar {
          --background: transparent;
          --border-width: 0;

          ion-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: -0.3px;
          }
        }
      }

      ion-content {
        --background: var(--fitos-bg-primary, #0D0D0D);
      }

      .assessment-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 16px;
      }

      .intro-section {
        text-align: center;
        margin-bottom: 24px;

        h1 {
          color: var(--fitos-text-primary, #F5F5F5);
          font-weight: 700;
        }

        p {
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }

      .intro-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }

      ion-card {
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

      .question-card {
        margin-bottom: 16px;
      }

      .question-number {
        font-weight: 600;
        color: var(--ion-color-primary, #10B981);
      }

      .option-item {
        --background: transparent;
        margin-bottom: 8px;
        --padding-start: 16px;
      }

      ion-list {
        background: transparent;
      }

      .progress-text {
        text-align: center;
        margin-bottom: 16px;
        font-size: 14px;
        color: var(--fitos-text-tertiary, #737373);
      }

      .results-section {
        text-align: center;

        h1 {
          color: var(--fitos-text-primary, #F5F5F5);
          font-weight: 700;
        }

        p {
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }

      .chronotype-category {
        font-size: 28px;
        font-weight: 700;
        margin: 16px 0;
        color: var(--ion-color-primary, #10B981);
      }

      .score-badge {
        display: inline-block;
        padding: 8px 16px;
        background: var(--fitos-bg-tertiary, #262626);
        border-radius: 16px;
        margin: 16px 0;
        font-family: 'Space Mono', monospace;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .insights-list {
        text-align: left;
        margin-top: 24px;

        h3 {
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      .insight-item {
        margin-bottom: 12px;
        padding: 12px;
        background: var(--fitos-bg-tertiary, #262626);
        border-radius: 8px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      .insight-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .recommendation-chip {
        margin: 4px;
      }

      ion-button[size="large"] {
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    `,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Chronotype Assessment</ion-title>
      </ion-toolbar>
      @if (!showResults()) {
        <ion-progress-bar [value]="progress()"></ion-progress-bar>
      }
    </ion-header>

    <ion-content>
      <div class="assessment-container">
        @if (loading()) {
          <div class="intro-section">
            <ion-spinner name="circular"></ion-spinner>
            <p>Loading assessment...</p>
          </div>
        } @else if (!started() && !showResults()) {
          <!-- Introduction -->
          <div class="intro-section">
            <ion-icon [icon]="timeOutline" class="intro-icon"></ion-icon>
            <h1>Discover Your Chronotype</h1>
            <p>
              Your chronotype determines when you naturally feel most alert and
              energetic. Understanding it can help optimize your workout timing
              for peak performance.
            </p>

            <ion-card>
              <ion-card-header>
                <ion-card-title>What You'll Learn</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ul>
                  <li>Your natural sleep-wake preference</li>
                  <li>Optimal workout timing (up to 8.4% performance difference)</li>
                  <li>Peak performance windows</li>
                  <li>Personalized training recommendations</li>
                </ul>
              </ion-card-content>
            </ion-card>

            <ion-button expand="block" size="large" (click)="startAssessment()">
              <ion-icon slot="start" [icon]="arrowForward"></ion-icon>
              Start Assessment (2 minutes)
            </ion-button>

            <p class="ion-text-center ion-margin-top">
              <ion-text color="medium">
                <ion-icon [icon]="informationCircle"></ion-icon>
                5 quick questions based on the validated MEQ assessment
              </ion-text>
            </p>
          </div>
        } @else if (started() && !showResults()) {
          <!-- Questions -->
          <p class="progress-text">
            Question {{ currentQuestionIndex() + 1 }} of {{ totalQuestions() }}
          </p>

          @if (currentQuestion(); as question) {
            <ion-card class="question-card">
              <ion-card-header>
                <ion-card-subtitle>
                  <span class="question-number">Q{{ currentQuestionIndex() + 1 }}</span>
                </ion-card-subtitle>
                <ion-card-title>{{ question.text }}</ion-card-title>
              </ion-card-header>

              <ion-card-content>
                <ion-radio-group
                  [value]="responses()[question.id]"
                  (ionChange)="selectOption(question.id, $event.detail.value)"
                >
                  <ion-list>
                    @for (option of question.options; track option.value) {
                      <ion-item class="option-item" lines="none">
                        <ion-radio slot="start" [value]="option.value"></ion-radio>
                        <ion-label>{{ option.text }}</ion-label>
                      </ion-item>
                    }
                  </ion-list>
                </ion-radio-group>
              </ion-card-content>
            </ion-card>

            <div class="ion-margin-top">
              @if (currentQuestionIndex() > 0) {
                <ion-button fill="outline" (click)="previousQuestion()">
                  <ion-icon slot="start" [icon]="arrowBack"></ion-icon>
                  Previous
                </ion-button>
              }

              @if (canProceed()) {
                <ion-button
                  class="ion-float-right"
                  (click)="nextQuestion()"
                  [disabled]="!hasAnswer()"
                >
                  @if (isLastQuestion()) {
                    <ion-icon slot="start" [icon]="checkmarkCircle"></ion-icon>
                    Finish
                  } @else {
                    Next
                    <ion-icon slot="end" [icon]="arrowForward"></ion-icon>
                  }
                </ion-button>
              }
            </div>
          }
        } @else if (showResults() && result()) {
          <!-- Results -->
          <div class="results-section">
            <ion-icon
              [icon]="result()!.category.includes('morning') ? sunnyOutline : moonOutline"
              class="intro-icon"
              [color]="result()!.category.includes('morning') ? 'warning' : 'primary'"
            ></ion-icon>

            <h1>Your Chronotype</h1>

            <div class="chronotype-category">
              {{ chronotypeService.getChronotypeLabel(result()!.category) }}
            </div>

            <div class="score-badge">
              <strong>Score:</strong> {{ result()!.score }} / 86
              <br />
              <ion-text color="medium">
                <small>Confidence: {{ (result()!.confidence * 100).toFixed(0) }}%</small>
              </ion-text>
            </div>

            <p>{{ result()!.description }}</p>

            <!-- Peak Performance Window -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>⏰ Your Peak Performance Window</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <h3>
                  {{
                    chronotypeService.formatTime(result()!.peak_performance_window.start)
                  }}
                  -
                  {{
                    chronotypeService.formatTime(result()!.peak_performance_window.end)
                  }}
                </h3>
                <p>Schedule strength and power training during this window for best results.</p>
              </ion-card-content>
            </ion-card>

            <!-- Strengths -->
            @if (result()!.strengths.length > 0) {
              <div class="insights-list">
                <h3>✨ Your Strengths</h3>
                @for (strength of result()!.strengths; track strength) {
                  <div class="insight-item">{{ strength }}</div>
                }
              </div>
            }

            <!-- Challenges -->
            @if (result()!.challenges.length > 0) {
              <div class="insights-list">
                <h3>⚠️ Challenges</h3>
                @for (challenge of result()!.challenges; track challenge) {
                  <div class="insight-item">{{ challenge }}</div>
                }
              </div>
            }

            <!-- Recommendations -->
            @if (result()!.recommendations.length > 0) {
              <div class="insights-list">
                <h3>💡 Recommendations</h3>
                @for (rec of result()!.recommendations; track rec) {
                  <ion-chip class="recommendation-chip">{{ rec }}</ion-chip>
                }
              </div>
            }

            <ion-button expand="block" size="large" class="ion-margin-top" (click)="saveAndExit()">
              <ion-icon slot="start" [icon]="checkmarkCircle"></ion-icon>
              Save Results
            </ion-button>

            <ion-button expand="block" fill="outline" (click)="retakeAssessment()">
              Retake Assessment
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
})
export class ChronotypeAssessmentPage {
  private readonly chronotypeService = inject(ChronotypeService);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  // Icons
  readonly timeOutline = timeOutline;
  readonly sunnyOutline = sunnyOutline;
  readonly moonOutline = moonOutline;
  readonly checkmarkCircle = checkmarkCircle;
  readonly arrowForward = arrowForward;
  readonly arrowBack = arrowBack;
  readonly informationCircle = informationCircle;

  // State
  readonly loading = signal(false);
  readonly started = signal(false);
  readonly questions = signal<ChronotypeQuestion[]>([]);
  readonly currentQuestionIndex = signal(0);
  readonly responses = signal<Record<string, number>>({});
  readonly showResults = signal(false);
  readonly result = signal<ChronotypeResult | null>(null);

  // Computed
  readonly currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()]);
  readonly totalQuestions = computed(() => this.questions().length);
  readonly progress = computed(() => (this.currentQuestionIndex() + 1) / this.totalQuestions());
  readonly hasAnswer = computed(() => {
    const question = this.currentQuestion();
    return question ? this.responses()[question.id] !== undefined : false;
  });
  readonly isLastQuestion = computed(
    () => this.currentQuestionIndex() === this.totalQuestions() - 1
  );
  readonly canProceed = computed(() => this.hasAnswer());

  constructor() {
    addIcons({
      timeOutline,
      sunnyOutline,
      moonOutline,
      checkmarkCircle,
      arrowForward,
      arrowBack,
      informationCircle,
    });
  }

  /**
   * Start the assessment
   */
  async startAssessment(): Promise<void> {
    this.loading.set(true);
    try {
      const questions = await this.chronotypeService.getAssessmentQuestions();
      this.questions.set(questions);
      this.started.set(true);
      this.currentQuestionIndex.set(0);
      this.responses.set({});
    } catch (error) {
      console.error('Error starting assessment:', error);
      alert('Failed to load assessment. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Select an option for current question
   */
  selectOption(questionId: string, value: number): void {
    this.responses.update((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  /**
   * Go to next question
   */
  async nextQuestion(): Promise<void> {
    if (this.isLastQuestion()) {
      await this.calculateResults();
    } else {
      this.currentQuestionIndex.update((i) => i + 1);
    }
  }

  /**
   * Go to previous question
   */
  previousQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update((i) => i - 1);
    }
  }

  /**
   * Calculate chronotype results
   */
  async calculateResults(): Promise<void> {
    await this.loadingService.show('Calculating your chronotype...');
    try {
      const result = await this.chronotypeService.assessChronotype(this.responses());
      this.result.set(result);
      this.showResults.set(true);
    } catch (error) {
      console.error('Error calculating chronotype:', error);
      alert('Failed to calculate results. Please try again.');
    } finally {
      await this.loadingService.hide();
    }
  }

  /**
   * Save results and exit
   */
  async saveAndExit(): Promise<void> {
    const user = this.authService.user();
    if (!user || !this.result()) return;

    await this.loadingService.show('Saving your chronotype...');
    try {
      await this.chronotypeService.saveUserChronotype(
        user.id,
        this.result()!,
        this.responses()
      );
      await this.loadingService.hide();
      this.router.navigate(['/settings'], {
        queryParams: { message: 'Chronotype assessment saved successfully!' },
      });
    } catch (error) {
      console.error('Error saving chronotype:', error);
      await this.loadingService.hide();
      alert('Failed to save results. Please try again.');
    }
  }

  /**
   * Retake the assessment
   */
  retakeAssessment(): void {
    this.started.set(false);
    this.showResults.set(false);
    this.result.set(null);
    this.responses.set({});
    this.currentQuestionIndex.set(0);
  }
}
