import { Component, OnInit, ViewChild, ElementRef, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonTextarea,
  IonFooter,
  IonSpinner,
  ToastController,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sendOutline,
  micOutline,
  closeOutline,
  refreshOutline,
} from 'ionicons/icons';
import { AICoachService, UserContext } from '@app/core/services/ai-coach.service';
import { AuthService } from '@app/core/services/auth.service';
import { VoiceService } from '@app/core/services/voice.service';
import { HapticService } from '@app/core/services/haptic.service';
import { ChatMessageComponent } from '../../components/chat-message/chat-message.component';
import { TypingIndicatorComponent } from '../../components/typing-indicator/typing-indicator.component';
import { QuickActionsComponent } from '../../components/quick-actions/quick-actions.component';

/**
 * ChatPage - AI Coaching Chat Interface
 *
 * Features:
 * - Real-time chat with AI coach
 * - Message history with auto-scroll
 * - Voice input support
 * - Quick action buttons
 * - Typing indicators
 * - Message persistence (TODO: Supabase integration)
 * - Escalation to trainer notifications
 *
 * Flow:
 * 1. User types or speaks message
 * 2. Message sent to AI backend
 * 3. AI processes with user context
 * 4. Response streams back (TODO: implement streaming)
 * 5. Conversation saved to database
 *
 * Usage:
 * Navigate to /coaching/chat
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon,
    IonTextarea,
    IonFooter,
    IonSpinner,
    IonFab,
    IonFabButton,
    ChatMessageComponent,
    TypingIndicatorComponent,
    QuickActionsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>AI Coach</ion-title>
        <ion-buttons slot="end">
          @if (messages().length > 0) {
            <ion-button (click)="clearChat()">
              <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>

      <!-- Agent Indicator -->
      @if (aiCoach.currentAgent()) {
        <ion-toolbar class="agent-toolbar">
          <div class="agent-indicator">
            <span class="agent-dot"></span>
            <span class="agent-text">
              {{ getAgentLabel(aiCoach.currentAgent()!) }} Agent Active
            </span>
          </div>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content #content [scrollEvents]="true">
      <div class="chat-container">
        <!-- Empty State -->
        @if (messages().length === 0 && !aiCoach.isProcessing()) {
          <div class="empty-state">
            <div class="coach-avatar">
              <ion-icon name="sparkles-outline"></ion-icon>
            </div>
            <h2>Hey! I'm your AI Coach</h2>
            <p>I can help you with workouts, nutrition, recovery, and motivation.</p>
            <p class="tip">Try asking me anything or use the quick actions below!</p>
          </div>

          <!-- Quick Actions (only show when empty) -->
          <app-quick-actions (actionSelected)="handleQuickAction($event)" />
        }

        <!-- Message List -->
        @if (messages().length > 0) {
          <div class="messages-list">
            @for (message of messages(); track message.id) {
              <app-chat-message [message]="message" />
            }

            <!-- Typing Indicator -->
            @if (aiCoach.isProcessing()) {
              <app-typing-indicator />
            }

            <!-- Scroll Anchor -->
            <div #scrollAnchor class="scroll-anchor"></div>
          </div>
        }

        <!-- Error Display -->
        @if (aiCoach.error()) {
          <div class="error-banner">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <div class="error-content">
              <strong>Error:</strong>
              <span>{{ aiCoach.error() }}</span>
            </div>
            <ion-button fill="clear" size="small" (click)="aiCoach.clearError()">
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          </div>
        }
      </div>
    </ion-content>

    <!-- Input Footer -->
    <ion-footer>
      <div class="chat-input-container">
        <!-- Voice Recording Indicator -->
        @if (voiceService.isListening()) {
          <div class="voice-recording">
            <div class="recording-indicator">
              <span class="recording-dot"></span>
              <span>Recording...</span>
            </div>
            <ion-button fill="clear" (click)="stopVoiceInput()">
              <ion-icon slot="icon-only" name="close-outline"></ion-icon>
            </ion-button>
          </div>
        }

        <!-- Text Input -->
        <div class="input-wrapper">
          <ion-textarea
            [(ngModel)]="messageInput"
            placeholder="Ask me anything..."
            [autoGrow]="true"
            [rows]="1"
            [maxlength]="1000"
            (keydown.enter)="onEnterPress($event)"
            [disabled]="aiCoach.isProcessing() || voiceService.isListening()"
          ></ion-textarea>

          <div class="input-actions">
            <!-- Voice Button -->
            <ion-button
              fill="clear"
              (click)="toggleVoiceInput()"
              [disabled]="aiCoach.isProcessing()"
              class="voice-button"
            >
              <ion-icon
                slot="icon-only"
                [name]="voiceService.isListening() ? 'close-outline' : 'mic-outline'"
                [class.listening]="voiceService.isListening()"
              ></ion-icon>
            </ion-button>

            <!-- Send Button -->
            <ion-button
              (click)="sendMessage()"
              [disabled]="!canSend()"
              color="primary"
              class="send-button"
            >
              @if (aiCoach.isProcessing()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                <ion-icon slot="icon-only" name="send-outline"></ion-icon>
              }
            </ion-button>
          </div>
        </div>

        <!-- Character Count -->
        @if (messageInput.length > 800) {
          <div class="char-count" [class.warning]="messageInput.length > 950">
            {{ messageInput.length }} / 1000
          </div>
        }
      </div>
    </ion-footer>

    <!-- Scroll to Bottom FAB -->
    @if (showScrollButton()) {
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button size="small" (click)="scrollToBottom(true)">
          <ion-icon name="arrow-down-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    }
  `,
  styles: [`
    ion-content {
      --background: var(--fitos-bg-primary);
    }

    .agent-toolbar {
      --min-height: 40px;
      --padding-top: 0;
      --padding-bottom: 0;
    }

    .agent-indicator {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      padding: var(--fitos-space-2) var(--fitos-space-4);
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-secondary);
    }

    .agent-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--fitos-accent-primary);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .chat-container {
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--fitos-space-8) var(--fitos-space-4);
      text-align: center;
      gap: var(--fitos-space-4);
    }

    .coach-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--fitos-space-2);

      ion-icon {
        font-size: 48px;
        color: white;
      }
    }

    .empty-state h2 {
      margin: 0;
      font-size: var(--fitos-text-2xl);
      font-weight: 700;
      color: var(--fitos-text-primary);
    }

    .empty-state p {
      margin: 0;
      font-size: var(--fitos-text-base);
      color: var(--fitos-text-secondary);
      max-width: 400px;
    }

    .empty-state .tip {
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-tertiary);
      font-style: italic;
    }

    .messages-list {
      flex: 1;
      padding: var(--fitos-space-4) 0;
    }

    .scroll-anchor {
      height: 1px;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-3);
      margin: var(--fitos-space-4);
      padding: var(--fitos-space-3);
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--fitos-status-error);
      border-radius: var(--fitos-radius-lg);
      color: var(--fitos-status-error);

      ion-icon {
        font-size: 24px;
        flex-shrink: 0;
      }
    }

    .error-content {
      flex: 1;
      font-size: var(--fitos-text-sm);
      line-height: 1.4;

      strong {
        display: block;
        margin-bottom: 4px;
      }
    }

    .chat-input-container {
      padding: var(--fitos-space-3);
      background: var(--fitos-bg-secondary);
      border-top: 1px solid var(--fitos-border-subtle);
    }

    .voice-recording {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--fitos-space-3);
      background: var(--fitos-status-error);
      color: white;
      border-radius: var(--fitos-radius-lg);
      margin-bottom: var(--fitos-space-2);
    }

    .recording-indicator {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      font-size: var(--fitos-text-sm);
      font-weight: 600;
    }

    .recording-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: white;
      animation: blink 1s ease-in-out infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: var(--fitos-space-2);
      background: var(--fitos-bg-primary);
      border: 1px solid var(--fitos-border-default);
      border-radius: var(--fitos-radius-lg);
      padding: var(--fitos-space-2);
    }

    ion-textarea {
      flex: 1;
      --padding-start: var(--fitos-space-2);
      --padding-end: var(--fitos-space-2);
      --padding-top: var(--fitos-space-2);
      --padding-bottom: var(--fitos-space-2);
      font-size: var(--fitos-text-base);
    }

    .input-actions {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-1);
    }

    .voice-button ion-icon.listening {
      color: var(--fitos-status-error);
      animation: pulse 1s ease-in-out infinite;
    }

    .send-button {
      --padding-start: 12px;
      --padding-end: 12px;
      height: 40px;
    }

    .char-count {
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
      text-align: right;
      margin-top: var(--fitos-space-1);
      padding: 0 var(--fitos-space-2);

      &.warning {
        color: var(--fitos-status-warning);
        font-weight: 600;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .agent-dot,
      .voice-button ion-icon.listening,
      .recording-dot {
        animation: none !important;
      }
    }
  `],
})
export class ChatPage implements OnInit {
  @ViewChild('content', { static: false }) content?: IonContent;
  @ViewChild('scrollAnchor', { read: ElementRef, static: false }) scrollAnchor?: ElementRef;

  // Services
  aiCoach = inject(AICoachService);
  private auth = inject(AuthService);
  voiceService = inject(VoiceService);
  private haptic = inject(HapticService);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  // State
  messageInput = '';
  showScrollButton = signal(false);

  // Computed
  messages = this.aiCoach.messages;
  canSend = computed(() =>
    this.messageInput.trim().length > 0 && !this.aiCoach.isProcessing()
  );

  constructor() {
    addIcons({ sendOutline, micOutline, closeOutline, refreshOutline });

    // Auto-scroll when new messages arrive
    effect(() => {
      const messagesCount = this.messages().length;
      if (messagesCount > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  async ngOnInit() {
    // TODO: Load conversation history from Supabase
    // const userId = this.auth.user()?.id;
    // if (userId) {
    //   await this.loadConversationHistory(userId);
    // }
  }

  /**
   * Send message to AI coach
   */
  async sendMessage(): Promise<void> {
    if (!this.canSend()) return;

    const message = this.messageInput.trim();
    this.messageInput = '';

    await this.haptic.light();

    try {
      const userContext = this.getUserContext();
      await this.aiCoach.sendMessage(message, userContext);
      await this.haptic.success();
    } catch (err) {
      await this.haptic.error();
      await this.showToast('Failed to send message. Please try again.', 'danger');
    }
  }

  /**
   * Handle quick action selection
   */
  async handleQuickAction(prompt: string): Promise<void> {
    this.messageInput = prompt;
    await this.sendMessage();
  }

  /**
   * Handle Enter key press
   */
  onEnterPress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    // Send on Enter, new line on Shift+Enter
    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Toggle voice input
   */
  async toggleVoiceInput(): Promise<void> {
    if (this.voiceService.isListening()) {
      this.stopVoiceInput();
    } else {
      await this.startVoiceInput();
    }
  }

  /**
   * Start voice input
   */
  async startVoiceInput(): Promise<void> {
    const hasPermission = await this.voiceService.requestPermission();
    if (!hasPermission) {
      await this.showToast('Microphone permission denied', 'warning');
      return;
    }

    await this.voiceService.startListening({
      endpointing: 2000, // Stop after 2 seconds of silence
    });

    await this.haptic.light();

    // Auto-send when transcript finalized
    const checkTranscript = setInterval(() => {
      const transcript = this.voiceService.transcript();
      if (transcript && !this.voiceService.isListening()) {
        clearInterval(checkTranscript);
        this.messageInput = transcript;
        this.sendMessage();
      }
    }, 500);

    // Cleanup after 30 seconds
    setTimeout(() => clearInterval(checkTranscript), 30000);
  }

  /**
   * Stop voice input
   */
  stopVoiceInput(): void {
    this.voiceService.stopListening();
    this.haptic.light();
  }

  /**
   * Clear chat history
   */
  async clearChat(): Promise<void> {
    const confirmed = confirm('Are you sure you want to clear this conversation?');
    if (confirmed) {
      this.aiCoach.clearHistory();
      await this.haptic.light();
      await this.showToast('Conversation cleared', 'success');
    }
  }

  /**
   * Scroll to bottom of message list
   */
  async scrollToBottom(smooth = false): Promise<void> {
    if (this.scrollAnchor?.nativeElement) {
      this.scrollAnchor.nativeElement.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  }

  /**
   * Get user context for AI
   */
  private getUserContext(): UserContext {
    const user = this.auth.user();
    const profile = this.auth.profile();

    // Return appropriate context based on user role
    if (profile?.role === 'trainer') {
      return {
        user_id: user?.id || '',
        role: 'trainer',
        specializations: [],
        preferences: {},
      };
    }

    // Default to client context
    return {
      user_id: user?.id || '',
      role: 'client',
      goals: [],
      fitness_level: 'intermediate',
      preferences: {},
    };
  }

  /**
   * Get agent display label
   */
  getAgentLabel(agent: string): string {
    const labels: Record<string, string> = {
      workout: 'Workout',
      nutrition: 'Nutrition',
      recovery: 'Recovery',
      motivation: 'Motivation',
      general: 'General',
    };
    return labels[agent] || agent;
  }

  /**
   * Show toast notification
   */
  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
