import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  trendingDownOutline,
  cashOutline,
  peopleOutline,
  statsChartOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

import { SupabaseService } from '../../../../core/services/supabase.service';

interface PaymentMetrics {
  date: string;
  mrrCents: number;
  mrrGrowthCents: number;
  mrrGrowthPercent: number;
  totalActiveSubscriptions: number;
  churnRatePercent: number;
  recoveryRatePercent: number;
  totalRevenueCents: number;
  averageRevenuePerUserCents: number;
}

interface FailedPayment {
  id: string;
  clientName: string;
  amountCents: number;
  attemptCount: number;
  status: string;
  nextPaymentAttempt: string | null;
  failureMessage: string | null;
  createdAt: string;
}

/**
 * PaymentAnalyticsPage - Revenue and payment analytics dashboard
 *
 * Features:
 * - MRR (Monthly Recurring Revenue) tracking
 * - MRR growth trends
 * - Churn rate analysis (voluntary vs involuntary)
 * - Failed payment recovery tracking
 * - Average revenue per user
 * - Active subscription count
 * - Failed payment list with Smart Retry status
 *
 * Sprint 29: Payment Analytics & Recovery
 */
@Component({
  selector: 'app-payment-analytics',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonRefresher,
    IonRefresherContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings" />
        </ion-buttons>
        <ion-title>Payment Analytics</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent" color="primary" />
          <p>Loading analytics...</p>
        </div>
      } @else {
        <!-- Time Period Segment -->
        <ion-segment [(value)]="selectedPeriod" class="ion-padding">
          <ion-segment-button value="7d">
            <ion-label>7 Days</ion-label>
          </ion-segment-button>
          <ion-segment-button value="30d">
            <ion-label>30 Days</ion-label>
          </ion-segment-button>
          <ion-segment-button value="90d">
            <ion-label>90 Days</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div class="ion-padding">
          <!-- Key Metrics Cards -->
          <div class="metrics-grid">
            <!-- MRR Card -->
            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric-header">
                  <ion-icon name="cash-outline" color="success" />
                  <ion-label>MRR</ion-label>
                </div>
                <h1>{{ formatCurrency(currentMetrics().mrrCents) }}</h1>
                <div class="metric-change" [class.positive]="currentMetrics().mrrGrowthCents >= 0" [class.negative]="currentMetrics().mrrGrowthCents < 0">
                  <ion-icon [name]="currentMetrics().mrrGrowthCents >= 0 ? 'trending-up-outline' : 'trending-down-outline'" />
                  <span>{{ formatCurrency(Math.abs(currentMetrics().mrrGrowthCents)) }} ({{ currentMetrics().mrrGrowthPercent.toFixed(1) }}%)</span>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Active Subscriptions Card -->
            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric-header">
                  <ion-icon name="people-outline" color="primary" />
                  <ion-label>Active Clients</ion-label>
                </div>
                <h1>{{ currentMetrics().totalActiveSubscriptions }}</h1>
                <ion-note>Paying subscriptions</ion-note>
              </ion-card-content>
            </ion-card>

            <!-- ARPU Card -->
            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric-header">
                  <ion-icon name="stats-chart-outline" color="tertiary" />
                  <ion-label>ARPU</ion-label>
                </div>
                <h1>{{ formatCurrency(currentMetrics().averageRevenuePerUserCents) }}</h1>
                <ion-note>Average revenue per user</ion-note>
              </ion-card-content>
            </ion-card>

            <!-- Churn Rate Card -->
            <ion-card class="metric-card">
              <ion-card-content>
                <div class="metric-header">
                  <ion-icon name="alert-circle-outline" [color]="getChurnColor(currentMetrics().churnRatePercent)" />
                  <ion-label>Churn Rate</ion-label>
                </div>
                <h1>{{ currentMetrics().churnRatePercent.toFixed(1) }}%</h1>
                <ion-note>{{ getChurnStatus(currentMetrics().churnRatePercent) }}</ion-note>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- Recovery Metrics Card -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <div class="card-title-with-icon">
                  <ion-icon name="checkmark-circle-outline" color="success" />
                  Payment Recovery
                </div>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="recovery-stats">
                <div class="recovery-stat">
                  <ion-label>Recovery Rate</ion-label>
                  <h2>{{ currentMetrics().recoveryRatePercent.toFixed(1) }}%</h2>
                  <ion-note>Industry avg: 57%</ion-note>
                </div>
                <div class="recovery-stat">
                  <ion-label>Smart Retries</ion-label>
                  <h2>
                    <ion-icon name="checkmark-circle-outline" color="success" />
                    Active
                  </h2>
                  <ion-note>ML-optimized timing</ion-note>
                </div>
              </div>

              <ion-note class="ion-margin-top info-note">
                <ion-icon name="alert-circle-outline" />
                Stripe Smart Retries automatically attempts to recover failed payments using machine learning to optimize retry timing.
              </ion-note>
            </ion-card-content>
          </ion-card>

          <!-- Failed Payments Card -->
          @if (failedPayments().length > 0) {
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <div class="card-title-with-icon">
                    <ion-icon name="alert-circle-outline" color="warning" />
                    Active Failed Payments
                  </div>
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="full">
                  @for (payment of failedPayments(); track payment.id) {
                    <ion-item>
                      <div class="failed-payment-item">
                        <div class="payment-info">
                          <h3>{{ payment.clientName }}</h3>
                          <p>{{ formatCurrency(payment.amountCents) }}</p>
                          <ion-note>
                            Attempt {{ payment.attemptCount }}
                            @if (payment.nextPaymentAttempt) {
                              • Next retry: {{ formatDate(payment.nextPaymentAttempt) }}
                            }
                          </ion-note>
                          @if (payment.failureMessage) {
                            <ion-note color="danger" class="failure-message">
                              {{ payment.failureMessage }}
                            </ion-note>
                          }
                        </div>
                        <ion-badge [color]="getPaymentStatusColor(payment.status)">
                          {{ formatStatus(payment.status) }}
                        </ion-badge>
                      </div>
                    </ion-item>
                  }
                </ion-list>
              </ion-card-content>
            </ion-card>
          }

          <!-- Revenue Breakdown Card -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <div class="card-title-with-icon">
                  <ion-icon name="stats-chart-outline" color="primary" />
                  Revenue Overview
                </div>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="revenue-breakdown">
                <div class="revenue-item">
                  <ion-label>Total Revenue</ion-label>
                  <h2>{{ formatCurrency(currentMetrics().totalRevenueCents) }}</h2>
                </div>
                <div class="revenue-item">
                  <ion-label>Monthly Recurring</ion-label>
                  <h2>{{ formatCurrency(currentMetrics().mrrCents) }}</h2>
                </div>
                <div class="revenue-item">
                  <ion-label>Per User</ion-label>
                  <h2>{{ formatCurrency(currentMetrics().averageRevenuePerUserCents) }}</h2>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Info Card -->
          <ion-card class="info-card">
            <ion-card-content>
              <div class="info-section">
                <ion-icon name="alert-circle-outline" color="primary" />
                <div class="info-content">
                  <p><strong>Understanding Your Metrics:</strong></p>
                  <ul>
                    <li><strong>MRR:</strong> Monthly Recurring Revenue from active subscriptions</li>
                    <li><strong>ARPU:</strong> Average Revenue Per User (total MRR / active subs)</li>
                    <li><strong>Churn Rate:</strong> Percentage of subscriptions lost (goal: <5%)</li>
                    <li><strong>Recovery Rate:</strong> Failed payments recovered via Smart Retries</li>
                  </ul>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    :host {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-header {
      ion-toolbar {
        --background: transparent;
        --border-width: 0;
        --color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    ion-card-title {
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      gap: 1rem;

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .metric-card {
      margin: 0;

      ion-card-content {
        padding: 1rem;
      }

      .metric-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;

        ion-icon {
          font-size: 1.25rem;
        }

        ion-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          color: var(--fitos-text-tertiary, #737373);
        }
      }

      h1 {
        margin: 0;
        font-size: 1.75rem;
        font-weight: 600;
        font-family: 'Space Mono', monospace;
        line-height: 1.2;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .metric-change {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-top: 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        font-family: 'Space Mono', monospace;

        &.positive {
          color: var(--ion-color-success);
        }

        &.negative {
          color: var(--ion-color-danger);
        }

        ion-icon {
          font-size: 1rem;
        }
      }

      ion-note {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.75rem;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .card-title-with-icon {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--fitos-text-primary, #F5F5F5);

      ion-icon {
        font-size: 1.5rem;
      }
    }

    .recovery-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;

      .recovery-stat {
        padding: 1rem;
        background: var(--fitos-bg-tertiary, #262626);
        border-radius: 8px;
        text-align: center;

        ion-label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 0.5rem;
        }

        h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;

          ion-icon {
            font-size: 1.75rem;
          }
        }

        ion-note {
          display: block;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          color: var(--fitos-text-tertiary, #737373);
        }
      }
    }

    .info-note {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 6px;
      font-size: 0.875rem;
      color: var(--fitos-text-secondary, #A3A3A3);

      ion-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
        margin-top: 0.125rem;
      }
    }

    .failed-payment-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0;
      gap: 1rem;

      .payment-info {
        flex: 1;

        h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        p {
          margin: 0 0 0.25rem 0;
          font-size: 0.9rem;
          font-weight: 500;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        ion-note {
          display: block;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          color: var(--fitos-text-tertiary, #737373);

          &.failure-message {
            margin-top: 0.5rem;
            font-style: italic;
          }
        }
      }
    }

    .revenue-breakdown {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;

      .revenue-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);

        &:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        ion-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          color: var(--fitos-text-tertiary, #737373);
        }

        h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }
    }

    .info-card {
      --background: var(--fitos-bg-tertiary, #262626);
    }

    .info-section {
      display: flex;
      gap: 1rem;

      ion-icon {
        font-size: 1.5rem;
        margin-top: 0.25rem;
        flex-shrink: 0;
      }

      .info-content {
        flex: 1;

        p {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        ul {
          margin: 0.5rem 0 0 0;
          padding-left: 1.25rem;
          font-size: 0.875rem;
          color: var(--fitos-text-secondary, #A3A3A3);

          li {
            margin-bottom: 0.5rem;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }

    ion-item {
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);
    }

    ion-list {
      background: transparent;
    }
  `],
})
export class PaymentAnalyticsPage implements OnInit {
  private supabase = inject(SupabaseService);

  // State
  loading = signal(true);
  selectedPeriod = signal<'7d' | '30d' | '90d'>('30d');
  metrics = signal<PaymentMetrics[]>([]);
  failedPayments = signal<FailedPayment[]>([]);

  // Computed
  currentMetrics = computed(() => {
    const latest = this.metrics()[0];
    return latest || {
      date: new Date().toISOString(),
      mrrCents: 0,
      mrrGrowthCents: 0,
      mrrGrowthPercent: 0,
      totalActiveSubscriptions: 0,
      churnRatePercent: 0,
      recoveryRatePercent: 0,
      totalRevenueCents: 0,
      averageRevenuePerUserCents: 0,
    };
  });

  constructor() {
    addIcons({
      trendingUpOutline,
      trendingDownOutline,
      cashOutline,
      peopleOutline,
      statsChartOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);

    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Determine date range based on selected period
      const days = this.selectedPeriod() === '7d' ? 7 : this.selectedPeriod() === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Load payment analytics
      const { data: analyticsData, error: analyticsError } = await this.supabase.client
        .from('payment_analytics')
        .select('*')
        .eq('trainer_id', user.id)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });

      if (analyticsError) throw analyticsError;

      this.metrics.set(
        analyticsData?.map(m => ({
          date: m.metric_date,
          mrrCents: m.mrr_cents,
          mrrGrowthCents: m.mrr_growth_cents,
          mrrGrowthPercent: m.mrr_growth_percent,
          totalActiveSubscriptions: m.total_active_subscriptions,
          churnRatePercent: m.churn_rate_percent,
          recoveryRatePercent: m.recovery_rate_percent,
          totalRevenueCents: m.total_revenue_cents,
          averageRevenuePerUserCents: m.average_revenue_per_user_cents,
        })) || []
      );

      // Load active failed payments
      const { data: failuresData, error: failuresError } = await this.supabase.client
        .from('payment_failures')
        .select(`
          id,
          amount_cents,
          attempt_count,
          status,
          next_payment_attempt,
          failure_message,
          created_at,
          profiles!payment_failures_client_id_fkey (
            full_name
          )
        `)
        .eq('trainer_id', user.id)
        .in('status', ['retrying'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (failuresError) throw failuresError;

      this.failedPayments.set(
        failuresData?.map(f => ({
          id: f.id,
          clientName: f.profiles?.full_name || 'Unknown',
          amountCents: f.amount_cents,
          attemptCount: f.attempt_count,
          status: f.status,
          nextPaymentAttempt: f.next_payment_attempt,
          failureMessage: f.failure_message,
          createdAt: f.created_at,
        })) || []
      );
    } catch (error) {
      console.error('Error loading payment analytics:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }

  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getChurnColor(churnRate: number): string {
    if (churnRate < 5) return 'success';
    if (churnRate < 10) return 'warning';
    return 'danger';
  }

  getChurnStatus(churnRate: number): string {
    if (churnRate < 5) return 'Excellent';
    if (churnRate < 10) return 'Good';
    if (churnRate < 15) return 'Needs attention';
    return 'Critical';
  }

  getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'recovered':
        return 'success';
      case 'retrying':
        return 'warning';
      case 'failed':
      case 'abandoned':
        return 'danger';
      default:
        return 'medium';
    }
  }
}
