import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonAvatar,
  IonIcon,
  IonBadge,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, sparklesOutline } from 'ionicons/icons';
import { ChatMessage } from '../../../../core/services/ai-coach.service';

/**
 * ChatMessageComponent - Individual chat message bubble
 *
 * Features:
 * - User/assistant message styling
 * - Avatar display
 * - Timestamp formatting
 * - Agent badge (workout/nutrition/recovery)
 * - Markdown rendering (future: add markdown library)
 * - Confidence indicator for low confidence (<70%)
 *
 * Usage:
 * ```html
 * <app-chat-message [message]="message" />
 * ```
 */
@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [
    CommonModule,
    IonAvatar,
    IonIcon,
    IonBadge,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="chat-message"
      [class.user-message]="message().role === 'user'"
      [class.assistant-message]="message().role === 'assistant'"
    >
      <!-- Avatar -->
      <div class="avatar-container">
        @if (message().role === 'assistant') {
          <ion-avatar class="avatar">
            <ion-icon name="sparkles-outline"></ion-icon>
          </ion-avatar>
        } @else {
          <ion-avatar class="avatar">
            <ion-icon name="person-circle-outline"></ion-icon>
          </ion-avatar>
        }
      </div>

      <!-- Message Content -->
      <div class="message-content">
        <!-- Message Header -->
        <div class="message-header">
          <span class="message-role">
            {{ message().role === 'assistant' ? 'AI Coach' : 'You' }}
          </span>

          @if (message().agent && message().role === 'assistant') {
            <ion-badge [color]="getAgentColor(message().agent!)" class="agent-badge">
              {{ getAgentLabel(message().agent!) }}
            </ion-badge>
          }

          <span class="message-time">
            {{ formatTime(message().timestamp) }}
          </span>
        </div>

        <!-- Message Body -->
        <div class="message-body">
          <!-- TODO: Add markdown rendering here -->
          <p [innerHTML]="formatContent(message().content)"></p>
        </div>

        <!-- Low Confidence Warning -->
        @if (message().confidence && message().confidence! < 0.7) {
          <div class="confidence-warning">
            <ion-icon name="warning-outline"></ion-icon>
            <ion-text color="warning">
              <small>I'm not very confident about this answer. Consider asking your trainer.</small>
            </ion-text>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-message {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      padding: 0 16px;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .user-message {
      flex-direction: row-reverse;
    }

    .avatar-container {
      flex-shrink: 0;
    }

    .avatar {
      width: 40px;
      height: 40px;
      background: var(--fitos-bg-tertiary, #262626);
      display: flex;
      align-items: center;
      justify-content: center;

      ion-icon {
        font-size: 24px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .assistant-message .avatar {
      background: linear-gradient(135deg, var(--ion-color-primary, #10B981), #8B5CF6);

      ion-icon {
        color: white;
      }
    }

    .message-content {
      flex: 1;
      max-width: 70%;
      min-width: 0;
    }

    .user-message .message-content {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .user-message .message-header {
      flex-direction: row-reverse;
    }

    .message-role {
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .agent-badge {
      font-size: 11px;
      padding: 2px 8px;
      text-transform: capitalize;
    }

    .message-time {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      margin-left: auto;
    }

    .user-message .message-time {
      margin-left: 0;
      margin-right: auto;
    }

    .message-body {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 12px;
      word-wrap: break-word;
    }

    .user-message .message-body {
      background: var(--ion-color-primary, #10B981);
      border-color: var(--ion-color-primary, #10B981);
      color: white;
    }

    .message-body p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .confidence-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid #F59E0B;
      border-radius: 8px;

      ion-icon {
        flex-shrink: 0;
        font-size: 16px;
        color: #F59E0B;
      }

      small {
        font-size: 12px;
        line-height: 1.4;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .chat-message {
        animation: none;
      }
    }

    @media (max-width: 640px) {
      .message-content {
        max-width: 80%;
      }
    }
  `],
})
export class ChatMessageComponent {
  // Inputs
  message = input.required<ChatMessage>();

  constructor() {
    addIcons({ personCircleOutline, sparklesOutline });
  }

  /**
   * Get agent badge color
   */
  getAgentColor(agent: string): string {
    const colors: Record<string, string> = {
      workout: 'primary',
      nutrition: 'success',
      recovery: 'tertiary',
      motivation: 'secondary',
      general: 'medium',
    };
    return colors[agent] || 'medium';
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
   * Format timestamp to relative time
   */
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    // Format as date if older than a week
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Format message content
   * TODO: Add markdown rendering library (e.g., marked.js)
   */
  formatContent(content: string): string {
    // Basic formatting for now
    let formatted = content;

    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');

    // Bold text **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic text *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert URLs to links
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    return formatted;
  }
}
