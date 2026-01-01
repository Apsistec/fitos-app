import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';

export interface ActivityItem {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  type: 'workout_completed' | 'progress_photo' | 'checkin' | 'milestone' | 'payment';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Component({
  selector: 'app-trainer-activity-feed',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  template: `
    <ion-card>
      <ion-card-header>
        <div class="header-content">
          <ion-card-title>Recent Activity</ion-card-title>
          <ion-button fill="clear" size="small" routerLink="/tabs/clients">
            View All
          </ion-button>
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (activities() && activities()!.length > 0) {
          <ion-list lines="full" class="activity-list">
            @for (activity of activities(); track activity.id) {
              <ion-item
                button
                [routerLink]="['/tabs/clients', activity.clientId]"
                class="activity-item"
              >
                <div slot="start" class="activity-avatar">
                  @if (activity.clientAvatar) {
                    <img [src]="activity.clientAvatar" [alt]="activity.clientName" />
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(activity.clientName) }}
                    </div>
                  }
                  <div class="activity-badge" [class]="'type-' + activity.type">
                    <ion-icon [name]="getActivityIcon(activity.type)"></ion-icon>
                  </div>
                </div>

                <ion-label>
                  <h3>{{ activity.clientName }}</h3>
                  <p>{{ activity.message }}</p>
                  <ion-note>{{ getRelativeTime(activity.timestamp) }}</ion-note>
                </ion-label>

                @if (activity.metadata && activity.metadata['value']) {
                  <div slot="end" class="activity-value">
                    {{ activity.metadata!['value'] }}
                  </div>
                }
              </ion-item>
            }
          </ion-list>
        } @else {
          <div class="empty-state">
            <ion-icon name="newspaper-outline" class="empty-icon"></ion-icon>
            <h3>No Recent Activity</h3>
            <p>Client activities will appear here.</p>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .activity-list {
      margin: 0 -1rem;
    }

    .activity-item {
      --padding-start: 1rem;
      --padding-end: 1rem;
    }

    .activity-avatar {
      width: 40px;
      height: 40px;
      position: relative;
      margin-right: 1rem;

      img,
      .avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }

      .avatar-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ion-color-primary);
        color: white;
        font-weight: 600;
        font-size: 0.85rem;
      }
    }

    .activity-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--ion-card-background, white);

      ion-icon {
        font-size: 12px;
        color: white;
      }

      &.type-workout_completed {
        background: var(--ion-color-success);
      }

      &.type-progress_photo {
        background: var(--ion-color-tertiary);
      }

      &.type-checkin {
        background: var(--ion-color-primary);
      }

      &.type-milestone {
        background: var(--ion-color-warning);
      }

      &.type-payment {
        background: var(--ion-color-secondary);
      }
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

    .activity-value {
      font-weight: 600;
      color: var(--ion-color-primary);
      font-size: 0.9rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;

      .empty-icon {
        font-size: 4rem;
        color: var(--ion-color-medium);
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
export class TrainerActivityFeedComponent {
  activities = input<ActivityItem[]>();

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'workout_completed':
        return 'checkmark';
      case 'progress_photo':
        return 'camera';
      case 'checkin':
        return 'chatbubble';
      case 'milestone':
        return 'trophy';
      case 'payment':
        return 'card';
      default:
        return 'ellipse';
    }
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }
}
