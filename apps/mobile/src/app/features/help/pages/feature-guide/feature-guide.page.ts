/**
 * Feature Guide Page
 *
 * Displays detailed documentation for a specific feature.
 * Content includes sections with HTML rendering, tips, and related guides.
 */

import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  bookOutline,
  shareOutline,
  bulbOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { HelpService } from '../../services/help.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { FeatureGuide } from '@fitos/libs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-feature-guide',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonBadge,
    IonButton,
    DatePipe,
  ],
  templateUrl: './feature-guide.page.html',
  styleUrls: ['./feature-guide.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureGuidePage {
  private helpService = inject(HelpService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Get guide from route param
  guide = computed<FeatureGuide | undefined>(() => {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) return undefined;
    return this.helpService.getFeatureGuideBySlug(slug);
  });

  // Related guides
  relatedGuides = computed<FeatureGuide[]>(() => {
    const currentGuide = this.guide();
    const role = this.authService.profile()?.role;
    if (!currentGuide || !role) return [];
    return this.helpService.getRelatedGuides(currentGuide.id, role);
  });

  constructor() {
    addIcons({
      timeOutline,
      bookOutline,
      shareOutline,
      bulbOutline,
      chevronForwardOutline,
    });
  }

  onRelatedGuideClick(guide: FeatureGuide): void {
    this.router.navigate(['/tabs/settings/help/guide', guide.slug]);
  }

  async onShareGuide(): Promise<void> {
    const currentGuide = this.guide();
    if (!currentGuide) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentGuide.title,
          text: currentGuide.description,
          url: window.location.href,
        });
      } catch {
        // User cancelled share or error occurred
        console.log('Share cancelled or failed');
      }
    }
  }
}
