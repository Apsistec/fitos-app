/**
 * Sprint 67 — PostSessionReviewComponent
 *
 * Shown as a modal to the client after an appointment is marked `completed`.
 * Also triggered by the `trigger-session-review` Edge Function notification
 * (deep-link taps open this modal via the Notifications handler).
 *
 * UX: One-screen flow — star rating + optional text + Skip option.
 * Privacy: Review starts `is_public = false`; trainer reviews and approves.
 */
import {
  Component,
  Input,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonTextarea,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { star, starOutline, closeOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  TrainerPublicProfileService,
  SubmitReviewDto,
} from '../../../../core/services/trainer-public-profile.service';

// ─── Star label map ───────────────────────────────────────────────────────────

const STAR_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Poor',      color: '#EF4444' },
  2: { label: 'Fair',      color: '#F97316' },
  3: { label: 'Good',      color: '#EAB308' },
  4: { label: 'Great',     color: '#22C55E' },
  5: { label: 'Amazing!',  color: '#10B981' },
};

@Component({
  selector: 'app-post-session-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonTextarea,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Rate Your Session</ion-title>
        <ion-button fill="clear" slot="end" (click)="skip()">
          <ion-icon name="close-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="review-body">

        <!-- ── Trainer info ─────────────────────────────────────────────── -->
        <div class="trainer-header">
          <div class="trainer-avatar">{{ trainerInitial }}</div>
          <div class="trainer-info">
            <div class="trainer-name">{{ trainerName }}</div>
            <div class="session-label">{{ sessionLabel }}</div>
          </div>
        </div>

        <!-- ── Star picker ─────────────────────────────────────────────── -->
        <div class="star-section">
          <div class="stars-row">
            @for (n of [1, 2, 3, 4, 5]; track n) {
              <button
                class="star-btn"
                [class.selected]="rating() >= n"
                (click)="setRating(n)"
                [attr.aria-label]="'Rate ' + n + ' stars'"
              >
                <ion-icon [name]="rating() >= n ? 'star' : 'star-outline'"></ion-icon>
              </button>
            }
          </div>

          @if (rating() > 0) {
            <div
              class="star-label"
              [style.color]="starInfo().color"
            >
              {{ starInfo().label }}
            </div>
          } @else {
            <div class="star-hint">Tap a star to rate</div>
          }
        </div>

        <!-- ── Optional text review ────────────────────────────────────── -->
        @if (rating() > 0) {
          <div class="text-section">
            <div class="text-label">Leave a comment (optional)</div>
            <ion-textarea
              placeholder="What did you enjoy most about this session?"
              [value]="reviewText()"
              (ionInput)="updateText($event)"
              :rows="4"
              maxlength="140"
              autocapitalize="sentences"
              class="review-textarea"
            ></ion-textarea>
            <div class="text-count">{{ reviewText().length }}/140</div>
          </div>
        }

        <!-- ── Privacy note ────────────────────────────────────────────── -->
        @if (rating() > 0) {
          <div class="privacy-note">
            🔒 Reviews are private by default. Your trainer may choose to display it publicly on their profile.
          </div>
        }

        <!-- ── Actions ─────────────────────────────────────────────────── -->
        <div class="action-row">
          <ion-button
            fill="clear"
            color="medium"
            (click)="skip()"
          >
            Skip
          </ion-button>
          <ion-button
            [disabled]="rating() === 0 || isSubmitting()"
            (click)="submit()"
            class="submit-btn"
          >
            {{ isSubmitting() ? 'Submitting…' : 'Submit Review' }}
          </ion-button>
        </div>

        <!-- ── Thanks screen ───────────────────────────────────────────── -->
        @if (submitted()) {
          <div class="thanks-overlay">
            <div class="thanks-emoji">🙏</div>
            <div class="thanks-title">Thank you!</div>
            <div class="thanks-body">Your feedback helps {{ trainerName }} improve and grow.</div>
          </div>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 16px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .review-body {
      padding: 20px 20px 40px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      position: relative;
    }

    /* ── Trainer header ── */
    .trainer-header {
      display: flex; align-items: center; gap: 14px;
      padding: 16px;
      background: rgba(255,255,255,0.04);
      border-radius: 14px;
    }
    .trainer-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 800;
      color: var(--fitos-text-primary, #F5F5F5);
      flex-shrink: 0;
    }
    .trainer-name { font-size: 16px; font-weight: 700; }
    .session-label { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); margin-top: 2px; }

    /* ── Stars ─────── */
    .star-section { text-align: center; }
    .stars-row {
      display: flex; justify-content: center; gap: 8px;
      margin-bottom: 10px;
    }
    .star-btn {
      background: none; border: none; cursor: pointer; padding: 4px;
      ion-icon { font-size: 44px; color: rgba(255,255,255,0.15); transition: color 0.12s, transform 0.1s; }
      &.selected ion-icon { color: #F59E0B; }
      &:active ion-icon { transform: scale(1.2); }
    }
    .star-label { font-size: 18px; font-weight: 800; margin-top: 4px; }
    .star-hint  { font-size: 14px; color: var(--fitos-text-tertiary, #6B6B6B); }

    /* ── Text ──────── */
    .text-section { display: flex; flex-direction: column; gap: 6px; }
    .text-label { font-size: 13px; font-weight: 700; }
    .review-textarea { --background: rgba(255,255,255,0.04); border-radius: 12px; }
    .text-count { font-size: 11px; color: var(--fitos-text-tertiary, #6B6B6B); text-align: right; }

    /* ── Privacy note ── */
    .privacy-note {
      font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B);
      background: rgba(255,255,255,0.02); border-radius: 10px;
      padding: 10px 12px; text-align: center;
    }

    /* ── Actions ──── */
    .action-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 4px;
    }
    .submit-btn { --border-radius: 12px; flex: 1; margin-left: 8px; }

    /* ── Thanks overlay ─ */
    .thanks-overlay {
      position: absolute; inset: 0;
      background: var(--fitos-bg-primary, #0D0D0D);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; text-align: center;
      animation: fade-in 0.3s ease;
    }
    .thanks-emoji { font-size: 64px; }
    .thanks-title { font-size: 26px; font-weight: 900; }
    .thanks-body  { font-size: 15px; color: var(--fitos-text-secondary, #A3A3A3); max-width: 260px; }

    @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class PostSessionReviewComponent {
  @Input({ required: true }) trainerId!:   string;
  @Input({ required: true }) trainerName!: string;
  @Input()                   sessionId:    string | null = null;
  @Input()                   sessionLabel: string = 'Training Session';

  private profileService = inject(TrainerPublicProfileService);
  private modalCtrl      = inject(ModalController);

  rating       = signal(0);
  reviewText   = signal('');
  isSubmitting = signal(false);
  submitted    = signal(false);

  // Computed helpers
  starInfo = computed(() => STAR_LABELS[this.rating()] ?? { label: '', color: '#A3A3A3' });

  get trainerInitial(): string {
    return this.trainerName.charAt(0).toUpperCase();
  }

  // ── Interactions ───────────────────────────────────────────────────────────

  async setRating(n: number): Promise<void> {
    this.rating.set(n);
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  updateText(event: Event): void {
    this.reviewText.set((event as CustomEvent).detail.value ?? '');
  }

  async submit(): Promise<void> {
    if (this.rating() === 0 || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const dto: SubmitReviewDto = {
      trainer_id: this.trainerId,
      rating:     this.rating(),
      text:       this.reviewText().trim() || null,
      session_id: this.sessionId,
    };

    const ok = await this.profileService.submitReview(dto);
    this.isSubmitting.set(false);

    if (ok) {
      this.submitted.set(true);
      await Haptics.impact({ style: ImpactStyle.Medium });
      // Auto-dismiss after short celebration
      setTimeout(() => this.modalCtrl.dismiss({ submitted: true }), 2200);
    }
  }

  async skip(): Promise<void> {
    await this.modalCtrl.dismiss({ submitted: false });
  }

  // ── Static helper — open this modal from any page ─────────────────────────

  static async present(
    modalCtrl: ModalController,
    opts: {
      trainerId:    string;
      trainerName:  string;
      sessionId?:   string | null;
      sessionLabel?: string;
    }
  ): Promise<{ submitted: boolean }> {
    const modal = await modalCtrl.create({
      component:       PostSessionReviewComponent,
      componentProps:  {
        trainerId:    opts.trainerId,
        trainerName:  opts.trainerName,
        sessionId:    opts.sessionId ?? null,
        sessionLabel: opts.sessionLabel ?? 'Training Session',
      },
      initialBreakpoint: 0.75,
      breakpoints:       [0, 0.75, 1],
      handleBehavior:    'cycle',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    return data ?? { submitted: false };
  }
}
