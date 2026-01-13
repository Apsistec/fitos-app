import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { ClientService } from '../../../../../core/services/client.service';

interface ClientStats {
  id: string;
  full_name: string;
  avatar_url: string | null;
  last_workout_date: string | null;
  workout_count_7d: number;
  nutrition_logs_7d: number;
  adherence_score: number;
}

@Component({
  selector: 'app-active-clients',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <div class="header-row">
          <ion-card-title>Active Clients</ion-card-title>
          <ion-button fill="clear" size="small" routerLink="/clients">
            View All
          </ion-button>
        </div>
      </ion-card-header>
      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="dots"></ion-spinner>
          </div>
        } @else if (clients().length === 0) {
          <div class="empty-state">
            <ion-icon name="people-outline" size="large"></ion-icon>
            <p>No active clients yet</p>
          </div>
        } @else {
          <div class="client-list">
            @for (client of clients(); track client.id) {
              <div class="client-item" (click)="viewClient(client)">
                <ion-avatar slot="start">
                  @if (client.avatar_url) {
                    <img [src]="client.avatar_url" [alt]="client.full_name">
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(client.full_name) }}
                    </div>
                  }
                </ion-avatar>

                <div class="client-info">
                  <div class="client-name">{{ client.full_name }}</div>
                  <div class="client-stats">
                    <span class="stat">
                      <ion-icon name="barbell-outline"></ion-icon>
                      {{ client.workout_count_7d }}
                    </span>
                    <span class="stat">
                      <ion-icon name="nutrition-outline"></ion-icon>
                      {{ client.nutrition_logs_7d }}
                    </span>
                    <span class="stat adherence" [class.good]="client.adherence_score >= 80" [class.warning]="client.adherence_score < 80 && client.adherence_score >= 60">
                      {{ client.adherence_score }}%
                    </span>
                  </div>
                </div>

                <ion-icon name="chevron-forward-outline"></ion-icon>
              </div>
            }
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .loading-state {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;

      ion-icon {
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .client-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .client-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;

      &:active {
        background: var(--ion-color-light-shade);
      }
    }

    ion-avatar {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--fitos-accent-primary, #10B981);
      color: white;
      font-weight: 600;
      font-size: 18px;
    }

    .client-info {
      flex: 1;
      min-width: 0;
    }

    .client-name {
      font-weight: 500;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .client-stats {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 4px;

      ion-icon {
        font-size: 14px;
      }

      &.adherence {
        font-weight: 600;

        &.good {
          color: var(--fitos-accent-primary, #10B981);
        }

        &.warning {
          color: var(--ion-color-warning);
        }
      }
    }
  `]
})
export class ActiveClientsComponent implements OnInit {
  clients = signal<ClientStats[]>([]);
  loading = signal(true);

  constructor(
    private clientService: ClientService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadActiveClients();
  }

  private async loadActiveClients() {
    try {
      const stats = await this.clientService.getClientStats(5);
      this.clients.set(stats);
    } catch (error) {
      console.error('Error loading active clients:', error);
    } finally {
      this.loading.set(false);
    }
  }

  viewClient(client: ClientStats) {
    this.router.navigate(['/clients', client.id]);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
