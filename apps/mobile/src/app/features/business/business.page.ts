import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonIcon, IonGrid, IonRow, IonCol, IonChip, IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  walletOutline, cashOutline, receiptOutline,
  pricetagsOutline, funnelOutline, mailOutline,
  analyticsOutline, trendingUpOutline, cardOutline,
  storefrontOutline, statsChartOutline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

interface BusinessCard {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-business',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonIcon, IonGrid, IonRow, IonCol, IonChip, IonLabel,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Business</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="stat-card">
          <span class="stat-value">$0</span>
          <span class="stat-label">This Month</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">0</span>
          <span class="stat-label">Active {{ isOwner() ? 'Members' : 'Clients' }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">0</span>
          <span class="stat-label">Leads</span>
        </div>
      </div>

      <!-- Business Tools Grid -->
      <h2 class="section-title">Business Tools</h2>
      <ion-grid>
        <ion-row>
          @for (card of businessCards(); track card.title) {
            <ion-col size="6">
              <ion-card button (click)="navigate(card.route)" class="tool-card">
                <ion-card-content>
                  <div class="tool-icon" [style.background]="card.color + '20'">
                    <ion-icon [name]="card.icon" [style.color]="card.color"></ion-icon>
                  </div>
                  <h3>{{ card.title }}</h3>
                  <p>{{ card.subtitle }}</p>
                </ion-card-content>
              </ion-card>
            </ion-col>
          }
        </ion-row>
      </ion-grid>
    </ion-content>
  `,
  styles: [`
    .quick-stats {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .stat-card {
      flex: 1;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: var(--fitos-accent, #00ff88);
    }

    .stat-label {
      display: block;
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      margin-top: 4px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin: 0 0 16px;
    }

    .tool-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px;
      margin: 0;
      border: 1px solid rgba(255, 255, 255, 0.06);

      ion-card-content {
        padding: 16px;
      }

      .tool-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;

        ion-icon {
          font-size: 24px;
        }
      }

      h3 {
        font-size: 14px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
        margin: 0 0 4px;
      }

      p {
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
        margin: 0;
      }
    }
  `],
})
export class BusinessPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  isOwner = this.auth.isOwner;

  businessCards = computed<BusinessCard[]>(() => {
    const role = this.auth.profile()?.role;

    const commonCards: BusinessCard[] = [
      { title: 'Revenue', subtitle: 'Income & payouts', icon: 'wallet-outline', route: '/tabs/settings/payments', color: '#10B981' },
      { title: 'CRM', subtitle: 'Lead pipeline', icon: 'funnel-outline', route: '/tabs/crm', color: '#6366F1' },
      { title: 'Pricing', subtitle: 'Plans & tiers', icon: 'pricetags-outline', route: '/tabs/settings/pricing', color: '#F59E0B' },
      { title: 'Stripe', subtitle: 'Payment setup', icon: 'card-outline', route: '/tabs/settings/integrations', color: '#8B5CF6' },
    ];

    if (role === 'gym_owner') {
      return [
        ...commonCards,
        { title: 'Reports', subtitle: 'Financial reports', icon: 'stats-chart-outline', route: '/tabs/analytics', color: '#EC4899' },
        { title: 'Marketing', subtitle: 'Campaigns', icon: 'analytics-outline', route: '/tabs/crm/analytics', color: '#14B8A6' },
      ];
    }

    return [
      ...commonCards,
      { title: 'Email', subtitle: 'Templates & sequences', icon: 'mail-outline', route: '/tabs/crm/templates', color: '#EC4899' },
      { title: 'Analytics', subtitle: 'Client insights', icon: 'trending-up-outline', route: '/tabs/analytics', color: '#14B8A6' },
    ];
  });

  constructor() {
    addIcons({
      walletOutline, cashOutline, receiptOutline,
      pricetagsOutline, funnelOutline, mailOutline,
      analyticsOutline, trendingUpOutline, cardOutline,
      storefrontOutline, statsChartOutline,
    });
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
}
