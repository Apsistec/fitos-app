import { Component, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
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
  imports: [CommonModule, IonButton, IonIcon],
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
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-secondary);
      border-top: 1px solid var(--fitos-border-subtle);
    }

    .actions-header {
      margin-bottom: var(--fitos-space-4);
      text-align: center;
    }

    .actions-header h3 {
      margin: 0 0 var(--fitos-space-1) 0;
      font-size: var(--fitos-text-lg);
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .subtitle {
      margin: 0;
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-tertiary);
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--fitos-space-3);
    }

    .action-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--fitos-space-2);
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-primary);
      border: 1px solid var(--fitos-border-subtle);
      border-radius: var(--fitos-radius-lg);
      cursor: pointer;
      transition: all var(--fitos-duration-fast) var(--fitos-ease-default);
      min-height: 100px;
      text-align: center;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--fitos-glow-primary);
        border-color: var(--fitos-accent-primary);
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
      transition: all var(--fitos-duration-fast);

      ion-icon {
        font-size: 24px;
      }
    }

    .action-button[data-color="nutrition"] .action-icon {
      background: rgba(16, 185, 129, 0.15);
      color: var(--fitos-nutrition-protein);
    }

    .action-button[data-color="progress"] .action-icon {
      background: rgba(59, 130, 246, 0.15);
      color: #3B82F6;
    }

    .action-button[data-color="workout"] .action-icon {
      background: rgba(139, 92, 246, 0.15);
      color: var(--fitos-accent-secondary);
    }

    .action-button[data-color="trainer"] .action-icon {
      background: rgba(245, 158, 11, 0.15);
      color: var(--fitos-status-warning);
    }

    .action-button:hover[data-color="nutrition"] {
      border-color: var(--fitos-nutrition-protein);
    }

    .action-button:hover[data-color="progress"] {
      border-color: #3B82F6;
    }

    .action-button:hover[data-color="workout"] {
      border-color: var(--fitos-accent-secondary);
    }

    .action-button:hover[data-color="trainer"] {
      border-color: var(--fitos-status-warning);
    }

    .action-label {
      font-size: var(--fitos-text-sm);
      font-weight: 500;
      color: var(--fitos-text-primary);
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
