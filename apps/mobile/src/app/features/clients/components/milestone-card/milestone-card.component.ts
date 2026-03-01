import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonIcon,
  IonButton,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trophyOutline,
  ribbonOutline,
  flameOutline,
  barbellOutline,
  starOutline,
  shareOutline,
  closeOutline,
} from 'ionicons/icons';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { MilestoneService, Milestone, MilestoneType } from '../../../../core/services/milestone.service';

// ─── Icon + colour map per milestone type ─────────────────────────────────────
const TYPE_META: Record<MilestoneType, { icon: string; gradient: string; label: string }> = {
  pr_set: {
    icon: 'barbell-outline',
    gradient: 'linear-gradient(135deg, #1A1A0A 0%, #3D2B00 100%)',
    label: 'Personal Record',
  },
  sessions_completed: {
    icon: 'ribbon-outline',
    gradient: 'linear-gradient(135deg, #091A13 0%, #0A3322 100%)',
    label: 'Milestone',
  },
  streak: {
    icon: 'flame-outline',
    gradient: 'linear-gradient(135deg, #1A0A00 0%, #3D1500 100%)',
    label: 'Streak',
  },
  custom: {
    icon: 'star-outline',
    gradient: 'linear-gradient(135deg, #0A0A1A 0%, #1A1A3D 100%)',
    label: 'Achievement',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-milestone-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, IonIcon, IonButton],
  template: `
    @if (milestoneService.pendingCard(); as milestone) {
      <!-- Backdrop -->
      <div class="backdrop" (click)="dismiss()"></div>

      <!-- Card -->
      <div class="card-wrapper">
        <div
          class="achievement-card"
          [style.background]="cardGradient(milestone.type)"
        >
          <!-- FitOS watermark -->
          <div class="watermark">FitOS</div>

          <!-- Confetti dots (CSS animated) -->
          <div class="confetti">
            @for (i of confettiDots; track i) {
              <div class="dot" [class]="'dot-' + i"></div>
            }
          </div>

          <!-- Icon ring -->
          <div class="icon-ring" [class]="'ring-' + milestone.type">
            <ion-icon [name]="cardIcon(milestone.type)" class="achievement-icon"></ion-icon>
          </div>

          <!-- Type label -->
          <div class="type-label">{{ cardLabel(milestone.type) }}</div>

          <!-- Title -->
          <h2 class="card-title">{{ milestone.title }}</h2>

          <!-- Stat (value + unit) -->
          @if (milestone.value !== null) {
            <div class="stat-row">
              <span class="stat-value">{{ milestone.value }}</span>
              @if (milestone.unit) {
                <span class="stat-unit">{{ milestone.unit }}</span>
              }
            </div>
          }

          <!-- Description -->
          @if (milestone.description) {
            <p class="card-desc">{{ milestone.description }}</p>
          }

          <!-- Date -->
          <div class="achieved-date">
            {{ milestone.achieved_at | date:'MMMM d, yyyy' }}
          </div>
        </div>

        <!-- Action buttons -->
        <div class="action-row">
          <button class="share-btn" (click)="share(milestone)">
            <ion-icon name="share-outline"></ion-icon>
            Share
          </button>
          <button class="close-btn" (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
            Close
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;

      &:has(.backdrop) { pointer-events: all; }
    }

    /* Backdrop */
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(6px);
    }

    /* Wrapper */
    .card-wrapper {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 0 24px;
      width: 100%;
      max-width: 360px;
      animation: card-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    @keyframes card-pop {
      from { transform: scale(0.7) translateY(40px); opacity: 0; }
      to   { transform: scale(1) translateY(0);       opacity: 1; }
    }

    /* Achievement card */
    .achievement-card {
      width: 100%;
      border-radius: 24px;
      padding: 32px 24px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
      overflow: hidden;
    }

    /* FitOS watermark */
    .watermark {
      position: absolute;
      bottom: 14px;
      right: 16px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 2px;
      color: rgba(255,255,255,0.15);
      text-transform: uppercase;
    }

    /* Confetti dots */
    .confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }

    .dot {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      animation: float-dot 3s ease-in-out infinite;
    }

    @keyframes float-dot {
      0%   { transform: translateY(0) rotate(0); opacity: 1; }
      100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
    }

    /* Colours and positions for confetti dots */
    .dot-1  { background: #10B981; left: 15%; top: 70%; animation-delay: 0s;    animation-duration: 2.8s; }
    .dot-2  { background: #F59E0B; left: 30%; top: 80%; animation-delay: 0.3s;  animation-duration: 3.1s; }
    .dot-3  { background: #3B82F6; left: 50%; top: 75%; animation-delay: 0.6s;  animation-duration: 2.6s; }
    .dot-4  { background: #EC4899; left: 70%; top: 85%; animation-delay: 0.9s;  animation-duration: 3.3s; }
    .dot-5  { background: #8B5CF6; left: 85%; top: 72%; animation-delay: 1.2s;  animation-duration: 2.9s; }
    .dot-6  { background: #10B981; left: 20%; top: 60%; animation-delay: 1.5s;  animation-duration: 3.0s; }
    .dot-7  { background: #F59E0B; left: 60%; top: 65%; animation-delay: 1.8s;  animation-duration: 2.7s; }
    .dot-8  { background: #3B82F6; left: 80%; top: 55%; animation-delay: 2.1s;  animation-duration: 3.2s; }

    /* Icon ring */
    .icon-ring {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }

    .ring-pr_set            { background: rgba(245, 158, 11, 0.15); border: 2px solid rgba(245,158,11,0.4); }
    .ring-sessions_completed { background: rgba(16, 185, 129, 0.15); border: 2px solid rgba(16,185,129,0.4); }
    .ring-streak             { background: rgba(249, 115, 22, 0.15);  border: 2px solid rgba(249,115,22,0.4); }
    .ring-custom             { background: rgba(139, 92, 246, 0.15);  border: 2px solid rgba(139,92,246,0.4); }

    .achievement-icon { font-size: 36px; }

    .ring-pr_set            .achievement-icon { color: #F59E0B; }
    .ring-sessions_completed .achievement-icon { color: #10B981; }
    .ring-streak             .achievement-icon { color: #F97316; }
    .ring-custom             .achievement-icon { color: #8B5CF6; }

    /* Text */
    .type-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.4);
    }

    .card-title {
      font-size: 24px;
      font-weight: 800;
      color: #F5F5F5;
      margin: 0;
      text-align: center;
      line-height: 1.2;
    }

    .stat-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
      margin: 4px 0;
    }

    .stat-value {
      font-size: 42px;
      font-weight: 900;
      color: #fff;
      line-height: 1;
    }

    .stat-unit {
      font-size: 18px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
    }

    .card-desc {
      font-size: 14px;
      color: rgba(255,255,255,0.55);
      text-align: center;
      margin: 0;
      line-height: 1.5;
    }

    .achieved-date {
      margin-top: 4px;
      font-size: 12px;
      color: rgba(255,255,255,0.3);
    }

    /* Action buttons */
    .action-row {
      display: flex;
      gap: 12px;
      width: 100%;
    }

    .share-btn, .close-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border-radius: 14px;
      padding: 14px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      ion-icon { font-size: 18px; }
    }

    .share-btn {
      background: var(--fitos-accent-primary, #10B981);
      border: none;
      color: #fff;
    }

    .close-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--fitos-text-secondary, #A3A3A3);
    }
  `],
})
export class MilestoneCardComponent implements OnInit {
  milestoneService = inject(MilestoneService);
  private toastCtrl = inject(ToastController);

  readonly confettiDots = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor() {
    addIcons({
      trophyOutline,
      ribbonOutline,
      flameOutline,
      barbellOutline,
      starOutline,
      shareOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    // Haptic celebration pulse on mount
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
  }

  cardGradient(type: MilestoneType): string {
    return TYPE_META[type]?.gradient ?? TYPE_META.custom.gradient;
  }

  cardIcon(type: MilestoneType): string {
    return TYPE_META[type]?.icon ?? 'trophy-outline';
  }

  cardLabel(type: MilestoneType): string {
    return TYPE_META[type]?.label ?? 'Achievement';
  }

  async share(milestone: Milestone): Promise<void> {
    const text =
      `🏆 ${milestone.title}\n` +
      (milestone.value !== null
        ? `${milestone.value}${milestone.unit ? ' ' + milestone.unit : ''}\n`
        : '') +
      (milestone.description ? `${milestone.description}\n` : '') +
      `\nTracked with FitOS 💪`;

    try {
      await Share.share({
        title: milestone.title,
        text,
        dialogTitle: 'Share your achievement',
      });
      await this.milestoneService.markCardGenerated(milestone.id);
    } catch {
      // User dismissed share sheet — not an error
    }
    this.milestoneService.dismissCard();
  }

  dismiss(): void {
    this.milestoneService.dismissCard();
  }
}
