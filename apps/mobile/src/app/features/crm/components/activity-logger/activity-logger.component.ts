import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonTextarea,
  IonCard,
  IonCardContent,
  IonItem,
  IonInput,
  IonDatetimeButton,
  IonDatetime,
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleOutline,
  callOutline,
  mailOutline,
  calendarOutline,
  saveOutline,
  closeOutline,
} from 'ionicons/icons';
import { LeadService, LeadActivity } from '../../../../core/services/lead.service';
import { HapticService } from '../../../../core/services/haptic.service';

type ActivityType = 'note' | 'call' | 'email' | 'meeting';

/**
 * ActivityLoggerComponent - Log lead activities
 *
 * Features:
 * - Note logging
 * - Call logging
 * - Email logging
 * - Meeting scheduling
 * - Rich metadata capture
 */
@Component({
  selector: 'app-activity-logger',
  standalone: true,
  imports: [
    FormsModule,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonTextarea,
    IonCard,
    IonCardContent,
    IonItem,
    IonInput,
    IonDatetimeButton,
    IonDatetime,
    IonModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="activity-logger">
      <ion-card-content>
        <!-- Activity Type Selector -->
        <ion-segment [(ngModel)]="activityType" (ionChange)="onTypeChange()">
          <ion-segment-button value="note">
            <ion-icon name="chatbubble-outline"></ion-icon>
            <ion-label>Note</ion-label>
          </ion-segment-button>
          <ion-segment-button value="call">
            <ion-icon name="call-outline"></ion-icon>
            <ion-label>Call</ion-label>
          </ion-segment-button>
          <ion-segment-button value="email">
            <ion-icon name="mail-outline"></ion-icon>
            <ion-label>Email</ion-label>
          </ion-segment-button>
          <ion-segment-button value="meeting">
            <ion-icon name="calendar-outline"></ion-icon>
            <ion-label>Meeting</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Note Form -->
        @if (activityType() === 'note') {
          <div class="form-section">
            <ion-item lines="none">
              <ion-textarea
                [(ngModel)]="noteContent"
                placeholder="Add a note about this lead..."
                rows="4"
                [autoGrow]="true"
              ></ion-textarea>
            </ion-item>
          </div>
        }

        <!-- Call Form -->
        @if (activityType() === 'call') {
          <div class="form-section">
            <ion-item lines="none">
              <ion-label position="stacked">Call Notes</ion-label>
              <ion-textarea
                [(ngModel)]="callNotes"
                placeholder="What was discussed?"
                rows="4"
                [autoGrow]="true"
              ></ion-textarea>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Duration (minutes)</ion-label>
              <ion-input
                type="number"
                [(ngModel)]="callDuration"
                placeholder="15"
                min="1"
              ></ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Outcome</ion-label>
              <ion-input
                [(ngModel)]="callOutcome"
                placeholder="e.g., Scheduled consultation"
              ></ion-input>
            </ion-item>
          </div>
        }

        <!-- Email Form -->
        @if (activityType() === 'email') {
          <div class="form-section">
            <ion-item lines="none">
              <ion-label position="stacked">Subject</ion-label>
              <ion-input
                [(ngModel)]="emailSubject"
                placeholder="Email subject"
              ></ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Summary</ion-label>
              <ion-textarea
                [(ngModel)]="emailSummary"
                placeholder="Brief summary of email content..."
                rows="4"
                [autoGrow]="true"
              ></ion-textarea>
            </ion-item>
          </div>
        }

        <!-- Meeting Form -->
        @if (activityType() === 'meeting') {
          <div class="form-section">
            <ion-item lines="none">
              <ion-label position="stacked">Meeting Date & Time</ion-label>
              <ion-datetime-button datetime="meeting-datetime"></ion-datetime-button>
              <ion-modal [keepContentsMounted]="true">
                <ng-template>
                  <ion-datetime
                    id="meeting-datetime"
                    [(ngModel)]="meetingDateTime"
                    presentation="date-time"
                  ></ion-datetime>
                </ng-template>
              </ion-modal>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Location</ion-label>
              <ion-input
                [(ngModel)]="meetingLocation"
                placeholder="e.g., Zoom, Office, Coffee shop"
              ></ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Agenda</ion-label>
              <ion-textarea
                [(ngModel)]="meetingAgenda"
                placeholder="What will you discuss?"
                rows="3"
                [autoGrow]="true"
              ></ion-textarea>
            </ion-item>
          </div>
        }

        <!-- Actions -->
        <div class="action-buttons">
          <ion-button
            expand="block"
            (click)="saveActivity()"
            [disabled]="!canSave()"
          >
            <ion-icon slot="start" name="save-outline"></ion-icon>
            Log {{ activityTypeLabel() }}
          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            (click)="cancel()"
          >
            <ion-icon slot="start" name="close-outline"></ion-icon>
            Cancel
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .activity-logger {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0;
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary, #262626);
      margin-bottom: 16px;
    }

    ion-segment-button {
      --indicator-color: var(--ion-color-primary, #10B981);
      --color: var(--fitos-text-secondary, #A3A3A3);
      --color-checked: var(--ion-color-primary, #10B981);
      min-height: 56px;
    }

    ion-segment-button ion-icon {
      font-size: 20px;
      margin-bottom: 4px;
    }

    ion-segment-button ion-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
      margin-top: 4px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
    }

    ion-label[position="stacked"] {
      font-size: 13px;
      font-weight: 500;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 8px;
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 24px;

      ion-button {
        margin: 0;
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
      }

      ion-button:first-child {
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }
  `],
})
export class ActivityLoggerComponent {
  private leadService = inject(LeadService);
  private haptic = inject(HapticService);

  // Inputs
  leadId = input.required<string>();

  // Outputs
  activityLogged = output<void>();
  cancelled = output<void>();

  // Activity type
  activityType = signal<ActivityType>('note');

  // Note fields
  noteContent = signal('');

  // Call fields
  callNotes = signal('');
  callDuration = signal<number | null>(null);
  callOutcome = signal('');

  // Email fields
  emailSubject = signal('');
  emailSummary = signal('');

  // Meeting fields
  meetingDateTime = signal<string>('');
  meetingLocation = signal('');
  meetingAgenda = signal('');

  constructor() {
    addIcons({
      chatbubbleOutline,
      callOutline,
      mailOutline,
      calendarOutline,
      saveOutline,
      closeOutline,
    });
  }

  onTypeChange(): void {
    this.haptic.light();
  }

  activityTypeLabel(): string {
    const labels = {
      note: 'Note',
      call: 'Call',
      email: 'Email',
      meeting: 'Meeting',
    };
    return labels[this.activityType()];
  }

  canSave(): boolean {
    const type = this.activityType();

    switch (type) {
      case 'note':
        return this.noteContent().trim().length > 0;
      case 'call':
        return this.callNotes().trim().length > 0;
      case 'email':
        return this.emailSubject().trim().length > 0 || this.emailSummary().trim().length > 0;
      case 'meeting':
        return this.meetingDateTime().length > 0;
      default:
        return false;
    }
  }

  async saveActivity(): Promise<void> {
    if (!this.canSave()) return;

    const type = this.activityType();
    let content = '';
    let metadata: Record<string, any> = {};

    switch (type) {
      case 'note':
        content = this.noteContent();
        break;

      case 'call':
        content = this.callNotes();
        metadata = {
          duration: this.callDuration(),
          outcome: this.callOutcome(),
        };
        break;

      case 'email':
        content = this.emailSummary();
        metadata = {
          subject: this.emailSubject(),
        };
        break;

      case 'meeting':
        content = this.meetingAgenda() || `Meeting scheduled for ${this.formatMeetingDate()}`;
        metadata = {
          scheduled_at: this.meetingDateTime(),
          location: this.meetingLocation(),
        };
        break;
    }

    await this.leadService.logActivity(this.leadId(), type, content, metadata);
    await this.haptic.success();

    this.resetForm();
    this.activityLogged.emit();
  }

  cancel(): void {
    this.haptic.light();
    this.resetForm();
    this.cancelled.emit();
  }

  private resetForm(): void {
    this.noteContent.set('');
    this.callNotes.set('');
    this.callDuration.set(null);
    this.callOutcome.set('');
    this.emailSubject.set('');
    this.emailSummary.set('');
    this.meetingDateTime.set('');
    this.meetingLocation.set('');
    this.meetingAgenda.set('');
  }

  private formatMeetingDate(): string {
    const date = new Date(this.meetingDateTime());
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
