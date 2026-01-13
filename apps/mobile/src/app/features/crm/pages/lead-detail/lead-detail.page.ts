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
  IonList,
  IonItem,
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
import { LeadService, Lead, LeadActivity, LeadStage } from '@app/core/services/lead.service';
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
    IonList,
    IonItem,
    IonNote,
    IonBadge,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/crm"></ion-back-button>
        </ion-buttons>
        <ion-title>Lead Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="editLead()">
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
                <ion-card-title>{{ lead()!.name }}</ion-card-title>
                <div class="contact-info">
                  <span class="email">{{ lead()!.email }}</span>
                  @if (lead()!.phone) {
                    <span class="phone">{{ lead()!.phone }}</span>
                  }
                </div>
              </div>
              <ion-chip [color]="getStageColor(lead()!.stage)">
                <ion-label>{{ getStageLabel(lead()!.stage) }}</ion-label>
              </ion-chip>
            </div>
          </ion-card-header>

          <ion-card-content>
            <!-- Lead Meta -->
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Source</span>
                <span class="meta-value">{{ lead()!.source }}</span>
              </div>
              @if (lead()!.expected_value) {
                <div class="meta-item">
                  <span class="meta-label">Expected Value</span>
                  <span class="meta-value">\${{ lead()!.expected_value }}</span>
                </div>
              }
              @if (lead()!.next_follow_up) {
                <div class="meta-item">
                  <span class="meta-label">Next Follow-up</span>
                  <span class="meta-value" [class.overdue]="isOverdue(lead()!.next_follow_up)">
                    {{ formatDate(lead()!.next_follow_up) }}
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
                  <div class="timeline-marker" [class]="'marker-' + activity.type">
                    <ion-icon [name]="getActivityIcon(activity.type)"></ion-icon>
                  </div>

                  <!-- Activity Content -->
                  <ion-card class="activity-card">
                    <ion-card-content>
                      <div class="activity-header">
                        <div class="activity-info">
                          <h3>{{ getActivityTitle(activity.type) }}</h3>
                          <ion-note>{{ formatTimestamp(activity.created_at) }}</ion-note>
                        </div>
                        @if (activity.type === 'status_change') {
                          <ion-badge color="primary">
                            {{ activity.metadata?.new_stage }}
                          </ion-badge>
                        }
                      </div>
                      <p class="activity-content">{{ activity.content }}</p>
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
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--fitos-space-8);
      gap: var(--fitos-space-3);

      ion-spinner {
        --color: var(--fitos-accent-primary);
      }

      p {
        margin: 0;
        color: var(--fitos-text-secondary);
      }
    }

    .lead-header {
      margin: var(--fitos-space-4);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--fitos-space-3);
    }

    .lead-info {
      flex: 1;
      min-width: 0;
    }

    ion-card-title {
      font-size: var(--fitos-text-xl);
      font-weight: 700;
      margin-bottom: var(--fitos-space-2);
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-1);
    }

    .email {
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-secondary);
    }

    .phone {
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-tertiary);
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--fitos-space-4);
      margin-bottom: var(--fitos-space-4);
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-1);
    }

    .meta-label {
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .meta-value {
      font-size: var(--fitos-text-base);
      font-weight: 600;
      color: var(--fitos-text-primary);

      &.overdue {
        color: var(--fitos-status-error);
      }
    }

    .quick-actions {
      display: flex;
      gap: var(--fitos-space-2);
      flex-wrap: wrap;
    }

    .timeline-section {
      padding: 0 var(--fitos-space-4) var(--fitos-space-4);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--fitos-space-4);

      h2 {
        margin: 0;
        font-size: var(--fitos-text-lg);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }
    }

    .empty-state {
      text-align: center;
      padding: var(--fitos-space-6);

      .empty-icon {
        font-size: 64px;
        color: var(--fitos-text-tertiary);
        opacity: 0.5;
        margin-bottom: var(--fitos-space-3);
      }

      p {
        margin: 0;
        color: var(--fitos-text-secondary);
      }

      .empty-subtitle {
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-tertiary);
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
        background: var(--fitos-border-subtle);
      }
    }

    .timeline-item {
      position: relative;
      margin-bottom: var(--fitos-space-4);
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
      background: var(--fitos-bg-secondary);
      border: 2px solid var(--fitos-border-default);
      z-index: 1;

      ion-icon {
        font-size: 16px;
      }

      &.marker-note {
        border-color: var(--fitos-accent-primary);
        background: var(--fitos-bg-primary);
        ion-icon {
          color: var(--fitos-accent-primary);
        }
      }

      &.marker-call {
        border-color: var(--ion-color-secondary);
        background: var(--fitos-bg-primary);
        ion-icon {
          color: var(--ion-color-secondary);
        }
      }

      &.marker-email {
        border-color: var(--ion-color-tertiary);
        background: var(--fitos-bg-primary);
        ion-icon {
          color: var(--ion-color-tertiary);
        }
      }

      &.marker-meeting {
        border-color: var(--ion-color-warning);
        background: var(--fitos-bg-primary);
        ion-icon {
          color: var(--ion-color-warning);
        }
      }

      &.marker-status_change {
        border-color: var(--fitos-status-success);
        background: var(--fitos-bg-primary);
        ion-icon {
          color: var(--fitos-status-success);
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
      gap: var(--fitos-space-2);
      margin-bottom: var(--fitos-space-2);
    }

    .activity-info {
      flex: 1;

      h3 {
        margin: 0 0 var(--fitos-space-1);
        font-size: var(--fitos-text-base);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      ion-note {
        font-size: var(--fitos-text-xs);
        color: var(--fitos-text-tertiary);
      }
    }

    .activity-content {
      margin: 0;
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-secondary);
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

  getStageLabel(stage: LeadStage): string {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      qualified: 'Qualified',
      consultation: 'Consultation',
      won: 'Won',
      lost: 'Lost',
    };
    return labels[stage];
  }

  getStageColor(stage: LeadStage): string {
    const colors = {
      new: 'primary',
      contacted: 'secondary',
      qualified: 'tertiary',
      consultation: 'warning',
      won: 'success',
      lost: 'danger',
    };
    return colors[stage];
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
