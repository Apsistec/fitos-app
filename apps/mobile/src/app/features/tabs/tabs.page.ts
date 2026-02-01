import {  Component, inject, OnInit , ChangeDetectionStrategy } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonBadge,
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
  chatbubblesOutline,
  chatbubbles,
  settingsOutline,
  settings,
  sparklesOutline,
  sparkles,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { MessagingService } from '../../core/services/messaging.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonBadge,
  ],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <!-- HOME TAB - All users -->
        <ion-tab-button tab="dashboard">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <!-- WORKOUTS TAB - Clients and Trainers -->
        @if (isClient() || isTrainer()) {
          <ion-tab-button tab="workouts">
            <ion-icon name="barbell-outline"></ion-icon>
            <ion-label>Workouts</ion-label>
          </ion-tab-button>
        }

        <!-- NUTRITION TAB - Clients only -->
        @if (isClient()) {
          <ion-tab-button tab="nutrition">
            <ion-icon name="nutrition-outline"></ion-icon>
            <ion-label>Nutrition</ion-label>
          </ion-tab-button>
        }

        <!-- CLIENTS TAB - Trainers and Owners -->
        @if (isTrainer() || isOwner()) {
          <ion-tab-button tab="clients">
            <ion-icon name="people-outline"></ion-icon>
            <ion-label>{{ isOwner() ? 'Members' : 'Clients' }}</ion-label>
          </ion-tab-button>
        }

        <!-- AI COACH TAB - All users -->
        <ion-tab-button tab="coaching">
          <ion-icon name="sparkles-outline"></ion-icon>
          <ion-label>AI Coach</ion-label>
        </ion-tab-button>

        <!-- MESSAGES TAB - All users -->
        <ion-tab-button tab="messages">
          <ion-icon name="chatbubbles-outline"></ion-icon>
          <ion-label>Messages</ion-label>
          @if (unreadCount() > 0) {
            <ion-badge color="danger">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</ion-badge>
          }
        </ion-tab-button>

        <!-- SETTINGS TAB - All users -->
        <ion-tab-button tab="settings">
          <ion-icon name="settings-outline"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: var(--fitos-bg-primary, #0D0D0D);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    ion-tab-button {
      --color: var(--fitos-text-tertiary, #737373);
      --color-selected: var(--ion-color-primary, #10B981);
      position: relative;
      font-size: 10px;
      letter-spacing: 0.2px;

      ion-icon {
        font-size: 22px;
        margin-bottom: 2px;
      }

      ion-label {
        font-size: 10px;
        font-weight: 500;
      }

      ion-badge {
        position: absolute;
        top: 4px;
        right: calc(50% - 30px);
        font-size: 10px;
        min-width: 18px;
        height: 18px;
        padding: 2px 5px;
        border-radius: 9px;
        --background: #EF4444;
        --color: white;
      }
    }
  `],
})
export class TabsPage implements OnInit {
  private authService = inject(AuthService);
  private messagingService = inject(MessagingService);

  isTrainer = this.authService.isTrainer;
  isClient = this.authService.isClient;
  isOwner = this.authService.isOwner;
  unreadCount = this.messagingService.totalUnreadSignal;

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
      chatbubblesOutline,
      chatbubbles,
      settingsOutline,
      settings,
      sparklesOutline,
      sparkles,
    });
  }

  async ngOnInit() {
    // Load conversations to get initial unread count
    await this.messagingService.loadConversations();
  }
}
