/**
 * Sprint 68 — NpsDashboardWidget
 *
 * Trainer analytics component showing:
 *   - Big NPS number (–100 to +100) with colour coding
 *   - Segment breakdown: Promoters / Passives / Detractors
 *   - 4-quarter trend bar chart
 *   - Response rate + "Send Survey" button
 *
 * Used in: OwnerAnalyticsPage / TrainerAnalyticsPage
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonSkeletonText,
  IonBadge,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import {
  NpsService,
  NpsSummary,
  NpsQuarterTrend,
  getNpsColor,
} from '../../../../core/services/nps.service';

@Component({
  selector: 'app-nps-dashboard-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonSkeletonText,
    IonBadge,
  ],
  template: `
    <ion-card class="nps-card">
      <ion-card-header>
        <div class="card-header-row">
          <ion-card-title>Net Promoter Score</ion-card-title>
          <ion-button size="small" fill="outline" (click)="sendSurvey()" [disabled]="isSending()">
            {{ isSending() ? 'Sending…' : 'Send Survey' }}
          </ion-button>
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (isLoading()) {
          <!-- Skeleton -->
          <ion-skeleton-text animated class="score-skeleton"></ion-skeleton-text>
          <ion-skeleton-text animated class="breakdown-skeleton"></ion-skeleton-text>
        }

        @if (!isLoading() && summary(); as s) {
          <!-- ── Big NPS number ─────────────────────────────────────────── -->
          <div class="score-hero">
            <div
              class="nps-number"
              [style.color]="npsColor()"
            >
              {{ s.current.score !== null ? npsDisplay(s.current.score) : '—' }}
            </div>
            <div class="nps-label">
              @if (s.current.score === null) { No data yet }
              @else if (s.current.score >= 50) { Excellent 🎉 }
              @else if (s.current.score >= 0)  { Good 👍 }
              @else                            { Needs work 💪 }
            </div>
          </div>

          <!-- ── Segment breakdown ──────────────────────────────────────── -->
          <div class="segments-row">
            <div class="segment promoter">
              <div class="seg-value">{{ s.current.promoters }}</div>
              <div class="seg-label">Promoters</div>
              <div class="seg-hint">9–10</div>
            </div>
            <div class="segment passive">
              <div class="seg-value">{{ s.current.passives }}</div>
              <div class="seg-label">Passives</div>
              <div class="seg-hint">7–8</div>
            </div>
            <div class="segment detractor">
              <div class="seg-value">{{ s.current.detractors }}</div>
              <div class="seg-label">Detractors</div>
              <div class="seg-hint">0–6</div>
            </div>
          </div>

          <!-- ── Stacked segment bar ────────────────────────────────────── -->
          @if (s.current.total > 0) {
            <div class="segment-bar" [attr.aria-label]="'NPS breakdown bar'">
              <div class="seg-bar-fill promoter-fill"
                [style.width]="pct(s.current.promoters, s.current.total) + '%'"></div>
              <div class="seg-bar-fill passive-fill"
                [style.width]="pct(s.current.passives,  s.current.total) + '%'"></div>
              <div class="seg-bar-fill detractor-fill"
                [style.width]="pct(s.current.detractors, s.current.total) + '%'"></div>
            </div>
          }

          <!-- ── 4-quarter trend ────────────────────────────────────────── -->
          @if (s.trend.length > 0) {
            <div class="trend-section">
              <div class="trend-label">Quarterly Trend</div>
              <div class="trend-chart">
                @for (q of trendReversed(s.trend); track q.quarter) {
                  <div class="trend-bar-col">
                    <div class="trend-score" [style.color]="trendColor(q.score)">
                      {{ q.score !== null ? npsDisplay(q.score) : '—' }}
                    </div>
                    <div
                      class="trend-bar"
                      [style.height]="trendBarHeight(q.score) + 'px'"
                      [style.background]="trendColor(q.score)"
                    ></div>
                    <div class="trend-quarter">{{ q.quarter }}</div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- ── Response rate ──────────────────────────────────────────── -->
          <div class="meta-row">
            <span class="meta-item">{{ s.total_sent }} sent</span>
            <span class="meta-item">{{ s.response_rate }}% response rate</span>
          </div>
        }

        @if (!isLoading() && !summary()) {
          <div class="empty-nps">
            <p>Send your first NPS survey to start collecting feedback from clients.</p>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .nps-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      margin: 0;
    }

    .card-header-row {
      display: flex; align-items: center; justify-content: space-between;
    }
    ion-card-title { font-size: 16px; font-weight: 800; }

    /* ── Skeletons ── */
    .score-skeleton  { height: 80px; border-radius: 12px; margin-bottom: 12px; }
    .breakdown-skeleton { height: 48px; border-radius: 8px; }

    /* ── Big number ── */
    .score-hero { text-align: center; margin: 8px 0 20px; }
    .nps-number {
      font-size: 72px; font-weight: 900; line-height: 1;
      letter-spacing: -2px;
    }
    .nps-label { font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); margin-top: 4px; }

    /* ── Segments ── */
    .segments-row {
      display: flex; gap: 0; margin-bottom: 12px;
      background: rgba(255,255,255,0.03); border-radius: 14px; overflow: hidden;
    }
    .segment {
      flex: 1; text-align: center; padding: 12px 4px;
      border-right: 1px solid rgba(255,255,255,0.06);
      &:last-child { border-right: none; }
    }
    .seg-value { font-size: 24px; font-weight: 900; }
    .seg-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .seg-hint  { font-size: 10px; color: var(--fitos-text-tertiary, #6B6B6B); }

    .segment.promoter  .seg-value { color: #10B981; }
    .segment.passive   .seg-value { color: #EAB308; }
    .segment.detractor .seg-value { color: #EF4444; }

    /* ── Stacked bar ── */
    .segment-bar {
      height: 8px; border-radius: 4px; overflow: hidden;
      display: flex; margin-bottom: 16px;
      background: rgba(255,255,255,0.06);
    }
    .seg-bar-fill { height: 100%; transition: width 0.4s ease; }
    .promoter-fill  { background: #10B981; }
    .passive-fill   { background: #EAB308; }
    .detractor-fill { background: #EF4444; }

    /* ── Trend chart ── */
    .trend-section { margin-top: 4px; margin-bottom: 12px; }
    .trend-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.6px; color: var(--fitos-text-tertiary, #6B6B6B);
      margin-bottom: 10px;
    }
    .trend-chart {
      display: flex; gap: 12px; align-items: flex-end;
      height: 80px;
    }
    .trend-bar-col {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: flex-end; gap: 4px;
    }
    .trend-score { font-size: 11px; font-weight: 800; }
    .trend-bar {
      width: 100%; border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.4s ease;
    }
    .trend-quarter { font-size: 10px; color: var(--fitos-text-tertiary, #6B6B6B); white-space: nowrap; }

    /* ── Meta row ── */
    .meta-row {
      display: flex; gap: 16px; justify-content: center;
      margin-top: 4px;
    }
    .meta-item { font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B); }

    /* ── Empty ── */
    .empty-nps { padding: 16px 0; text-align: center; }
    .empty-nps p { font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); }
  `],
})
export class NpsDashboardWidgetComponent implements OnInit {
  private npsService  = inject(NpsService);
  private alertCtrl   = inject(AlertController);
  private toastCtrl   = inject(ToastController);

  summary   = signal<NpsSummary | null>(null);
  isLoading = signal(true);
  isSending = signal(false);

  npsColor = computed(() => {
    const s = this.summary();
    return getNpsColor(s?.current.score ?? null);
  });

  async ngOnInit(): Promise<void> {
    const data = await this.npsService.getMyNpsSummary();
    this.summary.set(data);
    this.isLoading.set(false);
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async sendSurvey(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header:  'Send NPS Survey?',
      message: 'This will send a feedback request notification to all your active clients.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send',
          handler: async () => {
            this.isSending.set(true);
            const id = await this.npsService.sendSurvey();
            this.isSending.set(false);

            const toast = await this.toastCtrl.create({
              message:  id ? 'NPS survey sent to clients! 📊' : 'Failed to send survey.',
              duration: 2500,
              color:    id ? 'success' : 'warning',
              position: 'top',
            });
            await toast.present();

            if (id) {
              const fresh = await this.npsService.getMyNpsSummary();
              this.summary.set(fresh);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  npsDisplay(score: number): string {
    return score > 0 ? `+${Math.round(score)}` : `${Math.round(score)}`;
  }

  pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  }

  trendReversed(trend: NpsQuarterTrend[]): NpsQuarterTrend[] {
    return [...trend].reverse();
  }

  trendColor(score: number | null): string {
    return getNpsColor(score);
  }

  trendBarHeight(score: number | null): number {
    if (score === null) return 4;
    // Map –100..+100 to 8..56 px
    return Math.max(8, Math.round(((score + 100) / 200) * 56));
  }
}
