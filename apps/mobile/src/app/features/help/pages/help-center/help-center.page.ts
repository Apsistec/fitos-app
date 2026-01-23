/**
 * Help Center Page
 *
 * Main help hub with search functionality and role-based content filtering.
 * Entry point for all help and documentation features.
 */

import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonListHeader,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  helpCircleOutline,
  bookOutline,
  rocketOutline,
  chatbubbleEllipsesOutline,
  schoolOutline,
  peopleOutline,
  mailOutline,
  statsChartOutline,
  cardOutline,
  watchOutline,
  bugOutline,
} from 'ionicons/icons';
import { HelpSearchComponent } from '../../components/help-search/help-search.component';
import { HelpCardComponent } from '../../components/help-card/help-card.component';
import { HelpService } from '../../services/help.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { HelpCategory } from '@fitos/libs';

@Component({
  selector: 'app-help-center',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonListHeader,
    IonLabel,
    HelpSearchComponent,
    HelpCardComponent
],
  templateUrl: './help-center.page.html',
  styleUrls: ['./help-center.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpCenterPage {
  private helpService = inject(HelpService);
  private authService = inject(AuthService);

  // Computed categories filtered by role
  categories = computed<HelpCategory[]>(() => {
    const role = this.authService.profile()?.role;
    if (!role) return [];
    return this.helpService.getCategories(role);
  });

  // Quick action cards
  quickActions = computed(() => {
    const role = this.authService.profile()?.role;

    const actions = [
      {
        title: 'Getting Started',
        description: 'Step-by-step guide to set up your account',
        icon: 'rocket-outline',
        route: '/tabs/settings/help/getting-started',
        color: 'primary',
        roles: ['client', 'trainer', 'gym_owner'],
      },
      {
        title: 'Frequently Asked Questions',
        description: 'Find quick answers to common questions',
        icon: 'help-circle-outline',
        route: '/tabs/settings/help/faq',
        color: 'secondary',
        roles: ['client', 'trainer', 'gym_owner'],
      },
      {
        title: 'Contact Support',
        description: 'Get help from our support team',
        icon: 'chatbubble-ellipses-outline',
        route: '/tabs/settings/help/contact',
        color: 'tertiary',
        roles: ['client', 'trainer', 'gym_owner'],
      },
    ];

    return actions.filter((action) => action.roles.includes(role!));
  });

  // Feature guides filtered by role
  featuresGuides = computed(() => {
    const role = this.authService.profile()?.role;
    if (!role) return [];

    const guides = this.helpService.getFeatureGuidesByRole(role);
    return guides.map((guide) => ({
      title: guide.title,
      description: guide.description,
      icon: guide.icon,
      route: `/tabs/settings/help/guide/${guide.slug}`,
      color: 'medium',
    }));
  });

  constructor() {
    addIcons({
      helpCircleOutline,
      bookOutline,
      rocketOutline,
      chatbubbleEllipsesOutline,
      schoolOutline,
      peopleOutline,
      mailOutline,
      statsChartOutline,
      cardOutline,
      watchOutline,
      bugOutline,
    });
  }
}
