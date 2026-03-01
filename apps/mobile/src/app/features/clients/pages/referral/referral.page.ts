/**
 * Sprint 69 — ReferralPage (client-facing)
 *
 * Shows the client their personal referral link, stats, and earned rewards.
 * Accessed via: /tabs/workouts/referral
 *
 * Features:
 *   - Referral URL display with copy + native share
 *   - Stats: clicks, conversions, rewards earned
 *   - Progress toward next reward (if trainer has program configured)
 *   - "How it works" section
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonSkeletonText,
  IonProgressBar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  copyOutline,
  shareOutline,
  giftOutline,
  peopleOutline,
  eyeOutline,
  trophyOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import {
  ReferralService,
  ReferralCode,
  ReferralProgram,
  REFERRAL_BASE_URL,
} from '../../../../core/services/referral.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-referral',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonProgressBar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts"></ion-back-button>
        </ion-buttons>
        <ion-title>Refer a Friend</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      @if (isLoading()) {
        <ion-skeleton-text animated class="hero-skeleton"></ion-skeleton-text>
        <ion-skeleton-text animated class="stat-skeleton"></ion-skeleton-text>
      }

      @if (!isLoading() && myCode(); as code) {

        <!-- ── Hero gift card ──────────────────────────────────────────────── -->
        <div class="hero-card">
          <div class="hero-icon">🎁</div>
          @if (program()) {
            <h2 class="hero-title">Earn {{ rewardLabel() }}</h2>
            <p class="hero-subtitle">for every {{ program()!.conversions_required }} friend{{ program()!.conversions_required !== 1 ? 's' : '' }} who signs up</p>
          } @else {
            <h2 class="hero-title">Share FitOS with friends</h2>
            <p class="hero-subtitle">Help others reach their fitness goals</p>
          }
        </div>

        <!-- ── Referral link card ──────────────────────────────────────────── -->
        <ion-card class="link-card">
          <ion-card-content>
            <div class="link-label">Your personal referral link</div>
            <div class="link-display">
              <span class="link-text">nutrifitos.app/join/<strong>{{ code.code }}</strong></span>
            </div>
            <div class="link-actions">
              <ion-button fill="outline" size="default" (click)="copyLink(code)">
                <ion-icon slot="start" name="copy-outline"></ion-icon>
                Copy
              </ion-button>
              <ion-button fill="solid" size="default" (click)="shareLink(code)">
                <ion-icon slot="start" name="share-outline"></ion-icon>
                Share
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- ── Stats row ──────────────────────────────────────────────────── -->
        <div class="stats-row">
          <div class="stat-box">
            <ion-icon name="eye-outline" class="stat-icon"></ion-icon>
            <div class="stat-value">{{ code.clicks }}</div>
            <div class="stat-label">Link views</div>
          </div>
          <div class="stat-box">
            <ion-icon name="people-outline" class="stat-icon"></ion-icon>
            <div class="stat-value">{{ code.conversions }}</div>
            <div class="stat-label">Sign-ups</div>
          </div>
          <div class="stat-box">
            <ion-icon name="trophy-outline" class="stat-icon"></ion-icon>
            <div class="stat-value">{{ code.rewards_earned }}</div>
            <div class="stat-label">Rewards</div>
          </div>
        </div>

        <!-- ── Progress toward next reward ───────────────────────────────── -->
        @if (program() && program()!.conversions_required > 1) {
          <ion-card class="progress-card">
            <ion-card-content>
              <div class="progress-header">
                <span>Progress to next reward</span>
                <span class="progress-count">{{ progressCount() }}/{{ program()!.conversions_required }}</span>
              </div>
              <ion-progress-bar
                [value]="progressFraction()"
                color="success"
                class="reward-progress"
              ></ion-progress-bar>
              <p class="progress-hint">
                {{ progressRemaining() }} more sign-up{{ progressRemaining() !== 1 ? 's' : '' }} to earn {{ rewardLabel() }}
              </p>
            </ion-card-content>
          </ion-card>
        }

        <!-- ── How it works ───────────────────────────────────────────────── -->
        <ion-card class="howto-card">
          <ion-card-header>
            <ion-card-title>How it works</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="howto-step">
              <div class="step-num">1</div>
              <div class="step-text">Share your personal link with a friend</div>
            </div>
            <div class="howto-step">
              <div class="step-num">2</div>
              <div class="step-text">They sign up and book their first session</div>
            </div>
            <div class="howto-step">
              <div class="step-num">3</div>
              @if (program()) {
                <div class="step-text">You earn {{ rewardLabel() }} — automatically credited to your account</div>
              } @else {
                <div class="step-text">You're recognized as a top supporter — rewards announced by your trainer</div>
              }
            </div>
          </ion-card-content>
        </ion-card>

      }

      @if (!isLoading() && !myCode()) {
        <div class="empty-state">
          <ion-icon name="gift-outline" class="empty-icon"></ion-icon>
          <p>Referral links are available once you have an active trainer relationship.</p>
        </div>
      }

    </ion-content>
  `,
  styles: [`
    /* ── Hero ── */
    .hero-card {
      text-align: center;
      padding: 32px 16px 24px;
    }
    .hero-icon { font-size: 64px; line-height: 1; margin-bottom: 16px; }
    .hero-title {
      font-size: 22px; font-weight: 900; margin: 0 0 8px;
      color: var(--fitos-accent-primary, #10B981);
    }
    .hero-subtitle {
      font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0;
    }

    /* ── Skeletons ── */
    .hero-skeleton  { height: 160px; border-radius: 16px; margin-bottom: 16px; }
    .stat-skeleton  { height: 80px; border-radius: 12px; }

    /* ── Link card ── */
    .link-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      margin: 0 0 16px;
    }
    .link-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.6px; color: var(--fitos-text-tertiary, #6B6B6B);
      margin-bottom: 10px;
    }
    .link-display {
      background: rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }
    .link-text {
      font-size: 15px; font-family: monospace; word-break: break-all;
      color: var(--fitos-text-primary, #F5F5F5);
    }
    .link-text strong { color: var(--fitos-accent-primary, #10B981); }
    .link-actions {
      display: flex; gap: 10px;
      ion-button { flex: 1; }
    }

    /* ── Stats ── */
    .stats-row {
      display: flex; gap: 10px; margin-bottom: 16px;
    }
    .stat-box {
      flex: 1; text-align: center; padding: 16px 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
    }
    .stat-icon { font-size: 20px; color: var(--fitos-accent-primary, #10B981); margin-bottom: 6px; }
    .stat-value { font-size: 26px; font-weight: 900; line-height: 1; }
    .stat-label { font-size: 11px; color: var(--fitos-text-tertiary, #6B6B6B); margin-top: 4px; }

    /* ── Progress ── */
    .progress-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      margin: 0 0 16px;
    }
    .progress-header {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px; margin-bottom: 10px;
    }
    .progress-count { font-weight: 800; color: var(--fitos-accent-primary, #10B981); }
    .reward-progress { height: 8px; border-radius: 4px; margin-bottom: 8px; }
    .progress-hint { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0; }

    /* ── How it works ── */
    .howto-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      margin: 0;
    }
    ion-card-title { font-size: 15px; font-weight: 800; }
    .howto-step {
      display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px;
      &:last-child { margin-bottom: 0; }
    }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      background: var(--fitos-accent-primary, #10B981);
      color: #0D0D0D; font-weight: 900; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .step-text { font-size: 14px; color: var(--fitos-text-primary, #F5F5F5); line-height: 1.5; }

    /* ── Empty ── */
    .empty-state {
      text-align: center; padding: 64px 24px;
    }
    .empty-icon { font-size: 56px; color: var(--fitos-text-tertiary, #6B6B6B); margin-bottom: 16px; display: block; }
    .empty-state p { font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); }
  `],
})
export class ReferralPage implements OnInit {
  private referralService = inject(ReferralService);
  private authService     = inject(AuthService);
  private toastCtrl       = inject(ToastController);

  myCode    = this.referralService.myCode;
  program   = this.referralService.program;
  isLoading = this.referralService.isLoading;

  rewardLabel = computed(() => {
    const p = this.program();
    return p ? this.referralService.formatRewardLabel(p) : '';
  });

  // Progress toward next reward (since last reward milestone)
  progressCount = computed(() => {
    const code = this.myCode();
    const p = this.program();
    if (!code || !p) return 0;
    const sinceLastReward = code.conversions - (code.rewards_earned * p.conversions_required);
    return Math.max(0, sinceLastReward);
  });

  progressFraction = computed(() => {
    const p = this.program();
    if (!p || p.conversions_required <= 1) return 0;
    return Math.min(1, this.progressCount() / p.conversions_required);
  });

  progressRemaining = computed(() => {
    const p = this.program();
    if (!p) return 0;
    return Math.max(0, p.conversions_required - this.progressCount());
  });

  async ngOnInit(): Promise<void> {
    // Load referral program config (if trainer has one)
    await this.referralService.getMyProgram();

    // Determine trainer to generate code for (primary trainer from trainer_clients)
    const profile = this.authService.profile();
    const trainerId = (profile as any)?.primary_trainer_id ?? null;
    if (trainerId) {
      await this.referralService.getOrCreateCode(trainerId);
    }
  }

  async copyLink(code: ReferralCode): Promise<void> {
    try {
      await Clipboard.write({ string: code.share_url });
      const toast = await this.toastCtrl.create({
        message: 'Referral link copied! 📋',
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toast.present();
    } catch {
      // Fallback for browsers without Clipboard support
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code.share_url);
      }
    }
  }

  async shareLink(code: ReferralCode): Promise<void> {
    const program = this.program();
    const rewardText = program
      ? `and I'll earn ${this.rewardLabel()}!`
      : 'and get started on your fitness journey!';

    try {
      await Share.share({
        title: 'Join me on FitOS!',
        text: `Hey! I've been using FitOS for my fitness coaching and I love it. Use my referral link to sign up ${rewardText}`,
        url: code.share_url,
        dialogTitle: 'Share your referral link',
      });
    } catch {
      // User cancelled share or not available — fall back to copy
      await this.copyLink(code);
    }
  }
}

addIcons({
  copyOutline,
  shareOutline,
  giftOutline,
  peopleOutline,
  eyeOutline,
  trophyOutline,
  checkmarkCircleOutline,
});
