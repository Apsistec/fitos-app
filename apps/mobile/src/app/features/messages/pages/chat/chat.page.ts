import {  Component, inject, signal, OnInit, ViewChild, ElementRef, AfterViewChecked , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonFooter,
  IonTextarea,
  IonButton,
  IonIcon,
  IonSpinner,
  IonAvatar,
  IonNote,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, personCircleOutline } from 'ionicons/icons';
import { MessagingService, type Message } from '@app/core/services/messaging.service';
import { AuthService } from '@app/core/services/auth.service';
import { ClientService } from '@app/core/services/client.service';
import { AICoachService } from '@app/core/services/ai-coach.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonFooter,
    IonTextarea,
    IonButton,
    IonIcon,
    IonSpinner,
    IonAvatar,
    IonNote,
    IonRefresher,
    IonRefresherContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/messages"></ion-back-button>
        </ion-buttons>
        <ion-title>
          <div class="chat-header">
            <ion-avatar>
              @if (otherUserAvatar()) {
                <img [src]="otherUserAvatar()" [alt]="otherUserName()" />
              } @else {
                <ion-icon name="person-circle-outline"></ion-icon>
              }
            </ion-avatar>
            <span>{{ otherUserName() }}</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content #content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="messages-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner></ion-spinner>
            <p>Loading messages...</p>
          </div>
        } @else if (messages().length > 0) {
          <div class="messages-list">
            @for (message of messages(); track message.id) {
              <div
                class="message"
                [class.sent]="message.sender_id === currentUserId()"
                [class.received]="message.sender_id !== currentUserId()"
              >
                <div class="message-bubble">
                  <p class="message-content">{{ message.content }}</p>
                  <span class="message-time">{{ formatTime(message.created_at) }}</span>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="empty-state">
            <p>No messages yet. Start the conversation!</p>
          </div>
        }

        @if (errorMessage()) {
          <ion-note color="danger" class="error-message">
            {{ errorMessage() }}
          </ion-note>
        }
      </div>
    </ion-content>

    <ion-footer>
      <div class="message-input-container">
        <form [formGroup]="messageForm" (ngSubmit)="sendMessage()">
          <ion-textarea
            formControlName="content"
            placeholder="Type a message..."
            [autoGrow]="true"
            rows="1"
            [maxlength]="1000"
          ></ion-textarea>

          <ion-button
            type="submit"
            fill="clear"
            [disabled]="messageForm.invalid || sending()"
            aria-label="Send message"
          >
            @if (sending()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon name="send" slot="icon-only"></ion-icon>
            }
          </ion-button>
        </form>
      </div>
    </ion-footer>
  `,
  styles: [`
    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;

      ion-avatar {
        width: 32px;
        height: 32px;

        ion-icon {
          font-size: 32px;
          color: var(--ion-color-medium);
        }
      }

      span {
        font-size: 1rem;
        font-weight: 600;
      }
    }

    .messages-container {
      padding: 16px;
      min-height: 100%;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      text-align: center;

      ion-spinner {
        margin-bottom: 16px;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      display: flex;
      width: 100%;

      &.sent {
        justify-content: flex-end;

        .message-bubble {
          background: var(--ion-color-primary);
          color: var(--ion-color-primary-contrast);
          border-radius: 18px 18px 4px 18px;
        }
      }

      &.received {
        justify-content: flex-start;

        .message-bubble {
          background: var(--ion-color-light);
          color: var(--ion-color-dark);
          border-radius: 18px 18px 18px 4px;
        }
      }
    }

    .message-bubble {
      max-width: 75%;
      padding: 12px 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

      .message-content {
        margin: 0 0 4px;
        font-size: 0.9375rem;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .message-time {
        font-size: 0.6875rem;
        opacity: 0.7;
      }
    }

    .message-input-container {
      padding: 12px 16px;
      background: var(--ion-background-color);
      border-top: 1px solid var(--ion-color-light);

      form {
        display: flex;
        align-items: flex-end;
        gap: 8px;

        ion-textarea {
          flex: 1;
          --background: var(--ion-color-light);
          --padding-start: 12px;
          --padding-end: 12px;
          --padding-top: 8px;
          --padding-bottom: 8px;
          border-radius: 20px;
        }

        ion-button {
          --padding-start: 8px;
          --padding-end: 8px;
          margin: 0;
        }
      }
    }

    .error-message {
      display: block;
      padding: 16px;
      margin: 16px 0;
      text-align: center;
    }
  `],
})
export class ChatPage implements OnInit, AfterViewChecked {
  @ViewChild('content') content?: IonContent;

  private fb = inject(FormBuilder);
  private messagingService = inject(MessagingService);
  private authService = inject(AuthService);
  private clientService = inject(ClientService);
  private aiCoachService = inject(AICoachService);
  private route = inject(ActivatedRoute);

  messages = this.messagingService.currentMessagesSignal;
  loading = this.messagingService.isLoadingSignal;
  errorMessage = this.messagingService.errorSignal;

  otherUserId = signal<string>('');
  otherUserName = signal<string>('Unknown');
  otherUserAvatar = signal<string | null>(null);
  currentUserId = signal<string>('');
  sending = signal(false);
  shouldScrollToBottom = false;

  messageForm: FormGroup = this.fb.group({
    content: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  constructor() {
    addIcons({
      send,
      personCircleOutline,
    });
  }

  ngOnInit(): void {
    const userId = this.authService.user()?.id;
    if (userId) {
      this.currentUserId.set(userId);
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.otherUserId.set(id);
      this.loadChat();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  async loadChat(): Promise<void> {
    // Load messages
    await this.messagingService.loadMessages(this.otherUserId());

    // Load other user info
    await this.loadOtherUserInfo();

    // Scroll to bottom after loading
    this.shouldScrollToBottom = true;
  }

  async loadOtherUserInfo(): Promise<void> {
    try {
      await this.clientService.loadClients();
      const clients = this.clientService.clients();
      const client = clients.find(c => c.id === this.otherUserId());

      if (client) {
        this.otherUserName.set(client.full_name || 'Unknown');
        this.otherUserAvatar.set(client.avatar_url || null);
      }
    } catch (error) {
      console.error('Error loading other user info:', error);
    }
  }

  async sendMessage(): Promise<void> {
    if (this.messageForm.invalid) return;

    this.sending.set(true);
    try {
      const content = this.messageForm.value.content.trim();
      if (!content) return;

      await this.messagingService.sendMessage(this.otherUserId(), content);

      // Auto-collect training data for Coach Brain if sender is a trainer
      const isTrainer = this.authService.isTrainer() || this.authService.isOwner();
      if (isTrainer && content.length >= 20) { // Only collect substantial messages (20+ chars)
        const trainerId = this.authService.currentUser()?.id;
        if (trainerId) {
          // Fire and forget - don't block message sending if collection fails
          this.aiCoachService.collectTrainingData(
            trainerId,
            content,
            'message'
          ).catch(err => {
            console.warn('Failed to collect training data:', err);
            // Silent fail - don't disrupt user experience
          });
        }
      }

      // Clear form
      this.messageForm.reset();

      // Scroll to bottom after sending
      this.shouldScrollToBottom = true;
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      this.sending.set(false);
    }
  }

  formatTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadChat();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
