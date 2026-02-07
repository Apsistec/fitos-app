/**
 * Getting Started Page
 *
 * Role-specific onboarding checklist with progress tracking.
 * Completion is derived from real app state — steps auto-complete
 * when the user has actually performed the required actions.
 */

import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
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
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonProgressBar,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  checkmarkCircleOutline,
  chevronForwardOutline,
  refreshOutline,
  rocketOutline,
} from 'ionicons/icons';
import { HelpService } from '../../services/help.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { GettingStartedGuide, GettingStartedStep } from '@fitos/libs';

@Component({
  selector: 'app-getting-started',
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
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonProgressBar,
    IonBadge,
  ],
  templateUrl: './getting-started.page.html',
  styleUrls: ['./getting-started.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GettingStartedPage implements ViewWillEnter {
  private helpService = inject(HelpService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Computed guide for current user role
  guide = computed<GettingStartedGuide | undefined>(() => {
    const role = this.authService.profile()?.role;
    if (!role) return undefined;
    return this.helpService.getGettingStartedGuide(role);
  });

  // Progress calculation
  progress = computed(() => {
    const role = this.authService.profile()?.role;
    if (!role) return { completed: 0, total: 0, percentage: 0 };
    return this.helpService.getGuideProgress(role);
  });

  // Check if all steps are complete
  isComplete = computed(() => {
    const prog = this.progress();
    return prog.total > 0 && prog.completed === prog.total;
  });

  constructor() {
    addIcons({
      checkmarkCircle,
      checkmarkCircleOutline,
      chevronForwardOutline,
      refreshOutline,
      rocketOutline,
    });
  }

  ionViewWillEnter(): void {
    // Refresh completion data every time the page is shown,
    // so steps that were just completed in other parts of the app
    // are reflected immediately.
    this.helpService.refreshCompletionData();
  }

  onStepClick(step: GettingStartedStep): void {
    if (step.route) {
      this.router.navigate([step.route]);
    }
  }
}
