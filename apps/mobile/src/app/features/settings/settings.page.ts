import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  notificationsOutline,
  moonOutline,
  lockClosedOutline,
  helpCircleOutline,
  documentTextOutline,
  logOutOutline,
  chevronForward,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonToggle,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="settings-container">
        <ion-list>
          <ion-item button detail>
            <ion-icon name="person-outline" slot="start"></ion-icon>
            <ion-label>Edit Profile</ion-label>
          </ion-item>

          <ion-item button detail>
            <ion-icon name="notifications-outline" slot="start"></ion-icon>
            <ion-label>Notifications</ion-label>
          </ion-item>

          <ion-item>
            <ion-icon name="moon-outline" slot="start"></ion-icon>
            <ion-label>Dark Mode</ion-label>
            <ion-toggle slot="end"></ion-toggle>
          </ion-item>
        </ion-list>

        <ion-list>
          <ion-item button detail>
            <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
            <ion-label>Privacy & Security</ion-label>
          </ion-item>

          <ion-item button detail>
            <ion-icon name="help-circle-outline" slot="start"></ion-icon>
            <ion-label>Help & Support</ion-label>
          </ion-item>

          <ion-item button detail>
            <ion-icon name="document-text-outline" slot="start"></ion-icon>
            <ion-label>Terms & Privacy Policy</ion-label>
          </ion-item>
        </ion-list>

        @if (isAuthenticated()) {
          <div class="ion-padding">
            <ion-button expand="block" fill="outline" color="danger" (click)="signOut()">
              <ion-icon name="log-out-outline" slot="start"></ion-icon>
              Sign Out
            </ion-button>
          </div>
        }

        <div class="version-info">
          <p>FitOS v0.1.0</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .settings-container {
      max-width: 768px;
      margin: 0 auto;
    }

    ion-list {
      margin-bottom: 24px;
    }

    .version-info {
      text-align: center;
      padding: 24px;

      p {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 0.875rem;
      }
    }
  `],
})
export class SettingsPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  isAuthenticated = computed(() => this.authService.isAuthenticated());

  constructor() {
    addIcons({
      personOutline,
      notificationsOutline,
      moonOutline,
      lockClosedOutline,
      helpCircleOutline,
      documentTextOutline,
      logOutOutline,
      chevronForward,
    });
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
