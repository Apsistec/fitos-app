import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import {
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  personOutline,
  timeOutline,
  ellipsisHorizontal,
} from 'ionicons/icons';
import { Appointment, AppointmentStatus } from '@fitos/shared';

addIcons({
  checkmarkCircleOutline,
  personOutline,
  timeOutline,
  ellipsisHorizontal,
});

/** Color mapping per appointment status — adherence-neutral (no red). */
export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  requested:    '#3B82F6',  // Blue — pending approval
  booked:       '#10B981',  // Teal (--fitos-accent-primary)
  confirmed:    '#22C55E',  // Green
  arrived:      '#EAB308',  // Yellow
  completed:    '#6B7280',  // Gray
  no_show:      '#8B5CF6',  // Purple — adherence-neutral
  early_cancel: '#374151',  // Dark gray
  late_cancel:  '#B45309',  // Amber
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  requested:    'Requested',
  booked:       'Booked',
  confirmed:    'Confirmed',
  arrived:      'Arrived',
  completed:    'Completed',
  no_show:      'No Show',
  early_cancel: 'Cancelled',
  late_cancel:  'Late Cancel',
};

export interface AppointmentBlockData {
  appointment: Appointment;
  clientName: string;
  serviceName: string;
  /** Row height in px for 1 slot (15 min). Block height = slots * rowHeight */
  rowHeight: number;
}

@Component({
  selector: 'app-appointment-block',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    <div
      class="appointment-block"
      [class]="'status-' + data().appointment.status"
      [style.height.px]="blockHeight()"
      [style.background-color]="statusColor() + '22'"
      [style.border-left-color]="statusColor()"
      (click)="blockClick.emit(data().appointment)"
      (contextmenu)="$event.preventDefault(); longPress.emit(data().appointment)"
    >
      <div class="block-inner">
        <div class="block-header">
          <span class="client-name">{{ data().clientName }}</span>
          @if (showMenu()) {
            <ion-icon name="ellipsis-horizontal" class="menu-icon" (click)="$event.stopPropagation(); longPress.emit(data().appointment)" />
          }
        </div>

        @if (blockHeight() >= 44) {
          <div class="service-name">{{ data().serviceName }}</div>
        }

        @if (blockHeight() >= 64) {
          <div class="time-label">
            <ion-icon name="time-outline" />
            {{ startTime() }} – {{ endTime() }}
          </div>
        }

        @if (blockHeight() >= 80) {
          <div class="status-badge" [style.background-color]="statusColor()">
            {{ statusLabel() }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .appointment-block {
      position: absolute;
      left: 4px;
      right: 4px;
      border-radius: 6px;
      border-left: 4px solid transparent;
      cursor: pointer;
      overflow: hidden;
      transition: opacity 150ms ease, transform 150ms ease;
      min-height: 28px;
      z-index: 2;

      &:active {
        opacity: 0.85;
        transform: scale(0.98);
      }
    }

    .block-inner {
      padding: 4px 6px;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }

    .client-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--fitos-text-primary, #FAFAFA);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    .menu-icon {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      flex-shrink: 0;
      padding: 2px;
      min-width: 18px;
      min-height: 18px;
    }

    .service-name {
      font-size: 10px;
      color: var(--fitos-text-secondary, #A3A3A3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .time-label {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 10px;
      color: var(--fitos-text-tertiary, #737373);

      ion-icon {
        font-size: 10px;
      }
    }

    .status-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 600;
      color: white;
      padding: 1px 5px;
      border-radius: 3px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      align-self: flex-start;
    }
  `],
})
export class AppointmentBlockComponent {
  readonly data = input.required<AppointmentBlockData>();

  /** Emitted when the block is tapped — opens appointment detail sheet */
  readonly blockClick = output<Appointment>();

  /** Emitted on long-press / context-menu — reveals quick-action menu */
  readonly longPress = output<Appointment>();

  readonly statusColor = computed(() => STATUS_COLORS[this.data().appointment.status]);
  readonly statusLabel = computed(() => STATUS_LABELS[this.data().appointment.status]);

  readonly blockHeight = computed(() => {
    const appt = this.data().appointment;
    const slots = appt.duration_minutes / 15;
    return Math.max(slots * this.data().rowHeight, 28);
  });

  readonly showMenu = computed(() => this.blockHeight() >= 40);

  readonly startTime = computed(() => {
    const d = new Date(this.data().appointment.start_at);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  });

  readonly endTime = computed(() => {
    const d = new Date(this.data().appointment.end_at);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  });
}
