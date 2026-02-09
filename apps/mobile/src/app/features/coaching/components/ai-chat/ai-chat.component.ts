import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonFooter,
  IonToolbar,
  IonTextarea,
  IonButton,
  IonIcon,
  IonSpinner,
  IonChip,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sendOutline, sparklesOutline } from 'ionicons/icons';
import { AICoachService, UserContext } from '../../../../core/services/ai-coach.service';

const AGENT_CONFIG = {
  workout: { label: 'Workout', color: 'primary', icon: '💪' },
  nutrition: { label: 'Nutrition', color: 'success', icon: '🥗' },
  recovery: { label: 'Recovery', color: 'tertiary', icon: '😴' },
  motivation: { label: 'Motivation', color: 'warning', icon: '🔥' },
  general: { label: 'General', color: 'medium', icon: '💬' },
};

/**
 * AIChatComponent - AI coach conversation interface
 *
 * Features:
 * - Multi-agent AI chat
 * - Real-time message streaming
 * - Agent indicator (shows which specialist)
 * - Auto-scroll to latest message
 * - Confidence display
 *
 * Usage:
 * <app-ai-chat [userContext]="userContext"></app-ai-chat>
 */
@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonFooter,
    IonToolbar,
    IonTextarea,
    IonButton,
    IonIcon,
    IonSpinner,
    IonChip,
    IonLabel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content [scrollEvents]="true">
      <div class="chat-container">
        <!-- Empty State -->
        @if (aiCoach.messages().length === 0) {
          <div class="empty-state">
            <ion-icon name="sparkles-outline"></ion-icon>
            <h3>AI Fitness Coach</h3>
            <p>Ask me anything about workouts, nutrition, recovery, or motivation!</p>
            <div class="quick-prompts">
              <button class="prompt-chip" (click)="sendQuickPrompt('How much protein should I eat?')">
                Protein guidance
              </button>
              <button class="prompt-chip" (click)="sendQuickPrompt('What exercises for chest?')">
                Exercise ideas
              </button>
              <button class="prompt-chip" (click)="sendQuickPrompt('How to improve my sleep?')">
                Sleep tips
              </button>
            </div>
          </div>
        }

        <!-- Messages -->
        @for (message of aiCoach.messages(); track message.id) {
          <div class="message" [class.user]="message.role === 'user'" [class.assistant]="message.role === 'assistant'">
            <div class="message-content">
              <p>{{ message.content }}</p>
              @if (message.role === 'assistant' && message.agent) {
                <div class="message-meta">
                  <ion-chip size="small" [color]="AGENT_CONFIG[message.agent].color">
                    <span class="agent-icon">{{ AGENT_CONFIG[message.agent].icon }}</span>
                    <ion-label>{{ AGENT_CONFIG[message.agent].label }}</ion-label>
                  </ion-chip>
                  @if (message.confidence && message.confidence < 0.8) {
                    <span class="confidence-low">Low confidence - verify with trainer</span>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Loading Indicator -->
        @if (aiCoach.isProcessing()) {
          <div class="message assistant">
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        }
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <div class="input-container">
          <ion-textarea
            [(ngModel)]="messageText"
            placeholder="Ask your AI coach..."
            rows="1"
            autoGrow="true"
            [maxlength]="500"
            (keydown.enter)="onEnterKey($any($event))"
          ></ion-textarea>
          <ion-button
            fill="solid"
            size="default"
            (click)="sendMessage()"
            [disabled]="!messageText().trim() || aiCoach.isProcessing()"
            aria-label="Send message"
          >
            @if (aiCoach.isProcessing()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon slot="icon-only" name="send-outline"></ion-icon>
            }
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      min-height: 100%;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      text-align: center;
      flex: 1;

      ion-icon {
        font-size: 64px;
        color: var(--ion-color-primary, #10B981);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0 0 24px;
        color: var(--fitos-text-secondary, #A3A3A3);
        max-width: 300px;
        font-size: 14px;
      }
    }

    .quick-prompts {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 300px;
    }

    .prompt-chip {
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: var(--fitos-bg-secondary, #1A1A1A);
      color: var(--fitos-text-primary, #F5F5F5);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      transition: all 150ms ease;

      &:hover {
        border-color: var(--ion-color-primary, #10B981);
        background: var(--fitos-bg-tertiary, #262626);
      }

      &:active {
        transform: scale(0.98);
      }
    }

    .message {
      display: flex;
      flex-direction: column;
      max-width: 80%;

      &.user {
        align-self: flex-end;

        .message-content {
          background: var(--ion-color-primary, #10B981);
          color: white;
          border-radius: 12px 12px 6px 12px;
        }
      }

      &.assistant {
        align-self: flex-start;

        .message-content {
          background: var(--fitos-bg-secondary, #1A1A1A);
          color: var(--fitos-text-primary, #F5F5F5);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px 12px 12px 6px;
        }
      }
    }

    .message-content {
      padding: 12px 16px;

      p {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      ion-chip {
        margin: 0;
        font-size: 11px;
      }

      .agent-icon {
        font-size: 14px;
      }
    }

    .confidence-low {
      font-size: 11px;
      color: #F59E0B;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 8px 0;

      span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--fitos-text-tertiary, #737373);
        animation: typing 1.4s infinite;

        &:nth-child(2) {
          animation-delay: 0.2s;
        }

        &:nth-child(3) {
          animation-delay: 0.4s;
        }
      }
    }

    @keyframes typing {
      0%, 60%, 100% {
        opacity: 0.3;
      }
      30% {
        opacity: 1;
      }
    }

    ion-footer {
      ion-toolbar {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        --border-color: rgba(255, 255, 255, 0.06);
        padding: 8px 12px;
      }
    }

    .input-container {
      display: flex;
      gap: 8px;
      align-items: flex-end;

      ion-textarea {
        flex: 1;
        --background: var(--fitos-bg-tertiary, #262626);
        --color: var(--fitos-text-primary, #F5F5F5);
        --placeholder-color: var(--fitos-text-tertiary, #737373);
        --padding-start: 12px;
        --padding-end: 12px;
        --padding-top: 10px;
        --padding-bottom: 10px;
        border-radius: 12px;
        font-size: 14px;
      }

      ion-button {
        min-width: 44px;
        height: 44px;
        margin: 0;

        ion-spinner {
          --color: white;
        }
      }
    }
  `],
})
export class AIChatComponent {
  aiCoach = inject(AICoachService);

  // Component state
  messageText = signal('');
  AGENT_CONFIG = AGENT_CONFIG;

  // User context (should be passed from parent)
  userContext: UserContext = {
    user_id: 'test-user',
    role: 'client',
    goals: ['muscle_gain'],
    fitness_level: 'intermediate',
  };

  constructor() {
    addIcons({ sendOutline, sparklesOutline });

    // Auto-scroll to bottom when new messages arrive
    effect(() => {
      const messages = this.aiCoach.messages();
      if (messages.length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  async sendMessage(): Promise<void> {
    const text = this.messageText().trim();
    if (!text || this.aiCoach.isProcessing()) return;

    // Clear input
    this.messageText.set('');

    // Send to AI coach
    await this.aiCoach.sendMessage(text, this.userContext);
  }

  async sendQuickPrompt(prompt: string): Promise<void> {
    this.messageText.set(prompt);
    await this.sendMessage();
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.shiftKey) {
      // Allow Shift+Enter for new line
      return;
    }
    event.preventDefault();
    this.sendMessage();
  }

  private scrollToBottom(): void {
    const content = document.querySelector('ion-content');
    content?.scrollToBottom(300);
  }
}
