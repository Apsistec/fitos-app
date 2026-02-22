import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  computed,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {
  IonSpinner,
  IonText,
  IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, personOutline } from 'ionicons/icons';
import { Appointment } from '@fitos/shared';
import {
  AppointmentBlockComponent,
  AppointmentBlockData,
} from '../appointment-block/appointment-block.component';
import {
  BookingFormComponent,
  BookingFormInput,
} from '../booking-form/booking-form.component';

addIcons({ addOutline, personOutline });

/** One trainer column for the multi-trainer view. */
export interface TrainerColumn {
  id: string;
  name: string;
  avatarUrl?: string;
  appointments: Appointment[];
}

/** Resolved appointment block positioned on the grid. */
interface PositionedBlock {
  block: AppointmentBlockData;
  topPx: number;
}

const HOURS_START = 6;   // 6 AM
const HOURS_END   = 21;  // 9 PM
const TOTAL_HOURS = HOURS_END - HOURS_START;
const TOTAL_SLOTS = TOTAL_HOURS * 4; // 15-min slots
const ROW_HEIGHT_PX = 20; // px per 15-min slot
const GRID_HEIGHT_PX = TOTAL_SLOTS * ROW_HEIGHT_PX; // 1200px for 6am–9pm

@Component({
  selector: 'app-schedule-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonSpinner, IonText, IonIcon,
    AppointmentBlockComponent,
  ],
  template: `
    <div class="calendar-wrapper" #calendarWrapper>
      <!-- Header: column labels for multi-trainer mode -->
      @if (viewMode() === 'all-trainers' && trainerColumns().length > 0) {
        <div class="column-headers" [style.padding-left.px]="TIME_GUTTER_WIDTH">
          @for (col of trainerColumns(); track col.id) {
            <button
              type="button"
              class="column-header"
              [class.selected]="col.id === activeTrainerId()"
              (click)="activeTrainerChange.emit(col.id)"
              (keyup.enter)="activeTrainerChange.emit(col.id)"
              [attr.aria-pressed]="col.id === activeTrainerId()"
            >
              <div class="trainer-avatar">
                @if (col.avatarUrl) {
                  <img [src]="col.avatarUrl" [alt]="col.name" />
                } @else {
                  <ion-icon name="person-outline" />
                }
              </div>
              <span class="trainer-name">{{ col.name }}</span>
            </button>
          }
        </div>
      }

      <!-- Loading state -->
      @if (isLoading()) {
        <div class="loading-overlay">
          <ion-spinner name="crescent" />
          <ion-text color="medium">Loading schedule...</ion-text>
        </div>
      }

      <!-- Grid scroll container -->
      <div class="grid-scroll" #gridScroll>
        <div class="grid-inner" [style.height.px]="GRID_HEIGHT_PX">

          <!-- Time gutter (left axis) -->
          <div class="time-gutter" [style.width.px]="TIME_GUTTER_WIDTH">
            @for (label of hourLabels(); track label.hour) {
              <div
                class="hour-label"
                [style.top.px]="label.topPx"
              >{{ label.text }}</div>
            }
          </div>

          <!-- Single-trainer or all-trainers columns -->
          @if (viewMode() === 'single') {
            <!-- Single trainer column -->
            <button
              type="button"
              class="trainer-column"
              [style.left.px]="TIME_GUTTER_WIDTH"
              [style.right.px]="0"
              (click)="onColumnClick($event)"
              (keyup.enter)="onColumnClick($event)"
              aria-label="Schedule grid - click to book appointment"
            >
              @for (row of gridRows(); track row.slotIndex) {
                <div
                  class="grid-row"
                  [class.hour-boundary]="row.isHourBoundary"
                  [class.half-hour]="row.isHalfHour"
                  [style.top.px]="row.topPx"
                  [style.height.px]="ROW_HEIGHT_PX"
                ></div>
              }

              @for (block of singleColumnBlocks(); track block.block.appointment.id) {
                <div [style.top.px]="block.topPx" style="position: absolute; left: 0; right: 0;">
                  <app-appointment-block
                    [data]="block.block"
                    (blockClick)="appointmentClick.emit($event)"
                    (longPress)="appointmentLongPress.emit($event)"
                  />
                </div>
              }

              <!-- Current time indicator -->
              @if (currentTimePx() !== null) {
                <div class="now-line" [style.top.px]="currentTimePx()!">
                  <div class="now-dot"></div>
                  <div class="now-bar"></div>
                </div>
              }
            </button>

          } @else {
            <!-- Multi-trainer columns with horizontal scroll -->
            <div class="multi-trainer-scroll" [style.left.px]="TIME_GUTTER_WIDTH">
              @for (col of trainerColumns(); track col.id) {
                <button
                  type="button"
                  class="trainer-column multi"
                  [class.active]="col.id === activeTrainerId()"
                  (click)="onColumnClick($event, col.id)"
                  (keyup.enter)="onColumnClick($event, col.id)"
                  [attr.aria-label]="col.name + ' schedule grid'"
                >
                  @for (row of gridRows(); track row.slotIndex) {
                    <div
                      class="grid-row"
                      [class.hour-boundary]="row.isHourBoundary"
                      [class.half-hour]="row.isHalfHour"
                      [style.top.px]="row.topPx"
                      [style.height.px]="ROW_HEIGHT_PX"
                    ></div>
                  }

                  @for (block of columnBlocks(col); track block.block.appointment.id) {
                    <div [style.top.px]="block.topPx" style="position: absolute; left: 0; right: 0;">
                      <app-appointment-block
                        [data]="block.block"
                        (blockClick)="appointmentClick.emit($event)"
                        (longPress)="appointmentLongPress.emit($event)"
                      />
                    </div>
                  }
                </button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .calendar-wrapper {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      background: var(--fitos-bg-primary, #0D0D0D);
    }

    /* ── Column headers (multi-trainer mode) ── */
    .column-headers {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      overflow-x: auto;
      flex-shrink: 0;
      background: var(--fitos-bg-secondary, #171717);
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .column-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      min-width: 100px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 150ms;
      flex-shrink: 0;
      border: none;
      background: transparent;
      font: inherit;
      color: inherit;

      &:focus-visible {
        outline: 2px solid var(--fitos-accent-primary, #10B981);
        outline-offset: -2px;
      }

      &.selected {
        opacity: 1;
        border-bottom: 2px solid var(--fitos-accent-primary, #10B981);
      }
    }

    .trainer-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;

      img { width: 100%; height: 100%; object-fit: cover; }
      ion-icon { font-size: 16px; color: var(--fitos-text-tertiary, #737373); }
    }

    .trainer-name {
      font-size: 11px;
      font-weight: 500;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
      white-space: nowrap;
    }

    /* ── Loading ── */
    .loading-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(13, 13, 13, 0.7);
    }

    /* ── Grid scroll ── */
    .grid-scroll {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    }

    .grid-inner {
      position: relative;
      width: 100%;
    }

    /* ── Time gutter ── */
    .time-gutter {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 3;
      background: var(--fitos-bg-primary, #0D0D0D);
    }

    .hour-label {
      position: absolute;
      left: 4px;
      right: 4px;
      font-size: 10px;
      color: var(--fitos-text-tertiary, #737373);
      font-weight: 500;
      line-height: 1;
      transform: translateY(-50%);
      text-align: right;
      padding-right: 6px;
    }

    /* ── Trainer column ── */
    .trainer-column {
      position: absolute;
      top: 0;
      bottom: 0;
      cursor: pointer;
      border: none;
      background: transparent;
      font: inherit;
      color: inherit;
      padding: 0;
      text-align: inherit;

      &:focus-visible {
        outline: 2px solid var(--fitos-accent-primary, #10B981);
      }
    }

    /* ── Multi-trainer horizontal scroll container ── */
    .multi-trainer-scroll {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      display: flex;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    .trainer-column.multi {
      position: relative;
      width: 120px;
      min-width: 120px;
      flex-shrink: 0;
      border-right: 1px solid rgba(255, 255, 255, 0.04);
      top: auto;
      bottom: auto;
      height: 100%;

      &.active {
        background: rgba(16, 185, 129, 0.03);
      }

      &:focus-visible {
        outline: 2px solid var(--fitos-accent-primary, #10B981);
      }
    }

    /* ── Grid rows ── */
    .grid-row {
      position: absolute;
      left: 0;
      right: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.025);
      pointer-events: none;

      &.hour-boundary {
        border-bottom-color: rgba(255, 255, 255, 0.08);
      }

      &.half-hour {
        border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
      }
    }

    /* ── Current time indicator ── */
    .now-line {
      position: absolute;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      pointer-events: none;
      z-index: 4;
    }

    .now-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #EF4444;
      flex-shrink: 0;
    }

    .now-bar {
      flex: 1;
      height: 1px;
      background: #EF4444;
    }
  `],
})
export class ScheduleCalendarComponent implements AfterViewInit {
  @ViewChild('gridScroll') private gridScrollEl!: ElementRef<HTMLElement>;

  /** Date to display (ISO date string e.g. '2026-03-15') */
  readonly date = input.required<string>();

  /** Appointments for single-trainer view */
  readonly appointments = input<Appointment[]>([]);

  /** Columns for multi-trainer view */
  readonly trainerColumns = input<TrainerColumn[]>([]);

  /** 'single' | 'all-trainers' */
  readonly viewMode = input<'single' | 'all-trainers'>('single');

  /** Active trainer ID (for multi-trainer column highlighting) */
  readonly activeTrainerId = input<string | null>(null);

  /** True while parent is fetching appointments */
  readonly isLoading = input(false);

  /** Trainer ID used when pre-filling the booking form */
  readonly trainerId = input<string>('');

  // Outputs
  readonly appointmentClick = output<Appointment>();
  readonly appointmentLongPress = output<Appointment>();
  readonly slotClick = output<{ date: string; startTime: string; trainerId?: string }>();
  readonly activeTrainerChange = output<string>();

  private readonly modal = inject(ModalController);

  // Constants exposed to template
  readonly GRID_HEIGHT_PX = GRID_HEIGHT_PX;
  readonly ROW_HEIGHT_PX = ROW_HEIGHT_PX;
  readonly TIME_GUTTER_WIDTH = 44;

  readonly currentTimePx = computed<number | null>(() => {
    const now = new Date();
    const displayDate = new Date(this.date());
    // Only show on today
    if (
      now.getFullYear() !== displayDate.getFullYear() ||
      now.getMonth() !== displayDate.getMonth() ||
      now.getDate() !== displayDate.getDate()
    ) {
      return null;
    }
    const minutesFromStart = (now.getHours() - HOURS_START) * 60 + now.getMinutes();
    if (minutesFromStart < 0 || minutesFromStart > TOTAL_HOURS * 60) return null;
    return (minutesFromStart / 15) * ROW_HEIGHT_PX;
  });

  readonly hourLabels = computed(() => {
    const labels: { hour: number; text: string; topPx: number }[] = [];
    for (let h = HOURS_START; h <= HOURS_END; h++) {
      const slotIndex = (h - HOURS_START) * 4;
      labels.push({
        hour: h,
        text: h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`,
        topPx: slotIndex * ROW_HEIGHT_PX,
      });
    }
    return labels;
  });

  readonly gridRows = computed(() => {
    const rows: { slotIndex: number; topPx: number; isHourBoundary: boolean; isHalfHour: boolean }[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      rows.push({
        slotIndex: i,
        topPx: i * ROW_HEIGHT_PX,
        isHourBoundary: i % 4 === 0,
        isHalfHour: i % 2 === 0 && i % 4 !== 0,
      });
    }
    return rows;
  });

  readonly singleColumnBlocks = computed<PositionedBlock[]>(() =>
    this.positionAppointments(this.appointments())
  );

  columnBlocks(col: TrainerColumn): PositionedBlock[] {
    return this.positionAppointments(col.appointments);
  }

  private positionAppointments(appts: Appointment[]): PositionedBlock[] {
    return appts.map(appt => ({
      topPx: this.appointmentTopPx(appt),
      block: {
        appointment: appt,
        clientName: (appt as unknown as Record<string, unknown>)['client'] ? ((appt as unknown as Record<string, unknown>)['client'] as Record<string, unknown>)['full_name'] as string : 'Client',
        serviceName: (appt as unknown as Record<string, unknown>)['service_type'] ? ((appt as unknown as Record<string, unknown>)['service_type'] as Record<string, unknown>)['name'] as string : 'Session',
        rowHeight: ROW_HEIGHT_PX,
      } satisfies AppointmentBlockData,
    }));
  }

  private appointmentTopPx(appt: Appointment): number {
    const start = new Date(appt.start_at);
    const minutesFromGridStart = (start.getHours() - HOURS_START) * 60 + start.getMinutes();
    return Math.max(0, (minutesFromGridStart / 15) * ROW_HEIGHT_PX);
  }

  ngAfterViewInit() {
    // Scroll to current time (or 8 AM as fallback) after view init
    setTimeout(() => this.scrollToNow(), 100);
  }

  private scrollToNow() {
    const el = this.gridScrollEl?.nativeElement;
    if (!el) return;

    const now = new Date();
    const targetMinutes = this.currentTimePx() !== null
      ? (now.getHours() - HOURS_START) * 60 + now.getMinutes() - 60 // 1hr before now
      : (8 - HOURS_START) * 60; // default 8 AM

    const scrollTop = Math.max(0, (targetMinutes / 15) * ROW_HEIGHT_PX);
    el.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }

  async onColumnClick(event: Event, overrideTrainerId?: string) {
    // Don't open booking form if the click was on an appointment block
    if (!(event instanceof MouseEvent || event instanceof KeyboardEvent)) return;

    const target = event.target as HTMLElement;
    if (target.closest('app-appointment-block')) return;

    const gridEl = (event.currentTarget as HTMLElement);
    const rect = gridEl.getBoundingClientRect();
    const scrollTop = this.gridScrollEl?.nativeElement.scrollTop ?? 0;

    // Handle both mouse click and keyboard enter
    let clickY = 0;
    if (event instanceof MouseEvent) {
      clickY = event.clientY - rect.top + scrollTop;
    } else {
      // For keyboard events, use the center of the element
      clickY = rect.height / 2 + scrollTop;
    }

    // Snap to nearest 15-min slot
    const slotIndex = Math.floor(clickY / ROW_HEIGHT_PX);
    const totalMinutes = slotIndex * 15;
    const hour = HOURS_START + Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;

    if (hour >= HOURS_END) return;

    const startTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    // Emit event for parent to handle (e.g., show booking form)
    this.slotClick.emit({
      date: this.date(),
      startTime,
      trainerId: overrideTrainerId ?? this.trainerId() ?? undefined,
    });

    // Also open the booking modal directly
    await this.openBookingModal({
      date: this.date(),
      startTime,
      trainerId: overrideTrainerId ?? this.trainerId() ?? undefined,
    });
  }

  private async openBookingModal(prefill: BookingFormInput) {
    const modal = await this.modal.create({
      component: BookingFormComponent,
      componentProps: { prefill },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
      handleBehavior: 'cycle',
    });
    await modal.present();
  }
}
