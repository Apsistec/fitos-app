/**
 * RevenueReportPage — Sprint 60 (Phase 5D)
 *
 * Business revenue overview:
 * - Daily / weekly / monthly view toggle
 * - Revenue breakdown: package sales vs drop-in vs autopay
 * - Outstanding client balances (ledger debts)
 * - Summary KPIs: total revenue, avg per session, session count
 *
 * Route: /tabs/settings/revenue-report  (trainerOrOwnerGuard)
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonBadge,
  IonNote,
  IonItem,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  calendarOutline,
  downloadOutline,
  alertCircleOutline,
  walletOutline,
  layersOutline,
  cashOutline,
} from 'ionicons/icons';
import { SaleTransactionsService } from '../../../../core/services/sale-transactions.service';
import { ClientLedgerService } from '../../../../core/services/client-ledger.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

addIcons({
  trendingUpOutline,
  calendarOutline,
  downloadOutline,
  alertCircleOutline,
  walletOutline,
  layersOutline,
  cashOutline,
});

type GranularityType = 'daily' | 'weekly' | 'monthly';

interface DailyRevenueSummary {
  date: string;
  total_revenue: number;
  total_tips: number;
  session_count: number;
  cash_count: number;
  card_count: number;
  pack_count: number;
}

interface OutstandingClient {
  client_id: string;
  client_name: string;
  balance: number; // negative = owes money
}

@Component({
  selector: 'app-revenue-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonBadge,
    IonNote,
    IonItem,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Revenue Report</ion-title>
        <ion-buttons slot="end">
          @if (!isLoading() && dailyRows().length > 0) {
            <ion-button (click)="exportCsv()" aria-label="Export CSV">
              <ion-icon slot="icon-only" name="download-outline"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="report-container">

        <!-- ── Granularity + period selector ─────────────────── -->
        <ion-segment [(ngModel)]="granularity" (ngModelChange)="onGranularityChange()">
          <ion-segment-button value="daily"><ion-label>Daily</ion-label></ion-segment-button>
          <ion-segment-button value="weekly"><ion-label>Weekly</ion-label></ion-segment-button>
          <ion-segment-button value="monthly"><ion-label>Monthly</ion-label></ion-segment-button>
        </ion-segment>

        <!-- Date presets -->
        <div class="date-presets">
          @for (p of presets; track p.value) {
            <button
              class="preset-pill"
              [class.active]="selectedPreset() === p.value"
              (click)="selectPreset(p.value)"
            >{{ p.label }}</button>
          }
        </div>

        <ion-button expand="block" [disabled]="isLoading()" (click)="generate()" class="generate-button">
          @if (isLoading()) { <ion-spinner name="crescent"></ion-spinner> }
          @else {
            <ion-icon slot="start" name="calendar-outline"></ion-icon>
            Load Report
          }
        </ion-button>

        @if (dailyRows().length > 0) {
          <!-- ── KPI summary ──────────────────────────────────── -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-value primary">${{ totalRevenue() | number:'1.2-2' }}</div>
              <div class="kpi-label">Total Revenue</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">{{ totalSessions() }}</div>
              <div class="kpi-label">Sessions</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${{ avgPerSession() | number:'1.2-2' }}</div>
              <div class="kpi-label">Avg / Session</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value">${{ totalTips() | number:'1.2-2' }}</div>
              <div class="kpi-label">Total Tips</div>
            </div>
          </div>

          <!-- ── Payment method breakdown ───────────────────── -->
          <ion-card class="breakdown-card">
            <ion-card-content>
              <div class="breakdown-title">Payment Method Breakdown</div>
              <div class="breakdown-bars">
                <div class="bar-row">
                  <span class="bar-label">Session Packs</span>
                  <div class="bar-track">
                    <div class="bar-fill pack" [style.width]="packPct() + '%'"></div>
                  </div>
                  <span class="bar-value">{{ totalPackSessions() }}</span>
                </div>
                <div class="bar-row">
                  <span class="bar-label">Card</span>
                  <div class="bar-track">
                    <div class="bar-fill card" [style.width]="cardPct() + '%'"></div>
                  </div>
                  <span class="bar-value">{{ totalCardSessions() }}</span>
                </div>
                <div class="bar-row">
                  <span class="bar-label">Cash</span>
                  <div class="bar-track">
                    <div class="bar-fill cash" [style.width]="cashPct() + '%'"></div>
                  </div>
                  <span class="bar-value">{{ totalCashSessions() }}</span>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- ── Daily breakdown table ───────────────────────── -->
          <div class="table-card">
            <div class="table-header">
              <span class="col-date">Date</span>
              <span class="col-sessions">Sessions</span>
              <span class="col-revenue">Revenue</span>
              <span class="col-tips">Tips</span>
            </div>
            @for (row of dailyRows(); track row.date) {
              <div class="table-row">
                <span class="col-date">{{ formatDate(row.date) }}</span>
                <span class="col-sessions">{{ row.session_count }}</span>
                <span class="col-revenue">${{ row.total_revenue | number:'1.2-2' }}</span>
                <span class="col-tips">
                  @if (row.total_tips > 0) {
                    <span class="tip-amount">+${{ row.total_tips | number:'1.2-2' }}</span>
                  } @else { — }
                </span>
              </div>
            }
          </div>

          <!-- ── Outstanding balances ───────────────────────── -->
          @if (outstandingClients().length > 0) {
            <ion-card class="outstanding-card">
              <ion-card-content>
                <div class="outstanding-title">
                  <ion-icon name="alert-circle-outline"></ion-icon>
                  Outstanding Balances
                </div>
                @for (oc of outstandingClients(); track oc.client_id) {
                  <div class="outstanding-row">
                    <span class="oc-name">{{ oc.client_name }}</span>
                    <span class="oc-amount">-${{ (-oc.balance) | number:'1.2-2' }}</span>
                  </div>
                }
                <div class="outstanding-total">
                  Total Owed: ${{ totalOutstanding() | number:'1.2-2' }}
                </div>
              </ion-card-content>
            </ion-card>
          }
        }

      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 700; }

    .report-container { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

    ion-segment { --background: var(--fitos-bg-secondary, #1A1A1A); border-radius: 10px; }
    ion-segment-button { --color-checked: var(--ion-color-primary, #10B981); font-size: 13px; }

    .date-presets { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .preset-pill {
      flex-shrink: 0; padding: 6px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 600; border: 1.5px solid rgba(255,255,255,0.1);
      background: transparent; color: var(--fitos-text-secondary, #A3A3A3); cursor: pointer;
    }
    .preset-pill.active { border-color: var(--ion-color-primary, #10B981); color: var(--ion-color-primary, #10B981); background: rgba(16,185,129,0.08); }

    .generate-button { --border-radius: 10px; height: 48px; font-weight: 700; --box-shadow: 0 4px 12px rgba(16,185,129,0.25); }

    /* KPIs */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .kpi-card { background: var(--fitos-bg-secondary, #1A1A1A); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px 8px; text-align: center; }
    .kpi-value { font-size: 20px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--fitos-text-primary, #F5F5F5); line-height: 1.2; }
    .kpi-value.primary { color: var(--ion-color-primary, #10B981); }
    .kpi-label { font-size: 10px; color: var(--fitos-text-tertiary, #737373); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Breakdown */
    .breakdown-card { --background: var(--fitos-bg-secondary, #1A1A1A); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; box-shadow: none; margin: 0; }
    .breakdown-title { font-size: 13px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); margin-bottom: 12px; }
    .breakdown-bars { display: flex; flex-direction: column; gap: 10px; }
    .bar-row { display: flex; align-items: center; gap: 10px; }
    .bar-label { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); width: 90px; flex-shrink: 0; }
    .bar-track { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
    .bar-fill.pack { background: var(--ion-color-primary, #10B981); }
    .bar-fill.card { background: var(--ion-color-secondary, #6366F1); }
    .bar-fill.cash { background: var(--fitos-status-warning, #F59E0B); }
    .bar-value { font-size: 13px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--fitos-text-primary, #F5F5F5); width: 30px; text-align: right; flex-shrink: 0; }

    /* Table */
    .table-card { background: var(--fitos-bg-secondary, #1A1A1A); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
    .table-header { display: grid; grid-template-columns: 2fr 1fr 1.5fr 1fr; padding: 10px 14px; background: rgba(255,255,255,0.03); }
    .table-header span { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--fitos-text-tertiary, #737373); }
    .table-row { display: grid; grid-template-columns: 2fr 1fr 1.5fr 1fr; padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.04); align-items: center; }
    .col-date { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); }
    .col-sessions { font-size: 14px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }
    .col-revenue { font-size: 14px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--ion-color-primary, #10B981); }
    .col-tips { font-size: 12px; color: var(--fitos-text-tertiary, #737373); }
    .tip-amount { color: var(--fitos-status-warning, #F59E0B); font-weight: 600; }

    /* Outstanding */
    .outstanding-card { --background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); border-radius: 12px; box-shadow: none; margin: 0; }
    .outstanding-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--fitos-status-warning, #F59E0B); margin-bottom: 12px; }
    .outstanding-title ion-icon { font-size: 18px; }
    .outstanding-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .oc-name { font-size: 14px; color: var(--fitos-text-primary, #F5F5F5); }
    .oc-amount { font-size: 14px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--fitos-status-warning, #F59E0B); }
    .outstanding-total { margin-top: 10px; font-size: 13px; font-weight: 700; color: var(--fitos-status-warning, #F59E0B); text-align: right; }
  `],
})
export class RevenueReportPage implements OnInit {
  private saleService   = inject(SaleTransactionsService);
  private ledgerService = inject(ClientLedgerService);
  private auth          = inject(AuthService);
  private supabase      = inject(SupabaseService);
  private toastCtrl     = inject(ToastController);

  // ── State ──────────────────────────────────────────────────────────────────
  isLoading       = signal(false);
  granularity: GranularityType = 'daily';
  selectedPreset  = signal<string>('this_month');
  dailyRows       = signal<DailyRevenueSummary[]>([]);
  outstandingClients = signal<OutstandingClient[]>([]);

  presets = [
    { value: 'this_week',  label: 'This Week'  },
    { value: 'last_week',  label: 'Last Week'  },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
  ];

  // ── Computed KPIs ──────────────────────────────────────────────────────────
  totalRevenue    = computed(() => this.dailyRows().reduce((s, r) => s + r.total_revenue, 0));
  totalSessions   = computed(() => this.dailyRows().reduce((s, r) => s + r.session_count, 0));
  totalTips       = computed(() => this.dailyRows().reduce((s, r) => s + r.total_tips, 0));
  avgPerSession   = computed(() => {
    const sessions = this.totalSessions();
    return sessions > 0 ? this.totalRevenue() / sessions : 0;
  });

  totalPackSessions = computed(() => this.dailyRows().reduce((s, r) => s + r.pack_count, 0));
  totalCardSessions = computed(() => this.dailyRows().reduce((s, r) => s + r.card_count, 0));
  totalCashSessions = computed(() => this.dailyRows().reduce((s, r) => s + r.cash_count, 0));

  packPct = computed(() => {
    const t = this.totalSessions();
    return t > 0 ? Math.round(this.totalPackSessions() / t * 100) : 0;
  });
  cardPct = computed(() => {
    const t = this.totalSessions();
    return t > 0 ? Math.round(this.totalCardSessions() / t * 100) : 0;
  });
  cashPct = computed(() => {
    const t = this.totalSessions();
    return t > 0 ? Math.round(this.totalCashSessions() / t * 100) : 0;
  });

  totalOutstanding = computed(() =>
    Math.abs(this.outstandingClients().reduce((s, c) => s + c.balance, 0))
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.generate();
  }

  onGranularityChange(): void {
    this.generate();
  }

  selectPreset(preset: string): void {
    this.selectedPreset.set(preset);
    this.generate();
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async generate(): Promise<void> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    this.isLoading.set(true);
    const { from, to } = this.getDateRange();

    await Promise.all([
      this.loadRevenueRows(trainerId, from, to),
      this.loadOutstandingBalances(trainerId),
    ]);

    this.isLoading.set(false);
  }

  private async loadRevenueRows(trainerId: string, from: Date, to: Date): Promise<void> {
    const data = await this.saleService.getRevenueReport(trainerId, from, to);
    this.dailyRows.set(data as DailyRevenueSummary[]);
  }

  private async loadOutstandingBalances(trainerId: string): Promise<void> {
    const balances = await this.saleService.getOutstandingBalances(trainerId);
    // Filter to only clients who OWE money (negative balance)
    const owing = (balances as OutstandingClient[]).filter(b => b.balance < 0);
    this.outstandingClients.set(owing);
  }

  // ── CSV export ────────────────────────────────────────────────────────────

  async exportCsv(): Promise<void> {
    const rows = this.dailyRows();
    if (rows.length === 0) return;

    const header = 'Date,Sessions,Revenue,Tips,Pack,Card,Cash';
    const body = rows.map(r =>
      [
        r.date,
        r.session_count,
        r.total_revenue.toFixed(2),
        r.total_tips.toFixed(2),
        r.pack_count,
        r.card_count,
        r.cash_count,
      ].join(',')
    ).join('\n');

    const csv      = header + '\n' + body;
    const filename = `revenue-${this.selectedPreset()}.csv`;

    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const result = await Filesystem.writeFile({ path: filename, data: csv, directory: Directory.Cache, encoding: 'utf8' as never });
      await Share.share({ title: filename, url: result.uri });
    } catch {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }

    const t = await this.toastCtrl.create({ message: 'CSV exported', duration: 2000, color: 'success', position: 'top' });
    await t.present();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getDateRange(): { from: Date; to: Date } {
    const now = new Date();
    const endOfDay = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };

    switch (this.selectedPreset()) {
      case 'this_week': {
        const from = new Date(now); from.setDate(now.getDate() - now.getDay());
        return { from, to: endOfDay(new Date()) };
      }
      case 'last_week': {
        const from = new Date(now); from.setDate(now.getDate() - now.getDay() - 7);
        const to = new Date(from); to.setDate(from.getDate() + 6);
        return { from, to: endOfDay(to) };
      }
      case 'last_month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to   = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from, to: endOfDay(to) };
      }
      default: { // this_month
        return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(new Date()) };
      }
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
