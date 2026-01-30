import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { people, checkmarkCircle, barbell, cash, trendingUp, trendingDown } from 'ionicons/icons';

export interface TrainerStats {
  totalClients: number;
  activeClients: number;
  workoutsToday: number;
  weeklyRevenue: number;
  clientChange: number; // Percentage change from last period
  revenueChange: number; // Percentage change from last period
}

@Component({
  selector: 'app-trainer-overview-stats',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (stats(); as stats) {
      <div class="stats-grid">
        <ion-card class="stat-card">
          <ion-card-content>
            <div class="stat-icon-container primary">
              <ion-icon name="people"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">Total Clients</div>
              <div class="stat-value">{{ stats.totalClients }}</div>
              @if (stats.clientChange !== 0) {
                <div class="stat-change" [class.positive]="stats.clientChange > 0" [class.negative]="stats.clientChange < 0">
                  <ion-icon [name]="stats.clientChange > 0 ? 'trending-up' : 'trending-down'"></ion-icon>
                  <span>{{ abs(stats.clientChange) }}%</span>
                </div>
              }
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="stat-card">
          <ion-card-content>
            <div class="stat-icon-container success">
              <ion-icon name="checkmark-circle"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">Active Clients</div>
              <div class="stat-value">{{ stats.activeClients }}</div>
              <div class="stat-sublabel">
                {{ getActivePercentage(stats) }}% of total
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="stat-card">
          <ion-card-content>
            <div class="stat-icon-container warning">
              <ion-icon name="barbell"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">Workouts Today</div>
              <div class="stat-value">{{ stats.workoutsToday }}</div>
              <ion-button fill="clear" size="small" routerLink="/tabs/clients" class="view-link">
                View Schedule
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="stat-card">
          <ion-card-content>
            <div class="stat-icon-container tertiary">
              <ion-icon name="cash"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-label">Weekly Revenue</div>
              <div class="stat-value">\${{ formatRevenue(stats.weeklyRevenue) }}</div>
              @if (stats.revenueChange !== 0) {
                <div class="stat-change" [class.positive]="stats.revenueChange > 0" [class.negative]="stats.revenueChange < 0">
                  <ion-icon [name]="stats.revenueChange > 0 ? 'trending-up' : 'trending-down'"></ion-icon>
                  <span>{{ abs(stats.revenueChange) }}%</span>
                </div>
              }
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    }
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }

    .stat-card {
      margin: 0;
      max-width: 400px;
      width: 100%;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;

      ion-card-content {
        display: flex;
        gap: 12px;
        padding: 14px;
      }
    }

    .stat-icon-container {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      ion-icon {
        font-size: 22px;
        color: white;
      }

      &.primary {
        background: var(--ion-color-primary, #10B981);
      }

      &.success {
        background: var(--ion-color-success, #22C55E);
      }

      &.warning {
        background: var(--ion-color-warning, #F59E0B);
      }

      &.tertiary {
        background: var(--ion-color-tertiary, #8B5CF6);
      }
    }

    .stat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .stat-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      line-height: 1;
      font-family: 'Space Mono', monospace;
    }

    .stat-sublabel {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .stat-change {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;

      &.positive {
        color: var(--ion-color-primary, #10B981);
      }

      &.negative {
        color: var(--fitos-text-tertiary, #737373);
      }

      ion-icon {
        font-size: 14px;
      }
    }

    .view-link {
      align-self: flex-start;
      margin: 0;
      --padding-start: 0;
      --padding-end: 0;
      height: auto;
      font-size: 12px;
      --color: var(--ion-color-primary, #10B981);
    }

    @media (max-width: 576px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TrainerOverviewStatsComponent {
  stats = input<TrainerStats>();

  constructor() {
    addIcons({ people, checkmarkCircle, barbell, cash, trendingUp, trendingDown });
  }

  getActivePercentage(stats: TrainerStats): number {
    if (stats.totalClients === 0) return 0;
    return Math.round((stats.activeClients / stats.totalClients) * 100);
  }

  formatRevenue(amount: number): string {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  abs(value: number): number {
    return Math.abs(value);
  }
}
