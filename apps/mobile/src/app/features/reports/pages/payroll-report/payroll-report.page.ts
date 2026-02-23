/**
 * PayrollReportPage — Sprint 60 (Phase 5D)
 *
 * Generates a payroll report for a chosen date range.
 * - Date preset selector (this week, last week, this month, last month, custom)
 * - Summary cards: sessions, revenue, trainer pay, tips
 * - Line-item table filterable by service type / status
 * - CSV export via Capacitor Filesystem → share sheet
 *
 * Route: /tabs/settings/payroll-report  (trainerOrOwnerGuard)
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
  IonCard as IonCardAlias,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonBadge,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonItem,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  downloadOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  trendingUpOutline,
  cashOutline,
  receiptOutline,
  personOutline,
} from 'ionicons/icons';
import { PayrollService } from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PayrollReportRow, PayrollSummary } from '@fitos/shared';

addIcons({
  calendarOutline,
  downloadOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  trendingUpOutline,
  cashOutline,
  receiptOutline,
  personOutline,
});

type DatePreset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

@Component({
  selector: 'app-payroll-report',
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
    IonSelect,
    IonSelectOption,
    IonItem,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Payroll Report</ion-title>
        <ion-buttons slot="end">
          @if (summary()) {
            <ion-button (click)="exportCsv()" aria-label="Export CSV">
              <ion-icon slot="icon-only" name="download-outline"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="report-container">

        <!-- ── Date range selector ──────────────────────────────── -->
        <div class="date-presets">
          @for (p of presets; track p.value) {
            <button
              class="preset-pill"
              [class.active]="selectedPreset() === p.value"
              (click)="selectPreset(p.value)"
            >{{ p.label }}</button>
          }
        </div>

        <!-- Custom date inputs -->
        @if (selectedPreset() === 'custom') {
          <div class="custom-dates">
            <ion-item lines="full">
              <ion-label position="stacked">From</ion-label>
              <ion-input
                type="date"
                [(ngModel)]="customFrom"
                (ngModelChange)="onCustomDateChange()"
              ></ion-input>
            </ion-item>
            <ion-item lines="full">
              <ion-label position="stacked">To</ion-label>
              <ion-input
                type="date"
                [(ngModel)]="customTo"
                (ngModelChange)="onCustomDateChange()"
              ></ion-input>
            </ion-item>
          </div>
        }

        <!-- Generate button -->
        <ion-button
          expand="block"
          [disabled]="isLoading()"
          (click)="generate()"
          class="generate-button"
        >
          @if (isLoading()) { <ion-spinner name="crescent"></ion-spinner> }
          @else {
            <ion-icon slot="start" name="calendar-outline"></ion-icon>
            Generate Report
          }
        </ion-button>

        <!-- ── Summary cards ──────────────────────────────────────── -->
        @if (summary()) {
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-value">{{ summary()!.total_sessions }}</div>
              <div class="summary-label">Total Sessions</div>
            </div>
            <div class="summary-card">
              <div class="summary-value primary">{{ summary()!.total_completed }}</div>
              <div class="summary-label">Completed</div>
            </div>
            <div class="summary-card">
              <div class="summary-value warning">{{ summary()!.total_no_shows }}</div>
              <div class="summary-label">No-Shows</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">{{ summary()!.total_cancellations }}</div>
              <div class="summary-label">Cancels</div>
            </div>
          </div>

          <div class="revenue-grid">
            <ion-card class="revenue-card">
              <ion-card-content>
                <div class="revenue-label">Gross Revenue</div>
                <div class="revenue-value">${{ summary()!.total_gross_revenue | number:'1.2-2' }}</div>
              </ion-card-content>
            </ion-card>
            <ion-card class="revenue-card accent">
              <ion-card-content>
                <div class="revenue-label">Your Pay</div>
                <div class="revenue-value">${{ summary()!.total_trainer_pay | number:'1.2-2' }}</div>
              </ion-card-content>
            </ion-card>
            <ion-card class="revenue-card">
              <ion-card-content>
                <div class="revenue-label">Tips</div>
                <div class="revenue-value">${{ summary()!.total_tips | number:'1.2-2' }}</div>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- ── Filter bar ──────────────────────────────────────── -->
          <div class="filter-bar">
            <ion-select
              [(ngModel)]="filterStatus"
              placeholder="All Statuses"
              interface="popover"
              class="filter-select"
            >
              <ion-select-option value="">All Statuses</ion-select-option>
              <ion-select-option value="completed">Completed</ion-select-option>
              <ion-select-option value="no_show">No-Show</ion-select-option>
              <ion-select-option value="late_cancel">Late Cancel</ion-select-option>
              <ion-select-option value="early_cancel">Early Cancel</ion-select-option>
            </ion-select>
          </div>

          <!-- ── Line items ─────────────────────────────────────── -->
          @if (filteredRows().length === 0) {
            <div class="empty-rows">
              <p>No sessions match the selected filter.</p>
            </div>
          } @else {
            <div class="line-items">
              @for (row of filteredRows(); track row.visit_id) {
                <div class="line-item" [class.processed]="row.payroll_processed">
                  <div class="line-left">
                    <div class="line-date">{{ formatDate(row.visit_date) }}</div>
                    <div class="line-client">{{ row.client_name }}</div>
                    <div class="line-service">{{ row.service_name }}</div>
                  </div>
                  <div class="line-right">
                    <ion-badge [color]="statusColor(row.appointment_status)" class="status-badge">
                      {{ formatStatus(row.appointment_status) }}
                    </ion-badge>
                    <div class="line-pay">${{ row.trainer_pay_amount | number:'1.2-2' }}</div>
                    @if (row.tip_amount > 0) {
                      <div class="line-tip">+${{ row.tip_amount | number:'1.2-2' }} tip</div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Mark processed -->
            @if (unprocessedCount() > 0) {
              <ion-button
                expand="block"
                fill="outline"
                (click)="markAllProcessed()"
                class="mark-button"
              >
                Mark {{ unprocessedCount() }} Session{{ unprocessedCount() !== 1 ? 's' : '' }} as Processed
              </ion-button>
            }
          }
        }

      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 700; }

    .report-container { padding: 16px; display: flex; flex-direction: column; gap: 14px; }

    /* Date presets */
    .date-presets { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .preset-pill {
      flex-shrink: 0; padding: 6px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 600; border: 1.5px solid rgba(255,255,255,0.1);
      background: transparent; color: var(--fitos-text-secondary, #A3A3A3); cursor: pointer;
      transition: all 0.15s;
    }
    .preset-pill.active {
      border-color: var(--ion-color-primary, #10B981);
      color: var(--ion-color-primary, #10B981);
      background: rgba(16,185,129,0.08);
    }

    .custom-dates { display: flex; flex-direction: column; gap: 8px; }
    ion-item { --background: var(--fitos-bg-secondary, #1A1A1A); --border-color: rgba(255,255,255,0.08); }
    ion-label { font-size: 11px !important; color: var(--fitos-text-tertiary, #737373) !important; text-transform: uppercase; letter-spacing: 0.5px; }

    .generate-button { --border-radius: 10px; height: 48px; font-weight: 700; --box-shadow: 0 4px 12px rgba(16,185,129,0.25); }

    /* Summary grid */
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .summary-card {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px 8px; text-align: center;
    }
    .summary-value { font-size: 28px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--fitos-text-primary, #F5F5F5); line-height: 1; }
    .summary-value.primary { color: var(--ion-color-primary, #10B981); }
    .summary-value.warning { color: var(--fitos-status-warning, #F59E0B); }
    .summary-label { font-size: 10px; color: var(--fitos-text-tertiary, #737373); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

    .revenue-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .revenue-card { --background: var(--fitos-bg-secondary, #1A1A1A); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; box-shadow: none; margin: 0; }
    .revenue-card.accent { border-color: rgba(16,185,129,0.3); --background: rgba(16,185,129,0.05); }
    .revenue-label { font-size: 10px; color: var(--fitos-text-tertiary, #737373); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .revenue-value { font-size: 18px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--ion-color-primary, #10B981); }

    /* Filter */
    .filter-bar { display: flex; }
    .filter-select { font-size: 14px; color: var(--fitos-text-primary, #F5F5F5); background: var(--fitos-bg-secondary, #1A1A1A); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.08); flex: 1; }

    /* Line items */
    .line-items { display: flex; flex-direction: column; gap: 0; background: var(--fitos-bg-secondary, #1A1A1A); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
    .line-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); transition: opacity 0.2s; }
    .line-item:last-child { border-bottom: none; }
    .line-item.processed { opacity: 0.5; }

    .line-left { flex: 1; }
    .line-date { font-size: 11px; color: var(--fitos-text-tertiary, #737373); margin-bottom: 2px; }
    .line-client { font-size: 14px; font-weight: 600; color: var(--fitos-text-primary, #F5F5F5); }
    .line-service { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); }

    .line-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .status-badge { font-size: 11px; }
    .line-pay { font-size: 16px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--ion-color-primary, #10B981); }
    .line-tip { font-size: 11px; color: var(--fitos-text-tertiary, #737373); }

    .empty-rows { text-align: center; padding: 24px; color: var(--fitos-text-secondary, #A3A3A3); font-size: 14px; }

    .mark-button { --border-radius: 10px; height: 44px; font-weight: 700; }
  `],
})
export class PayrollReportPage implements OnInit {
  payrollService = inject(PayrollService);
  private auth       = inject(AuthService);
  private toastCtrl  = inject(ToastController);

  // ── State ──────────────────────────────────────────────────────────────────
  isLoading       = signal(false);
  selectedPreset  = signal<DatePreset>('this_month');
  filterStatus    = '';
  customFrom      = '';
  customTo        = '';
  summary         = computed(() => this.payrollService.payrollSummary());

  filteredRows = computed<PayrollReportRow[]>(() => {
    const rows = this.summary()?.rows ?? [];
    if (!this.filterStatus) return rows;
    return rows.filter(r => r.appointment_status === this.filterStatus);
  });

  unprocessedCount = computed(() =>
    this.filteredRows().filter(r => !r.payroll_processed).length
  );

  presets: { value: DatePreset; label: string }[] = [
    { value: 'this_week',  label: 'This Week'  },
    { value: 'last_week',  label: 'Last Week'  },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'custom',     label: 'Custom'     },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Auto-generate this month on load
    this.generate();
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  selectPreset(preset: DatePreset): void {
    this.selectedPreset.set(preset);
    if (preset !== 'custom') this.generate();
  }

  onCustomDateChange(): void {
    if (this.customFrom && this.customTo) this.generate();
  }

  async generate(): Promise<void> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    const { from, to } = this.getDateRange();
    this.isLoading.set(true);
    await this.payrollService.getPayrollSummary(trainerId, from, to);
    this.isLoading.set(false);
  }

  async exportCsv(): Promise<void> {
    const s = this.summary();
    if (!s) return;

    const csv = this.payrollService.generateCsv(s);
    const filename = `payroll-${this.formatDateForFile(s.date_from)}-to-${this.formatDateForFile(s.date_to)}.csv`;

    try {
      // Dynamically import Capacitor Filesystem to avoid SSR issues
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const result = await Filesystem.writeFile({
        path:      filename,
        data:      csv,
        directory: Directory.Cache,
        encoding:  'utf8' as never,
      });

      await Share.share({
        title: filename,
        url:   result.uri,
      });
    } catch {
      // Fallback: browser download for PWA
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const t = await this.toastCtrl.create({
        message:  'CSV downloaded',
        duration: 2000,
        color:    'success',
        position: 'top',
      });
      await t.present();
    }
  }

  async markAllProcessed(): Promise<void> {
    const unprocessed = this.filteredRows()
      .filter(r => !r.payroll_processed)
      .map(r => r.visit_id);

    if (unprocessed.length === 0) return;

    const count = await this.payrollService.markProcessed(unprocessed);
    if (count > 0) {
      // Refresh report
      await this.generate();
      const t = await this.toastCtrl.create({
        message:  `✓ ${count} session${count !== 1 ? 's' : ''} marked as processed`,
        duration: 2500,
        color:    'success',
        position: 'top',
      });
      await t.present();
    }
  }

  // ── Date range helpers ────────────────────────────────────────────────────

  private getDateRange(): { from: Date; to: Date } {
    const now = new Date();
    const startOfDay = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
    const endOfDay   = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };

    switch (this.selectedPreset()) {
      case 'this_week': {
        const from = new Date(now);
        from.setDate(now.getDate() - now.getDay()); // Sunday
        return { from: startOfDay(from), to: endOfDay(new Date()) };
      }
      case 'last_week': {
        const from = new Date(now);
        from.setDate(now.getDate() - now.getDay() - 7);
        const to = new Date(from);
        to.setDate(from.getDate() + 6);
        return { from: startOfDay(from), to: endOfDay(to) };
      }
      case 'this_month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from, to: endOfDay(new Date()) };
      }
      case 'last_month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const to   = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from, to: endOfDay(to) };
      }
      case 'custom':
        return {
          from: this.customFrom ? new Date(this.customFrom) : new Date(now.getFullYear(), now.getMonth(), 1),
          to:   this.customTo   ? new Date(this.customTo)   : new Date(),
        };
    }
  }

  // ── Formatting ────────────────────────────────────────────────────────────

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateForFile(iso: string): string {
    return new Date(iso).toISOString().split('T')[0];
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      completed:    'Done',
      no_show:      'No-Show',
      late_cancel:  'Late Cancel',
      early_cancel: 'Early Cancel',
    };
    return map[status] ?? status;
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      completed:    'success',
      no_show:      'warning',
      late_cancel:  'warning',
      early_cancel: 'medium',
    };
    return map[status] ?? 'medium';
  }
}
