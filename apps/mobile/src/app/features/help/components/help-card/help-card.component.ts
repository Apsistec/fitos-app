/**
 * Help Card Component
 *
 * Reusable card component for displaying help categories and quick links.
 * Follows FitOS Design System with dark-first approach and proper touch targets.
 */

import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonIcon,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-help-card',
  standalone: true,
  imports: [
    RouterLink,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonIcon,
    IonBadge
],
  templateUrl: './help-card.component.html',
  styleUrls: ['./help-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpCardComponent {
  title = input.required<string>();
  description = input.required<string>();
  icon = input.required<string>();
  route = input.required<string>();
  articleCount = input<number>();
  color = input<string>('primary');

  constructor() {
    addIcons({ chevronForwardOutline });
  }
}
