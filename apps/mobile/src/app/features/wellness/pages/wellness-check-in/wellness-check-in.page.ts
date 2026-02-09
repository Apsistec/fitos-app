import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRadioGroup,
  IonRadio,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonIcon,
  IonChip,
  IonBackButton,
  IonButtons,
  IonProgressBar,
  IonAlert,
  IonSpinner,
  AlertController,
  LoadingController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  warning,
  informationCircle,
  checkmarkCircle,
  call,
  chatbubble,
  medkit,
  fitness,
  shieldCheckmark,
} from 'ionicons/icons';

import {
  WellnessService,
  ScreeningQuestion,
  ScreeningResult,
  ScreeningType,
  WorkoutPlan,
  CrisisResource,
} from '../../../../core/services/wellness.service';

/**
 * Wellness Check-In Page
 *
 * PHQ-2/GAD-2 validated mental health screening with safety guardrails.
 * Exercise recommendations and crisis resources.
 *
 * ⚠️ DISCLAIMER: For informational purposes only. Not medical advice.
 *
 * Sprint 37: Mental Health Integration
 */

@Component({
  selector: 'app-wellness-check-in',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonRadioGroup,
    IonRadio,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonIcon,
    IonChip,
    IonBackButton,
    IonButtons,
    IonProgressBar,
    IonAlert,
    IonSpinner,
  ],
  templateUrl: './wellness-check-in.page.html',
  styleUrls: ['./wellness-check-in.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WellnessCheckInPage implements OnInit {
  private readonly wellnessService = inject(WellnessService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly loadingController = inject(LoadingController);

  // State
  readonly step = signal<'intro' | 'questions' | 'results' | 'workouts' | 'resources'>('intro');
  readonly screeningType = signal<ScreeningType>('combined');
  readonly questions = signal<ScreeningQuestion[]>([]);
  readonly responses = signal<Record<string, number>>({});
  readonly currentQuestionIndex = signal<number>(0);
  readonly result = signal<ScreeningResult | null>(null);
  readonly workoutPlan = signal<WorkoutPlan | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Computed
  readonly currentQuestion = computed(() => {
    const questions = this.questions();
    const index = this.currentQuestionIndex();
    return questions[index] || null;
  });

  readonly progress = computed(() => {
    const questions = this.questions();
    const index = this.currentQuestionIndex();
    if (questions.length === 0) return 0;
    return (index + 1) / questions.length;
  });

  readonly allQuestionsAnswered = computed(() => {
    const questions = this.questions();
    const responses = this.responses();
    return questions.every((q) => responses[q.id] !== undefined);
  });

  readonly severityColor = computed(() => {
    const result = this.result();
    if (!result) return 'medium';
    return this.wellnessService.getSeverityColor(result.severity);
  });

  constructor() {
    addIcons({
      warning,
      informationCircle,
      checkmarkCircle,
      call,
      chatbubble,
      medkit,
      fitness,
      shieldCheckmark,
    });
  }

  async ngOnInit() {
    // Show intro step first
  }

  // =====================================================================
  // INTRO STEP
  // =====================================================================

  async startScreening() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.wellnessService.getScreeningQuestions(
        this.screeningType()
      );
      this.questions.set(data.questions);
      this.step.set('questions');
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load screening questions');
    } finally {
      this.loading.set(false);
    }
  }

  // =====================================================================
  // QUESTIONS STEP
  // =====================================================================

  selectAnswer(questionId: string, value: number) {
    const currentResponses = this.responses();
    this.responses.set({
      ...currentResponses,
      [questionId]: value,
    });
  }

  isAnswerSelected(questionId: string, value: number): boolean {
    const responses = this.responses();
    return responses[questionId] === value;
  }

  nextQuestion() {
    const index = this.currentQuestionIndex();
    const questions = this.questions();

    if (index < questions.length - 1) {
      this.currentQuestionIndex.set(index + 1);
    }
  }

  previousQuestion() {
    const index = this.currentQuestionIndex();
    if (index > 0) {
      this.currentQuestionIndex.set(index - 1);
    }
  }

  async submitScreening() {
    if (!this.allQuestionsAnswered()) {
      await this.showAlert(
        'Incomplete Screening',
        'Please answer all questions to complete the screening.'
      );
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Calculating results...',
    });
    await loading.present();

    try {
      const result = await this.wellnessService.assessScreening(
        this.screeningType(),
        this.responses()
      );
      this.result.set(result);

      // Check for crisis concern
      if (result.crisis_concern || result.severity === 'severe') {
        await this.showCrisisAlert(result);
      }

      this.step.set('results');
    } catch (err: any) {
      this.error.set(err.message || 'Failed to calculate screening results');
    } finally {
      await loading.dismiss();
    }
  }

  // =====================================================================
  // RESULTS STEP
  // =====================================================================

  async viewWorkoutRecommendations() {
    const result = this.result();
    if (!result) return;

    const loading = await this.loadingController.create({
      message: 'Loading workout recommendations...',
    });
    await loading.present();

    try {
      const plan = await this.wellnessService.getWorkoutRecommendations(
        result.severity,
        result.screening_type as ScreeningType,
        'sedentary' // TODO: Get from user profile
      );
      this.workoutPlan.set(plan);
      this.step.set('workouts');
    } catch (err: any) {
      await this.showAlert('Error', 'Failed to load workout recommendations');
    } finally {
      await loading.dismiss();
    }
  }

  viewCrisisResources() {
    this.step.set('resources');
  }

  async complete() {
    await this.router.navigate(['/tabs/dashboard']);
  }

  // =====================================================================
  // WORKOUTS STEP
  // =====================================================================

  getWorkoutIcon(type: string): string {
    return this.wellnessService.getWorkoutIcon(type as any);
  }

  formatWorkoutType(type: string): string {
    return this.wellnessService.formatWorkoutType(type as any);
  }

  formatIntensity(intensity: string): string {
    return this.wellnessService.formatIntensity(intensity as any);
  }

  backToResults() {
    this.step.set('results');
  }

  // =====================================================================
  // RESOURCES STEP
  // =====================================================================

  async callResource(resource: CrisisResource) {
    const phone = resource.phone;
    if (!phone) return;

    // Log access
    await this.wellnessService.logCrisisResourceAccess(
      resource.type,
      resource.name,
      resource.urgency,
      this.result()?.screening_type
    );

    // Confirm before calling
    const alert = await this.alertController.create({
      header: `Call ${resource.name}?`,
      message: phone,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Call',
          handler: () => {
            this.wellnessService.callEmergency(phone);
          },
        },
      ],
    });
    await alert.present();
  }

  async textResource(resource: CrisisResource) {
    const text = resource.text;
    if (!text) return;

    // Log access
    await this.wellnessService.logCrisisResourceAccess(
      resource.type,
      resource.name,
      resource.urgency,
      this.result()?.screening_type
    );

    // Confirm before texting
    const alert = await this.alertController.create({
      header: `Text ${resource.name}?`,
      message: `Send message to ${text}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Text',
          handler: () => {
            this.wellnessService.sendText(text);
          },
        },
      ],
    });
    await alert.present();
  }

  async visitWebsite(resource: CrisisResource) {
    if (!resource.website) return;

    // Log access
    await this.wellnessService.logCrisisResourceAccess(
      resource.type,
      resource.name,
      resource.urgency,
      this.result()?.screening_type
    );

    this.wellnessService.openWebsite(resource.website);
  }

  // =====================================================================
  // HELPERS
  // =====================================================================

  async showCrisisAlert(result: ScreeningResult) {
    const alert = await this.alertController.create({
      header: '🆘 Immediate Support Available',
      message:
        'Your screening indicates you may benefit from immediate support. Crisis resources are available 24/7. Would you like to view them now?',
      cssClass: 'crisis-alert',
      buttons: [
        {
          text: 'View Resources',
          handler: () => {
            this.step.set('resources');
          },
        },
        {
          text: 'Continue',
          role: 'cancel',
        },
      ],
    });
    await alert.present();
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  restart() {
    this.step.set('intro');
    this.responses.set({});
    this.currentQuestionIndex.set(0);
    this.result.set(null);
    this.workoutPlan.set(null);
    this.error.set(null);
  }
}
