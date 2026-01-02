import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';

export interface ClientAlert {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  type: 'missed_workout' | 'low_adherence' | 'no_checkin' | 'overdue_payment';
  message: string;
  daysAgo: number;
  severity: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-trainer-needs-attention',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  template: `
    <ion-card class="attention-card">
      <ion-card-header>
        <ion-card-title>Needs Attention</ion-card-title>
      </ion-card-header>

      <ion-card-content>
        @if (alerts() && alerts()!.length > 0) {
          <ion-list lines="full" class="alerts-list">
            @for (alert of alerts(); track alert.id) {
              <ion-item
                button
                [routerLink]="['/tabs/clients', alert.clientId]"
                [detail]="true"
                class="alert-item"
                [class.severity-low]="alert.severity === 'low'"
                [class.severity-medium]="alert.severity === 'medium'"
                [class.severity-high]="alert.severity === 'high'"
              >
                <ion-avatar slot="start">
                  @if (alert.clientAvatar) {
                    <img [src]="alert.clientAvatar" [alt]="alert.clientName" />
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(alert.clientName) }}
                    </div>
                  }
                </ion-avatar>

                <ion-label>
                  <h3>{{ alert.clientName }}</h3>
                  <p>{{ alert.message }}</p>
                  <ion-note>{{ alert.daysAgo }} days ago</ion-note>
                </ion-label>

                <ion-badge slot="end" [color]="getSeverityColor(alert.severity)">
                  <ion-icon [name]="getAlertIcon(alert.type)"></ion-icon>
                </ion-badge>
              </ion-item>
            }
          </ion-list>

          @if (alerts()!.length > 3) {
            <ion-button expand="block" fill="clear" routerLink="/tabs/clients" class="view-all-button">
              View All Alerts
            </ion-button>
          }
        } @else {
          <div class="empty-state">
            <ion-icon name="checkmark-circle-outline" class="empty-icon"></ion-icon>
            <h3>All Clear!</h3>
            <p>No clients need immediate attention.</p>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .attention-card {
      margin: 0;
      max-width: 800px;
      width: 100%;
    }

    .alerts-list {
      margin: 0 -1rem;
    }

    .alert-item {
      --padding-start: 1rem;
      --padding-end: 1rem;
      --inner-padding-end: 0.5rem;

      &.severity-high {
        --background: rgba(var(--ion-color-danger-rgb), 0.05);
        border-left: 3px solid var(--ion-color-danger);
      }

      &.severity-medium {
        --background: rgba(var(--ion-color-warning-rgb), 0.05);
        border-left: 3px solid var(--ion-color-warning);
      }

      &.severity-low {
        border-left: 3px solid var(--ion-color-medium);
      }
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-primary);
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }

    ion-label {
      h3 {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      p {
        color: var(--ion-color-medium);
        font-size: 0.85rem;
        white-space: normal;
        margin-bottom: 0.25rem;
      }

      ion-note {
        font-size: 0.75rem;
      }
    }

    ion-badge {
      ion-icon {
        font-size: 1rem;
      }
    }

    .view-all-button {
      margin-top: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;

      .empty-icon {
        font-size: 4rem;
        color: var(--ion-color-success);
        margin-bottom: 1rem;
      }

      h3 {
        margin: 0 0 0.5rem 0;
        color: var(--ion-color-dark);
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }
  `],
})
export class TrainerNeedsAttentionComponent {
  alerts = input<ClientAlert[]>();

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      default:
        return 'medium';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'missed_workout':
        return 'fitness-outline';
      case 'low_adherence':
        return 'trending-down-outline';
      case 'no_checkin':
        return 'chatbubble-outline';
      case 'overdue_payment':
        return 'card-outline';
      default:
        return 'alert-circle-outline';
    }
  }
}
