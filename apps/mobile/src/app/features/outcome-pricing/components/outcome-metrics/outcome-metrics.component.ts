import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { OutcomePricingService, TrainerAnalytics } from '../../services/outcome-pricing.service';

/**
 * Outcome Metrics Component
 *
 * Displays key metrics for trainer's outcome-based pricing performance.
 * Can be embedded in dashboards or analytics pages.
 */
@Component({
  selector: 'fit-outcome-metrics',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    @if (isLoading()) {
      <div class="loading-container">
        <ion-spinner></ion-spinner>
      </div>
    } @else if (analytics()) {
      <div class="metrics-grid">
        <!-- Total Clients -->
        <ion-card class="metric-card">
          <ion-card-content>
            <div class="metric-icon" style="background: rgba(16, 185, 129, 0.1)">
              <ion-icon name="people-outline" style="color: var(--fitos-accent-primary, #10B981)"></ion-icon>
            </div>
            <div class="metric-value">{{ analytics()!.total_outcome_clients }}</div>
            <div class="metric-label">Outcome Clients</div>
          </ion-card-content>
        </ion-card>

        <!-- Active Goals -->
        <ion-card class="metric-card">
          <ion-card-content>
            <div class="metric-icon" style="background: rgba(59, 130, 246, 0.1)">
              <ion-icon name="flag-outline" style="color: #3B82F6"></ion-icon>
            </div>
            <div class="metric-value">{{ analytics()!.active_goals }}</div>
            <div class="metric-label">Active Goals</div>
          </ion-card-content>
        </ion-card>

        <!-- Achieved Goals -->
        <ion-card class="metric-card">
          <ion-card-content>
            <div class="metric-icon" style="background: rgba(34, 197, 94, 0.1)">
              <ion-icon name="trophy-outline" style="color: #22C55E"></ion-icon>
            </div>
            <div class="metric-value">{{ analytics()!.achieved_goals }}</div>
            <div class="metric-label">Goals Achieved</div>
          </ion-card-content>
        </ion-card>

        <!-- Completion Rate -->
        <ion-card class="metric-card">
          <ion-card-content>
            <div class="metric-icon" style="background: rgba(139, 92, 246, 0.1)">
              <ion-icon name="stats-chart-outline" style="color: #8B5CF6"></ion-icon>
            </div>
            <div class="metric-value">{{ analytics()!.avg_completion_rate.toFixed(0) }}%</div>
            <div class="metric-label">Avg Progress</div>
          </ion-card-content>
        </ion-card>

        <!-- Bonus Revenue -->
        <ion-card class="metric-card primary">
          <ion-card-content>
            <div class="metric-icon">
              <ion-icon name="cash-outline"></ion-icon>
            </div>
            <div class="metric-value">{{ formatRevenue(analytics()!.total_bonus_revenue_cents) }}</div>
            <div class="metric-label">Bonus Revenue</div>
            <p class="metric-note">From outcome achievements</p>
          </ion-card-content>
        </ion-card>

        <!-- Pending Verifications -->
        <ion-card class="metric-card" [class.warning]="analytics()!.pending_verifications > 0">
          <ion-card-content>
            <div class="metric-icon">
              <ion-icon name="time-outline"></ion-icon>
            </div>
            <div class="metric-value">{{ analytics()!.pending_verifications }}</div>
            <div class="metric-label">Pending Verifications</div>
            @if (analytics()!.pending_verifications > 0) {
              <p class="metric-note">Needs attention</p>
            }
          </ion-card-content>
        </ion-card>
      </div>
    } @else if (error()) {
      <div class="error-container">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <p>{{ error() }}</p>
        <ion-button size="small" (click)="loadAnalytics()">Retry</ion-button>
      </div>
    }
  `,
  styles: [`
    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;
    }

    .error-container ion-icon {
      font-size: 64px;
      color: var(--ion-color-danger);
    }

    .error-container p {
      color: var(--ion-color-medium);
      text-align: center;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      padding: 16px;
    }

    .metric-card {
      margin: 0;
    }

    .metric-card.primary {
      background: linear-gradient(135deg, var(--fitos-accent-primary, #10B981) 0%, #059669 100%);
    }

    .metric-card.primary * {
      color: white !important;
    }

    .metric-card.warning {
      border: 2px solid var(--ion-color-warning);
    }

    ion-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px;
    }

    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }

    .metric-card.primary .metric-icon {
      background: rgba(255, 255, 255, 0.2);
    }

    .metric-icon ion-icon {
      font-size: 24px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 8px;
    }

    .metric-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ion-color-medium);
      font-weight: 600;
    }

    .metric-card.primary .metric-label {
      color: rgba(255, 255, 255, 0.9);
    }

    .metric-note {
      margin: 8px 0 0;
      font-size: 11px;
      color: var(--ion-color-medium);
    }

    .metric-card.primary .metric-note {
      color: rgba(255, 255, 255, 0.8);
    }

    .metric-card.warning .metric-note {
      color: var(--ion-color-warning);
      font-weight: 600;
    }
  `]
})
export class OutcomeMetricsComponent implements OnInit {
  private readonly outcomePricingService = inject(OutcomePricingService);

  analytics = signal<TrainerAnalytics | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.isLoading.set(true);
    this.error.set(null);

    this.outcomePricingService.getTrainerAnalytics().subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load outcome analytics:', err);
        this.error.set('Failed to load analytics');
        this.isLoading.set(false);
      }
    });
  }

  formatRevenue(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
