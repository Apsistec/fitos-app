import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonAvatar,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  trashOutline,
  chatbubbleOutline,
  fitnessOutline,
  nutritionOutline,
  bedOutline,
  happyOutline,
  timeOutline,
} from 'ionicons/icons';
import { HapticService } from '@app/core/services/haptic.service';
import { AICoachService, ChatMessage } from '@app/core/services/ai-coach.service';

export type CoachPersona = 'workout' | 'nutrition' | 'recovery' | 'motivation' | 'general';

export interface Conversation {
  id: string;
  title: string;
  persona: CoachPersona;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: Date;
  createdAt: Date;
}

/**
 * ConversationHistoryPage - View and manage AI coaching conversations
 *
 * Features:
 * - List all past conversations
 * - Search conversations
 * - Filter by persona
 * - Delete conversations
 * - Resume conversations
 * - New conversation creation
 */
@Component({
  selector: 'app-conversation-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonAvatar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/coaching"></ion-back-button>
        </ion-buttons>
        <ion-title>AI Coach Conversations</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="startNewConversation()">
            <ion-icon slot="icon-only" name="add-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Search -->
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="handleSearch()"
          placeholder="Search conversations..."
          [debounce]="300"
        ></ion-searchbar>
      </ion-toolbar>

      <!-- Persona Filter -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedPersona" (ionChange)="handleFilter()">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="workout">
            <ion-icon name="fitness-outline"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="nutrition">
            <ion-icon name="nutrition-outline"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="recovery">
            <ion-icon name="bed-outline"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="motivation">
            <ion-icon name="happy-outline"></ion-icon>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="conversation-history-container">
        @if (filteredConversations().length === 0) {
          <!-- Empty State -->
          <div class="empty-state">
            <ion-icon name="chatbubble-outline"></ion-icon>
            @if (searchQuery() || selectedPersona() !== 'all') {
              <h3>No conversations found</h3>
              <p>Try adjusting your search or filters</p>
              <ion-button fill="outline" (click)="clearFilters()">
                Clear Filters
              </ion-button>
            } @else {
              <h3>No conversations yet</h3>
              <p>Start a conversation with your AI coach to get personalized guidance</p>
              <ion-button (click)="startNewConversation()">
                <ion-icon slot="start" name="add-outline"></ion-icon>
                Start Conversation
              </ion-button>
            }
          </div>
        } @else {
          <!-- Conversation List -->
          <ion-list>
            @for (conversation of filteredConversations(); track conversation.id) {
              <ion-item
                button
                (click)="openConversation(conversation)"
                detail="true"
              >
                <ion-avatar slot="start" [class]="'persona-' + conversation.persona">
                  <ion-icon [name]="getPersonaIcon(conversation.persona)"></ion-icon>
                </ion-avatar>

                <ion-label>
                  <h2>{{ conversation.title }}</h2>
                  <p class="last-message">{{ conversation.lastMessage }}</p>
                  <div class="conversation-meta">
                    <ion-chip size="small" [color]="getPersonaColor(conversation.persona)">
                      <ion-label>{{ getPersonaLabel(conversation.persona) }}</ion-label>
                    </ion-chip>
                    <span class="message-count">
                      <ion-icon name="chatbubble-outline"></ion-icon>
                      {{ conversation.messageCount }}
                    </span>
                    <span class="timestamp">
                      <ion-icon name="time-outline"></ion-icon>
                      {{ formatTimestamp(conversation.lastMessageAt) }}
                    </span>
                  </div>
                </ion-label>

                <ion-button
                  slot="end"
                  fill="clear"
                  color="danger"
                  (click)="deleteConversation($event, conversation)"
                >
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-button>
              </ion-item>
            }
          </ion-list>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .conversation-history-container {
      padding: var(--fitos-space-4);
      min-height: 100%;
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary);
      margin: 0;
      padding: var(--fitos-space-2);

      ion-segment-button {
        --indicator-color: var(--fitos-accent-primary);
        --color: var(--fitos-text-secondary);
        --color-checked: var(--fitos-accent-primary);
        min-height: 40px;

        ion-icon {
          font-size: 20px;
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--fitos-space-8) var(--fitos-space-4);
      text-align: center;
      min-height: 60vh;

      ion-icon {
        font-size: 64px;
        color: var(--fitos-text-tertiary);
        margin-bottom: var(--fitos-space-4);
      }

      h3 {
        margin: 0 0 var(--fitos-space-2) 0;
        font-size: var(--fitos-text-xl);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }

      p {
        margin: 0 0 var(--fitos-space-6) 0;
        font-size: var(--fitos-text-base);
        color: var(--fitos-text-secondary);
        max-width: 300px;
      }

      ion-button {
        margin: 0;
      }
    }

    ion-list {
      background: transparent;
      padding: 0;
    }

    ion-item {
      --background: var(--fitos-bg-secondary);
      --border-color: var(--fitos-border-subtle);
      --padding-start: var(--fitos-space-4);
      --padding-end: var(--fitos-space-4);
      --min-height: 96px;
      margin-bottom: var(--fitos-space-3);
      border-radius: var(--fitos-radius-lg);
      border: 1px solid var(--fitos-border-subtle);

      &:last-child {
        margin-bottom: 0;
      }
    }

    ion-avatar {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;

      ion-icon {
        font-size: 24px;
        color: white;
      }

      &.persona-workout {
        background: var(--ion-color-primary);
      }

      &.persona-nutrition {
        background: var(--ion-color-success);
      }

      &.persona-recovery {
        background: var(--ion-color-tertiary);
      }

      &.persona-motivation {
        background: var(--ion-color-warning);
      }

      &.persona-general {
        background: var(--ion-color-medium);
      }
    }

    ion-label {
      h2 {
        font-size: var(--fitos-text-base);
        font-weight: 600;
        color: var(--fitos-text-primary);
        margin: 0 0 var(--fitos-space-1) 0;
      }

      .last-message {
        font-size: var(--fitos-text-sm);
        color: var(--fitos-text-secondary);
        margin: 0 0 var(--fitos-space-2) 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
    }

    .conversation-meta {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-3);
      flex-wrap: wrap;

      ion-chip {
        margin: 0;
        font-size: var(--fitos-text-xs);
      }

      .message-count,
      .timestamp {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: var(--fitos-text-xs);
        color: var(--fitos-text-tertiary);

        ion-icon {
          font-size: 12px;
        }
      }
    }
  `],
})
export class ConversationHistoryPage implements OnInit {
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private haptic = inject(HapticService);
  private aiCoach = inject(AICoachService);

  // State
  conversations = signal<Conversation[]>([]);
  filteredConversations = signal<Conversation[]>([]);
  searchQuery = signal('');
  selectedPersona = signal<'all' | CoachPersona>('all');

  constructor() {
    addIcons({
      addOutline,
      searchOutline,
      trashOutline,
      chatbubbleOutline,
      fitnessOutline,
      nutritionOutline,
      bedOutline,
      happyOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.loadConversations();
  }

  async loadConversations(): Promise<void> {
    // TODO: Load from service/database
    // Mock data for now
    const mockConversations: Conversation[] = [
      {
        id: 'conv_1',
        title: 'Bench Press Form Check',
        persona: 'workout',
        messageCount: 8,
        lastMessage: "Great! Focus on keeping your shoulder blades retracted...",
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        id: 'conv_2',
        title: 'Protein Intake Guidance',
        persona: 'nutrition',
        messageCount: 5,
        lastMessage: "For muscle gain, aim for 1.6-2.2g per kg bodyweight...",
        lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      {
        id: 'conv_3',
        title: 'Sleep Optimization',
        persona: 'recovery',
        messageCount: 12,
        lastMessage: "Try keeping your room temperature between 60-67°F...",
        lastMessageAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'conv_4',
        title: 'Staying Motivated',
        persona: 'motivation',
        messageCount: 6,
        lastMessage: "Remember why you started. Small progress is still progress...",
        lastMessageAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ];

    this.conversations.set(mockConversations);
    this.filteredConversations.set(mockConversations);
  }

  handleSearch(): void {
    this.applyFilters();
  }

  handleFilter(): void {
    this.haptic.light();
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.conversations();

    // Apply persona filter
    if (this.selectedPersona() !== 'all') {
      filtered = filtered.filter(c => c.persona === this.selectedPersona());
    }

    // Apply search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.lastMessage.toLowerCase().includes(query)
      );
    }

    this.filteredConversations.set(filtered);
  }

  clearFilters(): void {
    this.haptic.light();
    this.searchQuery.set('');
    this.selectedPersona.set('all');
    this.filteredConversations.set(this.conversations());
  }

  async startNewConversation(): Promise<void> {
    await this.haptic.light();
    this.router.navigate(['/coaching/chat']);
  }

  async openConversation(conversation: Conversation): Promise<void> {
    await this.haptic.light();
    // TODO: Load conversation messages and navigate to chat
    this.router.navigate(['/coaching/chat', conversation.id]);
  }

  async deleteConversation(event: Event, conversation: Conversation): Promise<void> {
    event.stopPropagation();
    await this.haptic.warning();

    const alert = await this.alertCtrl.create({
      header: 'Delete Conversation',
      message: `Are you sure you want to delete "${conversation.title}"? This cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            this.haptic.light();
          },
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.haptic.success();

            // TODO: Delete from service/database
            this.conversations.update(convs =>
              convs.filter(c => c.id !== conversation.id)
            );
            this.applyFilters();
          },
        },
      ],
    });

    await alert.present();
  }

  getPersonaIcon(persona: CoachPersona): string {
    const icons: Record<CoachPersona, string> = {
      workout: 'fitness-outline',
      nutrition: 'nutrition-outline',
      recovery: 'bed-outline',
      motivation: 'happy-outline',
      general: 'chatbubble-outline',
    };
    return icons[persona];
  }

  getPersonaLabel(persona: CoachPersona): string {
    const labels: Record<CoachPersona, string> = {
      workout: 'Workout',
      nutrition: 'Nutrition',
      recovery: 'Recovery',
      motivation: 'Motivation',
      general: 'General',
    };
    return labels[persona];
  }

  getPersonaColor(persona: CoachPersona): string {
    const colors: Record<CoachPersona, string> = {
      workout: 'primary',
      nutrition: 'success',
      recovery: 'tertiary',
      motivation: 'warning',
      general: 'medium',
    };
    return colors[persona];
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}
