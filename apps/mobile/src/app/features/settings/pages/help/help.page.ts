import {  Component, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  mailOutline,
  bookOutline,
  videocamOutline,
  helpCircleOutline,
  chevronForward,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-help',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Help & Support</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="help-container">
        <p>For comprehensive help documentation covering all user types (Clients, Trainers, Gym Owners), please visit the Settings page or contact support.</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .help-container {
      padding: 16px;
    }
  `],
})
export class HelpPage {
  private toastController = inject(ToastController);
  private authService = inject(AuthService);

  selectedUserType = signal<'client' | 'trainer' | 'owner'>(
    this.authService.isOwner() ? 'owner' : this.authService.isTrainer() ? 'trainer' : 'client'
  );

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline,
      mailOutline,
      bookOutline,
      videocamOutline,
      helpCircleOutline,
      chevronForward,
    });
  }

  onUserTypeChange(event: any) {
    this.selectedUserType.set(event.detail.value);
  }

  async openChat() {
    const toast = await this.toastController.create({
      message: 'Live chat coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async sendEmail() {
    window.location.href = 'mailto:support@fitos.app?subject=FitOS Support Request';
  }

  async openGuide() {
    const toast = await this.toastController.create({
      message: 'User guide coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async openVideos() {
    const toast = await this.toastController.create({
      message: 'Video tutorials coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
