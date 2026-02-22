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
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonIcon,
  IonBadge,
  IonSpinner,
  IonText,
  IonAvatar,
  AlertController,
  ToastController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  personOutline,
  timeOutline,
  calendarOutline,
  briefcaseOutline,
} from 'ionicons/icons';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { AppointmentFsmService } from '../../../../core/services/appointment-fsm.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment } from '@fitos/shared';

addIcons({
  checkmarkCircleOutline, closeCircleOutline, personOutline,
  timeOutline, calendarOutline, briefcaseOutline,
});

@Component({
  selector: 'app-request-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonList,
    IonIcon, IonBadge, IonSpinner, IonText, IonAvatar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          Booking Requests
          @if (pendingCount() > 0) {
            <ion-badge color="primary" style="margin-left: 8px;">{{ pendingCount() }}</ion-badge>
          }
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Done</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (isLoading()) {
        <div class="loading-state">
          <ion-spinner name="crescent" />
          <ion-text color="medium">Loading requests...</ion-text>
        </div>
      } @else if (requestedAppointments().length === 0) {
        <div class="empty-state">
          <ion-icon name="calendar-outline" />
          <h3>No pending requests</h3>
          <p>New booking requests from clients will appear here.</p>
        </div>
      } @else {
        <ion-list>
          @for (appt of requestedAppointments(); track appt.id) {
            <div class="request-card">
              <div class="request-header">
                <ion-avatar class="client-avatar">
                  <ion-icon name="person-outline" />
                </ion-avatar>
                <div class="request-info">
                  <div class="client-name">{{ clientName(appt) }}</div>
                  <div class="service-name">
                    <ion-icon name="briefcase-outline" />
                    {{ serviceName(appt) }}
                  </div>
                </div>
              </div>

              <div class="request-details">
                <div class="detail-row">
                  <ion-icon name="calendar-outline" />
                  <span>{{ formatDate(appt.start_at) }}</span>
                </div>
                <div class="detail-row">
                  <ion-icon name="time-outline" />
                  <span>{{ formatTime(appt.start_at) }} · {{ appt.duration_minutes }} min</span>
                </div>
                @if (appt.notes) {
                  <div class="request-notes">{{ appt.notes }}</div>
                }
              </div>

              <div class="request-actions">
                <ion-button
                  fill="outline"
                  color="medium"
                  [disabled]="processingId() === appt.id"
                  (click)="deny(appt)"
                >
                  @if (processingId() === appt.id && processingAction() === 'deny') {
                    <ion-spinner name="crescent" />
                  } @else {
                    <ion-icon name="close-circle-outline" slot="start" />
                    Decline
                  }
                </ion-button>

                <ion-button
                  fill="solid"
                  color="primary"
                  [disabled]="processingId() === appt.id"
                  (click)="approve(appt)"
                >
                  @if (processingId() === appt.id && processingAction() === 'approve') {
                    <ion-spinner name="crescent" />
                  } @else {
                    <ion-icon name="checkmark-circle-outline" slot="start" />
                    Approve
                  }
                </ion-button>
              </div>
            </div>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`
    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      gap: 16px;
      text-align: center;
      color: var(--fitos-text-tertiary, #737373);
    }

    .empty-state {
      ion-icon {
        font-size: 48px;
        opacity: 0.4;
      }
      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
      p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      }
    }

    .request-card {
      margin: 12px 16px;
      background: var(--fitos-bg-elevated, #1A1A1A);
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .request-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .client-avatar {
      width: 44px;
      height: 44px;
      background: rgba(16, 185, 129, 0.12);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      ion-icon {
        font-size: 22px;
        color: var(--fitos-accent-primary, #10B981);
      }
    }

    .request-info {
      flex: 1;
      min-width: 0;
    }

    .client-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--fitos-text-primary, #FAFAFA);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .service-name {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-top: 2px;

      ion-icon { font-size: 13px; }
    }

    .request-details {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);

      ion-icon {
        font-size: 14px;
        color: var(--fitos-text-tertiary, #737373);
        flex-shrink: 0;
      }
    }

    .request-notes {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      font-style: italic;
      line-height: 1.4;
      margin-top: 4px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      border-left: 3px solid rgba(255, 255, 255, 0.1);
    }

    .request-actions {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);

      ion-button {
        flex: 1;
        --border-radius: 10px;
      }
    }

    ion-spinner {
      --color: currentColor;
      width: 16px;
      height: 16px;
    }
  `],
})
export class AppointmentRequestQueueComponent implements OnInit {
  private readonly modal = inject(ModalController);
  private readonly alert = inject(AlertController);
  private readonly toast = inject(ToastController);
  private readonly appointmentService = inject(AppointmentService);
  private readonly fsm = inject(AppointmentFsmService);
  private readonly auth = inject(AuthService);

  readonly isLoading = this.appointmentService.isLoading;
  readonly processingId = signal<string | null>(null);
  readonly processingAction = signal<'approve' | 'deny' | null>(null);

  readonly requestedAppointments = computed(() =>
    this.appointmentService.appointments().filter(a => a.status === 'requested')
  );

  readonly pendingCount = computed(() => this.requestedAppointments().length);

  ngOnInit() {
    const tid = this.auth.profile()?.id;
    if (tid) {
      this.appointmentService.loadAppointments(tid, {
        start: new Date(),
        end: this.parseDateString(this.futureDate(60)),
      });
    }
  }

  async approve(appt: Appointment) {
    this.processingId.set(appt.id);
    this.processingAction.set('approve');

    const result = await this.fsm.approve(appt);

    this.processingId.set(null);
    this.processingAction.set(null);

    const toastEl = await this.toast.create({
      message: result.success
        ? `Booking approved for ${this.clientName(appt)}`
        : `Failed: ${result.error}`,
      duration: 2500,
      color: result.success ? 'success' : 'warning',
      position: 'top',
    });
    await toastEl.present();
  }

  async deny(appt: Appointment) {
    const alertEl = await this.alert.create({
      header: 'Decline Request?',
      message: `This will decline ${this.clientName(appt)}'s booking request and cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Decline',
          role: 'destructive',
          handler: async () => {
            this.processingId.set(appt.id);
            this.processingAction.set('deny');

            const result = await this.fsm.deny(appt.id);

            this.processingId.set(null);
            this.processingAction.set(null);

            const toastEl = await this.toast.create({
              message: result.success ? 'Request declined' : `Failed: ${result.error}`,
              duration: 2000,
              color: result.success ? 'medium' : 'warning',
              position: 'top',
            });
            await toastEl.present();
          },
        },
      ],
    });
    await alertEl.present();
  }

  dismiss() {
    this.modal.dismiss();
  }

  clientName(appt: Appointment): string {
    const client = (appt as unknown as Record<string, unknown>)['client'] as { full_name?: string } | undefined;
    return client?.full_name ?? 'Client';
  }

  serviceName(appt: Appointment): string {
    const serviceType = (appt as unknown as Record<string, unknown>)['service_type'] as { name?: string } | undefined;
    return serviceType?.name ?? 'Session';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  }

  private futureDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private parseDateString(dateStr: string): Date {
    return new Date(dateStr);
  }
}
