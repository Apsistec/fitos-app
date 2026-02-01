import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonBadge,
  IonChip,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  mailOutline,
  sendOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  eyeOutline,
  createOutline,
  trashOutline,
  peopleOutline,
} from 'ionicons/icons';
import { HapticService } from '../../../../core/services/haptic.service';

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  recipientCount: number;
  openRate?: number;
  clickRate?: number;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  templateId?: string;
}

/**
 * EmailCampaignsPage - Manage email marketing campaigns
 *
 * Features:
 * - Campaign list with status filters
 * - Create new campaigns
 * - View campaign analytics
 * - Schedule campaigns
 * - Draft management
 */
@Component({
  selector: 'app-email-campaigns',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
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
    IonBadge,
    IonChip,
    IonLabel,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/crm"></ion-back-button>
        </ion-buttons>
        <ion-title>Email Campaigns</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="createCampaign()" aria-label="Create campaign">
            <ion-icon slot="icon-only" name="add-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="campaigns-container">
        <!-- Stats Header -->
        <div class="stats-header">
          <div class="stat-card">
            <span class="stat-value">{{ totalCampaigns() }}</span>
            <span class="stat-label">Total Campaigns</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ averageOpenRate() }}%</span>
            <span class="stat-label">Avg Open Rate</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ totalRecipients() }}</span>
            <span class="stat-label">Total Sent</span>
          </div>
        </div>

        <!-- Status Filter -->
        <ion-segment [(ngModel)]="statusFilter" (ionChange)="onFilterChange()">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="draft">
            <ion-label>Drafts</ion-label>
          </ion-segment-button>
          <ion-segment-button value="scheduled">
            <ion-label>Scheduled</ion-label>
          </ion-segment-button>
          <ion-segment-button value="sent">
            <ion-label>Sent</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Search -->
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearch()"
          placeholder="Search campaigns..."
          debounce="300"
        ></ion-searchbar>

        <!-- Loading State -->
        @if (loading()) {
          <div class="loading-container">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading campaigns...</p>
          </div>
        }

        <!-- Campaign List -->
        @if (!loading() && filteredCampaigns().length > 0) {
          <div class="campaigns-list">
            @for (campaign of filteredCampaigns(); track campaign.id) {
              <ion-card class="campaign-card" button (click)="viewCampaign(campaign)">
                <ion-card-header>
                  <div class="campaign-header">
                    <div class="campaign-info">
                      <ion-card-title>{{ campaign.name }}</ion-card-title>
                      <p class="campaign-subject">{{ campaign.subject }}</p>
                    </div>
                    <ion-badge [color]="getStatusColor(campaign.status)">
                      {{ campaign.status }}
                    </ion-badge>
                  </div>
                </ion-card-header>

                <ion-card-content>
                  <div class="campaign-meta">
                    <div class="meta-item">
                      <ion-icon name="people-outline"></ion-icon>
                      <span>{{ campaign.recipientCount }} recipients</span>
                    </div>

                    @if (campaign.status === 'sent' && campaign.openRate !== undefined) {
                      <div class="meta-item">
                        <ion-icon name="mail-outline"></ion-icon>
                        <span>{{ campaign.openRate }}% opened</span>
                      </div>
                    }

                    @if (campaign.scheduledFor && campaign.status === 'scheduled') {
                      <div class="meta-item">
                        <ion-icon name="time-outline"></ion-icon>
                        <span>{{ formatDate(campaign.scheduledFor) }}</span>
                      </div>
                    }

                    @if (campaign.sentAt && campaign.status === 'sent') {
                      <div class="meta-item">
                        <ion-icon name="send-outline"></ion-icon>
                        <span>Sent {{ formatDate(campaign.sentAt) }}</span>
                      </div>
                    }
                  </div>

                  <!-- Actions -->
                  <div class="campaign-actions">
                    @if (campaign.status === 'draft') {
                      <ion-button size="small" fill="outline" (click)="editCampaign($event, campaign)">
                        <ion-icon slot="start" name="create-outline"></ion-icon>
                        Edit
                      </ion-button>
                      <ion-button size="small" (click)="scheduleCampaign($event, campaign)">
                        <ion-icon slot="start" name="time-outline"></ion-icon>
                        Schedule
                      </ion-button>
                    }

                    @if (campaign.status === 'sent') {
                      <ion-button size="small" fill="outline" (click)="viewAnalytics($event, campaign)">
                        <ion-icon slot="start" name="eye-outline"></ion-icon>
                        Analytics
                      </ion-button>
                    }

                    @if (campaign.status === 'draft' || campaign.status === 'failed') {
                      <ion-button
                        size="small"
                        fill="clear"
                        color="danger"
                        (click)="deleteCampaign($event, campaign)"
                        aria-label="Delete campaign"
                      >
                        <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                      </ion-button>
                    }
                  </div>
                </ion-card-content>
              </ion-card>
            }
          </div>
        }

        <!-- Empty State -->
        @if (!loading() && filteredCampaigns().length === 0) {
          <div class="empty-state">
            <ion-icon name="mail-outline" class="empty-icon"></ion-icon>
            <h2>No campaigns found</h2>
            @if (searchQuery()) {
              <p>No campaigns match "{{ searchQuery() }}"</p>
            } @else if (statusFilter() !== 'all') {
              <p>No {{ statusFilter() }} campaigns</p>
            } @else {
              <p>Create your first email campaign to get started</p>
              <ion-button (click)="createCampaign()">
                <ion-icon slot="start" name="add-outline"></ion-icon>
                Create Campaign
              </ion-button>
            }
          </div>
        }
      </div>
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

    .campaigns-container {
      padding: 16px;
    }

    .stats-header {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stat-value {
      font-family: 'Space Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
      color: var(--fitos-text-tertiary, #737373);
      text-align: center;
    }

    ion-segment {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      margin-bottom: 16px;
    }

    ion-searchbar {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      margin-bottom: 16px;
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

    .campaigns-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .campaign-card {
      margin: 0;
      transition: transform 150ms ease;

      &:active {
        transform: scale(0.98);
      }
    }

    .campaign-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .campaign-info {
      flex: 1;
      min-width: 0;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .campaign-subject {
      margin: 0;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .campaign-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);

      ion-icon {
        font-size: 16px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .campaign-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;

      ion-button {
        margin: 0;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;

      .empty-icon {
        font-size: 48px;
        color: var(--fitos-text-tertiary, #737373);
        opacity: 0.5;
        margin-bottom: 16px;
      }

      h2 {
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      ion-button {
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }
  `],
})
export class EmailCampaignsPage implements OnInit {
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private haptic = inject(HapticService);

  // State
  campaigns = signal<EmailCampaign[]>([]);
  loading = signal(true);
  statusFilter = signal<'all' | CampaignStatus>('all');
  searchQuery = signal('');

  // Computed
  filteredCampaigns = signal<EmailCampaign[]>([]);
  totalCampaigns = signal(0);
  averageOpenRate = signal(0);
  totalRecipients = signal(0);

  constructor() {
    addIcons({
      addOutline,
      mailOutline,
      sendOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      eyeOutline,
      createOutline,
      trashOutline,
      peopleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCampaigns();
  }

  async loadCampaigns(): Promise<void> {
    this.loading.set(true);

    try {
      // TODO: Load from API
      // Mock data for now
      const mockCampaigns: EmailCampaign[] = [
        {
          id: '1',
          name: 'Welcome Series - Week 1',
          subject: 'Welcome to your fitness journey!',
          status: 'sent',
          recipientCount: 45,
          openRate: 68,
          clickRate: 24,
          sentAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        },
        {
          id: '2',
          name: 'Monthly Newsletter - January',
          subject: 'Your January Fitness Recap',
          status: 'scheduled',
          recipientCount: 120,
          scheduledFor: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          name: 'Nutrition Tips Email',
          subject: '5 Easy Meal Prep Ideas',
          status: 'draft',
          recipientCount: 0,
          createdAt: new Date().toISOString(),
        },
      ];

      this.campaigns.set(mockCampaigns);
      this.updateStats();
      this.applyFilters();
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      this.loading.set(false);
    }
  }

  updateStats(): void {
    const campaigns = this.campaigns();

    this.totalCampaigns.set(campaigns.length);

    const sentCampaigns = campaigns.filter(c => c.status === 'sent' && c.openRate !== undefined);
    const avgOpen = sentCampaigns.length > 0
      ? sentCampaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / sentCampaigns.length
      : 0;
    this.averageOpenRate.set(Math.round(avgOpen));

    const totalSent = campaigns
      .filter(c => c.status === 'sent')
      .reduce((sum, c) => sum + c.recipientCount, 0);
    this.totalRecipients.set(totalSent);
  }

  onFilterChange(): void {
    this.haptic.light();
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.campaigns();

    // Status filter
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(c => c.status === this.statusFilter());
    }

    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query)
      );
    }

    this.filteredCampaigns.set(filtered);
  }

  getStatusColor(status: CampaignStatus): string {
    const colors: Record<CampaignStatus, string> = {
      draft: 'medium',
      scheduled: 'warning',
      sending: 'primary',
      sent: 'success',
      failed: 'danger',
    };
    return colors[status];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (Math.abs(diffDays) === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays > 0 && diffDays <= 7) {
      return `in ${diffDays} days`;
    } else if (diffDays < 0 && diffDays >= -7) {
      return `${Math.abs(diffDays)} days ago`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  async createCampaign(): Promise<void> {
    await this.haptic.light();
    // TODO: Navigate to campaign composer
    console.log('Create campaign');
  }

  viewCampaign(campaign: EmailCampaign): void {
    this.haptic.light();
    // TODO: Navigate to campaign detail
    console.log('View campaign:', campaign);
  }

  editCampaign(event: Event, campaign: EmailCampaign): void {
    event.stopPropagation();
    this.haptic.light();
    // TODO: Navigate to campaign editor
    console.log('Edit campaign:', campaign);
  }

  scheduleCampaign(event: Event, campaign: EmailCampaign): void {
    event.stopPropagation();
    this.haptic.light();
    // TODO: Open schedule modal
    console.log('Schedule campaign:', campaign);
  }

  viewAnalytics(event: Event, campaign: EmailCampaign): void {
    event.stopPropagation();
    this.haptic.light();
    // TODO: Navigate to analytics page
    console.log('View analytics:', campaign);
  }

  async deleteCampaign(event: Event, campaign: EmailCampaign): Promise<void> {
    event.stopPropagation();
    await this.haptic.warning();

    // TODO: Show confirmation dialog
    console.log('Delete campaign:', campaign);

    // Remove from list
    this.campaigns.update(campaigns =>
      campaigns.filter(c => c.id !== campaign.id)
    );
    this.applyFilters();
    this.updateStats();
  }
}
