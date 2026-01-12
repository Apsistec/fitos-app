import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonChip,
  IonLabel,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { Lead } from '@app/core/services/lead.service';

/**
 * LeadCardComponent - Reusable lead card for pipeline
 *
 * Features:
 * - Displays lead info (name, email, phone)
 * - Shows source and expected value
 * - Overdue follow-up indicator
 * - Click to view details
 */
@Component({
  selector: 'app-lead-card',
  standalone: true,
  imports: [
    IonCard,
    IonCardContent,
    IonChip,
    IonLabel,
    IonIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="lead-card" button (click)="cardClick.emit(lead())">
      <ion-card-content>
        <!-- Lead Name -->
        <h3 class="lead-name">{{ lead().name }}</h3>

        <!-- Contact Info -->
        <div class="lead-contact">
          <span class="lead-email">{{ lead().email }}</span>
          @if (lead().phone) {
            <span class="lead-phone">{{ lead().phone }}</span>
          }
        </div>

        <!-- Source -->
        <div class="lead-meta">
          <ion-chip size="small" outline="true">
            <ion-label>{{ lead().source }}</ion-label>
          </ion-chip>
          @if (lead().expected_value) {
            <span class="lead-value">\${{ lead().expected_value }}</span>
          }
        </div>

        <!-- Follow-up indicator -->
        @if (lead().next_follow_up && isOverdue(lead().next_follow_up)) {
          <div class="follow-up-alert">
            <ion-icon name="calendar-outline"></ion-icon>
            <span>Follow-up overdue</span>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .lead-card {
      margin: 0;
      cursor: move;
      transition: all var(--fitos-duration-fast);
      --background: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-subtle);

      &:hover {
        border-color: var(--fitos-border-default);
        transform: translateY(-2px);
        box-shadow: var(--fitos-shadow-md);
      }

      &.cdk-drag-preview {
        opacity: 0.8;
        transform: rotate(2deg);
        box-shadow: var(--fitos-shadow-lg);
        border-color: var(--fitos-accent-primary);
      }

      &.cdk-drag-animating {
        transition: transform var(--fitos-duration-normal) cubic-bezier(0.2, 0, 0, 1);
      }

      &.cdk-drag-placeholder {
        opacity: 0.3;
        border: 2px dashed var(--fitos-border-default);
        background: transparent;
      }

      ion-card-content {
        padding: var(--fitos-space-3);
      }
    }

    .lead-name {
      margin: 0 0 var(--fitos-space-2);
      font-size: var(--fitos-text-base);
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .lead-contact {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-1);
      margin-bottom: var(--fitos-space-2);
    }

    .lead-email {
      font-size: var(--fitos-text-sm);
      color: var(--fitos-text-secondary);
    }

    .lead-phone {
      font-size: var(--fitos-text-xs);
      color: var(--fitos-text-tertiary);
    }

    .lead-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--fitos-space-2);

      ion-chip {
        margin: 0;
        font-size: var(--fitos-text-xs);
        text-transform: capitalize;
      }
    }

    .lead-value {
      font-family: var(--fitos-font-mono);
      font-size: var(--fitos-text-sm);
      font-weight: 600;
      color: var(--fitos-status-success);
    }

    .follow-up-alert {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-1);
      margin-top: var(--fitos-space-2);
      padding: var(--fitos-space-2);
      background: rgba(239, 68, 68, 0.1);
      border-radius: var(--fitos-radius-sm);
      font-size: var(--fitos-text-xs);
      color: var(--fitos-status-error);

      ion-icon {
        font-size: 14px;
      }
    }
  `],
})
export class LeadCardComponent {
  // Inputs
  lead = input.required<Lead>();

  // Outputs
  cardClick = output<Lead>();

  constructor() {
    addIcons({ calendarOutline });
  }

  /**
   * Check if a date is overdue
   */
  isOverdue(date: string): boolean {
    return new Date(date) < new Date();
  }
}
