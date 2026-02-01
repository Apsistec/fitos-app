import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonButton,
  IonIcon,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { refreshOutline, alertCircleOutline } from 'ionicons/icons';

import { StripeService } from '../../../../core/services/stripe.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

/**
 * ConnectDashboardComponent - Stripe Connect Embedded Dashboard
 *
 * Displays Stripe's embedded account management UI
 * Requires Stripe Connect JS SDK to be loaded
 *
 * Features:
 * - Account management
 * - Balance viewing
 * - Payout history
 * - Payment details
 * - Document access (1099s, etc.)
 *
 * Sprint 28: Stripe Connect Marketplace
 */
@Component({
  selector: 'fit-connect-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonButton,
    IonIcon,
    IonNote,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required for Stripe's custom elements
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="connect-dashboard-container">
      @if (loading()) {
        <div class="loading-state">
          <ion-spinner name="crescent" color="primary" />
          <p>Loading dashboard...</p>
        </div>
      } @else if (error()) {
        <ion-card color="danger">
          <ion-card-content>
            <div class="error-state">
              <ion-icon name="alert-circle-outline" />
              <div>
                <h3>Error Loading Dashboard</h3>
                <p>{{ error() }}</p>
                <ion-button size="small" (click)="retry()">
                  <ion-icon name="refresh-outline" slot="start" />
                  Retry
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      } @else if (connectInstance()) {
        <!-- Stripe Embedded Components Container -->
        <div class="stripe-embedded-container">
          <!-- Account Management Component -->
          <stripe-connect-account-management
            [attr.data-client-secret]="clientSecret()"
          ></stripe-connect-account-management>

          <!-- Payments Component -->
          <stripe-connect-payments
            [attr.data-client-secret]="clientSecret()"
          ></stripe-connect-payments>

          <!-- Payouts Component -->
          <stripe-connect-payouts
            [attr.data-client-secret]="clientSecret()"
          ></stripe-connect-payouts>

          <!-- Balances Component -->
          <stripe-connect-balances
            [attr.data-client-secret]="clientSecret()"
          ></stripe-connect-balances>

          <!-- Documents Component (for 1099s and tax forms) -->
          <stripe-connect-documents
            [attr.data-client-secret]="clientSecret()"
          ></stripe-connect-documents>
        </div>

        <ion-note class="stripe-powered ion-margin-top">
          <p>Powered by Stripe Connect</p>
          <p class="small-text">Your payment information is securely managed by Stripe.</p>
        </ion-note>
      }
    </div>
  `,
  styles: [`
    .connect-dashboard-container {
      width: 100%;
      min-height: 400px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      gap: 1rem;

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .error-state {
      display: flex;
      align-items: center;
      gap: 1rem;

      ion-icon {
        font-size: 3rem;
        flex-shrink: 0;
      }

      h3 {
        margin: 0 0 0.5rem 0;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0 0 1rem 0;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .stripe-embedded-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    /* Stripe embedded components styling */
    stripe-connect-account-management,
    stripe-connect-payments,
    stripe-connect-payouts,
    stripe-connect-balances,
    stripe-connect-documents {
      display: block;
      width: 100%;
      min-height: 200px;
      border-radius: 12px;
      overflow: hidden;
    }

    .stripe-powered {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      p {
        margin: 0.25rem 0;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      .small-text {
        font-size: 0.85rem;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }
  `],
})
export class ConnectDashboardComponent implements OnInit, OnDestroy {
  private stripeService = inject(StripeService);
  private supabase = inject(SupabaseService);

  // State
  loading = signal(true);
  error = signal<string | null>(null);
  clientSecret = signal<string | null>(null);
  connectInstance = signal<any>(null);

  private sessionRefreshInterval?: number;

  constructor() {
    addIcons({
      refreshOutline,
      alertCircleOutline,
    });
  }

  async ngOnInit() {
    await this.loadStripeConnect();
  }

  ngOnDestroy() {
    // Clear session refresh interval
    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
    }
  }

  async loadStripeConnect() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Get Stripe account ID
      const status = this.stripeService.connectStatus();
      if (!status?.stripeAccountId) {
        throw new Error('No Stripe account found. Please complete onboarding first.');
      }

      // Load Stripe Connect SDK if not already loaded
      if (!(window as any).StripeConnect) {
        await this.loadStripeConnectSDK();
      }

      // Get account session from backend
      const { data, error } = await this.supabase.functions.invoke('stripe-account-session', {
        body: { accountId: status.stripeAccountId },
      });

      if (error) throw error;

      this.clientSecret.set(data.clientSecret);

      // Initialize Stripe Connect instance
      const StripeConnect = (window as any).StripeConnect;
      const instance = StripeConnect(data.clientSecret);
      this.connectInstance.set(instance);

      // Set up session refresh (sessions expire after ~30 minutes)
      this.setupSessionRefresh(data.expiresAt);

      this.loading.set(false);
    } catch (err) {
      console.error('Error loading Stripe Connect:', err);
      this.error.set((err as Error).message);
      this.loading.set(false);
    }
  }

  private async loadStripeConnectSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://connect-js.stripe.com/v1.0/connect.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Stripe Connect SDK'));
      document.head.appendChild(script);
    });
  }

  private setupSessionRefresh(expiresAt: string) {
    const expiryTime = new Date(expiresAt).getTime();
    const refreshTime = expiryTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry
    const now = Date.now();
    const timeUntilRefresh = refreshTime - now;

    if (timeUntilRefresh > 0) {
      this.sessionRefreshInterval = window.setTimeout(() => {
        this.loadStripeConnect();
      }, timeUntilRefresh);
    }
  }

  retry() {
    this.loadStripeConnect();
  }
}
