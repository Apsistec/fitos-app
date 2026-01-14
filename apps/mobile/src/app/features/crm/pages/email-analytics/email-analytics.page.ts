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
    <ion-header>
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
                  <span class="rate-value">{{ emailStats()?.open_rate.toFixed(1) }}%</span>
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
                  <span class="rate-value">{{ emailStats()?.click_rate.toFixed(1) }}%</span>
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
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        gap: var(--fitos-space-4);

        p {
          color: var(--fitos-text-secondary);
          font-size: var(--fitos-font-size-sm);
        }
      }

      ion-segment {
        margin-bottom: var(--fitos-space-4);
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: var(--fitos-space-3);
        margin-bottom: var(--fitos-space-4);
      }

      .metric-card {
        margin: 0;

        ion-card-content {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-3);
          padding: var(--fitos-space-4);
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
          font-size: var(--fitos-font-size-2xl);
          font-weight: 700;
          color: var(--fitos-text-primary);
          margin: 0 0 var(--fitos-space-1) 0;
        }

        p {
          font-size: var(--fitos-font-size-xs);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-1) 0;
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

      ion-card {
        margin: 0 0 var(--fitos-space-4) 0;

        ion-card-header {
          ion-card-title {
            display: flex;
            align-items: center;
            gap: var(--fitos-space-2);
            font-size: var(--fitos-font-size-lg);

            ion-icon {
              font-size: 20px;
              color: var(--fitos-accent-primary);
            }
          }
        }
      }

      .rate-item {
        margin-bottom: var(--fitos-space-5);

        &:last-child {
          margin-bottom: var(--fitos-space-4);
        }
      }

      .rate-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--fitos-space-2);

        .rate-label {
          font-size: var(--fitos-font-size-base);
          font-weight: 600;
          color: var(--fitos-text-primary);
        }

        .rate-value {
          font-size: var(--fitos-font-size-xl);
          font-weight: 700;
          color: var(--fitos-accent-primary);
        }
      }

      ion-progress-bar {
        height: 8px;
        border-radius: 4px;
        margin-bottom: var(--fitos-space-2);
      }

      .rate-description {
        font-size: var(--fitos-font-size-sm);
        color: var(--fitos-text-secondary);
        margin: 0;
      }

      .benchmarks {
        margin-top: var(--fitos-space-5);
        padding-top: var(--fitos-space-4);
        border-top: 1px solid var(--fitos-border-color);

        h4 {
          font-size: var(--fitos-font-size-sm);
          font-weight: 600;
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-3) 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .benchmark-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--fitos-space-2) 0;
        font-size: var(--fitos-font-size-sm);
        color: var(--fitos-text-secondary);

        .benchmark-value {
          font-weight: 600;
          color: var(--fitos-text-primary);
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--fitos-space-8) var(--fitos-space-4);
        min-height: 200px;

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-3);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-1) 0;
        }

        small {
          font-size: var(--fitos-font-size-sm);
        }
      }

      .email-activity-item {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--fitos-space-3);
        padding: var(--fitos-space-2) 0;

        .email-info {
          flex: 1;
          min-width: 0;

          h3 {
            font-size: var(--fitos-font-size-base);
            font-weight: 500;
            color: var(--fitos-text-primary);
            margin: 0 0 var(--fitos-space-1) 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          p {
            font-size: var(--fitos-font-size-xs);
            color: var(--fitos-text-secondary);
            margin: 0;
          }
        }

        .email-status {
          flex-shrink: 0;

          ion-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: var(--fitos-font-size-xs);
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
        gap: var(--fitos-space-2);
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
