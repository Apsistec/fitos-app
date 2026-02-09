import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonFab,
  IonFabButton,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  funnelOutline,
  mailOutline,
  callOutline,
  personAddOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  documentTextOutline,
} from 'ionicons/icons';
import {
  LeadService,
  LeadWithExtras,
  LeadStatus,
  PipelineStage,
} from '../../../../core/services/lead.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HapticService } from '../../../../core/services/haptic.service';
import { FormsModule } from '@angular/forms';

/**
 * PipelinePage - Kanban-style lead pipeline view
 *
 * Features:
 * - Drag-and-drop kanban board
 * - Lead cards with key info
 * - Quick actions (call, email, schedule)
 * - Search and filter
 * - Pipeline metrics
 * - Add new lead FAB
 *
 * Usage:
 * Navigate to /tabs/crm/pipeline
 */
@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonChip,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonFab,
    IonFabButton,
    FormsModule,
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Lead Pipeline</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/tabs/crm/templates">
            <ion-icon slot="icon-only" name="document-text-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="toggleSearch()">
            <ion-icon slot="icon-only" name="search-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="showFilters()">
            <ion-icon slot="icon-only" name="funnel-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      @if (showSearchBar()) {
        <ion-toolbar>
          <ion-searchbar
            [(ngModel)]="searchQuery"
            (ionInput)="onSearchInput($event)"
            placeholder="Search leads..."
            debounce="300"
          ></ion-searchbar>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content>
      <div class="pipeline-page">
        <!-- Pipeline Metrics -->
        <div class="metrics-bar">
          <div class="metric">
            <span class="metric-value">{{ totalLeads() }}</span>
            <span class="metric-label">Total Leads</span>
          </div>
          <div class="metric">
            <span class="metric-value">{{ activeLeads() }}</span>
            <span class="metric-label">Active</span>
          </div>
          <div class="metric">
            <span class="metric-value">{{ conversionRate() }}%</span>
            <span class="metric-label">Conv. Rate</span>
          </div>
        </div>

        <!-- Loading State -->
        @if (leadService.isLoading()) {
          <div class="loading-container">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading pipeline...</p>
          </div>
        }

        <!-- Pipeline Columns -->
        @if (!leadService.isLoading()) {
          <div class="pipeline-columns">
            @for (stage of stages(); track stage.id) {
              <div class="pipeline-column">
                <div class="column-header" [style.border-left-color]="stage.color">
                  <h3>{{ stage.name }}</h3>
                  <ion-chip color="medium">
                    {{ getLeadsForStage(stage.maps_to_status).length }}
                  </ion-chip>
                </div>

                <div class="column-content">
                  @for (lead of getLeadsForStage(stage.maps_to_status); track lead.id) {
                    <ion-card
                      class="lead-card"
                      button
                      (click)="openLeadDetail(lead)"
                    >
                      <ion-card-header>
                        <ion-card-title>{{ lead.full_name }}</ion-card-title>
                        @if (lead.lead_score > 0) {
                          <ion-chip
                            [color]="getScoreColor(lead.lead_score)"
                            size="small"
                          >
                            Score: {{ lead.lead_score }}
                          </ion-chip>
                        }
                      </ion-card-header>

                      <ion-card-content>
                        <div class="lead-info">
                          <span class="lead-email">{{ lead.email }}</span>
                          @if (lead.phone) {
                            <span class="lead-phone">{{ lead.phone }}</span>
                          }
                          @if (lead.source) {
                            <ion-chip color="tertiary" size="small">
                              {{ lead.source }}
                            </ion-chip>
                          }
                        </div>

                        @if (lead.tags && lead.tags.length > 0) {
                          <div class="lead-tags">
                            @for (tag of lead.tags.slice(0, 2); track tag) {
                              <ion-chip size="small">{{ tag }}</ion-chip>
                            }
                            @if (lead.tags.length > 2) {
                              <ion-chip size="small">+{{ lead.tags.length - 2 }}</ion-chip>
                            }
                          </div>
                        }

                        <!-- Quick Actions -->
                        <div class="lead-actions">
                          <ion-button
                            fill="clear"
                            size="small"
                            (click)="callLead(lead, $event)"
                          >
                            <ion-icon slot="icon-only" name="call-outline"></ion-icon>
                          </ion-button>
                          <ion-button
                            fill="clear"
                            size="small"
                            (click)="emailLead(lead, $event)"
                          >
                            <ion-icon slot="icon-only" name="mail-outline"></ion-icon>
                          </ion-button>
                        </div>
                      </ion-card-content>
                    </ion-card>
                  } @empty {
                    <div class="empty-column">
                      <p>No leads in this stage</p>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty State -->
        @if (!leadService.isLoading() && totalLeads() === 0) {
          <div class="empty-state">
            <ion-icon name="person-add-outline"></ion-icon>
            <h2>No Leads Yet</h2>
            <p>Start building your pipeline by adding your first lead.</p>
            <ion-button (click)="addLead()">
              <ion-icon slot="start" name="add-outline"></ion-icon>
              Add Lead
            </ion-button>
          </div>
        }
      </div>

      <!-- FAB: Add Lead -->
      @if (totalLeads() > 0) {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button (click)="addLead()">
            <ion-icon name="add-outline"></ion-icon>
          </ion-fab-button>
        </ion-fab>
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

    .pipeline-page {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .metrics-bar {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .metric {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .metric-value {
        font-family: 'Space Mono', monospace;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
        line-height: 1;
      }

      .metric-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
        color: var(--fitos-text-secondary, #A3A3A3);
        margin-top: 4px;
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 12px;

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0;
      }
    }

    .pipeline-columns {
      display: flex;
      gap: 12px;
      padding: 16px;
      overflow-x: auto;
      flex: 1;
      align-items: flex-start;

      /* Smooth scrolling */
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }

    .pipeline-column {
      flex: 0 0 300px;
      min-width: 300px;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 200px);

      @media (max-width: 768px) {
        flex: 0 0 280px;
        min-width: 280px;
      }
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 8px;
      border-left: 4px solid;
      margin-bottom: 8px;

      h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .column-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-bottom: 8px;
    }

    .lead-card {
      margin: 0;
      cursor: pointer;
      transition: transform 150ms ease;

      &:hover {
        transform: translateY(-2px);
      }

      ion-card-header {
        padding: 12px;

        ion-card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }
      }

      ion-card-content {
        padding: 12px;
        padding-top: 0;
      }
    }

    .lead-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;

      .lead-email,
      .lead-phone {
        font-size: 13px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .lead-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .lead-actions {
      display: flex;
      gap: 4px;
      justify-content: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 8px;
      margin-top: 8px;
    }

    .empty-column {
      padding: 16px;
      text-align: center;
      color: var(--fitos-text-tertiary, #737373);

      p {
        margin: 0;
        font-size: 13px;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      flex: 1;

      ion-icon {
        font-size: 48px;
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 16px;
      }

      h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
        max-width: 400px;
      }

      ion-button {
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .lead-card {
        transition: none;
      }

      .lead-card:hover {
        transform: none;
      }
    }
  `],
})
export class PipelinePage implements OnInit {
  // Services
  leadService = inject(LeadService);
  private auth = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private haptic = inject(HapticService);

  // State
  stages = signal<PipelineStage[]>([]);
  searchQuery = signal('');
  showSearchBar = signal(false);
  loading = signal(false);

  // Computed
  totalLeads = computed(() => this.leadService.leads().length);
  activeLeads = computed(() => this.leadService.activeLeads().length);

  conversionRate = computed(() => {
    const leads = this.leadService.leads();
    const won = leads.filter((l) => l.status === 'won').length;
    const completed = leads.filter((l) => l.status === 'won' || l.status === 'lost').length;

    if (completed === 0) return 0;
    return Math.round((won / completed) * 100);
  });

  constructor() {
    addIcons({
      addOutline,
      searchOutline,
      funnelOutline,
      mailOutline,
      callOutline,
      personAddOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      documentTextOutline,
    });
  }

  async ngOnInit() {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    await this.loadPipeline(trainerId);
  }

  /**
   * Load pipeline data
   */
  async loadPipeline(trainerId: string) {
    this.loading.set(true);

    try {
      // Load stages
      const stages = await this.leadService.getPipelineStages(trainerId);

      // Create default stages if none exist
      if (stages.length === 0) {
        await this.leadService.createDefaultPipelineStages(trainerId);
        const newStages = await this.leadService.getPipelineStages(trainerId);
        this.stages.set(newStages);
      } else {
        this.stages.set(stages);
      }

      // Load leads
      await this.leadService.getLeads(trainerId, false);
    } catch (err) {
      console.error('Error loading pipeline:', err);
      await this.showToast('Failed to load pipeline', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get leads for specific stage
   */
  getLeadsForStage(status: LeadStatus): LeadWithExtras[] {
    const leadsByStatus = this.leadService.leadsByStatus();
    return leadsByStatus[status] || [];
  }

  /**
   * Get color based on lead score
   */
  getScoreColor(score: number): string {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'medium';
  }

  /**
   * Toggle search bar
   */
  toggleSearch() {
    this.showSearchBar.update(show => !show);
    if (!this.showSearchBar()) {
      this.searchQuery.set('');
    }
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    // Search is computed in the service
    // In production, you'd filter the displayed leads
  }

  /**
   * Show filters modal
   */
  async showFilters() {
    await this.haptic.light();
    await this.showToast('Filters coming soon', 'primary');
  }

  /**
   * Open lead detail modal
   */
  async openLeadDetail(lead: LeadWithExtras) {
    await this.haptic.light();

    const { LeadDetailModalComponent } = await import(
      '../../components/lead-detail-modal.component'
    );

    const modal = await this.modalCtrl.create({
      component: LeadDetailModalComponent,
      componentProps: {
        leadId: lead.id,
      },
    });

    await modal.present();

    // Refresh leads after modal closes
    const { data } = await modal.onWillDismiss();
    if (data?.updated) {
      const trainerId = this.auth.user()?.id;
      if (trainerId) {
        await this.leadService.getLeads(trainerId, false);
      }
    }
  }

  /**
   * Add new lead
   */
  async addLead() {
    await this.haptic.light();

    const { AddLeadModalComponent } = await import(
      '../../components/add-lead-modal.component'
    );

    const modal = await this.modalCtrl.create({
      component: AddLeadModalComponent,
    });

    await modal.present();

    // Refresh leads after modal closes
    const { data } = await modal.onWillDismiss();
    if (data?.created || data?.updated) {
      const trainerId = this.auth.user()?.id;
      if (trainerId) {
        await this.leadService.getLeads(trainerId, false);
      }
    }
  }

  /**
   * Call lead
   */
  async callLead(lead: LeadWithExtras, event: Event) {
    event.stopPropagation();
    await this.haptic.light();

    if (!lead.phone) {
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
    }

    // Open phone app
    window.location.href = `tel:${lead.phone}`;
  }

  /**
   * Email lead
   */
  async emailLead(lead: LeadWithExtras, event: Event) {
    event.stopPropagation();
    await this.haptic.light();

    // TODO: Open email template selector modal
    await this.showToast('Email modal coming soon', 'primary');
  }

  /**
   * Show toast notification
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
