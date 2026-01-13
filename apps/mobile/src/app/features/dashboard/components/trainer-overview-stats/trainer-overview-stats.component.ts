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
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      margin: 0;
      max-width: 400px;
      width: 100%;

      ion-card-content {
        display: flex;
        gap: 1rem;
        padding: 1rem;
      }
    }

    .stat-icon-container {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      ion-icon {
        font-size: 24px;
        color: white;
      }

      &.primary {
        background: var(--ion-color-primary);
      }

      &.success {
        background: var(--ion-color-success);
      }

      &.warning {
        background: var(--ion-color-warning);
      }

      &.tertiary {
        background: var(--ion-color-tertiary);
      }
    }

    .stat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ion-color-dark);
      line-height: 1;
    }

    .stat-sublabel {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }

    .stat-change {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;

      &.positive {
        color: var(--ion-color-success);
      }

      &.negative {
        color: var(--ion-color-medium); // Neutral color, not red
      }

      ion-icon {
        font-size: 1rem;
      }
    }

    .view-link {
      align-self: flex-start;
      margin: 0;
      --padding-start: 0;
      --padding-end: 0;
      height: auto;
      font-size: 0.75rem;
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
