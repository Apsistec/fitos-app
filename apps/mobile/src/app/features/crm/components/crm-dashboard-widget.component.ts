import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonChip,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  mailOutline,
  trendingUpOutline,
  arrowForwardOutline,
  funnelOutline,
  sendOutline,
} from 'ionicons/icons';

import { LeadService } from '../../../core/services/lead.service';
import { EmailTemplateService, EmailStats } from '../../../core/services/email-template.service';
import { AuthService } from '../../../core/services/auth.service';

interface QuickStat {
  label: string;
  value: number | string;
  color: string;
  icon: string;
  route?: string;
}

/**
 * CRMDashboardWidget - Quick overview of CRM and email marketing metrics
 *
 * Displays on the main dashboard for trainers to see:
 * - Total leads and pipeline status
 * - Email performance metrics
 * - Quick actions
 */
@Component({
  selector: 'app-crm-dashboard-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonChip
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="crm-widget">
      <ion-card-header>
        <div class="header-content">
          <div>
            <ion-card-title>
              <ion-icon name="people-outline" />
              Lead Pipeline
            </ion-card-title>
            <ion-card-subtitle>CRM & Email Marketing</ion-card-subtitle>
          </div>
          <ion-button
            fill="clear"
            size="small"
            routerLink="/tabs/crm/pipeline"
          >
            View All
            <ion-icon slot="end" name="arrow-forward-outline" />
          </ion-button>
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="circular" />
            <p>Loading stats...</p>
          </div>
        } @else {
          <!-- Quick Stats Grid -->
          <div class="stats-grid">
            @for (stat of quickStats(); track stat.label) {
              <div
                class="stat-item"
                [class.clickable]="stat.route"
                [routerLink]="stat.route || null"
              >
                <div class="stat-icon" [style.background-color]="stat.color">
                  <ion-icon [name]="stat.icon" />
                </div>
                <div class="stat-details">
                  <h3>{{ stat.value }}</h3>
                  <p>{{ stat.label }}</p>
                </div>
              </div>
            }
          </div>

          <!-- Email Performance Summary -->
          @if (emailStats()) {
            <div class="email-summary">
              <h4>Email Performance (30 days)</h4>
              <div class="performance-metrics">
                <div class="metric">
                  <span class="metric-label">Open Rate</span>
                  <ion-chip
                    [color]="getOpenRateColor(emailStats()!.open_rate)"
                    size="small"
                  >
                    {{ emailStats()!.open_rate.toFixed(1) }}%
                  </ion-chip>
                </div>
                <div class="metric">
                  <span class="metric-label">Click Rate</span>
                  <ion-chip
                    [color]="getClickRateColor(emailStats()!.click_rate)"
                    size="small"
                  >
                    {{ emailStats()!.click_rate.toFixed(1) }}%
                  </ion-chip>
                </div>
              </div>
              <ion-button
                expand="block"
                fill="outline"
                size="small"
                routerLink="/tabs/crm/analytics"
                class="analytics-button"
              >
                <ion-icon slot="start" name="analytics-outline" />
                View Analytics
              </ion-button>
            </div>
          }

          <!-- Quick Actions -->
          <div class="quick-actions">
            <ion-button
              expand="block"
              fill="outline"
              size="small"
              routerLink="/tabs/crm/pipeline"
            >
              <ion-icon slot="start" name="funnel-outline" />
              Manage Pipeline
            </ion-button>
            <ion-button
              expand="block"
              fill="outline"
              size="small"
              routerLink="/tabs/crm/sequences"
            >
              <ion-icon slot="start" name="send-outline" />
              Email Sequences
            </ion-button>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .crm-widget {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
        margin: 0 0 16px 0;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        ion-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          margin-bottom: 4px;

          ion-icon {
            font-size: 20px;
            color: var(--ion-color-primary, #10B981);
          }
        }

        ion-button {
          --padding-start: 8px;
          --padding-end: 8px;
        }
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 0;
        gap: 12px;

        p {
          color: var(--fitos-text-secondary, #A3A3A3);
          font-size: 13px;
          margin: 0;
        }
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--fitos-bg-tertiary, #262626);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.06);

        &.clickable {
          cursor: pointer;
          transition: background 200ms ease;

          &:hover {
            background: var(--fitos-bg-tertiary, #262626);
            border-color: rgba(255, 255, 255, 0.12);
          }
        }
      }

      .stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        flex-shrink: 0;

        ion-icon {
          font-size: 20px;
          color: white;
        }
      }

      .stat-details {
        flex: 1;
        min-width: 0;

        h3 {
          font-size: 20px;
          font-weight: 700;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 2px 0;
        }

        p {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .email-summary {
        padding: 16px;
        background: var(--fitos-bg-tertiary, #262626);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        margin-bottom: 16px;

        h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .performance-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }

      .metric {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .metric-label {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        ion-chip {
          font-weight: 600;
          font-family: 'Space Mono', monospace;
        }
      }

      .analytics-button {
        margin-top: 8px;
        --border-radius: 8px;
      }

      .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;

        ion-button {
          --border-radius: 8px;
        }
      }
    `,
  ],
})
export class CRMDashboardWidgetComponent implements OnInit {
  private leadService = inject(LeadService);
  private emailService = inject(EmailTemplateService);
  private auth = inject(AuthService);

  // State
  loading = signal(false);
  totalLeads = signal(0);
  activeLeads = signal(0);
  emailStats = signal<EmailStats | null>(null);

  // Computed
  quickStats = computed<QuickStat[]>(() => [
    {
      label: 'Total Leads',
      value: this.totalLeads(),
      color: 'var(--ion-color-primary)',
      icon: 'people-outline',
      route: '/tabs/crm/pipeline',
    },
    {
      label: 'Active',
      value: this.activeLeads(),
      color: 'var(--ion-color-success)',
      icon: 'trending-up-outline',
      route: '/tabs/crm/pipeline',
    },
    {
      label: 'Emails Sent',
      value: this.emailStats()?.total_sent || 0,
      color: 'var(--ion-color-tertiary)',
      icon: 'mail-outline',
      route: '/tabs/crm/analytics',
    },
    {
      label: 'Opened',
      value: this.emailStats()?.total_opened || 0,
      color: 'var(--ion-color-warning)',
      icon: 'send-outline',
      route: '/tabs/crm/analytics',
    },
  ]);

  constructor() {
    addIcons({
      peopleOutline,
      mailOutline,
      trendingUpOutline,
      arrowForwardOutline,
      funnelOutline,
      sendOutline,
    });
  }

  async ngOnInit() {
    await this.loadCRMStats();
  }

  private async loadCRMStats() {
    this.loading.set(true);

    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      // Load lead counts
      const leads = await this.leadService.getLeads(trainerId);
      this.totalLeads.set(leads.length);
      this.activeLeads.set(
        leads.filter((l) =>
          ['new', 'contacted', 'qualified', 'consultation'].includes(l.status)
        ).length
      );

      // Load email stats (last 30 days)
      const stats = await this.emailService.getEmailStats(trainerId, 30);
      this.emailStats.set(stats);
    } catch (error) {
      console.error('Error loading CRM stats:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getOpenRateColor(rate: number): string {
    if (rate >= 25) return 'success';
    if (rate >= 15) return 'warning';
    return 'danger';
  }

  getClickRateColor(rate: number): string {
    if (rate >= 3) return 'success';
    if (rate >= 1.5) return 'warning';
    return 'danger';
  }
}
