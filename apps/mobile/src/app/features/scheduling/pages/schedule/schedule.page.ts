import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonBadge,
  IonFab,
  IonFabButton,
  ModalController,
  ActionSheetController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  addOutline,
  searchOutline,
  calendarOutline,
  peopleOutline,
  personOutline,
  todayOutline,
  listOutline,
  gridOutline,
  ellipsisHorizontalOutline,
} from 'ionicons/icons';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { ServiceTypeService } from '../../../../core/services/service-type.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClientService } from '../../../../core/services/client.service';
import { Appointment } from '@fitos/shared';
import { ScheduleCalendarComponent, TrainerColumn } from '../../components/schedule-calendar/schedule-calendar.component';
import { BookingFormComponent, BookingFormInput } from '../../components/booking-form/booking-form.component';
import { FindAppointmentComponent } from '../../components/find-appointment/find-appointment.component';
import { AppointmentRequestQueueComponent } from '../../components/request-queue/request-queue.component';
import { AppointmentFsmService } from '../../../../core/services/appointment-fsm.service';

addIcons({
  chevronBackOutline, chevronForwardOutline, addOutline, searchOutline,
  calendarOutline, peopleOutline, personOutline, todayOutline,
  listOutline, gridOutline, ellipsisHorizontalOutline,
});

@Component({
  selector: 'app-schedule',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonButtons, IonIcon, IonBadge,
    IonFab, IonFabButton,
    ScheduleCalendarComponent
],
  template: `
    <ion-header>
      <ion-toolbar>
        <!-- Date navigation -->
        <ion-buttons slot="start">
          <ion-button (click)="navigateDay(-1)">
            <ion-icon name="chevron-back-outline" />
          </ion-button>
        </ion-buttons>

        <ion-title (click)="goToToday()" (keyup.enter)="goToToday()" style="cursor: pointer;" role="button" tabindex="0">
          <div class="date-title">
            <span class="date-label">{{ displayDate() }}</span>
            @if (isToday()) {
              <span class="today-badge">Today</span>
            }
          </div>
        </ion-title>

        <ion-buttons slot="end">
          <ion-button (click)="navigateDay(1)">
            <ion-icon name="chevron-forward-outline" />
          </ion-button>

          <!-- View mode toggle (trainer/owner) -->
          @if (canViewAllTrainers()) {
            <ion-button (click)="toggleViewMode()">
              <ion-icon [name]="viewMode() === 'single' ? 'people-outline' : 'person-outline'" />
            </ion-button>
          }

          <ion-button (click)="openFindAppointment()">
            <ion-icon name="search-outline" />
            @if (pendingRequestCount() > 0) {
              <ion-badge color="primary">{{ pendingRequestCount() }}</ion-badge>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Mini date strip (7-day horizontal scroll) -->
      <div class="date-strip">
        @for (day of weekDays(); track day.iso) {
          <button
            type="button"
            class="day-chip"
            [class.today]="day.isToday"
            [class.selected]="day.iso === selectedDate()"
            (click)="selectDate(day.iso)"
            [attr.aria-pressed]="day.iso === selectedDate()"
          >
            <span class="day-label">{{ day.dayName }}</span>
            <span class="day-number">{{ day.dayNumber }}</span>
            @if (day.hasAppointments) {
              <div class="dot"></div>
            }
          </button>
        }
      </div>

      <!-- Pending requests banner -->
      @if (pendingRequestCount() > 0) {
        <button type="button" class="pending-banner" (click)="openRequestQueue()" (keyup.enter)="openRequestQueue()">
          <ion-icon name="calendar-outline" />
          {{ pendingRequestCount() }} pending booking request{{ pendingRequestCount() > 1 ? 's' : '' }}
          <ion-icon name="chevron-forward-outline" style="margin-left: auto;" />
        </button>
      }
    </ion-header>

    <ion-content [fullscreen]="true">
      <app-schedule-calendar
        [date]="selectedDate()"
        [appointments]="todayAppointments()"
        [trainerColumns]="trainerColumns()"
        [viewMode]="viewMode()"
        [activeTrainerId]="activeTrainerId()"
        [isLoading]="isLoading()"
        [trainerId]="trainerId()"
        (appointmentClick)="onAppointmentClick($event)"
        (appointmentLongPress)="onAppointmentLongPress($event)"
        (slotClick)="onSlotClick($event)"
        (activeTrainerChange)="activeTrainerId.set($event)"
      />
    </ion-content>

    <!-- FAB: New appointment -->
    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button (click)="openBookingForm()">
        <ion-icon name="add-outline" />
      </ion-fab-button>
    </ion-fab>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    ion-toolbar {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-title {
      cursor: pointer;
      outline: none;

      &:focus-visible {
        border-radius: 4px;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
      }
    }

    .date-title {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .date-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #FAFAFA);
    }

    .today-badge {
      font-size: 10px;
      font-weight: 500;
      color: var(--fitos-accent-primary, #10B981);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Date strip ── */
    .date-strip {
      display: flex;
      overflow-x: auto;
      padding: 8px 12px;
      gap: 6px;
      background: var(--fitos-bg-primary, #0D0D0D);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      scrollbar-width: none;

      &::-webkit-scrollbar { display: none; }
    }

    .day-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 10px;
      border-radius: 10px;
      cursor: pointer;
      flex-shrink: 0;
      min-width: 40px;
      transition: background 150ms ease;
      position: relative;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;

      &.today .day-number {
        color: var(--fitos-accent-primary, #10B981);
        font-weight: 700;
      }

      &.selected {
        background: rgba(16, 185, 129, 0.15);
      }

      &:active {
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .day-label {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .day-number {
      font-size: 16px;
      font-weight: 600;
      color: var(--fitos-text-primary, #FAFAFA);
      line-height: 1;
    }

    .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--fitos-accent-primary, #10B981);
      margin-top: 2px;
    }

    /* ── Pending banner ── */
    .pending-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(59, 130, 246, 0.12);
      border-bottom: 1px solid rgba(59, 130, 246, 0.3);
      color: #60A5FA;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      width: 100%;
      text-align: left;
      font: inherit;

      ion-icon { font-size: 16px; }
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
      display: flex;
      flex-direction: column;
    }

    app-schedule-calendar {
      flex: 1;
      overflow: hidden;
    }

    ion-fab-button {
      --background: var(--fitos-accent-primary, #10B981);
      --color: #000;
    }
  `],
})
export class SchedulePage implements OnInit {
  private readonly modal = inject(ModalController);
  private readonly actionSheet = inject(ActionSheetController);
  private readonly toast = inject(ToastController);
  private readonly appointmentService = inject(AppointmentService);
  private readonly fsm = inject(AppointmentFsmService);
  readonly serviceTypes = inject(ServiceTypeService);
  private readonly auth = inject(AuthService);
  private readonly clientService = inject(ClientService);

  readonly selectedDate = signal(new Date().toISOString().split('T')[0]);
  readonly viewMode = signal<'single' | 'all-trainers'>('single');
  readonly activeTrainerId = signal<string | null>(null);
  readonly isLoading = this.appointmentService.isLoading;

  readonly trainerId = computed(() => this.auth.profile()?.id ?? '');
  readonly userRole = computed(() => this.auth.profile()?.role);
  readonly canViewAllTrainers = computed(() =>
    this.userRole() === 'gym_owner' || this.userRole() === 'trainer'
  );

  readonly pendingRequestCount = this.appointmentService.pendingRequestCount;

  readonly isToday = computed(() =>
    this.selectedDate() === new Date().toISOString().split('T')[0]
  );

  readonly displayDate = computed(() => {
    const d = new Date(this.selectedDate() + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  });

  readonly todayAppointments = computed(() => {
    const date = this.selectedDate();
    return this.appointmentService.appointments().filter(appt => {
      const apptDate = appt.start_at.split('T')[0];
      return apptDate === date && !['early_cancel', 'late_cancel'].includes(appt.status);
    });
  });

  /** Multi-trainer columns — populated only when viewMode = 'all-trainers' */
  readonly trainerColumns = signal<TrainerColumn[]>([]);

  readonly weekDays = computed(() => {
    const selected = new Date(this.selectedDate() + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Show 7 days centered on selected date
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selected);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const apptOnDay = this.appointmentService.appointments().some(a =>
        a.start_at.startsWith(iso) && !['early_cancel', 'late_cancel'].includes(a.status)
      );
      days.push({
        iso,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isToday: d.getTime() === today.getTime(),
        hasAppointments: apptOnDay,
      });
    }
    return days;
  });

  ngOnInit() {
    const tid = this.trainerId();
    if (tid) {
      this.appointmentService.loadAppointments(tid, {
        start: this.parseDate(this.weekStart()),
        end: this.parseDate(this.weekEnd()),
      });
      this.serviceTypes.loadServiceTypes();
      this.clientService.loadClients();
    }
  }

  navigateDay(delta: number) {
    const d = new Date(this.selectedDate() + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    this.selectedDate.set(d.toISOString().split('T')[0]);
  }

  selectDate(iso: string) {
    this.selectedDate.set(iso);
  }

  goToToday() {
    this.selectedDate.set(new Date().toISOString().split('T')[0]);
  }

  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'single' ? 'all-trainers' : 'single');
  }

  async openBookingForm(prefill: BookingFormInput = {}) {
    const modal = await this.modal.create({
      component: BookingFormComponent,
      componentProps: {
        prefill: {
          date: this.selectedDate(),
          trainerId: this.trainerId(),
          ...prefill,
        },
      },
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
      handleBehavior: 'cycle',
    });
    await modal.present();
  }

  async openFindAppointment() {
    const modal = await this.modal.create({
      component: FindAppointmentComponent,
      breakpoints: [0, 0.85, 1],
      initialBreakpoint: 0.85,
      handleBehavior: 'cycle',
    });
    modal.onDidDismiss().then((result) => {
      if (result.data?.slot) {
        const slot = result.data.slot;
        this.selectedDate.set(slot.date);
        this.openBookingForm({ date: slot.date, startTime: slot.slot.start_at });
      }
    });
    await modal.present();
  }

  async openRequestQueue() {
    const modal = await this.modal.create({
      component: AppointmentRequestQueueComponent,
      breakpoints: [0, 0.85, 1],
      initialBreakpoint: 0.85,
      handleBehavior: 'cycle',
    });
    await modal.present();
  }

  async onAppointmentClick(appt: Appointment) {
    // Detail sheet — Sprint 56 will implement AppointmentDetailComponent
    const sheet = await this.actionSheet.create({
      header: `Appointment`,
      subHeader: `${appt.status.replace('_', ' ')} · ${this.formatTime(appt.start_at)}`,
      buttons: [
        { text: 'View Details', icon: 'calendar-outline', role: 'selected' },
        { text: 'Cancel', role: 'destructive', icon: 'close-outline' },
        { text: 'Dismiss', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async onAppointmentLongPress(appt: Appointment) {
    const buttons = [];

    if (this.fsm.canTransition(appt.status, 'confirmed')) {
      buttons.push({
        text: 'Confirm Appointment',
        icon: 'checkmark-circle-outline',
        handler: () => { this.fsm.transition(appt, 'confirmed'); },
      });
    }
    if (this.fsm.canTransition(appt.status, 'arrived')) {
      buttons.push({
        text: 'Mark Arrived',
        icon: 'person-outline',
        handler: () => { this.fsm.transition(appt, 'arrived'); },
      });
    }
    if (this.fsm.canTransition(appt.status, 'completed')) {
      buttons.push({
        text: 'Check Out (Complete)',
        icon: 'checkmark-done-outline',
        handler: () => { this.fsm.transition(appt, 'completed'); },
      });
    }
    if (this.fsm.canTransition(appt.status, 'no_show')) {
      buttons.push({
        text: 'Mark No-Show',
        icon: 'close-circle-outline',
        handler: () => { this.fsm.transition(appt, 'no_show'); },
      });
    }
    if (!this.fsm.isTerminal(appt.status)) {
      buttons.push({
        text: 'Cancel Appointment',
        icon: 'trash-outline',
        role: 'destructive',
        handler: () => { this.fsm.cancel(appt); },
      });
    }

    buttons.push({ text: 'Dismiss', role: 'cancel' });

    const sheet = await this.actionSheet.create({
      header: 'Quick Actions',
      buttons,
    });
    await sheet.present();
  }

  onSlotClick(evt: { date: string; startTime: string; trainerId?: string }) {
    this.openBookingForm({ date: evt.date, startTime: evt.startTime, trainerId: evt.trainerId });
  }

  private formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  }

  private weekStart(): string {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  }

  private weekEnd(): string {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  }

  private parseDate(dateStr: string): Date {
    return new Date(dateStr);
  }
}
