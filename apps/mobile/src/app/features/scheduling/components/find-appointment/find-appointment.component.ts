import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  output,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonSpinner,
  IonIcon,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  closeOutline,
  calendarOutline,
  timeOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { ServiceTypeService } from '../../../../core/services/service-type.service';
import { AvailabilityService } from '../../../../core/services/availability.service';
import { BookableSlot } from '@fitos/shared';

addIcons({ searchOutline, closeOutline, calendarOutline, timeOutline, checkmarkOutline });

interface SlotResult {
  slot: BookableSlot;
  date: string;
  trainerId: string;
  trainerName: string;
}

@Component({
  selector: 'app-find-appointment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList, IonItem, IonLabel,
    IonSelect, IonSelectOption, IonInput,
    IonSpinner, IonIcon,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Find an Appointment</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Filters -->
      <ion-list [inset]="true">
        <ion-item>
          <ion-label position="stacked">Service type *</ion-label>
          <ion-select
            [(ngModel)]="filterServiceTypeId"
            placeholder="Select service"
            interface="action-sheet"
          >
            @for (st of serviceTypes.activeServiceTypes(); track st.id) {
              <ion-select-option [value]="st.id">{{ st.name }}</ion-select-option>
            }
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-icon name="calendar-outline" slot="start" />
          <ion-label position="stacked">From date</ion-label>
          <ion-input type="date" [(ngModel)]="filterFromDate" [min]="today()" />
        </ion-item>

        <ion-item>
          <ion-icon name="calendar-outline" slot="start" />
          <ion-label position="stacked">To date</ion-label>
          <ion-input type="date" [(ngModel)]="filterToDate" [min]="filterFromDate || today()" />
        </ion-item>
      </ion-list>

      <ion-button
        expand="block"
        [disabled]="!filterServiceTypeId || isSearching()"
        (click)="search()"
        style="margin-bottom: 24px;"
      >
        @if (isSearching()) {
          <ion-spinner name="crescent" slot="start" />
          Searching...
        } @else {
          <ion-icon name="search-outline" slot="start" />
          Search Available Slots
        }
      </ion-button>

      <!-- Results -->
      @if (results().length > 0) {
        <div class="results-section">
          <div class="results-header">
            {{ results().length }} slot{{ results().length === 1 ? '' : 's' }} available
          </div>

          @for (result of results(); track result.slot.time + result.trainerId) {
            <button
              type="button"
              class="slot-card"
              (click)="selectSlot(result)"
              (keyup.enter)="selectSlot(result)"
            >
              <div class="slot-date">
                <ion-icon name="calendar-outline" />
                {{ formatDate(result.date) }}
              </div>
              <div class="slot-time">
                <ion-icon name="time-outline" />
                {{ formatSlotTime(result.slot) }}
              </div>
              @if (result.trainerName) {
                <div class="slot-trainer">{{ result.trainerName }}</div>
              }
              <ion-icon name="checkmark-outline" class="select-icon" />
            </button>
          }
        </div>
      }

      @if (searched() && results().length === 0 && !isSearching()) {
        <div class="empty-state">
          <p>No available slots found for those criteria.</p>
          <p>Try a different date range or service.</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    ion-list {
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .results-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .results-header {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--fitos-text-tertiary, #737373);
      margin-bottom: 4px;
    }

    .slot-card {
      background: var(--fitos-bg-elevated, #1A1A1A);
      border-radius: 10px;
      padding: 12px 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto;
      gap: 4px 8px;
      align-items: center;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: background 150ms ease;
      position: relative;
      width: 100%;
      text-align: left;
      font: inherit;
      color: inherit;
      background: var(--fitos-bg-elevated, #1A1A1A);

      &:hover {
        background: rgba(16, 185, 129, 0.08);
      }

      &:active {
        background: rgba(16, 185, 129, 0.12);
      }

      &:focus-visible {
        outline: 2px solid var(--fitos-accent-primary, #10B981);
        outline-offset: 2px;
      }
    }

    .slot-date, .slot-time {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--fitos-text-primary, #FAFAFA);

      ion-icon {
        font-size: 14px;
        color: var(--fitos-accent-primary, #10B981);
        flex-shrink: 0;
      }
    }

    .slot-trainer {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      grid-column: 1 / -1;
    }

    .select-icon {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: var(--fitos-accent-primary, #10B981);
    }

    .empty-state {
      text-align: center;
      padding: 40px 24px;
      color: var(--fitos-text-tertiary, #737373);
      font-size: 14px;
      line-height: 1.6;

      p { margin: 4px 0; }
    }

    ion-spinner {
      --color: var(--fitos-accent-primary, #10B981);
    }
  `],
})
export class FindAppointmentComponent implements OnInit {
  readonly slotSelected = output<{ date: string; startTime: string; trainerId: string }>();

  private readonly modal = inject(ModalController);
  private readonly toast = inject(ToastController);
  private readonly appointmentService = inject(AppointmentService);
  readonly serviceTypes = inject(ServiceTypeService);
  private readonly availability = inject(AvailabilityService);

  // Filters
  filterServiceTypeId = '';
  filterFromDate = '';
  filterToDate = '';

  // State
  readonly isSearching = signal(false);
  readonly searched = signal(false);
  readonly results = signal<SlotResult[]>([]);

  readonly today = computed(() => new Date().toISOString().split('T')[0]);

  ngOnInit() {
    this.filterFromDate = this.today();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.filterToDate = nextWeek.toISOString().split('T')[0];
    this.serviceTypes.loadServiceTypes();
  }

  async search() {
    if (!this.filterServiceTypeId) return;
    this.isSearching.set(true);
    this.searched.set(false);
    this.results.set([]);

    try {
      const allResults: SlotResult[] = [];
      const fromDate = new Date(this.filterFromDate || this.today());
      const toDate = new Date(this.filterToDate || this.filterFromDate || this.today());

      // Walk each date in the range
      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const slots = await this.appointmentService.getAvailableSlots(
          this.availability.currentTrainerId() ?? '',
          this.filterServiceTypeId,
          dateStr
        );
        const available = slots.filter(s => s.available);
        for (const slot of available) {
          allResults.push({
            slot,
            date: dateStr,
            trainerId: this.availability.currentTrainerId() ?? '',
            trainerName: '',
          });
        }
      }

      this.results.set(allResults);
    } catch {
      const toastEl = await this.toast.create({
        message: 'Search failed. Please try again.',
        duration: 2000,
        color: 'warning',
        position: 'top',
      });
      await toastEl.present();
    } finally {
      this.isSearching.set(false);
      this.searched.set(true);
    }
  }

  selectSlot(result: SlotResult) {
    const d = new Date(result.slot.time);
    const startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    this.slotSelected.emit({
      date: result.date,
      startTime,
      trainerId: result.trainerId,
    });
    this.modal.dismiss({ slot: result });
  }

  dismiss() {
    this.modal.dismiss();
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatSlotTime(slot: BookableSlot): string {
    const d = new Date(slot.time);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
}
