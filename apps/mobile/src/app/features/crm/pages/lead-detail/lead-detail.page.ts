import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonLabel,
  IonNote,
  IonBadge,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  callOutline,
  mailOutline,
  chatbubbleOutline,
  calendarOutline,
  createOutline,
  personOutline,
  timeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { LeadService, Lead, LeadActivity, LeadStatus } from '../../../../core/services/lead.service';
import { ActivityLoggerComponent } from '../../components/activity-logger/activity-logger.component';

/**
 * LeadDetailPage - Full lead details with activity timeline
 *
 * Features:
 * - Lead contact info and status
 * - Activity timeline (notes, calls, emails, meetings)
 * - Quick actions (call, email, schedule)
 * - Stage progression
 * - Edit lead details
 */
@Component({
  selector: 'app-lead-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ActivityLoggerComponent,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonLabel,
    IonNote,
    IonBadge,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/crm"></ion-back-button>
        </ion-buttons>
        <ion-title>Lead Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="editLead()" aria-label="Edit lead">
            <ion-icon slot="icon-only" name="create-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading lead...</p>
        </div>
      } @else if (lead()) {
        <!-- Lead Header Card -->
        <ion-card class="lead-header">
          <ion-card-header>
            <div class="header-content">
              <div class="lead-info">
                <ion-card-title>{{ lead()!.first_name }} {{ lead()!.last_name }}</ion-card-title>
                <div class="contact-info">
                  <span class="email">{{ lead()!.email }}</span>
                  @if (lead()!.phone) {
                    <span class="phone">{{ lead()!.phone }}</span>
                  }
                </div>
              </div>
              <ion-chip [color]="getStatusColor(lead()!.status)">
                <ion-label>{{ getStatusLabel(lead()!.status) }}</ion-label>
              </ion-chip>
            </div>
          </ion-card-header>

          <ion-card-content>
            <!-- Lead Meta -->
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Source</span>
                <span class="meta-value">{{ lead()!.source || 'Unknown' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Lead Score</span>
                <span class="meta-value">{{ lead()!.lead_score }}</span>
              </div>
              @if (lead()!.last_contacted_at) {
                <div class="meta-item">
                  <span class="meta-label">Last Contacted</span>
                  <span class="meta-value">
                    {{ formatDate(lead()!.last_contacted_at!) }}
                  </span>
                </div>
              }
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
              <ion-button size="small" fill="outline" (click)="makeCall()">
                <ion-icon slot="start" name="call-outline"></ion-icon>
                Call
              </ion-button>
              <ion-button size="small" fill="outline" (click)="sendEmail()">
                <ion-icon slot="start" name="mail-outline"></ion-icon>
                Email
              </ion-button>
              <ion-button size="small" fill="outline" (click)="scheduleFollowUp()">
                <ion-icon slot="start" name="calendar-outline"></ion-icon>
                Schedule
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Activity Timeline -->
        <div class="timeline-section">
          <div class="section-header">
            <h2>Activity Timeline</h2>
            <ion-button size="small" (click)="toggleActivityLogger()">
              <ion-icon slot="start" name="chatbubble-outline"></ion-icon>
              {{ showActivityLogger() ? 'Cancel' : 'Add Activity' }}
            </ion-button>
          </div>

          <!-- Activity Logger -->
          @if (showActivityLogger()) {
            <app-activity-logger
              [leadId]="lead()!.id"
              (activityLogged)="onActivityLogged()"
              (cancelled)="toggleActivityLogger()"
            />
          }

          @if (activities().length === 0) {
            <ion-card class="empty-state">
              <ion-card-content>
                <ion-icon name="chatbubble-outline" class="empty-icon"></ion-icon>
                <p>No activities yet</p>
                <p class="empty-subtitle">Add notes, log calls, or schedule meetings</p>
              </ion-card-content>
            </ion-card>
          } @else {
            <div class="timeline">
              @for (activity of activities(); track activity.id) {
                <div class="timeline-item">
                  <!-- Timeline Marker -->
                  <div class="timeline-marker" [class]="'marker-' + activity.activity_type">
                    <ion-icon [name]="getActivityIcon(activity.activity_type)"></ion-icon>
                  </div>

                  <!-- Activity Content -->
                  <ion-card class="activity-card">
                    <ion-card-content>
                      <div class="activity-header">
                        <div class="activity-info">
                          <h3>{{ getActivityTitle(activity.activity_type) }}</h3>
                          <ion-note>{{ formatTimestamp(activity.created_at) }}</ion-note>
                        </div>
                        @if (activity.activity_type === 'status_change') {
                          <ion-badge color="primary">
                            {{ activity.metadata?.['new_status'] }}
                          </ion-badge>
                        }
                      </div>
                      <p class="activity-content">{{ activity.description }}</p>
                    </ion-card-content>
                  </ion-card>
                </div>
              }
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-header ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    ion-card-header ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 12px;

      ion-spinner {
        --color: var(--ion-color-primary, #10B981);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .lead-header {
      margin: 16px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .lead-info {
      flex: 1;
      min-width: 0;
    }

    ion-card-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .email {
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .phone {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
      color: var(--fitos-text-tertiary, #737373);
    }

    .meta-value {
      font-size: 14px;
      font-weight: 600;
      font-family: 'Space Mono', monospace;
      color: var(--fitos-text-primary, #F5F5F5);

      &.overdue {
        color: #EF4444;
      }
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .timeline-section {
      padding: 0 16px 16px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .empty-state {
      text-align: center;
      padding: 24px;

      .empty-icon {
        font-size: 48px;
        color: var(--fitos-text-tertiary, #737373);
        opacity: 0.5;
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      .empty-subtitle {
        font-size: 13px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .timeline {
      position: relative;
      padding-left: 24px;

      &::before {
        content: '';
        position: absolute;
        left: 8px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .timeline-item {
      position: relative;
      margin-bottom: 16px;
    }

    .timeline-marker {
      position: absolute;
      left: -24px;
      top: 8px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 2px solid rgba(255, 255, 255, 0.06);
      z-index: 1;

      ion-icon {
        font-size: 16px;
      }

      &.marker-note {
        border-color: var(--ion-color-primary, #10B981);
        background: var(--fitos-bg-primary, #0D0D0D);
        ion-icon {
          color: var(--ion-color-primary, #10B981);
        }
      }

      &.marker-call {
        border-color: var(--ion-color-secondary);
        background: var(--fitos-bg-primary, #0D0D0D);
        ion-icon {
          color: var(--ion-color-secondary);
        }
      }

      &.marker-email {
        border-color: var(--ion-color-tertiary);
        background: var(--fitos-bg-primary, #0D0D0D);
        ion-icon {
          color: var(--ion-color-tertiary);
        }
      }

      &.marker-meeting {
        border-color: var(--ion-color-warning);
        background: var(--fitos-bg-primary, #0D0D0D);
        ion-icon {
          color: var(--ion-color-warning);
        }
      }

      &.marker-status_change {
        border-color: #10B981;
        background: var(--fitos-bg-primary, #0D0D0D);
        ion-icon {
          color: #10B981;
        }
      }
    }

    .activity-card {
      margin: 0;
    }

    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }

    .activity-info {
      flex: 1;

      h3 {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      ion-note {
        font-size: 11px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .activity-content {
      margin: 0;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      white-space: pre-wrap;
    }
  `],
})
export class LeadDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  leadService = inject(LeadService);
  private modalCtrl = inject(ModalController);

  lead = signal<Lead | null>(null);
  activities = signal<LeadActivity[]>([]);
  loading = signal(true);
  showActivityLogger = signal(false);

  constructor() {
    addIcons({
      callOutline,
      mailOutline,
      chatbubbleOutline,
      calendarOutline,
      createOutline,
      personOutline,
      timeOutline,
      checkmarkCircleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const leadId = this.route.snapshot.paramMap.get('id');
    if (!leadId) {
      this.router.navigate(['/crm']);
      return;
    }

    await this.loadLead(leadId);
    await this.loadActivities(leadId);
    this.loading.set(false);
  }

  async loadLead(leadId: string): Promise<void> {
    const lead = await this.leadService.getLeadById(leadId);
    this.lead.set(lead);
  }

  async loadActivities(leadId: string): Promise<void> {
    const activities = await this.leadService.getLeadActivities(leadId);
    this.activities.set(activities);
  }

  getStatusLabel(status: LeadStatus): string {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      qualified: 'Qualified',
      consultation: 'Consultation',
      won: 'Won',
      lost: 'Lost',
    };
    return labels[status];
  }

  getStatusColor(status: LeadStatus): string {
    const colors = {
      new: 'primary',
      contacted: 'secondary',
      qualified: 'tertiary',
      consultation: 'warning',
      won: 'success',
      lost: 'danger',
    };
    return colors[status];
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      note: 'chatbubble-outline',
      call: 'call-outline',
      email: 'mail-outline',
      meeting: 'calendar-outline',
      status_change: 'checkmark-circle-outline',
    };
    return icons[type] || 'chatbubble-outline';
  }

  getActivityTitle(type: string): string {
    const titles: Record<string, string> = {
      note: 'Note',
      call: 'Phone Call',
      email: 'Email',
      meeting: 'Meeting',
      status_change: 'Status Changed',
    };
    return titles[type] || 'Activity';
  }

  isOverdue(date: string): boolean {
    return new Date(date) < new Date();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  editLead(): void {
    // TODO: Open edit lead modal
    console.log('Edit lead:', this.lead());
  }

  makeCall(): void {
    // TODO: Initiate call via Capacitor
    console.log('Call:', this.lead()?.phone);
  }

  sendEmail(): void {
    // TODO: Open email composer
    console.log('Email:', this.lead()?.email);
  }

  scheduleFollowUp(): void {
    // TODO: Open follow-up scheduler
    console.log('Schedule follow-up');
  }

  toggleActivityLogger(): void {
    this.showActivityLogger.update(show => !show);
  }

  async onActivityLogged(): Promise<void> {
    this.showActivityLogger.set(false);

    // Reload activities to show the new one
    const leadId = this.lead()?.id;
    if (leadId) {
      await this.loadActivities(leadId);
    }
  }
}
