import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonList, IonItem, IonIcon, IonLabel, IonBadge,
  IonItemGroup, IonItemDivider,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubblesOutline, settingsOutline, helpCircleOutline,
  trophyOutline, sparklesOutline, analyticsOutline,
  walletOutline, funnelOutline, mailOutline,
  personCircleOutline, shieldCheckmarkOutline,
  documentTextOutline, peopleOutline, logOutOutline,
  clipboardOutline, timerOutline, megaphoneOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { MessagingService } from '../../core/services/messaging.service';

interface MoreMenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: () => number;
  subtitle?: string;
}

interface MoreMenuSection {
  title: string;
  items: MoreMenuItem[];
}

@Component({
  selector: 'app-more',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonList, IonItem, IonIcon, IonLabel, IonBadge,
    IonItemGroup, IonItemDivider,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>More</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @for (section of sections(); track section.title) {
        <ion-item-group>
          <ion-item-divider>
            <ion-label>{{ section.title }}</ion-label>
          </ion-item-divider>

          @for (item of section.items; track item.route) {
            <ion-item [button]="true" [detail]="true" (click)="navigate(item.route)">
              <ion-icon [name]="item.icon" slot="start" color="primary"></ion-icon>
              <ion-label>
                <h3>{{ item.label }}</h3>
                @if (item.subtitle) {
                  <p>{{ item.subtitle }}</p>
                }
              </ion-label>
              @if (item.badge && item.badge() > 0) {
                <ion-badge slot="end" color="danger">{{ item.badge() }}</ion-badge>
              }
            </ion-item>
          }
        </ion-item-group>
      }

      <!-- Sign Out -->
      <ion-list class="sign-out-section">
        <ion-item [button]="true" (click)="signOut()" [detail]="false">
          <ion-icon name="log-out-outline" slot="start" color="danger"></ion-icon>
          <ion-label color="danger">Sign Out</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    ion-item-divider {
      --background: transparent;
      --color: var(--fitos-text-tertiary, #737373);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-height: 40px;
      padding-top: 16px;
    }

    ion-item {
      --background: transparent;
      --border-color: rgba(255, 255, 255, 0.06);

      h3 {
        font-size: 16px;
        font-weight: 500;
      }

      p {
        font-size: 13px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .sign-out-section {
      margin-top: 24px;
      background: transparent;
    }
  `],
})
export class MorePage {
  private auth = inject(AuthService);
  private messaging = inject(MessagingService);
  private router = inject(Router);

  private unreadCount = this.messaging.totalUnreadSignal;

  sections = computed<MoreMenuSection[]>(() => {
    const role = this.auth.profile()?.role;

    const commonSections: MoreMenuSection[] = [
      {
        title: 'Communication',
        items: [
          { label: 'Messages', icon: 'chatbubbles-outline', route: '/tabs/messages', badge: this.unreadCount, subtitle: 'Chat with your team' },
        ],
      },
    ];

    const settingsSections: MoreMenuSection[] = [
      {
        title: 'Account',
        items: [
          { label: 'Profile', icon: 'person-circle-outline', route: '/tabs/settings/profile', subtitle: 'Edit your profile' },
          { label: 'Settings', icon: 'settings-outline', route: '/tabs/settings', subtitle: 'App preferences' },
          { label: 'Help Center', icon: 'help-circle-outline', route: '/tabs/settings/help', subtitle: 'FAQs and support' },
        ],
      },
    ];

    switch (role) {
      case 'client':
        return [
          ...commonSections,
          {
            title: 'Social',
            items: [
              { label: 'Leaderboard', icon: 'trophy-outline', route: '/tabs/social/leaderboard', subtitle: 'See how you rank' },
            ],
          },
          ...settingsSections,
        ];

      case 'trainer':
        return [
          ...commonSections,
          {
            title: 'AI & Coaching',
            items: [
              { label: 'AI Coach', icon: 'sparkles-outline', route: '/tabs/coaching', subtitle: 'AI coaching assistant' },
              { label: 'Coach Brain', icon: 'clipboard-outline', route: '/tabs/coaching/methodology-setup', subtitle: 'Setup your AI methodology' },
            ],
          },
          {
            title: 'Analytics',
            items: [
              { label: 'Growth Analytics', icon: 'trending-up-outline', route: '/tabs/analytics/growth', subtitle: 'Cohort retention & KPIs' },
              { label: 'CRM Pipeline', icon: 'funnel-outline', route: '/tabs/crm', subtitle: 'Lead management' },
            ],
          },
          ...settingsSections,
        ];

      case 'gym_owner':
        return [
          ...commonSections,
          {
            title: 'Analytics & Reports',
            items: [
              { label: 'Facility Analytics', icon: 'analytics-outline', route: '/tabs/analytics', subtitle: 'Utilization & KPIs' },
              { label: 'Growth Analytics', icon: 'trending-up-outline', route: '/tabs/analytics/growth', subtitle: 'Cohort retention & referrals' },
              { label: 'CRM Pipeline', icon: 'funnel-outline', route: '/tabs/crm', subtitle: 'Lead management' },
              { label: 'Email Campaigns', icon: 'megaphone-outline', route: '/tabs/crm/campaigns', subtitle: 'Campaigns & outreach' },
            ],
          },
          {
            title: 'Administration',
            items: [
              { label: 'Staff Permissions', icon: 'shield-checkmark-outline', route: '/tabs/settings/staff-permissions', subtitle: 'Manage staff access' },
              { label: 'Payroll Report', icon: 'document-text-outline', route: '/tabs/settings/payroll-report', subtitle: 'Staff pay & compensation' },
            ],
          },
          ...settingsSections,
        ];

      default:
        return [...commonSections, ...settingsSections];
    }
  });

  constructor() {
    addIcons({
      chatbubblesOutline, settingsOutline, helpCircleOutline,
      trophyOutline, sparklesOutline, analyticsOutline,
      walletOutline, funnelOutline, mailOutline,
      personCircleOutline, shieldCheckmarkOutline,
      documentTextOutline, peopleOutline, logOutOutline,
      clipboardOutline, timerOutline, megaphoneOutline,
      trendingUpOutline,
    });
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
