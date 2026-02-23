/**
 * ScheduleInsightsComponent — Sprint 61.3 (Phase 5D)
 *
 * A compact analytics widget shown on the trainer's schedule page.
 * Displays today's utilization bar, gap count, and a quick-add CTA.
 *
 * Inputs:
 *   appointments  — all trainer appointments (filtered by SchedulePage)
 *   availability  — trainer's StaffAvailability[] for weekly template
 *   selectedDate  — ISO date string (e.g. "2026-03-15")
 *
 * Output:
 *   addSlotClicked — emits when trainer taps "Fill a gap"
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  alertCircleOutline,
  addCircleOutline,
  trendingUpOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { ScheduleOptimizationService } from '../../../../core/services/schedule-optimization.service';
import type { Appointment, StaffAvailability, ScheduleInsight } from '@fitos/shared';

addIcons({
  timeOutline,
  alertCircleOutline,
  addCircleOutline,
  trendingUpOutline,
  checkmarkCircleOutline,
});

@Component({
  selector: 'app-schedule-insights',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon],
  template: `
    @if (insight()) {
      <div class="insights-card">

        <!-- Utilization bar -->
        <div class="utilization-row">
          <div class="util-label">
            <ion-icon name="trending-up-outline"></ion-icon>
            Today's utilization
          </div>
          <div class="util-pct" [class.high]="insight()!.utilizationPct >= 80" [class.low]="insight()!.utilizationPct < 40">
            {{ insight()!.utilizationPct }}%
          </div>
        </div>

        <div class="util-bar-track">
          <div
            class="util-bar-fill"
            [style.width.%]="insight()!.utilizationPct"
            [class.high]="insight()!.utilizationPct >= 80"
            [class.medium]="insight()!.utilizationPct >= 50 && insight()!.utilizationPct < 80"
          ></div>
        </div>

        <!-- Stats row -->
        <div class="stats-row">
          <div class="stat">
            <ion-icon name="time-outline"></ion-icon>
            <span>{{ insight()!.bookedMinutes }} min booked</span>
          </div>

          @if (insight()!.gapCount > 0) {
            <div class="stat gap-warn" (click)="addSlotClicked.emit()" role="button" tabindex="0">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <span>{{ insight()!.gapCount }} gap{{ insight()!.gapCount > 1 ? 's' : '' }} &gt;30 min</span>
              <ion-icon name="add-circle-outline" class="add-icon"></ion-icon>
            </div>
          } @else {
            <div class="stat success">
              <ion-icon name="checkmark-circle-outline"></ion-icon>
              <span>No large gaps</span>
            </div>
          }
        </div>

      </div>
    }
  `,
  styles: [`
    .insights-card {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex; flex-direction: column; gap: 8px;
    }

    /* Utilization row */
    .utilization-row {
      display: flex; justify-content: space-between; align-items: center;
    }
    .util-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .util-label ion-icon { font-size: 14px; color: var(--ion-color-primary, #10B981); }
    .util-pct {
      font-size: 18px; font-weight: 700; font-family: 'Space Mono', monospace;
      color: var(--ion-color-primary, #10B981);
    }
    .util-pct.high  { color: var(--ion-color-primary, #10B981); }
    .util-pct.low   { color: var(--fitos-text-tertiary, #737373); }

    /* Utilization bar */
    .util-bar-track {
      height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;
    }
    .util-bar-fill {
      height: 100%; border-radius: 3px;
      background: var(--fitos-accent-primary, #10B981);
      transition: width 300ms ease;
    }
    .util-bar-fill.high   { background: var(--ion-color-primary, #10B981); }
    .util-bar-fill.medium { background: #F59E0B; }

    /* Stats row */
    .stats-row {
      display: flex; justify-content: space-between; align-items: center; gap: 8px;
    }
    .stat {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3);
    }
    .stat ion-icon { font-size: 14px; }

    .gap-warn {
      color: #F59E0B; cursor: pointer;
      background: rgba(245,158,11,0.1); border-radius: 8px; padding: 4px 8px;
      -webkit-tap-highlight-color: transparent;
    }
    .gap-warn ion-icon { color: #F59E0B; }
    .gap-warn .add-icon { font-size: 16px; margin-left: 2px; }

    .success { color: var(--ion-color-primary, #10B981); }
    .success ion-icon { color: var(--ion-color-primary, #10B981); }
  `],
})
export class ScheduleInsightsComponent implements OnChanges {
  @Input() appointments: Appointment[] = [];
  @Input() availability: StaffAvailability[] = [];
  @Input() selectedDate = '';

  @Output() addSlotClicked = new EventEmitter<void>();

  private optimSvc = inject(ScheduleOptimizationService);
  private cdr      = inject(ChangeDetectorRef);

  insight = signal<ScheduleInsight | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appointments'] || changes['availability'] || changes['selectedDate']) {
      this.recompute();
    }
  }

  private recompute(): void {
    if (!this.selectedDate || this.availability.length === 0) {
      this.insight.set(null);
      return;
    }

    const date = new Date(this.selectedDate + 'T00:00:00');
    const dow  = date.getDay();

    const dayBlocks = this.availability.filter(a => a.day_of_week === dow && a.is_active);
    if (dayBlocks.length === 0) {
      this.insight.set(null);
      return;
    }

    // Use the first block's start and last block's end as the day's availability window
    const sorted = [...dayBlocks].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const availStart = parseTime(sorted[0].start_time);
    const availEnd   = parseTime(sorted[sorted.length - 1].end_time);

    this.insight.set(
      this.optimSvc.computeInsight(date, this.appointments, availStart, availEnd)
    );
    this.cdr.markForCheck();
  }
}
