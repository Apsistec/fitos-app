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
import { AICoachService, ChatMessage, UserContext } from '@app/core/services/ai-coach.service';

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
      --background: var(--fitos-bg-primary);
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-3);
      padding: var(--fitos-space-4);
      min-height: 100%;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--fitos-space-8) var(--fitos-space-4);
      text-align: center;
      flex: 1;

      ion-icon {
        font-size: 64px;
        color: var(--fitos-accent-primary);
        margin-bottom: var(--fitos-space-4);
      }

      h3 {
        margin: 0 0 var(--fitos-space-2);
        font-size: var(--fitos-text-2xl);
        font-weight: 700;
        color: var(--fitos-text-primary);
      }

      p {
        margin: 0 0 var(--fitos-space-6);
        color: var(--fitos-text-secondary);
        max-width: 300px;
      }
    }

    .quick-prompts {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-2);
      width: 100%;
      max-width: 300px;
    }

    .prompt-chip {
      padding: var(--fitos-space-3) var(--fitos-space-4);
      border-radius: var(--fitos-radius-lg);
      border: 1px solid var(--fitos-border-default);
      background: var(--fitos-bg-secondary);
      color: var(--fitos-text-primary);
      font-size: var(--fitos-text-sm);
      text-align: left;
      cursor: pointer;
      transition: all var(--fitos-duration-fast);

      &:hover {
        border-color: var(--fitos-accent-primary);
        background: var(--fitos-bg-tertiary);
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
          background: var(--fitos-accent-primary);
          color: white;
          border-radius: var(--fitos-radius-lg) var(--fitos-radius-lg) var(--fitos-radius-sm) var(--fitos-radius-lg);
        }
      }

      &.assistant {
        align-self: flex-start;

        .message-content {
          background: var(--fitos-bg-secondary);
          color: var(--fitos-text-primary);
          border: 1px solid var(--fitos-border-subtle);
          border-radius: var(--fitos-radius-lg) var(--fitos-radius-lg) var(--fitos-radius-lg) var(--fitos-radius-sm);
        }
      }
    }

    .message-content {
      padding: var(--fitos-space-3) var(--fitos-space-4);

      p {
        margin: 0;
        font-size: var(--fitos-text-base);
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      margin-top: var(--fitos-space-2);
      padding-top: var(--fitos-space-2);
      border-top: 1px solid var(--fitos-border-subtle);

      ion-chip {
        margin: 0;
        font-size: var(--fitos-text-xs);
      }

      .agent-icon {
        font-size: 14px;
      }
    }

    .confidence-low {
      font-size: var(--fitos-text-xs);
      color: var(--fitos-status-warning);
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: var(--fitos-space-2) 0;

      span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--fitos-text-tertiary);
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
        --background: var(--fitos-bg-secondary);
        --border-color: var(--fitos-border-default);
        padding: var(--fitos-space-2) var(--fitos-space-3);
      }
    }

    .input-container {
      display: flex;
      gap: var(--fitos-space-2);
      align-items: flex-end;

      ion-textarea {
        flex: 1;
        --background: var(--fitos-bg-tertiary);
        --color: var(--fitos-text-primary);
        --placeholder-color: var(--fitos-text-tertiary);
        --padding-start: 12px;
        --padding-end: 12px;
        --padding-top: 10px;
        --padding-bottom: 10px;
        border-radius: var(--fitos-radius-lg);
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
