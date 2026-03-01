/**
 * Sprint 68 — NpsResponsePage
 *
 * Client-facing full-page NPS survey.
 * Opened via push notification deep-link: /tabs/workouts/nps/:responseId
 * Also reachable via in-app notification card.
 *
 * Scale: 0–10 coloured gradient bar
 *   0–6  → Red/Orange (Detractor) → follow-up: "What can your trainer do to improve?"
 *   7–8  → Yellow (Passive)       → follow-up: "What would make it a 10?"
 *   9–10 → Green (Promoter)       → follow-up: "What do you love most?"
 */
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
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonTextarea,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  NpsService,
  NpsResponse,
  getNpsSegment,
  getScorePrompt,
} from '../../../../core/services/nps.service';

// ─── NPS scale metadata ───────────────────────────────────────────────────────

interface ScoreMeta {
  label: string;
  color: string;
  bg: string;
}

const SCORE_META: Record<number, ScoreMeta> = {
  0:  { label: 'Not at all likely',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  1:  { label: 'Not at all likely',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  2:  { label: 'Very unlikely',        color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  3:  { label: 'Unlikely',             color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  4:  { label: 'Somewhat unlikely',    color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
  5:  { label: 'Neutral',              color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
  6:  { label: 'Slightly unlikely',    color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
  7:  { label: 'Somewhat likely',      color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  8:  { label: 'Likely',               color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  9:  { label: 'Very likely',          color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  10: { label: 'Extremely likely',     color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

@Component({
  selector: 'app-nps-response',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonTextarea,
    IonProgressBar,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts"></ion-back-button>
        </ion-buttons>
        <ion-title>Quick Feedback</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (isLoading()) {
        <div class="loading-state">
          <ion-progress-bar type="indeterminate"></ion-progress-bar>
        </div>
      }

      @if (!isLoading() && !response()) {
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <h2>All caught up!</h2>
          <p>No pending feedback requests right now.</p>
        </div>
      }

      @if (!isLoading() && response(); as r) {
        <div class="nps-body" [style.--accent-color]="scoreMeta()?.color ?? '#6B7280'">

          <!-- ── Trainer greeting ───────────────────────────────────────── -->
          <div class="greeting-section">
            <div class="trainer-chip">{{ trainerInitial(r.trainer_name ?? '') }}</div>
            <h1 class="question">
              How likely are you to recommend <strong>{{ r.trainer_name }}</strong> to a friend?
            </h1>
            <p class="scale-hint">0 = Not at all likely · 10 = Extremely likely</p>
          </div>

          <!-- ── Score gradient bar ─────────────────────────────────────── -->
          <div class="score-section">
            <!-- Score pills 0–10 -->
            <div class="score-row">
              @for (n of scoreRange; track n) {
                <button
                  class="score-btn"
                  [class.selected]="selectedScore() === n"
                  [style.--btn-color]="SCORE_META[n].color"
                  (click)="selectScore(n)"
                  [attr.aria-label]="'Score ' + n"
                >
                  {{ n }}
                </button>
              }
            </div>

            <!-- Selected score feedback -->
            @if (selectedScore() !== null) {
              <div class="score-feedback" [style.background]="scoreMeta()!.bg">
                <span class="score-label" [style.color]="scoreMeta()!.color">
                  {{ selectedScore() }}/10 — {{ scoreMeta()!.label }}
                </span>
                <span class="score-segment">
                  @if (segment() === 'promoter')  { 🎉 Promoter  }
                  @if (segment() === 'passive')   { 😊 Passive   }
                  @if (segment() === 'detractor') { 💬 Detractor }
                </span>
              </div>
            }
          </div>

          <!-- ── Follow-up text ─────────────────────────────────────────── -->
          @if (selectedScore() !== null) {
            <div class="followup-section">
              <div class="followup-label">{{ followupPrompt() }}</div>
              <ion-textarea
                class="followup-textarea"
                placeholder="Your feedback helps us improve…"
                [value]="feedbackText()"
                (ionInput)="updateFeedback($event)"
                :rows="4"
                maxlength="300"
                autocapitalize="sentences"
              ></ion-textarea>
              <div class="char-count">{{ feedbackText().length }}/300</div>
            </div>
          }

          <!-- ── Submit / Skip ──────────────────────────────────────────── -->
          <div class="action-section">
            <ion-button
              expand="block"
              [disabled]="selectedScore() === null || isSubmitting()"
              (click)="submit()"
              class="submit-btn"
            >
              {{ isSubmitting() ? 'Submitting…' : 'Submit Feedback' }}
            </ion-button>
            <ion-button
              expand="block"
              fill="clear"
              color="medium"
              (click)="skip()"
            >
              Maybe Later
            </ion-button>
          </div>

        </div>
      }

      <!-- ── Completion screen ──────────────────────────────────────────── -->
      @if (submitted()) {
        <div class="completion-screen">
          <div class="completion-emoji">
            @if (segment() === 'promoter')  { 🎉 }
            @if (segment() === 'passive')   { 🙏 }
            @if (segment() === 'detractor') { 💪 }
          </div>
          <h2 class="completion-title">Thank you!</h2>
          <p class="completion-body">
            @if (segment() === 'promoter') {
              Your feedback means the world. Consider sharing your trainer with a friend!
            } @else if (segment() === 'passive') {
              Your feedback helps your trainer grow. They'll keep improving!
            } @else {
              Honest feedback is the best feedback. Your trainer wants to do better.
            }
          </p>
          <ion-button (click)="goHome()" fill="clear">Back to Home</ion-button>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 16px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .loading-state { position: absolute; top: 0; left: 0; right: 0; }

    /* ── Empty state ─── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 60vh; text-align: center; gap: 12px;
    }
    .empty-icon { font-size: 56px; }
    .empty-state h2 { font-size: 22px; font-weight: 900; margin: 0; }
    .empty-state p  { font-size: 15px; color: var(--fitos-text-secondary, #A3A3A3); }

    /* ── NPS body ─────── */
    .nps-body { padding: 24px 20px 48px; display: flex; flex-direction: column; gap: 28px; }

    /* ── Greeting ──────── */
    .greeting-section { display: flex; flex-direction: column; gap: 12px; }
    .trainer-chip {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(16,185,129,0.15); border: 2px solid rgba(16,185,129,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 900; color: #10B981;
    }
    .question {
      font-size: 22px; font-weight: 800; line-height: 1.3; margin: 0;
    }
    .question strong { color: var(--accent-color, #10B981); }
    .scale-hint { font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B); margin: 0; }

    /* ── Score bar ─────── */
    .score-section { display: flex; flex-direction: column; gap: 10px; }
    .score-row {
      display: flex; gap: 6px; flex-wrap: nowrap; justify-content: center;
    }
    .score-btn {
      flex: 1; min-width: 0; aspect-ratio: 1;
      max-width: 44px; height: 44px;
      border-radius: 10px;
      background: rgba(255,255,255,0.06);
      border: 1.5px solid rgba(255,255,255,0.08);
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 15px; font-weight: 700; cursor: pointer;
      transition: background 0.12s, transform 0.1s;
      &.selected {
        background: var(--btn-color, #10B981);
        border-color: var(--btn-color, #10B981);
        color: white;
        transform: scale(1.15);
      }
      &:active { transform: scale(0.92); }
    }

    .score-feedback {
      display: flex; align-items: center; justify-content: space-between;
      border-radius: 12px; padding: 10px 14px;
      animation: fade-in 0.2s ease;
    }
    .score-label { font-size: 14px; font-weight: 700; }
    .score-segment { font-size: 13px; }

    /* ── Follow-up ─────── */
    .followup-section { display: flex; flex-direction: column; gap: 8px; animation: fade-in 0.25s ease; }
    .followup-label { font-size: 15px; font-weight: 700; }
    .followup-textarea { --background: rgba(255,255,255,0.04); border-radius: 12px; }
    .char-count { font-size: 11px; color: var(--fitos-text-tertiary, #6B6B6B); text-align: right; }

    /* ── Actions ───────── */
    .action-section { display: flex; flex-direction: column; gap: 6px; }
    .submit-btn { --border-radius: 14px; }

    /* ── Completion ──────── */
    .completion-screen {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 80vh; text-align: center; gap: 16px; padding: 24px;
      animation: pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .completion-emoji { font-size: 72px; }
    .completion-title { font-size: 28px; font-weight: 900; margin: 0; }
    .completion-body  { font-size: 16px; color: var(--fitos-text-secondary, #A3A3A3); max-width: 280px; line-height: 1.5; }

    @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes pop-in  { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class NpsResponsePage implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private npsService = inject(NpsService);

  readonly SCORE_META  = SCORE_META;
  readonly scoreRange  = Array.from({ length: 11 }, (_, i) => i);  // 0–10

  response      = signal<NpsResponse | null>(null);
  selectedScore = signal<number | null>(null);
  feedbackText  = signal('');
  isLoading     = signal(true);
  isSubmitting  = signal(false);
  submitted     = signal(false);

  scoreMeta   = computed(() => this.selectedScore() !== null ? SCORE_META[this.selectedScore()!] : null);
  segment     = computed(() => this.selectedScore() !== null ? getNpsSegment(this.selectedScore()!) : null);
  followupPrompt = computed(() => this.selectedScore() !== null ? getScorePrompt(this.selectedScore()!) : '');

  async ngOnInit(): Promise<void> {
    const responseId = this.route.snapshot.paramMap.get('id');

    if (responseId) {
      // Deep-linked to specific response — load from DB
      const { data, error } = await (this.npsService as unknown as {
        supabase: { from: (t: string) => unknown };
      }).supabase
        ? // Access supabase via private — use service method instead
          { data: null, error: null }
        : { data: null, error: null };

      // Use service to check if pending
      const pending = await this.npsService.loadPendingNps();
      // If the deeplinked ID matches, use it; otherwise use whatever pending we got
      this.response.set(pending);
    } else {
      // Auto-load most recent pending
      const pending = await this.npsService.loadPendingNps();
      this.response.set(pending);
    }

    this.isLoading.set(false);
  }

  async selectScore(n: number): Promise<void> {
    this.selectedScore.set(n);
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  updateFeedback(event: Event): void {
    this.feedbackText.set((event as CustomEvent).detail.value ?? '');
  }

  async submit(): Promise<void> {
    const r     = this.response();
    const score = this.selectedScore();
    if (!r || score === null || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const ok = await this.npsService.submitNpsResponse(
      r.id,
      score,
      this.feedbackText().trim() || null
    );
    this.isSubmitting.set(false);

    if (ok) {
      await Haptics.impact({ style: ImpactStyle.Medium });
      this.submitted.set(true);
      // Auto-navigate home after 3s
      setTimeout(() => this.goHome(), 3000);
    }
  }

  skip(): void {
    this.router.navigate(['/tabs/workouts']);
  }

  goHome(): void {
    this.router.navigate(['/tabs/workouts']);
  }

  trainerInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
