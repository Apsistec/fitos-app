import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  nutritionOutline,
  trendingUpOutline,
  barbellOutline,
  chatbubbleEllipsesOutline,
} from 'ionicons/icons';

/**
 * Quick action preset for chat
 */
export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  color: string;
}

/**
 * QuickActionsComponent - Preset prompts for common questions
 *
 * Features:
 * - One-tap shortcuts for common coaching questions
 * - Visual icons and colors for each category
 * - Emits full prompt text for sending
 * - Scrollable horizontal list on mobile
 *
 * Usage:
 * ```html
 * <app-quick-actions (actionSelected)="handleAction($event)" />
 * ```
 */
@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quick-actions">
      <div class="actions-header">
        <h3>Quick Actions</h3>
        <p class="subtitle">Tap to ask common questions</p>
      </div>

      <div class="actions-grid">
        @for (action of quickActions; track action.id) {
          <button
            class="action-button"
            [attr.data-color]="action.color"
            (click)="selectAction(action)"
          >
            <div class="action-icon">
              <ion-icon [name]="action.icon"></ion-icon>
            </div>
            <span class="action-label">{{ action.label }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .quick-actions {
      padding: 16px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .actions-header {
      margin-bottom: 16px;
      text-align: center;
    }

    .actions-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .subtitle {
      margin: 0;
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .action-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: var(--fitos-bg-primary, #0D0D0D);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      cursor: pointer;
      transition: all 150ms ease;
      min-height: 100px;
      text-align: center;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        border-color: var(--ion-color-primary, #10B981);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .action-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;

      ion-icon {
        font-size: 24px;
      }
    }

    .action-button[data-color="nutrition"] .action-icon {
      background: rgba(16, 185, 129, 0.15);
      color: #22C55E;
    }

    .action-button[data-color="progress"] .action-icon {
      background: rgba(59, 130, 246, 0.15);
      color: #3B82F6;
    }

    .action-button[data-color="workout"] .action-icon {
      background: rgba(139, 92, 246, 0.15);
      color: #8B5CF6;
    }

    .action-button[data-color="trainer"] .action-icon {
      background: rgba(245, 158, 11, 0.15);
      color: #F59E0B;
    }

    .action-button:hover[data-color="nutrition"] {
      border-color: #22C55E;
    }

    .action-button:hover[data-color="progress"] {
      border-color: #3B82F6;
    }

    .action-button:hover[data-color="workout"] {
      border-color: #8B5CF6;
    }

    .action-button:hover[data-color="trainer"] {
      border-color: #F59E0B;
    }

    .action-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--fitos-text-primary, #F5F5F5);
      line-height: 1.3;
    }

    @media (max-width: 640px) {
      .actions-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .action-button {
        transition: none;
      }

      .action-button:hover {
        transform: none;
      }
    }
  `],
})
export class QuickActionsComponent {
  // Output
  actionSelected = output<string>();

  // Preset quick actions
  quickActions: QuickAction[] = [
    {
      id: 'nutrition',
      label: 'What should I eat today?',
      prompt: 'Based on my goals and training today, what should I focus on eating? Can you suggest a meal plan?',
      icon: 'nutrition-outline',
      color: 'nutrition',
    },
    {
      id: 'progress',
      label: "How's my progress?",
      prompt: "How am I progressing towards my goals? What areas am I doing well in and where can I improve?",
      icon: 'trending-up-outline',
      color: 'progress',
    },
    {
      id: 'workout',
      label: "Modify today's workout",
      prompt: "I need to adjust today's workout. Can you help me modify it based on how I'm feeling or time constraints?",
      icon: 'barbell-outline',
      color: 'workout',
    },
    {
      id: 'trainer',
      label: 'Talk to my trainer',
      prompt: 'I have a question that needs my trainer. Can you let them know I need help?',
      icon: 'chatbubble-ellipses-outline',
      color: 'trainer',
    },
  ];

  constructor() {
    addIcons({
      nutritionOutline,
      trendingUpOutline,
      barbellOutline,
      chatbubbleEllipsesOutline,
    });
  }

  /**
   * Handle action button click
   */
  selectAction(action: QuickAction): void {
    this.actionSelected.emit(action.prompt);
  }
}
