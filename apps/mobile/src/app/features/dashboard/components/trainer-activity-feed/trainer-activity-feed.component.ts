import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { newspaperOutline, checkmark, camera, chatbubble, trophy, card, ellipse } from 'ionicons/icons';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="activity-feed-card">
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
    .activity-feed-card {
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

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      ion-button {
        --color: var(--ion-color-primary, #10B981);
        font-size: 13px;
        font-weight: 600;
      }
    }

    .activity-list {
      margin: 0 -16px;
      background: transparent;
    }

    .activity-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --background: transparent;
      --border-color: rgba(255, 255, 255, 0.06);
    }

    .activity-avatar {
      width: 40px;
      height: 40px;
      position: relative;
      margin-right: 12px;

      img,
      .avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }

      img {
        object-fit: cover;
      }

      .avatar-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ion-color-primary, #10B981);
        color: white;
        font-weight: 600;
        font-size: 14px;
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
      border: 2px solid var(--fitos-bg-secondary, #1A1A1A);

      ion-icon {
        font-size: 10px;
        color: white;
      }

      &.type-workout_completed {
        background: var(--ion-color-primary, #10B981);
      }

      &.type-progress_photo {
        background: var(--ion-color-tertiary, #8B5CF6);
      }

      &.type-checkin {
        background: #3B82F6;
      }

      &.type-milestone {
        background: #F59E0B;
      }

      &.type-payment {
        background: #EC4899;
      }
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

    .activity-value {
      font-weight: 700;
      color: var(--ion-color-primary, #10B981);
      font-size: 14px;
      font-family: 'Space Mono', monospace;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;

      .empty-icon {
        font-size: 48px;
        color: var(--fitos-text-tertiary, #737373);
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
export class TrainerActivityFeedComponent {
  activities = input<ActivityItem[]>();

  constructor() {
    addIcons({ newspaperOutline, checkmark, camera, chatbubble, trophy, card, ellipse });
  }

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
