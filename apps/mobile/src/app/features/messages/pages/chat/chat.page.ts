import {  Component, inject, signal, OnInit, ViewChild, AfterViewChecked , ChangeDetectionStrategy } from '@angular/core';
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
import { send, personCircleOutline, checkmarkDoneOutline, checkmarkOutline, trashOutline } from 'ionicons/icons';
import { MessagingService, type Message, type ConversationType } from '../../../../core/services/messaging.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ClientService } from '../../../../core/services/client.service';
import { AICoachService } from '../../../../core/services/ai-coach.service';
import { ActionSheetController, ToastController } from '@ionic/angular/standalone';

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
    <ion-header class="ion-no-border">
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
                (click)="onMessagePress(message)"
              >
                <div class="message-bubble">
                  <p class="message-content">{{ message.content }}</p>
                  <div class="message-meta">
                    <span class="message-time">{{ formatTime(message.created_at) }}</span>
                    @if (message.sender_id === currentUserId()) {
                      <ion-icon
                        [name]="message.read_at ? 'checkmark-done-outline' : 'checkmark-outline'"
                        class="read-indicator"
                        [class.read]="message.read_at"
                      ></ion-icon>
                    }
                  </div>
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
    ion-header ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-header ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 12px;

      ion-avatar {
        width: 32px;
        height: 32px;

        ion-icon {
          font-size: 32px;
          color: var(--fitos-text-tertiary, #737373);
        }
      }

      span {
        font-size: 16px;
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
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0;
        font-size: 14px;
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
          background: var(--ion-color-primary, #10B981);
          color: white;
          border-radius: 18px 18px 4px 18px;
        }
      }

      &.received {
        justify-content: flex-start;

        .message-bubble {
          background: var(--fitos-bg-tertiary, #262626);
          color: var(--fitos-text-primary, #F5F5F5);
          border-radius: 18px 18px 18px 4px;
        }
      }
    }

    .message-bubble {
      max-width: 75%;
      padding: 12px 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);

      .message-content {
        margin: 0 0 4px;
        font-size: 15px;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .message-meta {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
      }

      .message-time {
        font-size: 11px;
        opacity: 0.7;
      }

      .read-indicator {
        font-size: 14px;
        opacity: 0.5;
      }

      .read-indicator.read {
        opacity: 1;
        color: #34D399;
      }
    }

    .message-input-container {
      padding: 12px 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      form {
        display: flex;
        align-items: flex-end;
        gap: 8px;

        ion-textarea {
          flex: 1;
          --background: var(--fitos-bg-tertiary, #262626);
          --padding-start: 12px;
          --padding-end: 12px;
          --padding-top: 8px;
          --padding-bottom: 8px;
          border-radius: 20px;
          font-size: 14px;
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
      color: #FCA5A5;
    }
  `],
})
export class ChatPage implements OnInit, AfterViewChecked {
  @ViewChild('content') content?: IonContent;

  private fb = inject(FormBuilder);
  private messagingService = inject(MessagingService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private clientService = inject(ClientService);
  private aiCoachService = inject(AICoachService);
  private route = inject(ActivatedRoute);
  private actionSheetCtrl = inject(ActionSheetController);
  private toastCtrl = inject(ToastController);

  messages = this.messagingService.currentMessagesSignal;
  loading = this.messagingService.isLoadingSignal;
  errorMessage = this.messagingService.errorSignal;

  otherUserId = signal<string>('');
  otherUserName = signal<string>('Unknown');
  otherUserAvatar = signal<string | null>(null);
  currentUserId = signal<string>('');
  conversationType = signal<ConversationType>('client_coaching');
  sending = signal(false);
  shouldScrollToBottom = false;

  messageForm: FormGroup = this.fb.group({
    content: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  constructor() {
    addIcons({
      send,
      personCircleOutline,
      checkmarkDoneOutline,
      checkmarkOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    const userId = this.authService.user()?.id;
    if (userId) {
      this.currentUserId.set(userId);
    }

    // EP-07: read conversation type from query param (?type=team)
    const type = this.route.snapshot.queryParamMap.get('type') as ConversationType | null;
    if (type === 'team' || type === 'group_announcement') {
      this.conversationType.set(type);
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
    // Load messages filtered by conversation type (EP-07)
    await this.messagingService.loadMessages(this.otherUserId(), this.conversationType());

    // Load other user info
    await this.loadOtherUserInfo();

    // Scroll to bottom after loading
    this.shouldScrollToBottom = true;
  }

  async loadOtherUserInfo(): Promise<void> {
    try {
      if (this.conversationType() === 'team') {
        // For team chats, look up the contact from team contacts signal or fetch profile
        const teamContacts = this.messagingService.teamContactsSignal();
        const contact = teamContacts.find(c => c.user_id === this.otherUserId());
        if (contact) {
          this.otherUserName.set(contact.full_name || 'Unknown');
          this.otherUserAvatar.set(contact.avatar_url || null);
          return;
        }
        // Fallback: fetch profile directly
        const { data } = await this.supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', this.otherUserId())
          .single();
        if (data) {
          this.otherUserName.set((data as any).full_name || 'Unknown');
          this.otherUserAvatar.set((data as any).avatar_url || null);
        }
      } else {
        await this.clientService.loadClients();
        const clients = this.clientService.clients();
        const client = clients.find((c) => c.id === this.otherUserId());
        if (client) {
          this.otherUserName.set(client.full_name || 'Unknown');
          this.otherUserAvatar.set(client.avatar_url || null);
        }
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

      if (this.conversationType() === 'team') {
        // EP-07: Team messages require facility_id for RLS scoping
        const facilityId = await this.resolveFacilityId();
        await this.messagingService.sendTeamMessage(this.otherUserId(), content, facilityId);
      } else {
        await this.messagingService.sendMessage(this.otherUserId(), content);

        // Auto-collect training data for Coach Brain if sender is a trainer
        const isTrainer = this.authService.isTrainer() || this.authService.isOwner();
        if (isTrainer && content.length >= 20) { // Only collect substantial messages (20+ chars)
          // Fire and forget - trainer ID derived from auth session by the service
          this.aiCoachService.collectTrainingData(
            content,
            'message'
          ).catch(() => {
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

  /**
   * Resolve the facility ID for the current user.
   * Trainers/owners have facility_id on their profile.
   * Admin assistants have it in the admin_assistants table.
   */
  private async resolveFacilityId(): Promise<string> {
    const profile = this.authService.profile();
    // Most roles have facility_id on the profile
    if ((profile as any)?.facility_id) {
      return (profile as any).facility_id as string;
    }
    // Admin assistants — look it up from the admin_assistants table
    const userId = this.authService.user()?.id;
    if (userId) {
      const { data } = await this.supabase
        .from('admin_assistants')
        .select('facility_id')
        .eq('user_id', userId)
        .single();
      if (data && (data as any).facility_id) {
        return (data as any).facility_id as string;
      }
    }
    return '';
  }

  async onMessagePress(message: Message): Promise<void> {
    // Only show actions for messages sent by the current user
    if (message.sender_id !== this.currentUserId()) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Message Options',
      buttons: [
        {
          text: 'Delete Message',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => this.deleteMessage(message.id),
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  private async deleteMessage(messageId: string): Promise<void> {
    const success = await this.messagingService.deleteMessage(messageId);
    const toast = await this.toastCtrl.create({
      message: success ? 'Message deleted' : 'Failed to delete message',
      duration: 2000,
      color: success ? 'success' : 'danger',
    });
    await toast.present();
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
