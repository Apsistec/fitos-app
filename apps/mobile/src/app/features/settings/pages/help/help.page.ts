import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonListHeader,
  IonLabel,
  IonText,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  rocketOutline,
  helpCircleOutline,
  bookOutline,
  mailOutline,
  searchOutline,
  chevronForward,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { HelpSearchComponent } from '../../../help/components/help-search/help-search.component';
import { HelpCardComponent } from '../../../help/components/help-card/help-card.component';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-help',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonListHeader,
    IonLabel,
    IonText,
    IonNote,
    HelpSearchComponent,
    HelpCardComponent,
  ],
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
})
export class HelpPage {
  private router = inject(Router);
  private authService = inject(AuthService);

  // Quick actions available to all users
  quickActions = computed<QuickAction[]>(() => {
    const isTrainer = this.authService.isTrainer();
    const isOwner = this.authService.isOwner();

    const baseActions: QuickAction[] = [
      {
        title: 'Getting Started',
        description: 'Step-by-step guide to get you up and running',
        icon: 'rocket-outline',
        route: '/tabs/settings/help/getting-started',
        color: 'primary',
      },
      {
        title: 'FAQs',
        description: 'Find answers to commonly asked questions',
        icon: 'help-circle-outline',
        route: '/tabs/settings/help/faq',
        color: 'secondary',
      },
      {
        title: 'Feature Guides',
        description: 'Learn how to use specific features',
        icon: 'book-outline',
        route: '/tabs/settings/help/center',
        color: 'tertiary',
      },
      {
        title: 'Contact Support',
        description: 'Get help from our support team',
        icon: 'mail-outline',
        route: '/tabs/settings/help/contact',
        color: 'success',
      },
    ];

    return baseActions;
  });

  // Role-specific quick links
  roleSpecificLinks = computed(() => {
    const isTrainer = this.authService.isTrainer();
    const isOwner = this.authService.isOwner();

    if (isOwner || isTrainer) {
      return [
        {
          title: 'Workout Builder Guide',
          slug: 'workout-builder',
        },
        {
          title: 'CRM Pipeline Guide',
          slug: 'crm-pipeline',
        },
        {
          title: 'Email Marketing Guide',
          slug: 'email-marketing',
        },
      ];
    }

    return [
      {
        title: 'Voice Logging Guide',
        slug: 'voice-workout-logging',
      },
      {
        title: 'Photo Nutrition Guide',
        slug: 'photo-nutrition',
      },
      {
        title: 'AI Coaching Guide',
        slug: 'ai-coaching-chat',
      },
    ];
  });

  appVersion = signal('1.0.0'); // TODO: Get from environment

  constructor() {
    addIcons({
      rocketOutline,
      helpCircleOutline,
      bookOutline,
      mailOutline,
      searchOutline,
      chevronForward,
    });
  }

  onSearchResultSelected(result: any) {
    this.router.navigateByUrl(result.route);
  }

  navigateToGuide(slug: string) {
    this.router.navigate(['/tabs/settings/help/guide', slug]);
  }
}
