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
import { Lead } from '../../../../core/services/lead.service';

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
        @if (lead().next_follow_up && isOverdue(lead().next_follow_up!)) {
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
      transition: all 150ms ease;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;

      &:hover {
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      &.cdk-drag-preview {
        opacity: 0.8;
        transform: rotate(2deg);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        border-color: var(--ion-color-primary, #10B981);
      }

      &.cdk-drag-animating {
        transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
      }

      &.cdk-drag-placeholder {
        opacity: 0.3;
        border: 2px dashed rgba(255, 255, 255, 0.12);
        background: transparent;
      }

      ion-card-content {
        padding: 12px;
      }
    }

    .lead-name {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .lead-contact {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
    }

    .lead-email {
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .lead-phone {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .lead-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      ion-chip {
        margin: 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }
    }

    .lead-value {
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: #10B981;
    }

    .follow-up-alert {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      padding: 8px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 6px;
      font-size: 11px;
      color: #EF4444;

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
