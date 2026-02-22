import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  ToastController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonNote,
  IonToggle,
  IonTextarea,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  calendarOutline,
  timeOutline,
  personOutline,
  repeatOutline,
  warningOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { ServiceTypeService } from '../../../../core/services/service-type.service';
import { ClientService } from '../../../../core/services/client.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CancellationPolicyService } from '../../../../core/services/cancellation-policy.service';
import { CreateAppointmentDto, ServiceType, BookableSlot } from '@fitos/shared';

addIcons({ closeOutline, calendarOutline, timeOutline, personOutline, repeatOutline, warningOutline, informationCircleOutline });

export interface BookingFormInput {
  /** Pre-filled date (ISO string) */
  date?: string;
  /** Pre-filled start time as HH:MM */
  startTime?: string;
  /** Pre-filled trainer ID (for multi-trainer view) */
  trainerId?: string;
  /** Edit mode: existing appointment ID */
  appointmentId?: string;
}

@Component({
  selector: 'app-booking-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonNote,
    IonToggle,
    IonTextarea,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ isEditMode() ? 'Edit Appointment' : 'New Appointment' }}</ion-title>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline" />
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            fill="solid"
            color="primary"
            [disabled]="!isFormValid() || isSaving()"
            (click)="save()"
          >
            @if (isSaving()) {
              <ion-spinner name="crescent" />
            } @else {
              {{ isEditMode() ? 'Update' : 'Book' }}
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (conflictError()) {
        <div class="conflict-banner">
          <ion-icon name="warning-outline" />
          <span>{{ conflictError() }}</span>
        </div>
      }

      <ion-list [inset]="true">
        <!-- Client search -->
        <ion-item>
          <ion-label position="stacked">Client *</ion-label>
          <ion-select
            [(ngModel)]="selectedClientId"
            placeholder="Select client"
            interface="action-sheet"
            (ngModelChange)="onClientChange()"
          >
            @for (client of clients(); track client.id) {
              <ion-select-option [value]="client.id">
                {{ client.full_name }}
              </ion-select-option>
            }
          </ion-select>
        </ion-item>

        <!-- Service type -->
        <ion-item>
          <ion-label position="stacked">Service *</ion-label>
          <ion-select
            [(ngModel)]="selectedServiceTypeId"
            placeholder="Select service"
            interface="action-sheet"
            (ngModelChange)="onServiceTypeChange()"
          >
            @for (service of serviceTypes.activeServiceTypes(); track service.id) {
              <ion-select-option [value]="service.id">
                {{ formatServiceLabel(service) }}
              </ion-select-option>
            }
          </ion-select>
        </ion-item>
      </ion-list>

      <ion-list [inset]="true">
        <!-- Date -->
        <ion-item>
          <ion-icon name="calendar-outline" slot="start" />
          <ion-label position="stacked">Date *</ion-label>
          <ion-input
            type="date"
            [(ngModel)]="selectedDate"
            [min]="today()"
            (ngModelChange)="onDateTimeChange()"
          />
        </ion-item>

        <!-- Time -->
        <ion-item>
          <ion-icon name="time-outline" slot="start" />
          <ion-label position="stacked">Start Time *</ion-label>
          @if (isLoadingSlots()) {
            <ion-spinner name="dots" style="margin-top: 12px;" />
          } @else if (availableSlots().length > 0) {
            <ion-select
              [(ngModel)]="selectedStartTime"
              placeholder="Select time"
              interface="action-sheet"
            >
              @for (slot of availableSlots(); track slot.time) {
                <ion-select-option [value]="slot.time" [disabled]="!slot.available">
                  {{ formatSlotTime(slot) }}{{ !slot.available ? ' — ' + slot.blocked_reason : '' }}
                </ion-select-option>
              }
            </ion-select>
          } @else {
            <ion-input
              type="time"
              [(ngModel)]="selectedStartTime"
              (ngModelChange)="onDateTimeChange()"
            />
          }
        </ion-item>

        <!-- Duration (auto-set, overridable) -->
        <ion-item>
          <ion-label position="stacked">Duration (minutes)</ion-label>
          <ion-input
            type="number"
            [(ngModel)]="durationMinutes"
            [min]="15"
            [max]="480"
            [step]="15"
          />
          @if (selectedServiceType()) {
            <ion-note slot="helper">
              Auto-set from service ({{ selectedServiceType()!.duration_minutes }} min)
            </ion-note>
          }
        </ion-item>
      </ion-list>

      <ion-list [inset]="true">
        <!-- Resource/Room -->
        <ion-item>
          <ion-label position="stacked">Room / Resource</ion-label>
          <ion-input
            [(ngModel)]="resourceNote"
            placeholder="e.g. Studio A, Power Rack 3"
          />
        </ion-item>

        <!-- Notes -->
        <ion-item>
          <ion-label position="stacked">Notes</ion-label>
          <ion-textarea
            [(ngModel)]="notes"
            placeholder="Session focus, client instructions..."
            rows="3"
            autoGrow="true"
          />
        </ion-item>
      </ion-list>

      <ion-list [inset]="true">
        <!-- Recurring toggle -->
        <ion-item>
          <ion-icon name="repeat-outline" slot="start" />
          <ion-label>Recurring appointment</ion-label>
          <ion-toggle [(ngModel)]="isRecurring" slot="end" />
        </ion-item>

        @if (isRecurring) {
          <ion-item>
            <ion-label position="stacked">Repeat every</ion-label>
            <ion-select [(ngModel)]="recurringWeeks" interface="popover">
              <ion-select-option [value]="1">1 week</ion-select-option>
              <ion-select-option [value]="2">2 weeks</ion-select-option>
              <ion-select-option [value]="4">4 weeks</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">For how many sessions</ion-label>
            <ion-select [(ngModel)]="recurringCount" interface="popover">
              <ion-select-option [value]="4">4 sessions</ion-select-option>
              <ion-select-option [value]="8">8 sessions</ion-select-option>
              <ion-select-option [value]="12">12 sessions</ion-select-option>
              <ion-select-option [value]="24">24 sessions</ion-select-option>
            </ion-select>
          </ion-item>
        }

        <!-- Send confirmation -->
        <ion-item>
          <ion-label>Send confirmation to client</ion-label>
          <ion-toggle [(ngModel)]="sendConfirmation" slot="end" [checked]="true" />
        </ion-item>
      </ion-list>

      <!-- Cancellation Policy deadline label -->
      @if (deadlineLabel()) {
        <div class="policy-notice">
          <ion-icon name="information-circle-outline" />
          <span>{{ deadlineLabel() }}</span>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .conflict-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.4);
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 16px;
      color: #EAB308;
      font-size: 13px;
      line-height: 1.4;

      ion-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
    }

    ion-list {
      margin-bottom: 16px;
      border-radius: 12px;
    }

    ion-spinner {
      --color: var(--fitos-accent-primary, #10B981);
    }

    .policy-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 8px;
      color: var(--fitos-accent-primary, #10B981);
      font-size: 13px;
      line-height: 1.4;

      ion-icon {
        font-size: 16px;
        flex-shrink: 0;
        margin-top: 1px;
      }
    }
  `],
})
export class BookingFormComponent implements OnInit {
  readonly prefill = input<BookingFormInput>({});

  private readonly modal = inject(ModalController);
  private readonly toast = inject(ToastController);
  private readonly appointmentService = inject(AppointmentService);
  readonly serviceTypes = inject(ServiceTypeService);
  private readonly auth = inject(AuthService);
  private readonly clientService = inject(ClientService);
  private readonly cancellationSvc = inject(CancellationPolicyService);

  // Form fields
  selectedClientId = '';
  selectedServiceTypeId = '';
  selectedDate = '';
  selectedStartTime = '';
  durationMinutes = 60;
  notes = '';
  resourceNote = '';
  isRecurring = false;
  recurringWeeks = 1;
  recurringCount = 8;
  sendConfirmation = true;

  // State
  readonly isSaving = signal(false);
  readonly conflictError = signal<string | null>(null);
  readonly availableSlots = signal<BookableSlot[]>([]);
  readonly isLoadingSlots = signal(false);

  readonly clients = this.clientService.clients;

  readonly today = computed(() => new Date().toISOString().split('T')[0]);

  readonly isEditMode = computed(() => !!this.prefill().appointmentId);

  readonly selectedServiceType = computed<ServiceType | undefined>(() =>
    this.serviceTypes.activeServiceTypes().find(st => st.id === this.selectedServiceTypeId)
  );

  readonly isFormValid = computed(() =>
    !!this.selectedClientId &&
    !!this.selectedServiceTypeId &&
    !!this.selectedDate &&
    !!this.selectedStartTime &&
    this.durationMinutes >= 15
  );

  /**
   * Human-readable cancellation deadline label, shown on the booking form.
   * Requires a selected service type and date+time.
   * Returns null when no policy exists or data is incomplete.
   */
  readonly deadlineLabel = computed<string | null>(() => {
    if (!this.selectedServiceTypeId || !this.selectedDate || !this.selectedStartTime) return null;

    // Build a minimal appointment-like object so CancellationPolicyService can resolve the policy
    const mockAppt: Partial<CreateAppointmentDto> = {
      service_type_id: this.selectedServiceTypeId,
      start_at: `${this.selectedDate}T${this.selectedStartTime}`,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.cancellationSvc.getDeadlineLabel(mockAppt as any);
  });

  ngOnInit() {
    const pre = this.prefill();
    if (pre.date) this.selectedDate = pre.date;
    if (pre.startTime) this.selectedStartTime = pre.startTime;

    this.serviceTypes.loadServiceTypes();
    this.clientService.loadClients();

    // Load cancellation policies so the deadline label has data
    const trainerId = pre.trainerId ?? this.auth.profile()?.id;
    if (trainerId) {
      this.cancellationSvc.loadPolicies(trainerId);
    }
  }

  onServiceTypeChange() {
    const st = this.selectedServiceType();
    if (st) {
      this.durationMinutes = st.duration_minutes;
    }
    this.loadAvailableSlots();
  }

  onClientChange() {
    this.conflictError.set(null);
  }

  onDateTimeChange() {
    this.conflictError.set(null);
    this.loadAvailableSlots();
  }

  private async loadAvailableSlots() {
    const trainerId = this.prefill().trainerId ?? this.auth.profile()?.id;
    if (!trainerId || !this.selectedServiceTypeId || !this.selectedDate) return;

    this.isLoadingSlots.set(true);
    try {
      const slots = await this.appointmentService.getAvailableSlots(
        trainerId,
        this.selectedServiceTypeId,
        this.selectedDate
      );
      this.availableSlots.set(slots);

      // Auto-select the pre-filled time if available
      const prefillStartTime = this.prefill().startTime;
      if (prefillStartTime && !this.selectedStartTime) {
        const match = slots.find(s => {
          return s.available && s.time && s.time.includes(prefillStartTime);
        });
        if (match) {
          this.selectedStartTime = match.time || '';
        }
      }
    } catch {
      this.availableSlots.set([]);
    } finally {
      this.isLoadingSlots.set(false);
    }
  }

  formatSlotTime(slot: BookableSlot): string {
    const d = new Date(slot.time);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  formatServiceLabel(service: ServiceType): string {
    return `${service.name} (${service.duration_minutes} min - $${service.base_price})`;
  }

  async save() {
    if (!this.isFormValid()) return;
    this.isSaving.set(true);
    this.conflictError.set(null);

    try {
      const trainerId = this.prefill().trainerId ?? this.auth.profile()?.id;
      if (!trainerId) throw new Error('No trainer ID available');

      const dto: CreateAppointmentDto = {
        trainer_id: trainerId,
        client_id: this.selectedClientId,
        service_type_id: this.selectedServiceTypeId,
        start_at: this.buildStartAt(),
        notes: this.notes || undefined,
        is_recurring: this.isRecurring,
      };

      await this.appointmentService.createAppointment(dto);

      const toastEl = await this.toast.create({
        message: 'Appointment booked',
        duration: 2000,
        color: 'success',
        position: 'top',
      });
      await toastEl.present();

      await this.modal.dismiss({ created: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to book appointment';
      if (message.toLowerCase().includes('conflict')) {
        this.conflictError.set('This time slot is no longer available. Please choose another time.');
      } else {
        this.conflictError.set(message);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  dismiss() {
    this.modal.dismiss();
  }

  private buildStartAt(): string {
    // If selectedStartTime is already a full ISO string (from slots), use it directly
    if (this.selectedStartTime.includes('T')) return this.selectedStartTime;

    // Otherwise combine date + time
    return `${this.selectedDate}T${this.selectedStartTime}:00`;
  }
}
