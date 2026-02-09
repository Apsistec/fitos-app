import { Component, OnInit, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  ModalController,
  ToastController,
  IonCheckbox,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  createOutline,
  callOutline,
  mailOutline,
  calendarOutline,
  personOutline,
  timeOutline,
  checkmarkCircleOutline,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  LeadService,
  LeadWithExtras,
  LeadTask,
  LeadStatus,
  ActivityType,
} from '../../../core/services/lead.service';
import { AuthService } from '../../../core/services/auth.service';
import { HapticService } from '../../../core/services/haptic.service';

/**
 * LeadDetailModalComponent - Detailed lead view with activity timeline
 *
 * Features:
 * - Lead information display/edit
 * - Activity timeline with filtering
 * - Task management
 * - Quick actions (call, email, schedule)
 * - Status management
 * - Notes and tags
 *
 * Usage:
 * ```typescript
 * const modal = await modalCtrl.create({
 *   component: LeadDetailModalComponent,
 *   componentProps: { leadId: 'uuid' }
 * });
 * await modal.present();
 * ```
 */
@Component({
  selector: 'app-lead-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonChip,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonCheckbox,
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Lead Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleEdit()">
            <ion-icon slot="icon-only" name="create-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Segment Tabs -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab" (ionChange)="onTabChange()">
          <ion-segment-button value="overview">
            <ion-label>Overview</ion-label>
          </ion-segment-button>
          <ion-segment-button value="activity">
            <ion-label>Activity</ion-label>
          </ion-segment-button>
          <ion-segment-button value="tasks">
            <ion-label>Tasks</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      }

      @if (!loading() && lead()) {
        <div class="lead-detail">
          <!-- Overview Tab -->
          @if (activeTab === 'overview') {
            <div class="overview-tab">
              <!-- Lead Header -->
              <div class="lead-header">
                <div class="lead-avatar">
                  <ion-icon name="person-outline"></ion-icon>
                </div>
                <div class="lead-info">
                  <h2>{{ lead()!.full_name }}</h2>
                  <ion-chip [color]="getStatusColor(lead()!.status)">
                    {{ lead()!.status }}
                  </ion-chip>
                  @if (lead()!.lead_score > 0) {
                    <ion-chip [color]="getScoreColor(lead()!.lead_score)">
                      Score: {{ lead()!.lead_score }}
                    </ion-chip>
                  }
                </div>
              </div>

              <!-- Contact Info -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Contact Information</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-list lines="none">
                    <ion-item>
                      <ion-icon name="mail-outline" slot="start"></ion-icon>
                      <ion-label>
                        <h3>Email</h3>
                        <p>{{ lead()!.email }}</p>
                      </ion-label>
                      <ion-button fill="clear" (click)="emailLead()">
                        Email
                      </ion-button>
                    </ion-item>

                    @if (lead()!.phone) {
                      <ion-item>
                        <ion-icon name="call-outline" slot="start"></ion-icon>
                        <ion-label>
                          <h3>Phone</h3>
                          <p>{{ lead()!.phone }}</p>
                        </ion-label>
                        <ion-button fill="clear" (click)="callLead()">
                          Call
                        </ion-button>
                      </ion-item>
                    }

                    @if (lead()!.source) {
                      <ion-item>
                        <ion-label>
                          <h3>Source</h3>
                          <p>{{ lead()!.source }}</p>
                          @if (lead()!.source_details) {
                            <p class="source-details">{{ lead()!.source_details }}</p>
                          }
                        </ion-label>
                      </ion-item>
                    }
                  </ion-list>
                </ion-card-content>
              </ion-card>

              <!-- Status Management -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Pipeline Status</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-select
                    [(ngModel)]="selectedStatus"
                    (ionChange)="updateStatus()"
                    interface="action-sheet"
                    placeholder="Select status"
                  >
                    <ion-select-option value="new">New</ion-select-option>
                    <ion-select-option value="contacted">Contacted</ion-select-option>
                    <ion-select-option value="qualified">Qualified</ion-select-option>
                    <ion-select-option value="consultation">Consultation</ion-select-option>
                    <ion-select-option value="won">Won</ion-select-option>
                    <ion-select-option value="lost">Lost</ion-select-option>
                  </ion-select>

                  @if (selectedStatus === 'lost') {
                    <ion-textarea
                      [(ngModel)]="lostReason"
                      placeholder="Reason for losing lead..."
                      rows="3"
                      class="lost-reason-input"
                    ></ion-textarea>
                  }
                </ion-card-content>
              </ion-card>

              <!-- Tags -->
              @if (lead()!.tags && lead()!.tags!.length > 0) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>Tags</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="tags-container">
                      @for (tag of lead()!.tags; track tag) {
                        <ion-chip>{{ tag }}</ion-chip>
                      }
                    </div>
                  </ion-card-content>
                </ion-card>
              }

              <!-- Notes -->
              @if (lead()!.notes) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>Notes</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <p>{{ lead()!.notes }}</p>
                  </ion-card-content>
                </ion-card>
              }

              <!-- Metadata -->
              <ion-card>
                <ion-card-content>
                  <ion-list lines="none">
                    <ion-item>
                      <ion-label>
                        <h3>Created</h3>
                        <p>{{ formatDate(lead()!.created_at) }}</p>
                      </ion-label>
                    </ion-item>
                    @if (lead()!.last_contacted_at) {
                      <ion-item>
                        <ion-label>
                          <h3>Last Contacted</h3>
                          <p>{{ formatDate(lead()!.last_contacted_at!) }}</p>
                        </ion-label>
                      </ion-item>
                    }
                  </ion-list>
                </ion-card-content>
              </ion-card>
            </div>
          }

          <!-- Activity Tab -->
          @if (activeTab === 'activity') {
            <div class="activity-tab">
              <!-- Add Activity Button -->
              <div class="add-activity-section">
                <ion-button expand="block" (click)="showAddActivity()">
                  <ion-icon slot="start" name="add-outline"></ion-icon>
                  Add Activity
                </ion-button>
              </div>

              <!-- Activity Timeline -->
              @if (activities().length > 0) {
                <div class="timeline">
                  @for (activity of activities(); track activity.id) {
                    <div class="timeline-item">
                      <div class="timeline-marker" [class]="getActivityClass(activity.activity_type)">
                        <ion-icon [name]="getActivityIcon(activity.activity_type)"></ion-icon>
                      </div>
                      <div class="timeline-content">
                        <ion-card>
                          <ion-card-header>
                            <div class="activity-header">
                              <ion-card-title>{{ activity.subject || getActivityLabel(activity.activity_type) }}</ion-card-title>
                              <ion-note>{{ formatRelativeTime(activity.created_at) }}</ion-note>
                            </div>
                          </ion-card-header>
                          @if (activity.description) {
                            <ion-card-content>
                              <p>{{ activity.description }}</p>
                            </ion-card-content>
                          }
                        </ion-card>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <ion-icon name="time-outline"></ion-icon>
                  <p>No activities yet</p>
                </div>
              }
            </div>
          }

          <!-- Tasks Tab -->
          @if (activeTab === 'tasks') {
            <div class="tasks-tab">
              <!-- Add Task Button -->
              <div class="add-task-section">
                <ion-button expand="block" (click)="showAddTask()">
                  <ion-icon slot="start" name="add-outline"></ion-icon>
                  Add Task
                </ion-button>
              </div>

              <!-- Task List -->
              @if (tasks().length > 0) {
                <ion-list>
                  @for (task of tasks(); track task.id) {
                    <ion-item [class.completed]="task.completed">
                      <ion-checkbox
                        slot="start"
                        [checked]="task.completed"
                        (ionChange)="toggleTaskComplete(task)"
                      ></ion-checkbox>

                      <ion-label>
                        <h3>{{ task.title }}</h3>
                        @if (task.description) {
                          <p>{{ task.description }}</p>
                        }
                        @if (task.due_date) {
                          <p class="task-due">
                            <ion-icon name="calendar-outline"></ion-icon>
                            Due: {{ formatDate(task.due_date) }}
                          </p>
                        }
                      </ion-label>

                      @if (task.priority) {
                        <ion-chip
                          slot="end"
                          [color]="getPriorityColor(task.priority)"
                          size="small"
                        >
                          {{ task.priority }}
                        </ion-chip>
                      }

                      <ion-button
                        slot="end"
                        fill="clear"
                        color="danger"
                        (click)="deleteTask(task)"
                      >
                        <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                      </ion-button>
                    </ion-item>
                  }
                </ion-list>
              } @else {
                <div class="empty-state">
                  <ion-icon name="checkmark-circle-outline"></ion-icon>
                  <p>No tasks yet</p>
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
      --color: var(--fitos-text-primary, #F5F5F5);
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px;
    }

    .lead-detail {
      padding: 16px;
      padding-bottom: 48px;
    }

    .lead-header {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);

      .lead-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--fitos-bg-tertiary, #262626);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        ion-icon {
          font-size: 32px;
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }

      .lead-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;

        h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        ion-chip {
          align-self: flex-start;
        }
      }
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0 0 12px 0;
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --background: transparent;
    }

    .source-details {
      font-style: italic;
      color: var(--fitos-text-tertiary, #737373);
    }

    .lost-reason-input {
      margin-top: 12px;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .add-activity-section,
    .add-task-section {
      margin-bottom: 16px;

      ion-button {
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }

    .timeline {
      position: relative;
      padding-left: 24px;

      &::before {
        content: '';
        position: absolute;
        left: 15px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .timeline-item {
      position: relative;
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .timeline-marker {
      position: absolute;
      left: -40px;
      top: 8px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 2px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;

      ion-icon {
        font-size: 16px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      &.email {
        border-color: var(--ion-color-primary, #10B981);
        background: rgba(16, 185, 129, 0.1);

        ion-icon { color: var(--ion-color-primary, #10B981); }
      }

      &.call {
        border-color: #10B981;
        background: rgba(16, 185, 129, 0.1);

        ion-icon { color: #10B981; }
      }

      &.meeting {
        border-color: #8B5CF6;
        background: rgba(139, 92, 246, 0.1);

        ion-icon { color: #8B5CF6; }
      }

      &.note {
        border-color: var(--fitos-text-tertiary, #737373);
        background: rgba(115, 115, 115, 0.1);

        ion-icon { color: var(--fitos-text-tertiary, #737373); }
      }
    }

    .timeline-content {
      ion-card {
        margin: 0;
      }

      .activity-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;

        ion-card-title {
          flex: 1;
          font-size: 14px;
        }

        ion-note {
          font-size: 11px;
          white-space: nowrap;
        }
      }
    }

    .tasks-tab {
      ion-item.completed {
        opacity: 0.6;

        ion-label h3 {
          text-decoration: line-through;
        }
      }

      .task-due {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: var(--fitos-text-tertiary, #737373);

        ion-icon {
          font-size: 14px;
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;

      ion-icon {
        font-size: 48px;
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }
  `],
})
export class LeadDetailModalComponent implements OnInit {
  // Inputs
  leadId = input.required<string>();

  // Services
  private leadService = inject(LeadService);
  private auth = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private haptic = inject(HapticService);

  // State
  lead = signal<LeadWithExtras | null>(null);
  loading = signal(false);
  activeTab = 'overview';
  selectedStatus = '';
  lostReason = '';

  // Computed
  activities = computed(() => this.lead()?.activities || []);
  tasks = computed(() => this.lead()?.tasks || []);

  constructor() {
    addIcons({
      closeOutline,
      createOutline,
      callOutline,
      mailOutline,
      calendarOutline,
      personOutline,
      timeOutline,
      checkmarkCircleOutline,
      addOutline,
      trashOutline,
    });
  }

  async ngOnInit() {
    await this.loadLead();
  }

  /**
   * Load lead details
   */
  async loadLead() {
    this.loading.set(true);

    try {
      const lead = await this.leadService.getLead(this.leadId());
      if (lead) {
        this.lead.set(lead);
        this.selectedStatus = lead.status;
      }
    } catch (err) {
      console.error('Error loading lead:', err);
      await this.showToast('Failed to load lead details', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Tab change handler
   */
  onTabChange() {
    this.haptic.light();
  }

  /**
   * Toggle edit mode
   */
  async toggleEdit() {
    await this.haptic.light();

    const lead = this.lead();
    if (!lead) return;

    const { AddLeadModalComponent } = await import('./add-lead-modal.component');

    const modal = await this.modalCtrl.create({
      component: AddLeadModalComponent,
      componentProps: {
        leadId: lead.id,
      },
    });

    await modal.present();

    // Refresh lead after modal closes
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      await this.loadLead();
    }
  }

  /**
   * Update lead status
   */
  async updateStatus() {
    await this.haptic.light();

    const leadId = this.leadId();
    const newStatus = this.selectedStatus as LeadStatus;

    const success = await this.leadService.updateLeadStatus(
      leadId,
      newStatus,
      newStatus === 'lost' ? this.lostReason : undefined
    );

    if (success) {
      await this.showToast('Status updated', 'success');
      await this.loadLead();
    } else {
      await this.showToast('Failed to update status', 'danger');
    }
  }

  /**
   * Call lead
   */
  async callLead() {
    await this.haptic.light();

    const lead = this.lead();
    if (!lead?.phone) {
      await this.showToast('No phone number available', 'warning');
      return;
    }

    // Log activity
    const trainerId = this.auth.user()?.id;
    if (trainerId) {
      await this.leadService.addActivity(lead.id, trainerId, {
        activity_type: 'phone_call',
        subject: 'Phone call initiated',
        description: `Called ${lead.full_name}`,
      });
      await this.loadLead();
    }

    // Open phone app
    window.location.href = `tel:${lead.phone}`;
  }

  /**
   * Email lead
   */
  async emailLead() {
    await this.haptic.light();
    // TODO: Open email template selector
    await this.showToast('Email feature coming soon', 'primary');
  }

  /**
   * Show add activity form
   */
  async showAddActivity() {
    await this.haptic.light();
    // TODO: Open add activity modal
    await this.showToast('Add activity modal coming soon', 'primary');
  }

  /**
   * Show add task form
   */
  async showAddTask() {
    await this.haptic.light();
    // TODO: Open add task modal
    await this.showToast('Add task modal coming soon', 'primary');
  }

  /**
   * Toggle task completion
   */
  async toggleTaskComplete(task: LeadTask) {
    await this.haptic.light();

    if (!task.completed) {
      const success = await this.leadService.completeTask(task.id);
      if (success) {
        await this.showToast('Task completed', 'success');
        await this.loadLead();
      }
    }
  }

  /**
   * Delete task
   */
  async deleteTask(_task: LeadTask) {
    await this.haptic.light();
    // TODO: Implement task deletion
    await this.showToast('Delete task coming soon', 'primary');
  }

  /**
   * Get status color
   */
  getStatusColor(status: LeadStatus): string {
    switch (status) {
      case 'new': return 'medium';
      case 'contacted': return 'primary';
      case 'qualified': return 'secondary';
      case 'consultation': return 'tertiary';
      case 'won': return 'success';
      case 'lost': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Get score color
   */
  getScoreColor(score: number): string {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'medium';
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'medium';
      default: return 'medium';
    }
  }

  /**
   * Get activity icon
   */
  getActivityIcon(type: ActivityType): string {
    switch (type) {
      case 'email_sent':
      case 'email_opened':
      case 'email_clicked':
        return 'mail-outline';
      case 'phone_call':
        return 'call-outline';
      case 'meeting':
        return 'calendar-outline';
      case 'note':
      case 'status_change':
      default:
        return 'time-outline';
    }
  }

  /**
   * Get activity CSS class
   */
  getActivityClass(type: ActivityType): string {
    if (type.startsWith('email_')) return 'email';
    if (type === 'phone_call') return 'call';
    if (type === 'meeting') return 'meeting';
    return 'note';
  }

  /**
   * Get activity label
   */
  getActivityLabel(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
      email_sent: 'Email Sent',
      email_opened: 'Email Opened',
      email_clicked: 'Link Clicked',
      phone_call: 'Phone Call',
      text_message: 'Text Message',
      meeting: 'Meeting',
      note: 'Note',
      status_change: 'Status Changed',
      task_completed: 'Task Completed',
    };
    return labels[type] || type;
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format relative time
   */
  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return this.formatDate(dateString);
  }

  /**
   * Dismiss modal
   */
  async dismiss() {
    await this.haptic.light();
    await this.modalCtrl.dismiss();
  }

  /**
   * Show toast
   */
  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
