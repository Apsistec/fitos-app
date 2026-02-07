import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import {
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonButton,
  IonSearchbar,
  IonChip,
  IonLabel,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personAddOutline,
  mailOutline,
  checkmarkCircleOutline,
  calendarOutline,
  trophyOutline,
  closeCircleOutline,
  addOutline,
  funnelOutline,
} from 'ionicons/icons';
import { LeadService, Lead, LeadStatus } from '../../../../core/services/lead.service';
import { LeadCardComponent } from '../lead-card/lead-card.component';
import { LeadFormComponent } from '../lead-form/lead-form.component';
import { ModalController } from '@ionic/angular/standalone';

const STAGE_CONFIG: Record<LeadStatus, { label: string; color: string; icon: string }> = {
  new: { label: 'New', color: 'primary', icon: 'person-add-outline' },
  contacted: { label: 'Contacted', color: 'secondary', icon: 'mail-outline' },
  qualified: { label: 'Qualified', color: 'tertiary', icon: 'checkmark-circle-outline' },
  consultation: { label: 'Consultation', color: 'warning', icon: 'calendar-outline' },
  won: { label: 'Won', color: 'success', icon: 'trophy-outline' },
  lost: { label: 'Lost', color: 'danger', icon: 'close-circle-outline' },
};

/**
 * LeadPipelineComponent - Kanban-style pipeline view
 *
 * Features:
 * - Visual pipeline by stage
 * - Drag-and-drop between stages
 * - Search and filter
 * - Lead count by stage
 * - Quick actions
 */
@Component({
  selector: 'app-lead-pipeline',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    LeadCardComponent,
    IonBadge,
    IonIcon,
    IonButton,
    IonSearchbar,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pipeline-container">
      <!-- Header with stats -->
      <div class="pipeline-header">
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-value">{{ leadService.pipelineStats().total }}</span>
            <span class="stat-label">Total Leads</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ leadService.pipelineStats().conversionRate }}%</span>
            <span class="stat-label">Win Rate</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">\${{ formatValue(leadService.pipelineStats().totalValue) }}</span>
            <span class="stat-label">Total Value</span>
          </div>
        </div>
        <ion-button size="small" (click)="addLead()">
          <ion-icon slot="start" name="add-outline"></ion-icon>
          New Lead
        </ion-button>
      </div>

      <!-- Search -->
      <ion-searchbar
        [(ngModel)]="searchQuery"
        (ionInput)="onSearch()"
        placeholder="Search leads..."
        debounce="300"
      ></ion-searchbar>

      <!-- Loading State -->
      @if (leadService.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading pipeline...</p>
        </div>
      }

      <!-- Pipeline Stages (Horizontal Scroll) -->
      @if (!leadService.loading()) {
        <div cdkDropListGroup class="pipeline-stages">
          @for (stage of stages; track stage) {
            <div class="stage-column">
              <!-- Stage Header -->
              <div class="stage-header">
                <div class="stage-title">
                  <ion-icon [name]="STAGE_CONFIG[stage].icon"></ion-icon>
                  <span>{{ STAGE_CONFIG[stage].label }}</span>
                </div>
                <ion-badge [color]="STAGE_CONFIG[stage].color">
                  {{ getStageLeads(stage).length }}
                </ion-badge>
              </div>

              <!-- Lead Cards -->
              <div
                cdkDropList
                [cdkDropListData]="getStageLeads(stage)"
                [id]="stage"
                (cdkDropListDropped)="onDrop($event)"
                class="lead-cards"
              >
                @for (lead of getStageLeads(stage); track lead.id) {
                  <app-lead-card
                    cdkDrag
                    [lead]="lead"
                    (cardClick)="viewLead($event)"
                  />
                } @empty {
                  <div class="empty-stage">
                    <ion-icon name="funnel-outline"></ion-icon>
                    <p>No leads</p>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .pipeline-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      min-height: 100vh;
    }

    .pipeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);

      ion-button {
        --border-radius: 8px;
        font-weight: 700;
      }
    }

    .header-stats {
      display: flex;
      gap: 24px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-value {
      font-family: 'Space Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .stat-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
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

    .pipeline-stages {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 16px;
      -webkit-overflow-scrolling: touch;
    }

    .stage-column {
      flex: 0 0 300px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stage-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);

      ion-icon {
        font-size: 20px;
      }
    }

    .lead-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 200px;
      padding: 8px;
      background: transparent;
      border-radius: 8px;
      transition: background-color 150ms ease;

      &.cdk-drop-list-dragging {
        background: rgba(16, 185, 129, 0.05);
      }
    }

    .empty-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: var(--fitos-text-tertiary, #737373);
      text-align: center;

      ion-icon {
        font-size: 48px;
        margin-bottom: 8px;
      }

      p {
        margin: 0;
        font-size: 13px;
      }
    }
  `],
})
export class LeadPipelineComponent implements OnInit {
  leadService = inject(LeadService);
  private modalCtrl = inject(ModalController);

  // Component state
  searchQuery = signal('');
  filteredLeads = signal<Lead[]>([]);

  STAGE_CONFIG = STAGE_CONFIG;
  stages: LeadStatus[] = ['new', 'contacted', 'qualified', 'consultation', 'won', 'lost'];

  constructor() {
    addIcons({
      personAddOutline,
      mailOutline,
      checkmarkCircleOutline,
      calendarOutline,
      trophyOutline,
      closeCircleOutline,
      addOutline,
      funnelOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.leadService.loadLeads();
  }

  getStageLeads(stage: LeadStatus): Lead[] {
    const query = this.searchQuery().toLowerCase();
    const leads = this.leadService.leadsByStage()[stage] || [];

    if (!query) return leads;

    return leads.filter(lead => {
      const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
      return fullName.includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.phone?.includes(query);
    });
  }

  onSearch(): void {
    // Search is handled by getStageLeads
  }

  async onDrop(event: CdkDragDrop<Lead[]>): Promise<void> {
    if (event.previousContainer === event.container) {
      // Reordering within same stage
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Moving to different stage
      const lead = event.previousContainer.data[event.previousIndex];
      const newStage = event.container.id as LeadStatus;

      await this.leadService.updateStage(lead.id, newStage);

      // Transfer item between lists
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  viewLead(lead: Lead): void {
    // TODO: Navigate to lead detail page
    console.log('View lead:', lead);
  }

  async addLead(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: LeadFormComponent,
      componentProps: {
        title: 'Add New Lead',
        subtitle: 'Capture a potential client',
        showSource: true,
        showNotes: true,
        showExpectedValue: true,
      },
    });

    await modal.present();

    const { role } = await modal.onWillDismiss();

    if (role === 'leadCreated') {
      // Reload leads to show the new one
      await this.leadService.loadLeads();
    }
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    return value.toString();
  }
}
