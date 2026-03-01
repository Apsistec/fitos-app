/**
 * Sprint 69 — ReferralProgramSettingsPage (trainer)
 *
 * Trainer configures their referral reward program:
 *   - Reward type: free session / % discount / flat discount
 *   - Reward value (sessions or $)
 *   - Conversions required to earn one reward
 *   - Activate / deactivate
 *
 * Also shows the trainer-view referral analytics:
 *   - Total links, clicks, conversions
 *   - Conversion rate
 *   - Top referrers leaderboard
 *
 * Route: /tabs/settings/referral-program (trainerOrOwnerGuard)
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
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
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonButton,
  IonIcon,
  IonSkeletonText,
  IonBadge,
  ToastController,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  megaphoneOutline,
  peopleOutline,
  trophyOutline,
  eyeOutline,
  flashOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import {
  ReferralService,
  ReferralProgram,
  TrainerReferralStats,
  REWARD_TYPE_LABELS,
} from '../../../../core/services/referral.service';

@Component({
  selector: 'app-referral-program',
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
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonBadge,
    FormsModule,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Referral Program</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      @if (isLoading()) {
        <ion-skeleton-text animated class="skel-card"></ion-skeleton-text>
        <ion-skeleton-text animated class="skel-card short"></ion-skeleton-text>
      }

      @if (!isLoading()) {

        <!-- ── Analytics summary ───────────────────────────────────────────── -->
        @if (stats(); as s) {
          <div class="stats-row">
            <div class="stat-box">
              <ion-icon name="people-outline" class="stat-icon"></ion-icon>
              <div class="stat-value">{{ s.total_codes }}</div>
              <div class="stat-label">Active referrers</div>
            </div>
            <div class="stat-box">
              <ion-icon name="eye-outline" class="stat-icon"></ion-icon>
              <div class="stat-value">{{ s.total_clicks }}</div>
              <div class="stat-label">Link clicks</div>
            </div>
            <div class="stat-box">
              <ion-icon name="flash-outline" class="stat-icon"></ion-icon>
              <div class="stat-value">{{ s.total_conversions }}</div>
              <div class="stat-label">Conversions</div>
            </div>
            <div class="stat-box">
              <ion-icon name="megaphone-outline" class="stat-icon"></ion-icon>
              <div class="stat-value">{{ s.conversion_rate }}%</div>
              <div class="stat-label">Conv. rate</div>
            </div>
          </div>

          <!-- Top referrers leaderboard -->
          @if (s.top_referrers.length > 0) {
            <ion-card class="leaderboard-card">
              <ion-card-header>
                <ion-card-title>🏆 Top Referrers</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @for (ref of s.top_referrers; track ref.code; let i = $index) {
                  <div class="referrer-row">
                    <div class="rank">{{ i + 1 }}</div>
                    <div class="referrer-info">
                      <div class="referrer-name">{{ ref.full_name }}</div>
                      <div class="referrer-meta">{{ ref.conversions }} conversion{{ ref.conversions !== 1 ? 's' : '' }} · {{ ref.clicks }} clicks</div>
                    </div>
                    @if (ref.rewards_earned > 0) {
                      <ion-badge color="success">{{ ref.rewards_earned }} reward{{ ref.rewards_earned !== 1 ? 's' : '' }}</ion-badge>
                    }
                  </div>
                }
              </ion-card-content>
            </ion-card>
          }
        }

        <!-- ── Program configuration ──────────────────────────────────────── -->
        <ion-card class="config-card">
          <ion-card-header>
            <ion-card-title>Reward Configuration</ion-card-title>
          </ion-card-header>
          <ion-card-content>

            <!-- Active toggle -->
            <ion-item lines="full" class="config-item">
              <ion-label>Program Active</ion-label>
              <ion-toggle
                slot="end"
                [(ngModel)]="form().is_active"
                (ionChange)="onFormChange('is_active', $event.detail.checked)"
                color="success"
              ></ion-toggle>
            </ion-item>

            <!-- Reward type -->
            <ion-item lines="full" class="config-item">
              <ion-label>Reward Type</ion-label>
              <ion-select
                [(ngModel)]="form().reward_type"
                (ionChange)="onFormChange('reward_type', $event.detail.value)"
                interface="action-sheet"
                placeholder="Select type"
              >
                <ion-select-option value="session_credit">Free Session Credit</ion-select-option>
                <ion-select-option value="discount_pct">Percentage Discount</ion-select-option>
                <ion-select-option value="discount_flat">Flat Rate Discount</ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Reward value -->
            <ion-item lines="full" class="config-item">
              <ion-label>
                @if (form().reward_type === 'session_credit') { Sessions to Credit }
                @else if (form().reward_type === 'discount_pct') { Discount % }
                @else { Discount Amount ($) }
              </ion-label>
              <ion-select
                [(ngModel)]="form().reward_value"
                (ionChange)="onFormChange('reward_value', $event.detail.value)"
                interface="action-sheet"
                placeholder="Select value"
              >
                @if (form().reward_type === 'session_credit') {
                  @for (n of [1, 2, 3, 5]; track n) {
                    <ion-select-option [value]="n">{{ n }} session{{ n !== 1 ? 's' : '' }}</ion-select-option>
                  }
                }
                @if (form().reward_type === 'discount_pct') {
                  @for (n of [5, 10, 15, 20, 25]; track n) {
                    <ion-select-option [value]="n">{{ n }}%</ion-select-option>
                  }
                }
                @if (form().reward_type === 'discount_flat') {
                  @for (n of [10, 20, 25, 50, 100]; track n) {
                    <ion-select-option [value]="n">${{ n }}.00</ion-select-option>
                  }
                }
              </ion-select>
            </ion-item>

            <!-- Conversions required -->
            <ion-item lines="none" class="config-item">
              <ion-label>
                Referrals per Reward
                <p>How many successful sign-ups earn one reward</p>
              </ion-label>
              <ion-select
                [(ngModel)]="form().conversions_required"
                (ionChange)="onFormChange('conversions_required', $event.detail.value)"
                interface="action-sheet"
                slot="end"
              >
                @for (n of [1, 2, 3, 5]; track n) {
                  <ion-select-option [value]="n">{{ n }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

          </ion-card-content>
        </ion-card>

        <!-- Preview of what client sees -->
        <div class="preview-box">
          <div class="preview-label">Client will see</div>
          <div class="preview-text">"Earn {{ previewRewardLabel() }} for every {{ form().conversions_required }} friend{{ form().conversions_required !== 1 ? 's' : '' }} who signs up"</div>
        </div>

        <!-- Save button -->
        <ion-button
          expand="block"
          [disabled]="!isValid() || isSaving()"
          (click)="save()"
          class="save-btn"
        >
          <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
          {{ isSaving() ? 'Saving…' : (hasExistingProgram() ? 'Update Program' : 'Activate Program') }}
        </ion-button>

        <!-- Explanation card -->
        <ion-card class="info-card">
          <ion-card-content>
            <p class="info-text">
              When you activate the referral program, each of your active clients can generate a personal referral link.
              When a referred friend books their first session, the conversion is automatically tracked.
              Rewards are credited to the referring client's account automatically.
            </p>
          </ion-card-content>
        </ion-card>

      }
    </ion-content>
  `,
  styles: [`
    /* ── Skeleton ── */
    .skel-card { height: 100px; border-radius: 16px; margin-bottom: 16px; }
    .skel-card.short { height: 60px; }

    /* ── Stats row ── */
    .stats-row {
      display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;
    }
    .stat-box {
      flex: 1; min-width: calc(50% - 5px);
      text-align: center; padding: 14px 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
    }
    .stat-icon { font-size: 20px; color: var(--fitos-accent-primary, #10B981); margin-bottom: 4px; display: block; }
    .stat-value { font-size: 24px; font-weight: 900; }
    .stat-label { font-size: 11px; color: var(--fitos-text-tertiary, #6B6B6B); margin-top: 2px; }

    /* ── Leaderboard ── */
    .leaderboard-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      margin: 0 0 16px;
    }
    ion-card-title { font-size: 15px; font-weight: 800; }
    .referrer-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
      &:last-child { border-bottom: none; }
    }
    .rank {
      width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
      background: rgba(255,255,255,0.08);
      font-size: 12px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }
    .referrer-info { flex: 1; }
    .referrer-name { font-size: 14px; font-weight: 700; }
    .referrer-meta { font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B); }

    /* ── Config card ── */
    .config-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      margin: 0 0 16px;
    }
    .config-item { --background: transparent; }

    /* ── Preview ── */
    .preview-box {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .preview-label {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.6px; color: var(--fitos-accent-primary, #10B981);
      margin-bottom: 6px;
    }
    .preview-text {
      font-size: 14px; font-style: italic;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    /* ── Save button ── */
    .save-btn { margin: 0 0 16px; }

    /* ── Info ── */
    .info-card {
      --background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 12px;
      margin: 0;
    }
    .info-text { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0; line-height: 1.6; }
  `],
})
export class ReferralProgramPage implements OnInit {
  private referralService = inject(ReferralService);
  private toastCtrl       = inject(ToastController);

  isLoading        = this.referralService.isLoading;
  isSaving         = signal(false);
  hasExistingProgram = signal(false);
  stats            = this.referralService.trainerStats;

  form = signal<{
    reward_type: ReferralProgram['reward_type'];
    reward_value: number;
    conversions_required: number;
    is_active: boolean;
  }>({
    reward_type: 'session_credit',
    reward_value: 1,
    conversions_required: 1,
    is_active: true,
  });

  isValid = computed(() => {
    const f = this.form();
    return f.reward_type && f.reward_value > 0 && f.conversions_required >= 1;
  });

  previewRewardLabel = computed(() => {
    const f = this.form();
    const dummyProgram = { ...f } as ReferralProgram;
    return this.referralService.formatRewardLabel(dummyProgram);
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadProgram(),
      this.referralService.getTrainerStats(),
    ]);
  }

  private async loadProgram(): Promise<void> {
    const existing = await this.referralService.getMyProgram();
    if (existing) {
      this.hasExistingProgram.set(true);
      this.form.set({
        reward_type:          existing.reward_type,
        reward_value:         existing.reward_value,
        conversions_required: existing.conversions_required,
        is_active:            existing.is_active,
      });
    }
  }

  onFormChange(field: keyof ReturnType<typeof this.form>, value: any): void {
    this.form.update(f => ({ ...f, [field]: value }));
    // Reset reward_value when type changes to prevent invalid states
    if (field === 'reward_type') {
      const defaults: Record<string, number> = {
        session_credit: 1,
        discount_pct: 10,
        discount_flat: 20,
      };
      this.form.update(f => ({ ...f, reward_value: defaults[value] ?? 1 }));
    }
  }

  async save(): Promise<void> {
    if (!this.isValid()) return;
    this.isSaving.set(true);
    const ok = await this.referralService.saveProgram(this.form());
    this.isSaving.set(false);

    const toast = await this.toastCtrl.create({
      message: ok
        ? (this.hasExistingProgram() ? 'Referral program updated! 🎁' : 'Referral program activated! 🎉')
        : 'Failed to save program.',
      duration: 2500,
      color: ok ? 'success' : 'warning',
      position: 'top',
    });
    await toast.present();

    if (ok) this.hasExistingProgram.set(true);
  }
}

addIcons({
  megaphoneOutline,
  peopleOutline,
  trophyOutline,
  eyeOutline,
  flashOutline,
  checkmarkCircleOutline,
});
