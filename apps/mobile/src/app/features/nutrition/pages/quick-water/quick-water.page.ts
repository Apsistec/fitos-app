import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  ModalController,
} from '@ionic/angular/standalone';
import { QuickWaterComponent } from '../../components/quick-water/quick-water.component';

/**
 * Thin page that immediately opens the QuickWaterComponent modal.
 * This page exists so the Angular router can navigate to '/tabs/nutrition/water'
 * (from app shortcuts and deep links) and still present the modal UX.
 * On modal dismiss it navigates back to the nutrition tab.
 */
@Component({
  selector: 'app-quick-water-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/nutrition"></ion-back-button>
        </ion-buttons>
        <ion-title>Water</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content></ion-content>
  `,
})
export class QuickWaterPage implements OnInit {
  private modalController = inject(ModalController);
  private router = inject(Router);

  async ngOnInit(): Promise<void> {
    await this.openWaterModal();
  }

  private async openWaterModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: QuickWaterComponent,
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
      handleBehavior: 'cycle',
    });

    await modal.present();

    // When modal closes, go back to nutrition tab
    await modal.onDidDismiss();
    await this.router.navigate(['/tabs/nutrition']);
  }
}
