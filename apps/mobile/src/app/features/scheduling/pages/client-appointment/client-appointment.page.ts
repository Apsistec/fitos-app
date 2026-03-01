/**
 * ClientAppointmentPage — client-facing appointment detail view.
 *
 * Reached from:
 *   - Client dashboard "Next Session" card → /tabs/workouts/appointment/:id
 *   - Push notifications deep-linking to a specific appointment
 *
 * Shows: date/time, service name, trainer name/avatar, location, status.
 * Actions: Message Trainer.
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSkeletonText,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  timeOutline,
  locationOutline,
  personOutline,
  chatbubblesOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  hourglassOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../../../core/services/supabase.service';

interface AppointmentDetail {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_name: string | null;
  location: string | null;
  notes: string | null;
  trainer_id: string;
  trainer_name: string;
  trainer_avatar_url: string | null;
}

@Component({
  selector: 'app-client-appointment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonBadge,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Session Details</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      @if (isLoading()) {
        <div class="detail-card">
          <ion-skeleton-text animated style="width:60%;height:20px;border-radius:8px;margin-bottom:12px"></ion-skeleton-text>
          <ion-skeleton-text animated style="width:80%;height:14px;border-radius:6px;margin-bottom:8px"></ion-skeleton-text>
          <ion-skeleton-text animated style="width:70%;height:14px;border-radius:6px"></ion-skeleton-text>
        </div>
      }

      @if (!isLoading() && appt(); as a) {
        <!-- Status badge -->
        <div class="status-row">
          <ion-badge [color]="statusColor(a.status)">
            <ion-icon [name]="statusIcon(a.status)" class="status-icon"></ion-icon>
            {{ statusLabel(a.status) }}
          </ion-badge>
        </div>

        <!-- Date / time -->
        <div class="detail-card">
          <div class="detail-row">
            <div class="detail-icon"><ion-icon name="calendar-outline"></ion-icon></div>
            <div class="detail-content">
              <div class="detail-label">Date</div>
              <div class="detail-value">{{ a.start_at | date:'EEEE, MMMM d, y' }}</div>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-icon"><ion-icon name="time-outline"></ion-icon></div>
            <div class="detail-content">
              <div class="detail-label">Time</div>
              <div class="detail-value">
                {{ a.start_at | date:'h:mm a' }} – {{ a.end_at | date:'h:mm a' }}
              </div>
            </div>
          </div>
          @if (a.service_name) {
            <div class="detail-row">
              <div class="detail-icon"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
              <div class="detail-content">
                <div class="detail-label">Service</div>
                <div class="detail-value">{{ a.service_name }}</div>
              </div>
            </div>
          }
          @if (a.location) {
            <div class="detail-row">
              <div class="detail-icon"><ion-icon name="location-outline"></ion-icon></div>
              <div class="detail-content">
                <div class="detail-label">Location</div>
                <div class="detail-value">{{ a.location }}</div>
              </div>
            </div>
          }
        </div>

        <!-- Trainer card -->
        <div class="trainer-card">
          <div class="trainer-avatar">
            @if (a.trainer_avatar_url) {
              <img [src]="a.trainer_avatar_url" alt="Trainer" />
            } @else {
              <ion-icon name="person-outline"></ion-icon>
            }
          </div>
          <div class="trainer-info">
            <div class="trainer-label">Your Trainer</div>
            <div class="trainer-name">{{ a.trainer_name }}</div>
          </div>
        </div>

        @if (a.notes) {
          <div class="detail-card notes-card">
            <div class="detail-label">Notes</div>
            <p class="notes-text">{{ a.notes }}</p>
          </div>
        }

        <!-- Actions -->
        <div class="action-btns">
          <ion-button
            expand="block"
            (click)="messageTrainer(a.trainer_id)"
          >
            <ion-icon slot="start" name="chatbubbles-outline"></ion-icon>
            Message Trainer
          </ion-button>
        </div>
      }

      @if (!isLoading() && !appt()) {
        <div class="empty-state">
          <ion-icon name="calendar-outline" class="empty-icon"></ion-icon>
          <p>Session not found or you don't have access to view it.</p>
          <ion-button fill="outline" (click)="goBack()">Go Back</ion-button>
        </div>
      }

    </ion-content>
  `,
  styles: [`
    .status-row {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    ion-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 20px;
    }
    .status-icon { font-size: 14px; }

    .detail-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 14px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      &:last-child { border-bottom: none; padding-bottom: 0; }
      &:first-child { padding-top: 0; }
    }
    .detail-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      ion-icon { font-size: 17px; color: #10B981; }
    }
    .detail-content { flex: 1; }
    .detail-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      margin-bottom: 3px;
    }
    .detail-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    /* Trainer card */
    .trainer-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .trainer-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
      ion-icon { font-size: 24px; color: var(--fitos-text-secondary, #A3A3A3); }
    }
    .trainer-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      margin-bottom: 3px;
    }
    .trainer-name {
      font-size: 17px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    /* Notes */
    .notes-card .notes-text {
      margin: 8px 0 0;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      line-height: 1.5;
    }

    /* Actions */
    .action-btns { margin-top: 8px; }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 64px 24px;
    }
    .empty-icon {
      font-size: 56px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      margin-bottom: 16px;
      display: block;
    }
    .empty-state p {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 24px;
    }
  `],
})
export class ClientAppointmentPage implements OnInit {
  private supabase = inject(SupabaseService);
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);

  appt      = signal<AppointmentDetail | null>(null);
  isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.isLoading.set(false); return; }

    try {
      const { data, error } = await this.supabase.client
        .from('appointments')
        .select(`
          id, start_at, end_at, status, service_name, location, notes, trainer_id,
          profiles!appointments_trainer_id_fkey (full_name, avatar_url)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profile = (data as any).profiles;
        this.appt.set({
          id:                data.id,
          start_at:          data.start_at,
          end_at:            data.end_at,
          status:            data.status,
          service_name:      data.service_name ?? null,
          location:          data.location ?? null,
          notes:             data.notes ?? null,
          trainer_id:        data.trainer_id,
          trainer_name:      profile?.full_name ?? 'Your Trainer',
          trainer_avatar_url: profile?.avatar_url ?? null,
        });
      }
    } catch (err) {
      console.error('Error loading appointment:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      scheduled:  'primary',
      confirmed:  'success',
      completed:  'medium',
      cancelled:  'danger',
      no_show:    'warning',
    };
    return map[status] ?? 'medium';
  }

  statusIcon(status: string): string {
    const map: Record<string, string> = {
      scheduled:  'hourglass-outline',
      confirmed:  'checkmark-circle-outline',
      completed:  'checkmark-circle-outline',
      cancelled:  'close-circle-outline',
      no_show:    'close-circle-outline',
    };
    return map[status] ?? 'hourglass-outline';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show:   'No Show',
    };
    return map[status] ?? status;
  }

  messageTrainer(trainerId: string): void {
    this.router.navigate(['/tabs/messages/chat', trainerId]);
  }

  goBack(): void {
    this.router.navigate(['/tabs/dashboard']);
  }
}

addIcons({
  calendarOutline,
  timeOutline,
  locationOutline,
  personOutline,
  chatbubblesOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  hourglassOutline,
});
