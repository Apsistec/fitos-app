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
  sparklesOutline,
} from 'ionicons/icons';
import { AICoachService, UserContext } from '../../../../core/services/ai-coach.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VoiceService } from '../../../../core/services/voice.service';
import { HapticService } from '../../../../core/services/haptic.service';
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
 * - Message persistence via Supabase (ai_conversations + ai_conversation_messages)
 * - Escalation to trainer notifications
 *
 * Flow:
 * 1. User types or speaks message
 * 2. Message sent to AI backend
 * 3. AI processes with user context
 * 4. Response streams back (TODO: implement streaming)
 * 5. Conversation persisted to Supabase
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
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>AI Coach</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="navigateToInsights()" aria-label="AI Insights">
            <ion-icon slot="icon-only" name="sparkles-outline"></ion-icon>
          </ion-button>
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

    .agent-toolbar {
      --min-height: 40px;
      --padding-top: 0;
      --padding-bottom: 0;
    }

    .agent-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .agent-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ion-color-primary, #10B981);
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
      padding: 48px 16px;
      text-align: center;
      gap: 16px;
    }

    .coach-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--ion-color-primary, #10B981), #8B5CF6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;

      ion-icon {
        font-size: 48px;
        color: white;
      }
    }

    .empty-state h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      max-width: 400px;
    }

    .empty-state .tip {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
      font-style: italic;
    }

    .messages-list {
      flex: 1;
      padding: 16px 0;
    }

    .scroll-anchor {
      height: 1px;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #EF4444;
      border-radius: 12px;
      color: #EF4444;

      ion-icon {
        font-size: 24px;
        flex-shrink: 0;
      }
    }

    .error-content {
      flex: 1;
      font-size: 13px;
      line-height: 1.4;

      strong {
        display: block;
        margin-bottom: 4px;
      }
    }

    .chat-input-container {
      padding: 12px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .voice-recording {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      background: #EF4444;
      color: white;
      border-radius: 12px;
      margin-bottom: 8px;
    }

    .recording-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
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
      gap: 8px;
      background: var(--fitos-bg-primary, #0D0D0D);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 8px;
    }

    ion-textarea {
      flex: 1;
      --padding-start: 8px;
      --padding-end: 8px;
      --padding-top: 8px;
      --padding-bottom: 8px;
      font-size: 14px;
    }

    .input-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .voice-button ion-icon.listening {
      color: #EF4444;
      animation: pulse 1s ease-in-out infinite;
    }

    .send-button {
      --padding-start: 12px;
      --padding-end: 12px;
      height: 40px;
    }

    .char-count {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      text-align: right;
      margin-top: 4px;
      padding: 0 8px;

      &.warning {
        color: #F59E0B;
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
    addIcons({ sendOutline, micOutline, closeOutline, refreshOutline, sparklesOutline });

    // Auto-scroll when new messages arrive
    effect(() => {
      const messagesCount = this.messages().length;
      if (messagesCount > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  async ngOnInit() {
    // Load conversation history from Supabase
    const userId = this.auth.user()?.id;
    if (userId) {
      await this.aiCoach.loadConversation(userId);
    }
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
    } catch (_err) {
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
      await this.aiCoach.clearHistory();
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
   * Navigate to AI insights dashboard
   */
  navigateToInsights(): void {
    this.haptic.light();
    this.router.navigate(['/tabs/coaching/insights']);
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
  private async showToast(message: string, color = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
