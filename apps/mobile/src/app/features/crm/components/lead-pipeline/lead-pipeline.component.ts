import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { LeadService, Lead, LeadStage } from '@app/core/services/lead.service';

const STAGE_CONFIG = {
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
    IonCard,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonButton,
    IonSearchbar,
    IonChip,
    IonLabel,
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
        <div class="pipeline-stages">
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
              <div class="lead-cards">
                @for (lead of getStageLeads(stage); track lead.id) {
                  <ion-card
                    class="lead-card"
                    button
                    (click)="viewLead(lead)"
                    [class.dragging]="draggedLead() === lead.id"
                    draggable="true"
                    (dragstart)="onDragStart($event, lead)"
                    (dragend)="onDragEnd()"
                  >
                    <ion-card-content>
                      <!-- Lead Name -->
                      <h3 class="lead-name">{{ lead.name }}</h3>

                      <!-- Contact Info -->
                      <div class="lead-contact">
                        <span class="lead-email">{{ lead.email }}</span>
                        @if (lead.phone) {
                          <span class="lead-phone">{{ lead.phone }}</span>
                        }
                      </div>

                      <!-- Source -->
                      <div class="lead-meta">
                        <ion-chip size="small" outline="true">
                          <ion-label>{{ lead.source }}</ion-label>
                        </ion-chip>
                        @if (lead.expected_value) {
                          <span class="lead-value">\${{ lead.expected_value }}</span>
                        }
                      </div>

                      <!-- Follow-up indicator -->
                      @if (lead.next_follow_up && isOverdue(lead.next_follow_up)) {
                        <div class="follow-up-alert">
                          <ion-icon name="calendar-outline"></ion-icon>
                          <span>Follow-up overdue</span>
                        </div>
                      }
                    </ion-card-content>
                  </ion-card>
                } @empty {
                  <div class="empty-stage">
                    <ion-icon name="funnel-outline"></ion-icon>
                    <p>No leads</p>
                  </div>
                }
              </div>

              <!-- Drop Zone -->
              <div
                class="drop-zone"
                [class.active]="dropZone() === stage"
                (dragover)="onDragOver($event, stage)"
                (dragleave)="onDragLeave()"
                (drop)="onDrop($event, stage)"
              >
                Drop here
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
      gap: var(--fitos-space-4);
      padding: var(--fitos-space-4);
      min-height: 100vh;
    }

    .pipeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--fitos-space-4);
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-secondary);
      border-radius: var(--fitos-radius-lg);
    }

    .header-stats {
      display: flex;
      gap: var(--fitos-space-6);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-1);
    }

    .stat-value {
      font-family: var(--fitos-font-mono);
      font-size: var(--fitos-text-2xl);
      font-weight: 700;
      color: var(--fitos-text-primary);
    }

    .stat-label {
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

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

    .pipeline-stages {
      display: flex;
      gap: var(--fitos-space-4);
      overflow-x: auto;
      padding-bottom: var(--fitos-space-4);
      -webkit-overflow-scrolling: touch;
    }

    .stage-column {
      flex: 0 0 300px;
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-3);
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--fitos-space-3) var(--fitos-space-4);
      background: var(--fitos-bg-secondary);
      border-radius: var(--fitos-radius-md);
    }

    .stage-title {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      font-weight: 600;
      color: var(--fitos-text-primary);

      ion-icon {
        font-size: 20px;
      }
    }

    .lead-cards {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-3);
      min-height: 200px;
    }

    .lead-card {
      margin: 0;
      cursor: move;
      transition: all var(--fitos-duration-fast);
      --background: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-subtle);

      &:hover {
        border-color: var(--fitos-border-default);
        transform: translateY(-2px);
        box-shadow: var(--fitos-shadow-md);
      }

      &.dragging {
        opacity: 0.5;
        transform: rotate(2deg);
      }

      ion-card-content {
        padding: var(--fitos-space-3);
      }
    }

    .lead-name {
      margin: 0 0 var(--fitos-space-2);
      font-size: var(--fitos-text-base);
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .lead-contact {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-1);
      margin-bottom: var(--fitos-space-2);
    }

    .lead-email {
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-secondary);
    }

    .lead-phone {
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
    }

    .lead-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--fitos-space-2);

      ion-chip {
        margin: 0;
        font-size: var(--fitos-text-xs);
        text-transform: capitalize;
      }
    }

    .lead-value {
      font-family: var(--fitos-font-mono);
      font-size: var(--fitos-text-sm);
      font-weight: 600;
      color: var(--fitos-status-success);
    }

    .follow-up-alert {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-1);
      margin-top: var(--fitos-space-2);
      padding: var(--fitos-space-2);
      background: rgba(239, 68, 68, 0.1);
      border-radius: var(--fitos-radius-sm);
      font-size: var(--fitos-text-xs);
      color: var(--fitos-status-error);

      ion-icon {
        font-size: 14px;
      }
    }

    .empty-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--fitos-space-6);
      color: var(--fitos-text-tertiary);
      text-align: center;

      ion-icon {
        font-size: 48px;
        margin-bottom: var(--fitos-space-2);
      }

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
      }
    }

    .drop-zone {
      min-height: 50px;
      border: 2px dashed var(--fitos-border-subtle);
      border-radius: var(--fitos-radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-tertiary);
      opacity: 0;
      transition: all var(--fitos-duration-fast);

      &.active {
        opacity: 1;
        border-color: var(--fitos-accent-primary);
        background: rgba(16, 185, 129, 0.1);
        color: var(--fitos-accent-primary);
      }
    }
  `],
})
export class LeadPipelineComponent implements OnInit {
  leadService = inject(LeadService);

  // Component state
  searchQuery = signal('');
  draggedLead = signal<string | null>(null);
  dropZone = signal<LeadStage | null>(null);
  filteredLeads = signal<Lead[]>([]);

  STAGE_CONFIG = STAGE_CONFIG;
  stages: LeadStage[] = ['new', 'contacted', 'qualified', 'consultation', 'won', 'lost'];

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

  getStageLeads(stage: LeadStage): Lead[] {
    const query = this.searchQuery().toLowerCase();
    const leads = this.leadService.leadsByStage()[stage] || [];

    if (!query) return leads;

    return leads.filter(lead =>
      lead.name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone?.includes(query)
    );
  }

  onSearch(): void {
    // Search is handled by getStageLeads
  }

  onDragStart(event: DragEvent, lead: Lead): void {
    this.draggedLead.set(lead.id);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', lead.id);
  }

  onDragEnd(): void {
    this.draggedLead.set(null);
    this.dropZone.set(null);
  }

  onDragOver(event: DragEvent, stage: LeadStage): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dropZone.set(stage);
  }

  onDragLeave(): void {
    this.dropZone.set(null);
  }

  async onDrop(event: DragEvent, newStage: LeadStage): Promise<void> {
    event.preventDefault();
    const leadId = this.draggedLead();
    if (!leadId) return;

    await this.leadService.updateStage(leadId, newStage);

    this.draggedLead.set(null);
    this.dropZone.set(null);
  }

  viewLead(lead: Lead): void {
    // TODO: Open lead detail modal
    console.log('View lead:', lead);
  }

  addLead(): void {
    // TODO: Open add lead modal
    console.log('Add lead');
  }

  isOverdue(date: string): boolean {
    return new Date(date) < new Date();
  }

  formatValue(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    return value.toString();
  }
}
