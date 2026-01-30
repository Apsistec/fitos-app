import {  Component, inject, signal, OnInit , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubbleOutline, personCircleOutline } from 'ionicons/icons';
import { MessagingService, type Conversation } from '@app/core/services/messaging.service';

@Component({
  selector: 'app-conversations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonIcon,
    IonNote,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Messages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="conversations-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner></ion-spinner>
            <p>Loading conversations...</p>
          </div>
        } @else if (conversations().length > 0) {
          <ion-list lines="full">
            @for (conversation of conversations(); track conversation.otherUserId) {
              <ion-item
                button
                [routerLink]="['/tabs/messages/chat', conversation.otherUserId]"
                detail="false"
              >
                <ion-avatar slot="start">
                  @if (conversation.otherUserAvatar) {
                    <img [src]="conversation.otherUserAvatar" [alt]="conversation.otherUserName" />
                  } @else {
                    <ion-icon name="person-circle-outline"></ion-icon>
                  }
                </ion-avatar>

                <ion-label>
                  <h2>{{ conversation.otherUserName }}</h2>
                  @if (conversation.lastMessage) {
                    <p class="last-message">
                      {{ truncate(conversation.lastMessage.content, 50) }}
                    </p>
                  }
                  <ion-note class="message-time">
                    {{ formatTime(conversation.lastMessage?.created_at) }}
                  </ion-note>
                </ion-label>

                @if (conversation.unreadCount > 0) {
                  <ion-badge slot="end" color="primary">
                    {{ conversation.unreadCount }}
                  </ion-badge>
                }
              </ion-item>
            }
          </ion-list>
        } @else {
          <div class="empty-state">
            <ion-icon name="chatbubble-outline"></ion-icon>
            <h3>No Messages Yet</h3>
            <p>Start a conversation with your trainer or clients.</p>
          </div>
        }

        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
          </ion-note>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .conversations-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      text-align: center;

      ion-icon {
        font-size: 64px;
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }

      ion-spinner {
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px;
        font-weight: 600;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    ion-item {
      --padding-start: 16px;

      ion-avatar {
        width: 48px;
        height: 48px;

        ion-icon {
          font-size: 48px;
          color: var(--ion-color-medium);
        }
      }

      h2 {
        font-weight: 600;
        margin: 0 0 4px;
      }

      .last-message {
        color: var(--ion-color-medium);
        font-size: 0.875rem;
        margin: 0 0 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .message-time {
        font-size: 0.75rem;
      }
    }

    .error-message {
      display: block;
      padding: 16px;
      margin: 16px;
      text-align: center;
    }
  `],
})
export class ConversationsPage implements OnInit {
  private messagingService = inject(MessagingService);

  conversations = this.messagingService.conversationsSignal;
  loading = this.messagingService.isLoadingSignal;
  errorMessage = this.messagingService.errorSignal;

  constructor() {
    addIcons({
      chatbubbleOutline,
      personCircleOutline,
    });
  }

  ngOnInit(): void {
    this.loadConversations();
  }

  async loadConversations(): Promise<void> {
    await this.messagingService.loadConversations();
  }

  truncate(text: string | null | undefined, length: number): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadConversations();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
