import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonIcon,
  IonNote,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  timeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
  downloadOutline,
  refreshOutline,
  walletOutline,
} from 'ionicons/icons';

import { StripeService, StripePayout, StripeTransfer } from '../../../../core/services/stripe.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * TrainerPayoutsPage - Payout history and instant payout management
 *
 * Features:
 * - View payout history
 * - View transfer history (for facility trainers)
 * - Instant payout capability
 * - Payout status tracking
 * - Commission breakdown
 *
 * Sprint 28: Stripe Connect Marketplace
 */
@Component({
  selector: 'app-trainer-payouts',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonNote,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonRefresher,
    IonRefresherContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings" />
        </ion-buttons>
        <ion-title>Payouts & Earnings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Segment to switch between payouts and transfers -->
      <ion-segment [(value)]="selectedSegment" class="ion-padding">
        <ion-segment-button value="payouts">
          <ion-label>Payouts</ion-label>
        </ion-segment-button>
        <ion-segment-button value="transfers">
          <ion-label>Commissions</ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent" color="primary" />
          <p>Loading earnings...</p>
        </div>
      } @else {
        <!-- Payouts View -->
        @if (selectedSegment() === 'payouts') {
          <div class="ion-padding">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Payout History</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @if (payouts().length === 0) {
                  <div class="empty-state">
                    <ion-icon name="wallet-outline" color="medium" />
                    <p>No payouts yet</p>
                    <ion-note>Payouts will appear here once you receive payments from clients</ion-note>
                  </div>
                } @else {
                  <ion-list lines="full">
                    @for (payout of payouts(); track payout.id) {
                      <ion-item>
                        <ion-icon
                          [name]="getPayoutIcon(payout.status)"
                          [color]="getPayoutColor(payout.status)"
                          slot="start"
                        />
                        <ion-label>
                          <h3>{{ formatCurrency(payout.amountCents) }}</h3>
                          <p>{{ formatDate(payout.createdAt) }}</p>
                          @if (payout.arrivalDate) {
                            <ion-note>Arrives: {{ formatDate(payout.arrivalDate) }}</ion-note>
                          }
                          @if (payout.failureMessage) {
                            <ion-note color="danger">{{ payout.failureMessage }}</ion-note>
                          }
                        </ion-label>
                        <ion-badge [color]="getPayoutColor(payout.status)" slot="end">
                          {{ formatStatus(payout.status) }}
                        </ion-badge>
                      </ion-item>
                    }
                  </ion-list>
                }
              </ion-card-content>
            </ion-card>

            <!-- Instant Payout Card -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>Instant Payout</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Request an instant payout of your available balance.</p>
                <ion-note class="ion-margin-top">
                  <ion-icon name="alert-circle-outline" />
                  Instant payouts may incur additional fees. Standard payouts are free.
                </ion-note>
                <ion-button
                  expand="block"
                  (click)="requestInstantPayout()"
                  [disabled]="requestingPayout()"
                  class="ion-margin-top"
                >
                  @if (requestingPayout()) {
                    <ion-spinner name="crescent" slot="start" />
                    Processing...
                  } @else {
                    <ion-icon name="cash-outline" slot="start" />
                    Request Instant Payout
                  }
                </ion-button>
              </ion-card-content>
            </ion-card>
          </div>
        }

        <!-- Transfers/Commissions View -->
        @if (selectedSegment() === 'transfers') {
          <div class="ion-padding">
            <ion-card>
              <ion-card-header>
                <ion-card-title>Commission History</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @if (transfers().length === 0) {
                  <div class="empty-state">
                    <ion-icon name="cash-outline" color="medium" />
                    <p>No commission transfers yet</p>
                    <ion-note>Commission transfers from facilities will appear here</ion-note>
                  </div>
                } @else {
                  <!-- Summary Stats -->
                  <div class="stats-grid">
                    <div class="stat-card">
                      <ion-label>Total Earned</ion-label>
                      <h2>{{ formatCurrency(totalTransferAmount()) }}</h2>
                    </div>
                    <div class="stat-card">
                      <ion-label>Transfers</ion-label>
                      <h2>{{ transfers().length }}</h2>
                    </div>
                  </div>

                  <ion-list lines="full" class="ion-margin-top">
                    @for (transfer of transfers(); track transfer.id) {
                      <ion-item>
                        <ion-icon name="cash-outline" color="success" slot="start" />
                        <ion-label>
                          <h3>{{ formatCurrency(transfer.amountCents) }}</h3>
                          <p>{{ formatDate(transfer.createdAt) }}</p>
                          @if (transfer.description) {
                            <ion-note>{{ transfer.description }}</ion-note>
                          }
                          @if (transfer.commissionPercent) {
                            <ion-note>Commission: {{ transfer.commissionPercent }}%</ion-note>
                          }
                        </ion-label>
                        <ion-badge color="success" slot="end">Received</ion-badge>
                      </ion-item>
                    }
                  </ion-list>
                }
              </ion-card-content>
            </ion-card>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    :host {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-header {
      ion-toolbar {
        --background: transparent;
        --border-width: 0;
        --color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    ion-card-title {
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      gap: 1rem;

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;

      ion-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        color: var(--fitos-text-tertiary, #737373);
      }

      p {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      ion-note {
        max-width: 300px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      padding: 1rem;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
      text-align: center;

      ion-label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 0.5rem;
      }

      h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        font-family: 'Space Mono', monospace;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    ion-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
      color: var(--fitos-text-tertiary, #737373);

      ion-icon {
        font-size: 1rem;
      }
    }

    ion-item {
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);

      h3 {
        color: var(--fitos-text-primary, #F5F5F5);
        font-family: 'Space Mono', monospace;
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    ion-list {
      background: transparent;
    }
  `],
})
export class TrainerPayoutsPage implements OnInit {
  private stripeService = inject(StripeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // State
  loading = signal(true);
  requestingPayout = signal(false);
  selectedSegment = signal<'payouts' | 'transfers'>('payouts');
  payouts = signal<StripePayout[]>([]);
  transfers = signal<StripeTransfer[]>([]);

  // Computed
  totalTransferAmount = computed(() => {
    return this.transfers().reduce((sum, t) => sum + t.amountCents, 0);
  });

  constructor() {
    addIcons({
      cashOutline,
      timeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      alertCircleOutline,
      downloadOutline,
      refreshOutline,
      walletOutline,
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);

    try {
      // Load both payouts and transfers in parallel
      const [payouts, transfers] = await Promise.all([
        this.stripeService.getPayouts(50),
        this.stripeService.getTransfers(50),
      ]);

      this.payouts.set(payouts);
      this.transfers.set(transfers);
    } catch (error) {
      console.error('Error loading payout data:', error);
      await this.presentToast('Error loading payout data', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async handleRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }

  async requestInstantPayout() {
    const alert = await this.alertController.create({
      header: 'Request Instant Payout',
      message: 'Instant payouts incur a 1% fee (minimum $0.50). Standard payouts are free and arrive in 2 business days. Continue?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Confirm',
          handler: async () => {
            await this.processInstantPayout();
          },
        },
      ],
    });

    await alert.present();
  }

  private async processInstantPayout() {
    this.requestingPayout.set(true);

    try {
      const status = this.stripeService.connectStatus();
      if (!status?.stripeAccountId) {
        throw new Error('No Stripe account found');
      }

      // Call Edge Function to process instant payout
      const { error } = await this.stripeService['supabase'].functions.invoke(
        'process-instant-payout',
        {
          body: { accountId: status.stripeAccountId },
        }
      );

      if (error) throw error;

      await this.presentToast('Instant payout requested successfully', 'success');
      await this.loadData(); // Refresh the list
    } catch (error) {
      console.error('Error processing instant payout:', error);
      await this.presentToast((error as Error).message, 'danger');
    } finally {
      this.requestingPayout.set(false);
    }
  }

  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  getPayoutIcon(status: string): string {
    switch (status) {
      case 'paid':
        return 'checkmark-circle-outline';
      case 'failed':
      case 'canceled':
        return 'close-circle-outline';
      case 'pending':
      case 'in_transit':
        return 'time-outline';
      default:
        return 'cash-outline';
    }
  }

  getPayoutColor(status: string): string {
    switch (status) {
      case 'paid':
        return 'success';
      case 'failed':
      case 'canceled':
        return 'danger';
      case 'pending':
      case 'in_transit':
        return 'warning';
      default:
        return 'medium';
    }
  }

  private async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
