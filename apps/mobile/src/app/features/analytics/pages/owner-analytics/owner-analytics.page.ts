import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonIcon,
  IonBadge,
  IonNote,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  peopleOutline,
  trendingUpOutline,
  trendingDownOutline,
  statsChartOutline,
  warningOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

import {
  TrainerPerformanceService,
  TrainerMetrics,
  FacilityMetrics,
} from '../../../../core/services/trainer-performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { FormsModule } from '@angular/forms';

/**
 * OwnerAnalyticsPage - Facility-wide business analytics
 *
 * Features:
 * - Total revenue and growth metrics
 * - Revenue per trainer breakdown
 * - Client counts and distribution
 * - Retention and churn rates
 * - LTV:CAC ratio
 * - Trainer performance rankings
 * - Health indicators vs benchmarks
 *
 * Sprint 25: Gym Owner Business Analytics
 */
@Component({
  selector: 'app-owner-analytics',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonIcon,
    IonBadge,
    IonNote,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Business Analytics</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedPeriod" (ionChange)="onPeriodChange()">
          <ion-segment-button value="month">
            <ion-label>This Month</ion-label>
          </ion-segment-button>
          <ion-segment-button value="quarter">
            <ion-label>Quarter</ion-label>
          </ion-segment-button>
          <ion-segment-button value="year">
            <ion-label>Year</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="analytics-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" />
            <p>Loading analytics...</p>
          </div>
        } @else if (facilityMetrics()) {
          <!-- Key Metrics Summary -->
          <div class="metrics-grid">
            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric">
                  <ion-icon name="cash-outline" color="success" />
                  <div class="metric-content">
                    <span class="metric-label">Total Revenue</span>
                    <span class="metric-value">
                      {{ service.formatCurrency(facilityMetrics()!.total_revenue_month) }}
                    </span>
                    <span class="metric-sublabel">This period</span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric">
                  <ion-icon name="people-outline" color="primary" />
                  <div class="metric-content">
                    <span class="metric-label">Active Clients</span>
                    <span class="metric-value">{{ facilityMetrics()!.active_clients }}</span>
                    <span class="metric-sublabel">
                      {{ facilityMetrics()!.total_trainers }} trainers
                    </span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric">
                  <ion-icon
                    name="stats-chart-outline"
                    [color]="facilityMetrics()!.meets_retention_goal ? 'success' : 'warning'"
                  />
                  <div class="metric-content">
                    <span class="metric-label">Retention Rate</span>
                    <span class="metric-value">
                      {{ service.formatPercentage(facilityMetrics()!.avg_retention_rate) }}
                    </span>
                    <span class="metric-sublabel">
                      Target: {{ service.formatPercentage(facilityMetrics()!.retention_benchmark) }}
                    </span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric">
                  <ion-icon
                    name="trending-up-outline"
                    [color]="facilityMetrics()!.ltv_cac_ratio >= 3 ? 'success' : 'warning'"
                  />
                  <div class="metric-content">
                    <span class="metric-label">LTV:CAC Ratio</span>
                    <span class="metric-value">
                      {{ facilityMetrics()!.ltv_cac_ratio.toFixed(1) }}:1
                    </span>
                    <span class="metric-sublabel">Target: 3:1</span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- Health Indicators -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Business Health</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="health-indicators">
                <div class="indicator">
                  <ion-icon
                    [name]="facilityMetrics()!.meets_retention_goal ? 'checkmark-circle-outline' : 'warning-outline'"
                    [color]="facilityMetrics()!.meets_retention_goal ? 'success' : 'warning'"
                  />
                  <span>Retention Goal (66-71%)</span>
                  <ion-badge [color]="facilityMetrics()!.meets_retention_goal ? 'success' : 'warning'">
                    {{ service.formatPercentage(facilityMetrics()!.avg_retention_rate) }}
                  </ion-badge>
                </div>

                <div class="indicator">
                  <ion-icon
                    [name]="facilityMetrics()!.meets_churn_goal ? 'checkmark-circle-outline' : 'warning-outline'"
                    [color]="facilityMetrics()!.meets_churn_goal ? 'success' : 'warning'"
                  />
                  <span>Churn Rate (3-5% target)</span>
                  <ion-badge [color]="facilityMetrics()!.meets_churn_goal ? 'success' : 'warning'">
                    {{ service.formatPercentage(facilityMetrics()!.avg_churn_rate) }}
                  </ion-badge>
                </div>

                <div class="indicator">
                  <ion-icon
                    [name]="facilityMetrics()!.ltv_cac_ratio >= 3 ? 'checkmark-circle-outline' : 'warning-outline'"
                    [color]="facilityMetrics()!.ltv_cac_ratio >= 3 ? 'success' : 'warning'"
                  />
                  <span>LTV:CAC (3:1 target)</span>
                  <ion-badge [color]="facilityMetrics()!.ltv_cac_ratio >= 3 ? 'success' : 'warning'">
                    {{ facilityMetrics()!.ltv_cac_ratio.toFixed(1) }}:1
                  </ion-badge>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Revenue by Trainer -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Revenue by Trainer</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                @for (trainer of revenueByTrainer(); track trainer.trainer_id) {
                  <ion-item>
                    <div class="trainer-revenue-item">
                      <div class="trainer-info">
                        <span class="trainer-name">{{ trainer.trainer_name }}</span>
                        <span class="trainer-clients">{{ trainer.client_count }} clients</span>
                      </div>
                      <div class="trainer-revenue">
                        <span class="revenue-amount">
                          {{ service.formatCurrency(trainer.revenue) }}
                        </span>
                        <span class="revenue-per-client">
                          {{ service.formatCurrency(trainer.avg_per_client) }}/client
                        </span>
                      </div>
                    </div>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Trainer Performance Rankings -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Top Performers</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="rankings">
                <div class="ranking-category">
                  <h4>Revenue</h4>
                  @for (trainer of service.topRevenueTrainers(); track trainer.trainer_id; let i = $index) {
                    <div class="ranking-item">
                      <span class="rank">#{{ i + 1 }}</span>
                      <span class="name">{{ trainer.trainer_name }}</span>
                      <span class="value">
                        {{ service.formatCurrency(trainer.total_revenue_month) }}
                      </span>
                    </div>
                  }
                </div>

                <div class="ranking-category">
                  <h4>Retention</h4>
                  @for (trainer of service.topRetentionTrainers(); track trainer.trainer_id; let i = $index) {
                    <div class="ranking-item">
                      <span class="rank">#{{ i + 1 }}</span>
                      <span class="name">{{ trainer.trainer_name }}</span>
                      <span class="value">
                        {{ service.formatPercentage(trainer.retention_rate) }}
                      </span>
                    </div>
                  }
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Trainers Needing Attention -->
          @if (service.needsAttention().length > 0) {
            <ion-card class="alert-card">
              <ion-card-header>
                <div class="alert-header">
                  <ion-icon name="warning-outline" color="warning" />
                  <ion-card-title>Needs Attention</ion-card-title>
                </div>
              </ion-card-header>
              <ion-card-content>
                <ion-list>
                  @for (trainer of service.needsAttention(); track trainer.trainer_id) {
                    <ion-item>
                      <div class="attention-item">
                        <span class="trainer-name">{{ trainer.trainer_name }}</span>
                        <div class="issues">
                          @if (trainer.churn_rate > 0.05) {
                            <ion-badge color="danger">
                              High churn: {{ service.formatPercentage(trainer.churn_rate) }}
                            </ion-badge>
                          }
                          @if (trainer.retention_rate < 0.66) {
                            <ion-badge color="warning">
                              Low retention: {{ service.formatPercentage(trainer.retention_rate) }}
                            </ion-badge>
                          }
                          @if (trainer.completion_rate < 0.70) {
                            <ion-badge color="warning">
                              Low completion: {{ service.formatPercentage(trainer.completion_rate) }}
                            </ion-badge>
                          }
                        </div>
                      </div>
                    </ion-item>
                  }
                </ion-list>
              </ion-card-content>
            </ion-card>
          }
        } @else {
          <div class="empty-state">
            <ion-icon name="stats-chart-outline" />
            <p>No analytics data available</p>
            <ion-note>Add trainers to your facility to see analytics.</ion-note>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .analytics-container {
        padding: var(--fitos-space-4);
        max-width: 1200px;
        margin: 0 auto;
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        text-align: center;

        ion-spinner {
          margin-bottom: var(--fitos-space-2);
        }

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-2);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-1) 0;
        }
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--fitos-space-3);
        margin-bottom: var(--fitos-space-4);
      }

      .metric-card {
        margin: 0;

        .metric {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-3);

          > ion-icon {
            font-size: 40px;
          }

          .metric-content {
            flex: 1;
            display: flex;
            flex-direction: column;

            .metric-label {
              font-size: var(--fitos-font-size-sm);
              color: var(--fitos-text-tertiary);
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .metric-value {
              font-size: var(--fitos-font-size-2xl);
              font-weight: 700;
              color: var(--fitos-text-primary);
              line-height: 1.2;
              margin: 4px 0;
            }

            .metric-sublabel {
              font-size: var(--fitos-font-size-xs);
              color: var(--fitos-text-secondary);
            }
          }
        }
      }

      .health-indicators {
        display: flex;
        flex-direction: column;
        gap: var(--fitos-space-3);

        .indicator {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          padding: var(--fitos-space-2);
          background: var(--fitos-bg-secondary);
          border-radius: var(--fitos-border-radius);

          ion-icon {
            font-size: 24px;
          }

          span {
            flex: 1;
            font-size: var(--fitos-font-size-base);
            color: var(--fitos-text-secondary);
          }

          ion-badge {
            font-size: var(--fitos-font-size-sm);
            padding: 6px 12px;
          }
        }
      }

      .trainer-revenue-item {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--fitos-space-2) 0;

        .trainer-info {
          display: flex;
          flex-direction: column;

          .trainer-name {
            font-size: var(--fitos-font-size-base);
            font-weight: 600;
            color: var(--fitos-text-primary);
          }

          .trainer-clients {
            font-size: var(--fitos-font-size-sm);
            color: var(--fitos-text-tertiary);
          }
        }

        .trainer-revenue {
          display: flex;
          flex-direction: column;
          align-items: flex-end;

          .revenue-amount {
            font-size: var(--fitos-font-size-lg);
            font-weight: 700;
            color: var(--fitos-text-primary);
          }

          .revenue-per-client {
            font-size: var(--fitos-font-size-xs);
            color: var(--fitos-text-tertiary);
          }
        }
      }

      .rankings {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--fitos-space-4);

        .ranking-category {
          h4 {
            font-size: var(--fitos-font-size-base);
            font-weight: 600;
            color: var(--fitos-text-primary);
            margin: 0 0 var(--fitos-space-2) 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .ranking-item {
            display: flex;
            align-items: center;
            gap: var(--fitos-space-2);
            padding: var(--fitos-space-2);
            background: var(--fitos-bg-secondary);
            border-radius: var(--fitos-border-radius);
            margin-bottom: var(--fitos-space-1);

            .rank {
              font-size: var(--fitos-font-size-sm);
              font-weight: 700;
              color: var(--fitos-accent-primary);
              min-width: 30px;
            }

            .name {
              flex: 1;
              font-size: var(--fitos-font-size-sm);
              color: var(--fitos-text-secondary);
            }

            .value {
              font-size: var(--fitos-font-size-sm);
              font-weight: 600;
              color: var(--fitos-text-primary);
            }
          }
        }
      }

      .alert-card {
        border-left: 4px solid var(--ion-color-warning);

        .alert-header {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);

          ion-icon {
            font-size: 24px;
          }
        }

        .attention-item {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--fitos-space-2);
          padding: var(--fitos-space-2) 0;

          .trainer-name {
            font-size: var(--fitos-font-size-base);
            font-weight: 600;
            color: var(--fitos-text-primary);
          }

          .issues {
            display: flex;
            flex-wrap: wrap;
            gap: var(--fitos-space-1);

            ion-badge {
              font-size: var(--fitos-font-size-xs);
            }
          }
        }
      }

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 0;
      }
    `,
  ],
})
export class OwnerAnalyticsPage implements OnInit {
  service = inject(TrainerPerformanceService);
  private authService = inject(AuthService);

  // State
  selectedPeriod = signal<'month' | 'quarter' | 'year'>('month');
  loading = signal(false);
  facilityMetrics = this.service.facilityMetrics;
  revenueByTrainer = signal(this.service.getRevenueByTrainer());

  constructor() {
    addIcons({
      cashOutline,
      peopleOutline,
      trendingUpOutline,
      trendingDownOutline,
      statsChartOutline,
      warningOutline,
      checkmarkCircleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    const user = this.authService.user();
    if (!user || user.role !== 'gym_owner') {
      console.error('Only gym owners can view this page');
      return;
    }

    this.loading.set(true);

    try {
      const { startDate, endDate } = this.getDateRange();

      // Load trainer metrics and facility metrics
      await this.service.getTrainerMetrics(user.id, startDate, endDate);
      await this.service.getFacilityMetrics(user.id, startDate, endDate);

      // Update revenue breakdown
      this.revenueByTrainer.set(this.service.getRevenueByTrainer());
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      this.loading.set(false);
    }
  }

  onPeriodChange(): void {
    this.loadAnalytics();
  }

  async handleRefresh(event: any): Promise<void> {
    await this.loadAnalytics();
    event.target.complete();
  }

  private getDateRange(): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate: string;

    switch (this.selectedPeriod()) {
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
        break;
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        startDate = quarterStart.toISOString().split('T')[0];
        break;
      }
      case 'year':
        startDate = `${now.getFullYear()}-01-01`;
        break;
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  }
}
