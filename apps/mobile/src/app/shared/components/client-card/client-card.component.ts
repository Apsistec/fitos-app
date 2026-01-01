import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonButton,
  IonIcon,
  IonAvatar,
  IonLabel,
  IonItem
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  chatboxOutline,
  ellipsisVerticalOutline,
  checkmarkCircle,
  warningOutline,
  timeOutline
} from 'ionicons/icons';
import { ClientWithProfile } from '../../../core/services/client.service';

addIcons({
  personOutline,
  chatboxOutline,
  ellipsisVerticalOutline,
  checkmarkCircle,
  warningOutline,
  timeOutline
});

@Component({
  selector: 'app-client-card',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonAvatar,
    IonLabel,
    IonItem
  ],
  template: `
    <ion-card button (click)="onCardClick()">
      <ion-card-header>
        <div class="card-header-content">
          <div class="client-info">
            <ion-avatar class="client-avatar">
              @if (client().profile?.avatar_url) {
                <img [src]="client().profile.avatar_url" [alt]="client().profile?.full_name || 'Client'" />
              } @else {
                <ion-icon name="person-outline"></ion-icon>
              }
            </ion-avatar>
            <div class="client-details">
              <ion-card-title>{{ client().profile?.full_name || 'Unknown' }}</ion-card-title>
              <ion-card-subtitle>{{ client().profile?.email }}</ion-card-subtitle>
            </div>
          </div>
          <ion-button fill="clear" (click)="onMenuClick($event)">
            <ion-icon slot="icon-only" name="ellipsis-vertical-outline"></ion-icon>
          </ion-button>
        </div>
      </ion-card-header>

      <ion-card-content>
        <div class="card-content-wrapper">
          <!-- Subscription Status Badge -->
          <div class="status-section">
            <ion-badge [color]="getSubscriptionStatusColor(client().subscription_status)">
              <ion-icon
                [name]="getSubscriptionStatusIcon(client().subscription_status)"
                class="badge-icon"
              ></ion-icon>
              {{ formatSubscriptionStatus(client().subscription_status) }}
            </ion-badge>
          </div>

          <!-- Quick Stats -->
          <div class="stats-section">
            @if (showStats()) {
              <div class="stat-item">
                <ion-label>
                  <p class="stat-label">Last Activity</p>
                  <h3 class="stat-value">{{ getLastActivityText() }}</h3>
                </ion-label>
              </div>
            }
          </div>

          <!-- Quick Actions -->
          <div class="actions-section">
            <ion-button fill="outline" size="small" (click)="onMessageClick($event)">
              <ion-icon slot="start" name="chatbox-outline"></ion-icon>
              Message
            </ion-button>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .card-header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .client-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .client-avatar {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-light);
    }

    .client-avatar ion-icon {
      font-size: 24px;
      color: var(--ion-color-medium);
    }

    .client-details {
      flex: 1;
      min-width: 0;
    }

    ion-card-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    ion-card-subtitle {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-content-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .status-section {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .badge-icon {
      font-size: 0.875rem;
      margin-right: 0.25rem;
    }

    .stats-section {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .stat-item {
      flex: 1;
      min-width: 150px;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      margin: 0 0 0.25rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 0.875rem;
      font-weight: 500;
      margin: 0;
      color: var(--ion-color-dark);
    }

    .actions-section {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    ion-card {
      margin: 0.5rem 0;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    ion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class ClientCardComponent {
  client = input.required<ClientWithProfile>();
  showStats = input<boolean>(true);

  // Events
  cardClick = output<ClientWithProfile>();
  messageClick = output<ClientWithProfile>();
  menuClick = output<{ event: Event; client: ClientWithProfile }>();

  onCardClick() {
    this.cardClick.emit(this.client());
  }

  onMessageClick(event: Event) {
    event.stopPropagation();
    this.messageClick.emit(this.client());
  }

  onMenuClick(event: Event) {
    event.stopPropagation();
    this.menuClick.emit({ event, client: this.client() });
  }

  getSubscriptionStatusColor(status: string | null): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'past_due':
        return 'warning';
      case 'canceled':
      case 'unpaid':
        return 'danger';
      case 'trialing':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  getSubscriptionStatusIcon(status: string | null): string {
    switch (status) {
      case 'active':
        return 'checkmark-circle';
      case 'past_due':
      case 'unpaid':
        return 'warning-outline';
      case 'trialing':
        return 'time-outline';
      default:
        return 'time-outline';
    }
  }

  formatSubscriptionStatus(status: string | null): string {
    if (!status) return 'Inactive';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getLastActivityText(): string {
    // TODO: Calculate from actual workout data
    // For now, return placeholder
    const client = this.client();
    if (client.updated_at) {
      const updatedDate = new Date(client.updated_at);
      const now = new Date();
      const diffMs = now.getTime() - updatedDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    }
    return 'No activity';
  }
}
