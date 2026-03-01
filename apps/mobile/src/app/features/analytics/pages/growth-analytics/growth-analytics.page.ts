/**
 * Sprint 69 — GrowthAnalyticsPage (trainer)
 *
 * Trainer growth dashboard:
 *   - KPI cards: New Clients MTD, Active Clients, Churned (90d), Avg Sessions/Client
 *   - 6-month cohort retention heatmap (colour-coded % retained)
 *   - Referral funnel (links → clicks → conversions → rewards)
 *   - CSV export button (native Share sheet)
 *
 * Route: /tabs/analytics/growth (trainerOrOwnerGuard)
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
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSkeletonText,
  IonRefresher,
  IonRefresherContent,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  downloadOutline,
  peopleOutline,
  trendingUpOutline,
  trendingDownOutline,
  flashOutline,
  eyeOutline,
  trophyOutline,
  refreshOutline,
} from 'ionicons/icons';
import { GrowthAnalyticsService, CohortMonth } from '../../../../core/services/growth-analytics.service';
import { ReferralService, TrainerReferralStats } from '../../../../core/services/referral.service';

@Component({
  selector: 'app-growth-analytics',
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
    IonIcon,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonSkeletonText,
    IonRefresher,
    IonRefresherContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/analytics"></ion-back-button>
        </ion-buttons>
        <ion-title>Growth Analytics</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="exportCsv()" [disabled]="isExporting()">
            <ion-icon slot="icon-only" name="download-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <ion-refresher slot="fixed" (ionRefresh)="onRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (isLoading()) {
        <ion-skeleton-text animated class="skel-kpi"></ion-skeleton-text>
        <ion-skeleton-text animated class="skel-cohort"></ion-skeleton-text>
      }

      @if (!isLoading() && data(); as d) {

        <!-- ── KPI cards ──────────────────────────────────────────────────── -->
        <div class="kpi-grid">

          <div class="kpi-card accent">
            <ion-icon name="people-outline" class="kpi-icon"></ion-icon>
            <div class="kpi-value">{{ d.new_clients_mtd }}</div>
            <div class="kpi-label">New clients<br>this month</div>
          </div>

          <div class="kpi-card">
            <ion-icon name="trending-up-outline" class="kpi-icon green"></ion-icon>
            <div class="kpi-value">{{ d.active_clients }}</div>
            <div class="kpi-label">Active clients</div>
          </div>

          <div class="kpi-card">
            <ion-icon name="trending-down-outline" class="kpi-icon red"></ion-icon>
            <div class="kpi-value">{{ d.churned_last_90d }}</div>
            <div class="kpi-label">Churned<br>(90 days)</div>
          </div>

          <div class="kpi-card">
            <ion-icon name="flash-outline" class="kpi-icon yellow"></ion-icon>
            <div class="kpi-value">{{ d.avg_sessions_per_client }}</div>
            <div class="kpi-label">Avg sessions<br>/ client (90d)</div>
          </div>

        </div>

        <!-- ── Churn rate callout ────────────────────────────────────────── -->
        <div class="churn-callout" [class.danger]="churnRate() > 15">
          <span>Churn rate (90d):</span>
          <strong [style.color]="churnRate() > 15 ? '#EF4444' : '#10B981'">
            {{ churnRate() }}%
          </strong>
          <span class="churn-hint">
            ({{ d.churned_last_90d }} of {{ d.total_clients_ever }} total)
          </span>
        </div>

        <!-- ── 6-month cohort retention heatmap ───────────────────────────── -->
        @if (d.cohort_retention.length > 0) {
          <ion-card class="cohort-card">
            <ion-card-header>
              <ion-card-title>Cohort Retention</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="cohort-subtitle">% of clients still active from each month's cohort</p>
              <div class="cohort-grid">
                @for (cohort of d.cohort_retention; track cohort.cohort_month) {
                  <div class="cohort-cell">
                    <div
                      class="cohort-pct"
                      [style.background]="cohortCellBg(cohort.retention_pct)"
                    >{{ cohort.retention_pct }}%</div>
                    <div class="cohort-month">{{ cohort.cohort_month }}</div>
                    <div class="cohort-size">{{ cohort.retained }}/{{ cohort.cohort_size }}</div>
                  </div>
                }
              </div>
              <!-- Legend -->
              <div class="cohort-legend">
                <div class="legend-item"><div class="legend-dot green"></div><span>≥80%</span></div>
                <div class="legend-item"><div class="legend-dot yellow"></div><span>60–79%</span></div>
                <div class="legend-item"><div class="legend-dot orange"></div><span>40–59%</span></div>
                <div class="legend-item"><div class="legend-dot red"></div><span>&lt;40%</span></div>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- ── Referral funnel ───────────────────────────────────────────── -->
        @if (referralStats(); as rs) {
          <ion-card class="funnel-card">
            <ion-card-header>
              <ion-card-title>🔗 Referral Funnel</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="funnel-row">
                <div class="funnel-step">
                  <div class="funnel-value">{{ rs.total_codes }}</div>
                  <div class="funnel-label">Links shared</div>
                </div>
                <div class="funnel-arrow">→</div>
                <div class="funnel-step">
                  <div class="funnel-value">{{ rs.total_clicks }}</div>
                  <div class="funnel-label">Link clicks</div>
                </div>
                <div class="funnel-arrow">→</div>
                <div class="funnel-step">
                  <div class="funnel-value">{{ rs.total_conversions }}</div>
                  <div class="funnel-label">Sign-ups</div>
                </div>
                <div class="funnel-arrow">→</div>
                <div class="funnel-step">
                  <div class="funnel-value accent-text">{{ rs.total_rewards_issued }}</div>
                  <div class="funnel-label">Rewards<br>issued</div>
                </div>
              </div>
              <div class="funnel-rate">
                Overall conversion rate: <strong>{{ rs.conversion_rate }}%</strong>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- ── Export CTA ────────────────────────────────────────────────── -->
        <ion-button
          expand="block"
          fill="outline"
          (click)="exportCsv()"
          [disabled]="isExporting()"
          class="export-btn"
        >
          <ion-icon slot="start" name="download-outline"></ion-icon>
          {{ isExporting() ? 'Preparing export…' : 'Export Client Data (CSV)' }}
        </ion-button>

      }

      @if (!isLoading() && !data()) {
        <div class="empty-state">
          <ion-icon name="trending-up-outline" class="empty-icon"></ion-icon>
          <p>Growth analytics will appear once you have clients with completed sessions.</p>
        </div>
      }

    </ion-content>
  `,
  styles: [`
    /* ── Skeletons ── */
    .skel-kpi    { height: 140px; border-radius: 16px; margin-bottom: 16px; }
    .skel-cohort { height: 200px; border-radius: 16px; }

    /* ── KPI grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 16px;
      text-align: center;
    }
    .kpi-card.accent {
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.08);
    }
    .kpi-icon {
      font-size: 22px;
      margin-bottom: 8px;
      display: block;
      color: var(--fitos-text-tertiary, #6B6B6B);
    }
    .kpi-icon.green  { color: #10B981; }
    .kpi-icon.red    { color: #EF4444; }
    .kpi-icon.yellow { color: #EAB308; }
    .kpi-value {
      font-size: 32px; font-weight: 900; line-height: 1;
    }
    .kpi-label {
      font-size: 11px; color: var(--fitos-text-secondary, #A3A3A3);
      margin-top: 6px; line-height: 1.4;
    }

    /* ── Churn callout ── */
    .churn-callout {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.03);
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .churn-callout strong { font-size: 15px; font-weight: 900; }
    .churn-hint { color: var(--fitos-text-tertiary, #6B6B6B); font-size: 12px; }

    /* ── Cohort heatmap ── */
    .cohort-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      margin: 0 0 16px;
    }
    ion-card-title { font-size: 15px; font-weight: 800; }
    .cohort-subtitle {
      font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B); margin-bottom: 14px;
    }
    .cohort-grid {
      display: flex; gap: 8px; flex-wrap: wrap;
    }
    .cohort-cell {
      flex: 1; min-width: 70px; text-align: center;
    }
    .cohort-pct {
      font-size: 14px; font-weight: 900;
      padding: 8px 4px; border-radius: 8px;
      color: #0D0D0D; margin-bottom: 4px;
    }
    .cohort-month { font-size: 10px; color: var(--fitos-text-tertiary, #6B6B6B); }
    .cohort-size  { font-size: 10px; color: var(--fitos-text-tertiary, #6B6B6B); }
    .cohort-legend {
      display: flex; gap: 14px; margin-top: 14px; justify-content: center; flex-wrap: wrap;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 11px; }
    .legend-dot {
      width: 10px; height: 10px; border-radius: 50%;
    }
    .legend-dot.green  { background: #10B981; }
    .legend-dot.yellow { background: #EAB308; }
    .legend-dot.orange { background: #F97316; }
    .legend-dot.red    { background: #EF4444; }

    /* ── Funnel ── */
    .funnel-card {
      --background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      margin: 0 0 16px;
    }
    .funnel-row {
      display: flex; align-items: center; gap: 4px;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .funnel-step { text-align: center; flex: 1; }
    .funnel-value {
      font-size: 24px; font-weight: 900;
    }
    .funnel-value.accent-text { color: var(--fitos-accent-primary, #10B981); }
    .funnel-label { font-size: 11px; color: var(--fitos-text-tertiary, #6B6B6B); margin-top: 2px; line-height: 1.3; }
    .funnel-arrow { color: var(--fitos-text-tertiary, #6B6B6B); font-size: 18px; padding-bottom: 14px; }
    .funnel-rate {
      text-align: center; font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-top: 14px;
    }
    .funnel-rate strong { color: var(--fitos-accent-primary, #10B981); }

    /* ── Export button ── */
    .export-btn { margin-bottom: 24px; }

    /* ── Empty state ── */
    .empty-state {
      text-align: center; padding: 64px 24px;
    }
    .empty-icon {
      font-size: 56px; color: var(--fitos-text-tertiary, #6B6B6B);
      margin-bottom: 16px; display: block;
    }
    .empty-state p { font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); }
  `],
})
export class GrowthAnalyticsPage implements OnInit {
  private growthService  = inject(GrowthAnalyticsService);
  private referralService = inject(ReferralService);
  private toastCtrl      = inject(ToastController);

  data          = this.growthService.analytics;
  isLoading     = this.growthService.isLoading;
  referralStats = this.referralService.trainerStats;
  isExporting   = signal(false);

  churnRate = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return this.growthService.churnRate(d.total_clients_ever, d.churned_last_90d);
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.growthService.loadAnalytics(),
      this.referralService.getTrainerStats(),
    ]);
  }

  async onRefresh(event: any): Promise<void> {
    await Promise.all([
      this.growthService.loadAnalytics(),
      this.referralService.getTrainerStats(),
    ]);
    event.target.complete();
  }

  cohortCellBg(pct: number): string {
    return this.growthService.cohortCellColor(pct);
  }

  async exportCsv(): Promise<void> {
    this.isExporting.set(true);
    try {
      await this.growthService.exportCsv();
    } catch {
      const toast = await this.toastCtrl.create({
        message: 'Export failed. Try again.',
        duration: 2500,
        color: 'warning',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.isExporting.set(false);
    }
  }
}

addIcons({
  downloadOutline,
  peopleOutline,
  trendingUpOutline,
  trendingDownOutline,
  flashOutline,
  eyeOutline,
  trophyOutline,
  refreshOutline,
});
