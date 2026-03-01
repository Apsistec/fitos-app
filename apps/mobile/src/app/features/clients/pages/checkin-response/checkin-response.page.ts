import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonTextarea,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  chevronBackOutline,
  checkmarkOutline,
  happyOutline,
  sadOutline,
} from 'ionicons/icons';
import {
  CheckinService,
  CheckinQuestion,
  CheckinResponse,
  CheckinAnswer,
  AnswerValue,
} from '../../../../core/services/checkin.service';

// ─── Emoji rating map ─────────────────────────────────────────────────────────
const MOOD_EMOJIS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😩', label: 'Rough',     color: '#EF4444' },
  2: { emoji: '😕', label: 'Tough',     color: '#F97316' },
  3: { emoji: '😐', label: 'Okay',      color: '#EAB308' },
  4: { emoji: '🙂', label: 'Good',      color: '#22C55E' },
  5: { emoji: '🤩', label: 'Amazing',   color: '#10B981' },
};

@Component({
  selector: 'app-checkin-response',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonProgressBar,
    IonTextarea,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          @if (currentIndex() > 0 && !isComplete()) {
            <ion-button (click)="goBack()">
              <ion-icon name="chevron-back-outline" slot="icon-only"></ion-icon>
            </ion-button>
          } @else if (!isComplete()) {
            <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
          }
        </ion-buttons>

        @if (!isComplete()) {
          <ion-progress-bar
            [value]="progress()"
            color="primary"
            class="question-progress"
          ></ion-progress-bar>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (isLoading()) {
        <div class="center-spinner">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
      } @else if (!response()) {
        <div class="no-checkin">
          <div class="no-checkin-icon">✅</div>
          <h2>All caught up!</h2>
          <p>No pending check-ins right now. Your trainer will send one soon.</p>
          <ion-button (click)="goHome()" fill="outline" class="go-home-btn">
            Back to Home
          </ion-button>
        </div>
      } @else if (isComplete()) {
        <!-- ── Completion screen ─────────────────────────────────────────── -->
        <div class="completion-screen">
          <div class="completion-confetti">
            @for (i of confettiDots; track i) {
              <div class="dot" [style.animation-delay]="(i * 0.1) + 's'"></div>
            }
          </div>
          <div class="completion-icon">🎉</div>
          <h1>Check-in complete!</h1>
          <p>Thanks for sharing. Your trainer will review your responses.</p>
          @if (submitting()) {
            <ion-spinner name="crescent" color="primary"></ion-spinner>
          }
          <ion-button (click)="goHome()" fill="outline" class="go-home-btn" [disabled]="submitting()">
            Back to Home
          </ion-button>
        </div>
      } @else {
        <!-- ── Question screen ───────────────────────────────────────────── -->
        <div class="question-screen" [class.slide-in]="!transitioning()">
          <div class="q-counter">
            Question {{ currentIndex() + 1 }} of {{ totalQuestions() }}
          </div>

          <div class="q-text">{{ currentQuestion()?.text }}</div>

          @if (currentQuestion()?.type === 'rating') {
            <!-- ── Emoji rating ───────────────────────────────────────── -->
            <div class="emoji-grid">
              @for (entry of moodEntries; track entry.value) {
                <button
                  class="emoji-btn"
                  [class.selected]="currentAnswer() === entry.value"
                  [style.--btn-color]="entry.color"
                  (click)="selectRating(entry.value)"
                >
                  <span class="emoji">{{ entry.emoji }}</span>
                  <span class="emoji-label">{{ entry.label }}</span>
                </button>
              }
            </div>
          }

          @if (currentQuestion()?.type === 'text') {
            <!-- ── Free text ──────────────────────────────────────────── -->
            <ion-textarea
              [value]="(currentAnswer() as string) ?? ''"
              (ionInput)="setAnswer($event.detail.value ?? '')"
              placeholder="Type your answer here…"
              rows="5"
              autoGrow
              class="text-answer"
            ></ion-textarea>
          }

          @if (currentQuestion()?.type === 'yes_no') {
            <!-- ── Yes / No ───────────────────────────────────────────── -->
            <div class="yes-no-row">
              <button
                class="yn-btn yes"
                [class.selected]="currentAnswer() === true"
                (click)="setAnswer(true)"
              >
                👍 Yes
              </button>
              <button
                class="yn-btn no"
                [class.selected]="currentAnswer() === false"
                (click)="setAnswer(false)"
              >
                👎 No
              </button>
            </div>
          }

          <!-- ── Navigation ─────────────────────────────────────────────── -->
          <div class="nav-row">
            @if (!currentQuestion()?.required || hasAnswer()) {
              <ion-button
                expand="block"
                [color]="isLastQuestion() ? 'success' : 'primary'"
                class="next-btn"
                (click)="advance()"
              >
                @if (isLastQuestion()) {
                  <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                  Submit
                } @else {
                  Next
                  <ion-icon name="chevron-forward-outline" slot="end"></ion-icon>
                }
              </ion-button>
            } @else {
              <ion-button expand="block" fill="outline" color="medium" class="next-btn" disabled>
                Please answer to continue
              </ion-button>
            }

            @if (!currentQuestion()?.required) {
              <ion-button
                expand="block"
                fill="clear"
                color="medium"
                size="small"
                (click)="skip()"
              >
                Skip this question
              </ion-button>
            }
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .question-progress {
      --background: rgba(255,255,255,0.08);
      --progress-background: var(--fitos-accent-primary, #10B981);
      height: 3px;
      border-radius: 2px;
      margin: 4px 16px;
    }

    /* ── Loading ─────────────── */
    .center-spinner {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── No checkin ──────────── */
    .no-checkin {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px;
      gap: 12px;
      &-icon { font-size: 64px; }
      h2 { font-size: 24px; font-weight: 800; margin: 0; }
      p { font-size: 15px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0; }
    }

    /* ── Completion ──────────── */
    .completion-screen {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px;
      gap: 16px;
      position: relative;
      overflow: hidden;
    }

    .completion-icon { font-size: 80px; animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
    h1 { font-size: 28px; font-weight: 900; margin: 0; }
    .completion-screen p { font-size: 15px; color: var(--fitos-text-secondary, #A3A3A3); max-width: 260px; }

    @keyframes pop {
      0%   { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Confetti dots */
    .completion-confetti { position: absolute; inset: 0; pointer-events: none; }
    .dot {
      position: absolute;
      width: 10px; height: 10px;
      border-radius: 50%;
      animation: confetti-fall 1.2s ease-out forwards;
      &:nth-child(1)  { left: 10%;  background: #10B981; top: -20px; }
      &:nth-child(2)  { left: 25%;  background: #8B5CF6; top: -20px; }
      &:nth-child(3)  { left: 40%;  background: #F59E0B; top: -20px; }
      &:nth-child(4)  { left: 55%;  background: #EF4444; top: -20px; }
      &:nth-child(5)  { left: 70%;  background: #3B82F6; top: -20px; }
      &:nth-child(6)  { left: 85%;  background: #10B981; top: -20px; }
    }
    @keyframes confetti-fall {
      0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
      100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
    }

    .go-home-btn { margin-top: 8px; }

    /* ── Question screen ────── */
    .question-screen {
      padding: 32px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-height: 100%;
    }

    .slide-in {
      animation: slide-in 0.25s ease-out;
    }
    @keyframes slide-in {
      from { transform: translateX(30px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    .q-counter {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--fitos-accent-primary, #10B981);
    }

    .q-text {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.35;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    /* ── Emoji grid ────────── */
    .emoji-grid {
      display: flex;
      gap: 10px;
      justify-content: space-between;
      flex-wrap: nowrap;
    }

    .emoji-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 8px;
      border-radius: 14px;
      background: rgba(255,255,255,0.04);
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;

      &.selected {
        background: color-mix(in srgb, var(--btn-color) 15%, transparent);
        border-color: var(--btn-color);
      }

      .emoji { font-size: 28px; }
      .emoji-label { font-size: 11px; font-weight: 700; color: var(--fitos-text-secondary, #A3A3A3); }
    }

    /* ── Text answer ───────── */
    .text-answer {
      --background: rgba(255,255,255,0.04);
      --border-radius: 14px;
      --padding-start: 14px;
      --padding-end: 14px;
      --padding-top: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      font-size: 16px;
    }

    /* ── Yes / No ────────────── */
    .yes-no-row {
      display: flex;
      gap: 16px;
    }

    .yn-btn {
      flex: 1;
      padding: 20px;
      border-radius: 16px;
      font-size: 18px;
      font-weight: 800;
      border: 2px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      color: var(--fitos-text-primary, #F5F5F5);
      cursor: pointer;
      transition: all 0.15s ease;

      &.yes.selected { background: rgba(16,185,129,0.15); border-color: #10B981; }
      &.no.selected  { background: rgba(239,68,68,0.12);  border-color: #EF4444; }
    }

    /* ── Nav row ────────────── */
    .nav-row { display: flex; flex-direction: column; gap: 4px; margin-top: auto; }
    .next-btn { --border-radius: 14px; font-weight: 800; }
  `],
})
export class CheckinResponsePage implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private toastCtrl  = inject(ToastController);
  checkinService     = inject(CheckinService);

  readonly moodEntries = Object.entries(MOOD_EMOJIS).map(([k, v]) => ({
    value: Number(k),
    ...v,
  }));
  readonly confettiDots = [1, 2, 3, 4, 5, 6];

  isLoading    = signal(true);
  submitting   = signal(false);
  isComplete   = signal(false);
  transitioning = signal(false);

  response     = signal<CheckinResponse | null>(null);
  currentIndex = signal(0);
  answers      = signal<Map<string, AnswerValue>>(new Map());

  totalQuestions = computed(() =>
    this.response()?.questions_snapshot.length ?? 0
  );

  progress = computed(() =>
    this.totalQuestions() > 0
      ? (this.currentIndex() + 1) / this.totalQuestions()
      : 0
  );

  currentQuestion = computed((): CheckinQuestion | null => {
    const qs = this.response()?.questions_snapshot ?? [];
    return qs[this.currentIndex()] ?? null;
  });

  currentAnswer = computed((): AnswerValue | undefined => {
    const q = this.currentQuestion();
    if (!q) return undefined;
    return this.answers().get(q.id);
  });

  hasAnswer = computed(() => {
    const a = this.currentAnswer();
    if (a === undefined || a === null) return false;
    if (typeof a === 'string') return a.trim().length > 0;
    return true;
  });

  isLastQuestion = computed(
    () => this.currentIndex() === this.totalQuestions() - 1
  );

  constructor() {
    addIcons({ chevronForwardOutline, chevronBackOutline, checkmarkOutline, happyOutline, sadOutline });
  }

  async ngOnInit(): Promise<void> {
    const responseId = this.route.snapshot.paramMap.get('id');

    if (responseId) {
      const r = await this.checkinService.loadCheckinById(responseId);
      this.response.set(r);
    } else {
      await this.checkinService.loadPendingCheckin();
      this.response.set(this.checkinService.pendingResponse());
    }

    this.isLoading.set(false);
  }

  // ── Answer management ─────────────────────────────────────────────────────

  selectRating(value: number): void {
    const q = this.currentQuestion();
    if (!q) return;
    const map = new Map(this.answers());
    map.set(q.id, value);
    this.answers.set(map);
    Haptics.impact({ style: ImpactStyle.Light });
  }

  setAnswer(value: AnswerValue): void {
    const q = this.currentQuestion();
    if (!q) return;
    const map = new Map(this.answers());
    map.set(q.id, value);
    this.answers.set(map);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  advance(): void {
    if (this.isLastQuestion()) {
      this.submit();
    } else {
      this.transitioning.set(true);
      setTimeout(() => {
        this.currentIndex.update((i) => i + 1);
        this.transitioning.set(false);
      }, 50);
      Haptics.impact({ style: ImpactStyle.Light });
    }
  }

  skip(): void {
    if (!this.isLastQuestion()) {
      this.currentIndex.update((i) => i + 1);
    } else {
      this.submit();
    }
  }

  goBack(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update((i) => i - 1);
    }
  }

  goHome(): void {
    this.router.navigate(['/tabs/dashboard'], { replaceUrl: true });
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  private async submit(): Promise<void> {
    const r = this.response();
    if (!r || this.submitting()) return;

    this.submitting.set(true);
    this.isComplete.set(true);    // Show completion screen immediately

    await Haptics.impact({ style: ImpactStyle.Heavy });

    const answerList: CheckinAnswer[] = Array.from(this.answers().entries()).map(
      ([question_id, value]) => ({ question_id, value })
    );

    const ok = await this.checkinService.submitResponse(r.id, answerList);
    this.submitting.set(false);

    if (!ok) {
      const toast = await this.toastCtrl.create({
        message:  'Submission failed. Please try again.',
        color:    'warning',
        duration: 3000,
        position: 'bottom',
      });
      await toast.present();
      this.isComplete.set(false);
    }
  }
}
