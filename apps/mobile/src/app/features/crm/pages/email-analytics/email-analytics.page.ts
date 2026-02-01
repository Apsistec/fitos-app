import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonText,
  IonBadge,
  IonSpinner,
  IonChip,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  mailOutline,
  mailOpenOutline,
  linkOutline,
  trendingUpOutline,
  trendingDownOutline,
  analyticsOutline,
  timeOutline,
  peopleOutline,
  sendOutline,
} from 'ionicons/icons';

import { EmailTemplateService, EmailStats } from '../../../../core/services/email-template.service';
import { AuthService } from '../../../../core/services/auth.service';

interface EmailMetric {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  color: string;
}

interface RecentEmail {
  id: string;
  subject: string;
  leadName: string;
  sentAt: string;
  opened: boolean;
  clicked: boolean;
  openedAt?: string;
  clickedAt?: string;
}

@Component({
  selector: 'app-email-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonText,
    IonBadge,
    IonSpinner,
    IonChip,
    IonProgressBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button routerLink="/tabs/crm/pipeline">
            <ion-icon slot="icon-only" name="arrow-back-outline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Email Analytics</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="circular" />
          <p>Loading analytics...</p>
        </div>
      } @else {
        <!-- Time Period Selector -->
        <ion-segment [(ngModel)]="selectedPeriod" (ionChange)="onPeriodChange()">
          <ion-segment-button value="7">
            <ion-label>7 Days</ion-label>
          </ion-segment-button>
          <ion-segment-button value="30">
            <ion-label>30 Days</ion-label>
          </ion-segment-button>
          <ion-segment-button value="90">
            <ion-label>90 Days</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Key Metrics -->
        <div class="metrics-grid">
          @for (metric of metrics(); track metric.label) {
            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric-icon" [style.background-color]="metric.color">
                  <ion-icon [name]="metric.icon" />
                </div>
                <div class="metric-details">
                  <h3>{{ metric.value }}</h3>
                  <p>{{ metric.label }}</p>
                  @if (metric.change !== undefined) {
                    <ion-chip
                      [color]="metric.change >= 0 ? 'success' : 'danger'"
                      size="small"
                    >
                      <ion-icon
                        [name]="
                          metric.change >= 0
                            ? 'trending-up-outline'
                            : 'trending-down-outline'
                        "
                      />
                      {{ metric.change >= 0 ? '+' : '' }}{{ metric.change }}%
                    </ion-chip>
                  }
                </div>
              </ion-card-content>
            </ion-card>
          }
        </div>

        <!-- Engagement Rates -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="analytics-outline" />
              Engagement Rates
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            @if (emailStats()) {
              <!-- Open Rate -->
              <div class="rate-item">
                <div class="rate-header">
                  <span class="rate-label">Open Rate</span>
                  <span class="rate-value">{{ emailStats()!.open_rate.toFixed(1) }}%</span>
                </div>
                <ion-progress-bar
                  [value]="emailStats()!.open_rate / 100"
                  color="primary"
                />
                <p class="rate-description">
                  {{ emailStats()?.total_opened }} of {{ emailStats()?.total_sent }} emails opened
                </p>
              </div>

              <!-- Click Rate -->
              <div class="rate-item">
                <div class="rate-header">
                  <span class="rate-label">Click Rate</span>
                  <span class="rate-value">{{ emailStats()!.click_rate.toFixed(1) }}%</span>
                </div>
                <ion-progress-bar
                  [value]="emailStats()!.click_rate / 100"
                  color="success"
                />
                <p class="rate-description">
                  {{ emailStats()?.total_clicked }} of {{ emailStats()?.total_sent }} emails clicked
                </p>
              </div>

              <!-- Industry Benchmarks -->
              <div class="benchmarks">
                <h4>Industry Benchmarks (Fitness)</h4>
                <div class="benchmark-row">
                  <span>Average Open Rate:</span>
                  <span class="benchmark-value">21.5%</span>
                </div>
                <div class="benchmark-row">
                  <span>Average Click Rate:</span>
                  <span class="benchmark-value">2.8%</span>
                </div>
              </div>
            } @else {
              <div class="empty-state">
                <ion-text color="medium">
                  <p>No email data available for this period</p>
                </ion-text>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Recent Email Activity -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="time-outline" />
              Recent Activity
            </ion-card-title>
            <ion-card-subtitle>Last 10 emails sent</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            @if (recentEmails().length === 0) {
              <div class="empty-state">
                <ion-icon name="mail-outline" />
                <p>No emails sent yet</p>
                <ion-text color="medium">
                  <small>Start sending emails to see activity here</small>
                </ion-text>
              </div>
            } @else {
              <ion-list [inset]="true">
                @for (email of recentEmails(); track email.id) {
                  <ion-item lines="full">
                    <div class="email-activity-item">
                      <div class="email-info">
                        <h3>{{ email.subject }}</h3>
                        <p>
                          To: {{ email.leadName }} •
                          {{ formatDate(email.sentAt) }}
                        </p>
                      </div>
                      <div class="email-status">
                        @if (email.clicked) {
                          <ion-badge color="success">
                            <ion-icon name="link-outline" />
                            Clicked
                          </ion-badge>
                        } @else if (email.opened) {
                          <ion-badge color="primary">
                            <ion-icon name="mail-open-outline" />
                            Opened
                          </ion-badge>
                        } @else {
                          <ion-badge color="medium">
                            <ion-icon name="mail-outline" />
                            Sent
                          </ion-badge>
                        }
                      </div>
                    </div>
                  </ion-item>
                }
              </ion-list>
            }
          </ion-card-content>
        </ion-card>

        <!-- Quick Actions -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Quick Actions</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="action-buttons">
              <ion-button
                expand="block"
                fill="outline"
                routerLink="/tabs/crm/templates"
              >
                <ion-icon slot="start" name="document-text-outline" />
                Manage Templates
              </ion-button>
              <ion-button
                expand="block"
                fill="outline"
                routerLink="/tabs/crm/sequences"
              >
                <ion-icon slot="start" name="send-outline" />
                Email Sequences
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [
    `
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
        margin: 0 0 16px 0;

        ion-card-header {
          ion-card-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 700;
            color: var(--fitos-text-primary, #F5F5F5);

            ion-icon {
              font-size: 20px;
              color: var(--ion-color-primary, #10B981);
            }
          }
        }
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        gap: 16px;

        p {
          color: var(--fitos-text-secondary, #A3A3A3);
          font-size: 13px;
        }
      }

      ion-segment {
        margin-bottom: 16px;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .metric-card {
        margin: 0;

        ion-card-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
        }
      }

      .metric-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 12px;
        flex-shrink: 0;

        ion-icon {
          font-size: 24px;
          color: white;
        }
      }

      .metric-details {
        flex: 1;

        h3 {
          font-size: 24px;
          font-weight: 700;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 4px 0;
        }

        p {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0 0 4px 0;
        }

        ion-chip {
          --padding-start: 6px;
          --padding-end: 6px;
          height: 20px;
          font-size: 11px;

          ion-icon {
            font-size: 14px;
          }
        }
      }

      .rate-item {
        margin-bottom: 20px;

        &:last-child {
          margin-bottom: 16px;
        }
      }

      .rate-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .rate-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        .rate-value {
          font-size: 20px;
          font-weight: 700;
          font-family: 'Space Mono', monospace;
          color: var(--ion-color-primary, #10B981);
        }
      }

      ion-progress-bar {
        height: 8px;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .rate-description {
        font-size: 13px;
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0;
      }

      .benchmarks {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);

        h4 {
          font-size: 11px;
          font-weight: 500;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .benchmark-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        font-size: 13px;
        color: var(--fitos-text-secondary, #A3A3A3);

        .benchmark-value {
          font-weight: 600;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 48px 16px;
        min-height: 200px;

        ion-icon {
          font-size: 48px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 12px;
        }

        p {
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0 0 4px 0;
        }

        small {
          font-size: 13px;
        }
      }

      ion-list {
        background: transparent;
      }

      ion-item {
        --background: transparent;
      }

      .email-activity-item {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 8px 0;

        .email-info {
          flex: 1;
          min-width: 0;

          h3 {
            font-size: 14px;
            font-weight: 500;
            color: var(--fitos-text-primary, #F5F5F5);
            margin: 0 0 4px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          p {
            font-size: 11px;
            color: var(--fitos-text-secondary, #A3A3A3);
            margin: 0;
          }
        }

        .email-status {
          flex-shrink: 0;

          ion-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            padding: 4px 8px;

            ion-icon {
              font-size: 14px;
            }
          }
        }
      }

      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;

        ion-button {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
        }
      }
    `,
  ],
})
export class EmailAnalyticsPage implements OnInit {
  private emailService = inject(EmailTemplateService);
  private auth = inject(AuthService);

  // State
  loading = signal(false);
  selectedPeriod = '30';
  emailStats = signal<EmailStats | null>(null);
  recentEmails = signal<RecentEmail[]>([]);

  // Computed metrics
  metrics = computed<EmailMetric[]>(() => {
    const stats = this.emailStats();
    if (!stats) {
      return [
        {
          label: 'Emails Sent',
          value: 0,
          icon: 'send-outline',
          color: 'var(--ion-color-primary)',
        },
        {
          label: 'Opened',
          value: 0,
          icon: 'mail-open-outline',
          color: 'var(--ion-color-success)',
        },
        {
          label: 'Clicked',
          value: 0,
          icon: 'link-outline',
          color: 'var(--ion-color-tertiary)',
        },
        {
          label: 'Open Rate',
          value: '0%',
          icon: 'analytics-outline',
          color: 'var(--ion-color-warning)',
        },
      ];
    }

    return [
      {
        label: 'Emails Sent',
        value: stats.total_sent,
        icon: 'send-outline',
        color: 'var(--ion-color-primary)',
      },
      {
        label: 'Opened',
        value: stats.total_opened,
        icon: 'mail-open-outline',
        color: 'var(--ion-color-success)',
      },
      {
        label: 'Clicked',
        value: stats.total_clicked,
        icon: 'link-outline',
        color: 'var(--ion-color-tertiary)',
      },
      {
        label: 'Open Rate',
        value: `${stats.open_rate.toFixed(1)}%`,
        change: this.calculateChange(stats.open_rate, 21.5),
        icon: 'analytics-outline',
        color: 'var(--ion-color-warning)',
      },
    ];
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      mailOutline,
      mailOpenOutline,
      linkOutline,
      trendingUpOutline,
      trendingDownOutline,
      analyticsOutline,
      timeOutline,
      peopleOutline,
      sendOutline,
    });
  }

  async ngOnInit() {
    await this.loadAnalytics();
  }

  async loadAnalytics() {
    this.loading.set(true);

    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      const days = parseInt(this.selectedPeriod, 10);

      // Load email stats
      const stats = await this.emailService.getEmailStats(trainerId, days);
      this.emailStats.set(stats);

      // TODO: Load recent emails from database
      // For now, using placeholder data
      this.recentEmails.set([]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async onPeriodChange() {
    await this.loadAnalytics();
  }

  calculateChange(current: number, benchmark: number): number {
    if (benchmark === 0) return 0;
    return Math.round(((current - benchmark) / benchmark) * 100);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}
