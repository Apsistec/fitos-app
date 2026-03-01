import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/services/auth.service';
import { ProgressPhotosComponent } from '../../components/progress-photos/progress-photos.component';

/**
 * Client-facing standalone page for viewing and managing personal progress photos.
 * Route: /tabs/workouts/progress-photos
 *
 * Trainer view uses the `app-progress-photos` component directly inside
 * `ClientDetailPage` under the "Photos" tab (no separate page needed).
 */
@Component({
  selector: 'app-progress-photos-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    ProgressPhotosComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts"></ion-back-button>
        </ion-buttons>
        <ion-title>My Progress Photos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (clientId()) {
        <app-progress-photos
          [clientId]="clientId()!"
          [isTrainerView]="isTrainerView()"
        />
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }
    ion-title { font-size: 18px; font-weight: 700; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }
  `],
})
export class ProgressPhotosPage implements OnInit {
  private auth = inject(AuthService);

  clientId = signal<string | null>(null);
  // Client self-view — not the trainer panel
  isTrainerView = signal(false);

  ngOnInit(): void {
    const userId = this.auth.user()?.id;
    if (userId) this.clientId.set(userId);
  }
}
