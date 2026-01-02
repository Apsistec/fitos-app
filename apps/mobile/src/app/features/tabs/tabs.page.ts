import { Component, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  home,
  barbellOutline,
  barbell,
  nutritionOutline,
  nutrition,
  peopleOutline,
  people,
  settingsOutline,
  settings,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-tabs',
  imports: [

    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel
],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <!-- Client and Trainer: Workouts tab -->
        @if (isClient() || isTrainer()) {
          <ion-tab-button tab="workouts">
            <ion-icon name="barbell-outline"></ion-icon>
            <ion-label>Workouts</ion-label>
          </ion-tab-button>
        }

        <!-- Client and Trainer: Nutrition tab -->
        @if (isClient() || isTrainer()) {
          <ion-tab-button tab="nutrition">
            <ion-icon name="nutrition-outline"></ion-icon>
            <ion-label>Nutrition</ion-label>
          </ion-tab-button>
        }

        <!-- Trainer and Owner: Clients/Members tab -->
        @if (isTrainer() || isOwner()) {
          <ion-tab-button tab="clients">
            <ion-icon name="people-outline"></ion-icon>
            <ion-label>{{ isOwner() ? 'Members' : 'Clients' }}</ion-label>
          </ion-tab-button>
        }

        <ion-tab-button tab="settings">
          <ion-icon name="settings-outline"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: var(--ion-card-background, #fff);
      border-top: 1px solid var(--ion-color-light-shade);
    }

    ion-tab-button {
      --color: var(--ion-color-medium);
      --color-selected: var(--ion-color-primary);
    }
  `],
})
export class TabsPage {
  private authService = inject(AuthService);

  isTrainer = this.authService.isTrainer;
  isClient = this.authService.isClient;
  isOwner = this.authService.isOwner;

  constructor() {
    addIcons({
      homeOutline,
      home,
      barbellOutline,
      barbell,
      nutritionOutline,
      nutrition,
      peopleOutline,
      people,
      settingsOutline,
      settings,
    });
  }
}
