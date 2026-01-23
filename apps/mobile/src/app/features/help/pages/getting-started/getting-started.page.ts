/**
 * Getting Started Page
 *
 * Role-specific onboarding checklist with progress tracking.
 * Stores completion status in localStorage via HelpService.
 */

import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
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
  IonButton,
  IonProgressBar,
  IonBadge,
  AlertController,
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
    IonButton,
    IonProgressBar,
    IonBadge
],
  templateUrl: './getting-started.page.html',
  styleUrls: ['./getting-started.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GettingStartedPage {
  private helpService = inject(HelpService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);

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

  onStepClick(step: GettingStartedStep): void {
    // Toggle completion
    if (step.completed) {
      this.helpService.markStepIncomplete(step.id);
    } else {
      this.helpService.markStepComplete(step.id);
    }
  }

  onStepNavigate(step: GettingStartedStep, event: Event): void {
    event.stopPropagation();
    if (step.route) {
      this.router.navigate([step.route]);
    }
  }

  async onResetProgress(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Reset Progress?',
      message: 'This will uncheck all completed steps. Your actual data will not be affected.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            this.helpService.resetProgress();
          },
        },
      ],
    });

    await alert.present();
  }
}
