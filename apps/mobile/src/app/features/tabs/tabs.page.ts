import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
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
  homeOutline, home,
  barbellOutline, barbell,
  nutritionOutline, nutrition,
  peopleOutline, people,
  personOutline, person,
  chatbubblesOutline, chatbubbles,
  settingsOutline, settings,
  sparklesOutline, sparkles,
  briefcaseOutline, briefcase,
  ellipsisHorizontalOutline, ellipsisHorizontal,
  calendarOutline, calendar,
  storefrontOutline, storefront,
  cloudOfflineOutline,
} from 'ionicons/icons';
import { TabConfigService } from '../../core/services/tab-config.service';
import { MessagingService } from '../../core/services/messaging.service';
import { SyncService } from '../../core/services/sync.service';

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
      <!-- Sprint 65: Offline indicator banner -->
      @if (showOfflineBanner()) {
        <div class="offline-banner">
          <ion-icon name="cloud-offline-outline"></ion-icon>
          <span>
            @if (syncService.hasPendingChanges()) {
              Offline — {{ syncService.pendingCount() }} change{{ syncService.pendingCount() > 1 ? 's' : '' }} will sync when reconnected
            } @else {
              Offline — data will sync when reconnected
            }
          </span>
        </div>
      }

      <ion-tab-bar slot="bottom">
        @for (tab of tabConfig.tabs(); track tab.route) {
          <ion-tab-button [tab]="tab.route">
            <ion-icon [name]="tab.icon"></ion-icon>
            <ion-label>{{ tab.label }}</ion-label>
            <!-- Sprint 65: badge moved from 'more' to 'dashboard' since Shop replaced More -->
            @if (tab.route === 'dashboard' && unreadCount() > 0) {
              <ion-badge color="danger">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</ion-badge>
            }
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    /* ── Sprint 65: Offline banner ────────────────────────── */
    .offline-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--fitos-bg-secondary, #171717);
      border-top: 1px solid rgba(245, 158, 11, 0.25);
      color: #F59E0B;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.2px;

      ion-icon {
        font-size: 16px;
        flex-shrink: 0;
      }
    }

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
export class TabsPage {
  readonly tabConfig = inject(TabConfigService);
  private messagingService = inject(MessagingService);
  syncService = inject(SyncService); // Public for template

  readonly unreadCount = this.messagingService.totalUnreadSignal;

  /** Show banner when offline; auto-dismiss when back online */
  showOfflineBanner = computed(() => !this.syncService.isOnline());

  constructor() {
    addIcons({
      homeOutline, home,
      barbellOutline, barbell,
      nutritionOutline, nutrition,
      peopleOutline, people,
      personOutline, person,
      chatbubblesOutline, chatbubbles,
      settingsOutline, settings,
      sparklesOutline, sparkles,
      briefcaseOutline, briefcase,
      ellipsisHorizontalOutline, ellipsisHorizontal,
      calendarOutline, calendar,
      storefrontOutline, storefront,
      cloudOfflineOutline,
    });

    // Load conversations for unread count
    this.messagingService.loadConversations();
  }
}
