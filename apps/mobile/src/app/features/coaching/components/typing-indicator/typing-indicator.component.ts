import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonAvatar, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sparklesOutline } from 'ionicons/icons';

/**
 * TypingIndicatorComponent - Three-dot animation while AI is thinking
 *
 * Features:
 * - Smooth three-dot animation
 * - Consistent with message bubble styling
 * - Avatar to match assistant messages
 *
 * Usage:
 * ```html
 * @if (isProcessing()) {
 *   <app-typing-indicator />
 * }
 * ```
 */
@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule, IonAvatar, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="typing-indicator">
      <!-- Avatar -->
      <div class="avatar-container">
        <ion-avatar class="avatar">
          <ion-icon name="sparkles-outline"></ion-icon>
        </ion-avatar>
      </div>

      <!-- Typing Dots -->
      <div class="typing-content">
        <div class="typing-bubble">
          <div class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
        <span class="typing-text">AI Coach is thinking...</span>
      </div>
    </div>
  `,
  styles: [`
    .typing-indicator {
      display: flex;
      gap: var(--fitos-space-3);
      margin-bottom: var(--fitos-space-4);
      padding: 0 var(--fitos-space-4);
      animation: fadeIn 0.3s var(--fitos-ease-default);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .avatar-container {
      flex-shrink: 0;
    }

    .avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      display: flex;
      align-items: center;
      justify-content: center;

      ion-icon {
        font-size: 24px;
        color: white;
        animation: pulse 2s ease-in-out infinite;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(0.95);
      }
    }

    .typing-content {
      flex: 1;
      max-width: 70%;
    }

    .typing-bubble {
      background: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-subtle);
      border-radius: var(--fitos-radius-lg);
      padding: var(--fitos-space-3);
      display: inline-flex;
      align-items: center;
      min-height: 40px;
    }

    .typing-dots {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--fitos-text-tertiary);
      animation: dotBounce 1.4s ease-in-out infinite;
    }

    .dot:nth-child(1) {
      animation-delay: 0s;
    }

    .dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes dotBounce {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
      }
      30% {
        transform: translateY(-10px);
        opacity: 1;
      }
    }

    .typing-text {
      display: block;
      margin-top: var(--fitos-space-2);
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
      font-style: italic;
    }

    @media (prefers-reduced-motion: reduce) {
      .typing-indicator,
      .avatar ion-icon,
      .dot {
        animation: none !important;
      }

      .typing-text::after {
        content: '';
      }
    }

    @media (max-width: 640px) {
      .typing-content {
        max-width: 80%;
      }
    }
  `],
})
export class TypingIndicatorComponent {
  constructor() {
    addIcons({ sparklesOutline });
  }
}
