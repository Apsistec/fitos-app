/**
 * FAQ Accordion Component
 *
 * Reusable accordion item for displaying FAQ questions and answers.
 * Supports HTML content rendering and feedback mechanism.
 */

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import {
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronDownOutline,
  chevronUpOutline,
  thumbsUpOutline,
  thumbsDownOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  imports: [IonItem, IonLabel, IonIcon, IonButton],
  templateUrl: './faq-accordion.component.html',
  styleUrls: ['./faq-accordion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FAQAccordionComponent {
  question = input.required<string>();
  answer = input.required<string>();
  expanded = input<boolean>(false);

  toggleExpanded = output<void>();
  feedbackHelpful = output<void>();
  feedbackNotHelpful = output<void>();

  constructor() {
    addIcons({
      chevronDownOutline,
      chevronUpOutline,
      thumbsUpOutline,
      thumbsDownOutline,
    });
  }

  onToggle(): void {
    this.toggleExpanded.emit();
  }

  onHelpful(): void {
    this.feedbackHelpful.emit();
  }

  onNotHelpful(): void {
    this.feedbackNotHelpful.emit();
  }
}
