import { Component, input, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;

      ion-card-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .alerts-list {
      margin: 0 -16px;
      background: transparent;
    }

    .alert-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --inner-padding-end: 8px;
      --background: transparent;
      --border-color: rgba(255, 255, 255, 0.06);

      &.severity-high {
        --background: rgba(239, 68, 68, 0.06);
        border-left: 3px solid #EF4444;
      }

      &.severity-medium {
        --background: rgba(245, 158, 11, 0.06);
        border-left: 3px solid #F59E0B;
      }

      &.severity-low {
        border-left: 3px solid var(--fitos-text-tertiary, #737373);
      }
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-primary, #10B981);
      color: white;
      font-weight: 600;
      font-size: 14px;
      border-radius: 50%;
    }

    ion-label {
      h3 {
        font-weight: 600;
        font-size: 14px;
        color: var(--fitos-text-primary, #F5F5F5);
        margin-bottom: 4px;
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 13px;
        white-space: normal;
        margin-bottom: 4px;
      }

      ion-note {
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    ion-badge {
      ion-icon {
        font-size: 14px;
      }
    }

    .view-all-button {
      margin-top: 8px;
      --color: var(--ion-color-primary, #10B981);
      font-size: 14px;
      font-weight: 600;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;

      .empty-icon {
        font-size: 48px;
        color: var(--ion-color-primary, #10B981);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 14px;
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
