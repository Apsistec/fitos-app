import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
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
  IonSegment,
  IonSegmentButton,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleOutline,
  personCircleOutline,
  chatbubblesOutline,
  peopleOutline,
  addOutline,
} from 'ionicons/icons';
import { MessagingService, type Conversation, type TeamContact } from '../../../../core/services/messaging.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * ConversationsPage — Sprint 62 (EP-07 US-074)
 *
 * For trainers, gym owners, and admin assistants the header shows a
 * Clients | Team segment. Clients see the single list (no segment).
 *
 * Clients tab  → conversation_type = 'client_coaching'
 * Team tab     → conversation_type = 'team', plus a contact directory
 *                for staff who don't have an existing conversation yet.
 */
@Component({
  selector: 'app-conversations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
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
    IonSegment,
    IonSegmentButton,
    IonButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Messages</ion-title>
      </ion-toolbar>

      <!-- ── Clients / Team segment (trainers, owners, AAs) ── -->
      @if (isStaff()) {
        <ion-toolbar class="segment-toolbar">
          <ion-segment [value]="activeTab()" (ionChange)="onTabChange($event)">
            <ion-segment-button value="clients">
              <ion-icon name="chatbubbles-outline"></ion-icon>
              Clients
              @if (clientUnread() > 0) {
                <ion-badge color="danger">{{ clientUnread() }}</ion-badge>
              }
            </ion-segment-button>
            <ion-segment-button value="team">
              <ion-icon name="people-outline"></ion-icon>
              Team
              @if (teamUnread() > 0) {
                <ion-badge color="danger">{{ teamUnread() }}</ion-badge>
              }
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      }
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
        }

        <!-- ── Clients tab (or single list for clients) ── -->
        @if (!loading() && activeTab() === 'clients') {
          @if (displayConversations().length > 0) {
            <ion-list lines="full">
              @for (conv of displayConversations(); track conv.otherUserId) {
                <ion-item
                  button
                  [routerLink]="['/tabs/messages/chat', conv.otherUserId]"
                  detail="false"
                >
                  <ion-avatar slot="start">
                    @if (conv.otherUserAvatar) {
                      <img [src]="conv.otherUserAvatar" [alt]="conv.otherUserName" />
                    } @else {
                      <ion-icon name="person-circle-outline"></ion-icon>
                    }
                  </ion-avatar>

                  <ion-label>
                    <h2>{{ conv.otherUserName }}</h2>
                    @if (conv.lastMessage) {
                      <p class="last-message">
                        {{ truncate(conv.lastMessage.content, 50) }}
                      </p>
                    }
                    <ion-note class="message-time">
                      {{ formatTime(conv.lastMessage?.created_at) }}
                    </ion-note>
                  </ion-label>

                  @if (conv.unreadCount > 0) {
                    <ion-badge slot="end" color="primary">{{ conv.unreadCount }}</ion-badge>
                  }
                </ion-item>
              }
            </ion-list>
          } @else {
            <div class="empty-state">
              <ion-icon name="chatbubble-outline"></ion-icon>
              <h3>No Messages Yet</h3>
              <p>{{ isStaff() ? 'Client conversations will appear here.' : 'Start a conversation with your trainer or clients.' }}</p>
            </div>
          }
        }

        <!-- ── Team tab (staff only) ── -->
        @if (!loading() && activeTab() === 'team') {

          <!-- Existing team conversations -->
          @if (teamConvs().length > 0) {
            <div class="section-header">Recent</div>
            <ion-list lines="full">
              @for (conv of teamConvs(); track conv.otherUserId) {
                <ion-item
                  button
                  [routerLink]="['/tabs/messages/chat', conv.otherUserId]"
                  [queryParams]="{ type: 'team' }"
                  detail="false"
                >
                  <ion-avatar slot="start">
                    @if (conv.otherUserAvatar) {
                      <img [src]="conv.otherUserAvatar" [alt]="conv.otherUserName" />
                    } @else {
                      <ion-icon name="person-circle-outline"></ion-icon>
                    }
                  </ion-avatar>

                  <ion-label>
                    <h2>{{ conv.otherUserName }}</h2>
                    @if (conv.lastMessage) {
                      <p class="last-message">{{ truncate(conv.lastMessage.content, 50) }}</p>
                    }
                    <ion-note class="message-time">
                      {{ formatTime(conv.lastMessage?.created_at) }}
                    </ion-note>
                  </ion-label>

                  @if (conv.unreadCount > 0) {
                    <ion-badge slot="end" color="primary">{{ conv.unreadCount }}</ion-badge>
                  }
                </ion-item>
              }
            </ion-list>
          }

          <!-- Team contacts directory (staff without existing conversations) -->
          @if (newContacts().length > 0) {
            <div class="section-header">{{ teamConvs().length > 0 ? 'Start a New Conversation' : 'Team' }}</div>
            <ion-list lines="full">
              @for (contact of newContacts(); track contact.user_id) {
                <ion-item
                  button
                  [routerLink]="['/tabs/messages/chat', contact.user_id]"
                  [queryParams]="{ type: 'team' }"
                  detail="false"
                >
                  <ion-avatar slot="start">
                    @if (contact.avatar_url) {
                      <img [src]="contact.avatar_url" [alt]="contact.full_name" />
                    } @else {
                      <ion-icon name="person-circle-outline"></ion-icon>
                    }
                  </ion-avatar>

                  <ion-label>
                    <h2>{{ contact.full_name }}</h2>
                    <p class="role-label">{{ roleLabel(contact.role) }}</p>
                  </ion-label>

                  <ion-button slot="end" fill="outline" size="small"
                    [routerLink]="['/tabs/messages/chat', contact.user_id]"
                    [queryParams]="{ type: 'team' }">
                    <ion-icon name="add-outline" slot="start"></ion-icon>
                    Message
                  </ion-button>
                </ion-item>
              }
            </ion-list>
          }

          @if (teamConvs().length === 0 && newContacts().length === 0) {
            <div class="empty-state">
              <ion-icon name="people-outline"></ion-icon>
              <h3>No Team Members Found</h3>
              <p>Team contacts at your facility will appear here.</p>
            </div>
          }
        }

        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">{{ errorMessage() }}</ion-note>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar:first-child {
      --background: transparent;
      --border-width: 0;
    }

    ion-header ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .segment-toolbar {
      --background: var(--fitos-bg-primary, #0D0D0D);
      --border-width: 0;
      padding: 0 16px 8px;

      ion-segment {
        --background: var(--fitos-bg-secondary, #171717);
        border-radius: 10px;
        height: 40px;
      }

      ion-segment-button {
        --color: var(--fitos-text-secondary, #A3A3A3);
        --color-checked: var(--ion-color-primary, #10B981);
        --indicator-color: rgba(16, 185, 129, 0.15);
        --border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        min-height: 36px;

        ion-icon { font-size: 16px; margin-right: 4px; }

        ion-badge {
          margin-left: 4px;
          --background: #EF4444;
          --color: white;
          font-size: 10px;
          min-width: 16px;
          height: 16px;
          padding: 2px 4px;
          border-radius: 8px;
        }
      }
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    .conversations-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .section-header {
      padding: 16px 16px 8px;
      font-size: 12px;
      font-weight: 700;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.8px;
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
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 16px;
      }

      ion-spinner { margin-bottom: 16px; }

      h3 {
        margin: 0 0 8px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0;
        font-size: 14px;
      }
    }

    ion-list { background: transparent; }

    ion-item {
      --background: transparent;
      --padding-start: 16px;
      --border-color: rgba(255, 255, 255, 0.06);

      ion-avatar {
        width: 48px;
        height: 48px;

        ion-icon {
          font-size: 48px;
          color: var(--fitos-text-tertiary, #737373);
        }
      }

      h2 {
        font-weight: 600;
        font-size: 15px;
        margin: 0 0 4px;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .last-message {
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 14px;
        margin: 0 0 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .role-label {
        color: var(--fitos-text-tertiary, #737373);
        font-size: 13px;
        margin: 0;
        text-transform: capitalize;
      }

      .message-time {
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
      }

      ion-button[fill="outline"] {
        --border-color: rgba(16, 185, 129, 0.4);
        --color: #10B981;
        --border-radius: 6px;
        height: 32px;
        font-size: 13px;
        font-weight: 600;
      }
    }

    .error-message {
      display: block;
      padding: 16px;
      margin: 16px;
      text-align: center;
      color: #FCA5A5;
    }
  `],
})
export class ConversationsPage implements OnInit {
  private messagingService = inject(MessagingService);
  private auth             = inject(AuthService);

  // ── Signals ───────────────────────────────────────────────────
  activeTab    = signal<'clients' | 'team'>('clients');
  loading      = this.messagingService.isLoadingSignal;
  errorMessage = this.messagingService.errorSignal;

  // Role helpers
  isStaff = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'trainer' || role === 'gym_owner' || role === 'admin_assistant';
  });

  // ── Derived conversation lists ────────────────────────────────
  clientConvs = this.messagingService.clientConversations;
  teamConvs   = this.messagingService.teamConversations;

  // For clients, show all conversations (no filter). For staff, filter by tab.
  displayConversations = computed<Conversation[]>(() => {
    if (!this.isStaff()) return this.messagingService.conversationsSignal();
    return this.activeTab() === 'clients' ? this.clientConvs() : this.teamConvs();
  });

  // Unread counts per tab (for badge display)
  clientUnread = computed(() =>
    this.clientConvs().reduce((sum, c) => sum + c.unreadCount, 0)
  );
  teamUnread = computed(() =>
    this.teamConvs().reduce((sum, c) => sum + c.unreadCount, 0)
  );

  // Team contacts who don't already have a conversation
  newContacts = computed<TeamContact[]>(() => {
    const existingIds = new Set(this.teamConvs().map(c => c.otherUserId));
    return this.messagingService.teamContactsSignal().filter(c => !existingIds.has(c.user_id));
  });

  constructor() {
    addIcons({
      chatbubbleOutline,
      personCircleOutline,
      chatbubblesOutline,
      peopleOutline,
      addOutline,
    });
  }

  ngOnInit(): void {
    this.load();
  }

  private async load(): Promise<void> {
    await this.messagingService.loadConversations();
    // Pre-load team contacts for staff so the Team tab is ready
    if (this.isStaff()) {
      await this.messagingService.loadTeamContacts();
    }
  }

  onTabChange(event: CustomEvent): void {
    this.activeTab.set(event.detail.value as 'clients' | 'team');
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.messagingService.loadConversations();
    if (this.isStaff()) {
      await this.messagingService.loadTeamContacts();
    }
    (event.target as HTMLIonRefresherElement).complete();
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      trainer:         'Trainer',
      gym_owner:       'Owner',
      admin_assistant: 'Admin Assistant',
    };
    return labels[role] ?? role;
  }

  truncate(text: string | null | undefined, length: number): string {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now   = new Date();
    const diffMs    = now.getTime() - date.getTime();
    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);

    if (diffMins  < 1)  return 'Just now';
    if (diffMins  < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays  < 7)  return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}
