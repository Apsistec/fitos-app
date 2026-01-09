import { Component, inject, OnInit, computed } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote,
  IonAvatar,
  IonBadge,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { openOutline, cardOutline, personOutline } from 'ionicons/icons';
import { SubscriptionService } from '@app/core/services/subscription.service';

@Component({
  standalone: true,
  selector: 'app-my-subscription',
  imports: [
    CurrencyPipe,
    DatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
    IonSpinner,
    IonNote,
    IonAvatar,
    IonBadge,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>My Subscription</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="subscription-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading subscription...</p>
          </div>
        } @else if (!hasSubscription()) {
          <ion-card>
            <ion-card-content class="empty-state">
              <ion-icon name="card-outline" class="empty-icon"></ion-icon>
              <h3>No Active Subscription</h3>
              <p>You don't have an active subscription with a trainer yet.</p>
            </ion-card-content>
          </ion-card>
        } @else {
          <!-- Active Subscription -->
          <ion-card class="subscription-card">
            <ion-card-header>
              <div class="trainer-header">
                <ion-avatar>
                  @if (trainerAvatar()) {
                    <img [src]="trainerAvatar()" alt="Trainer" />
                  } @else {
                    <ion-icon name="person-outline"></ion-icon>
                  }
                </ion-avatar>
                <div class="trainer-info">
                  <ion-card-title>{{ trainerName() }}</ion-card-title>
                  <ion-badge [color]="statusColor()">{{ statusLabel() }}</ion-badge>
                </div>
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="subscription-details">
                <div class="detail-row">
                  <span class="label">Plan</span>
                  <span class="value">
                    {{ subscriptionAmount() | currency:subscriptionCurrency().toUpperCase() }}
                    / {{ subscriptionInterval() }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="label">Current Period</span>
                  <span class="value">
                    {{ currentPeriodStart() | date:'MMM d' }} - {{ currentPeriodEnd() | date:'MMM d, yyyy' }}
                  </span>
                </div>
                @if (isCanceling()) {
                  <div class="cancellation-notice">
                    <ion-note color="warning">
                      Your subscription will end on {{ currentPeriodEnd() | date:'MMMM d, yyyy' }}
                    </ion-note>
                  </div>
                }
              </div>

              <div class="subscription-actions">
                <ion-button expand="block" fill="outline" (click)="openBillingPortal()" [disabled]="portalLoading()">
                  @if (portalLoading()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else {
                    Manage Billing
                    <ion-icon name="open-outline" slot="end"></ion-icon>
                  }
                </ion-button>

                @if (!isCanceling()) {
                  <ion-button expand="block" fill="clear" color="medium" (click)="cancelSubscription()">
                    Cancel Subscription
                  </ion-button>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .subscription-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 16px;
      color: var(--ion-color-medium);

      p {
        margin-top: 16px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 48px 16px;

      .empty-icon {
        font-size: 48px;
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px;
        font-size: 1.25rem;
      }

      p {
        margin: 0;
        color: var(--ion-color-medium);
      }
    }

    .subscription-card {
      .trainer-header {
        display: flex;
        align-items: center;
        gap: 16px;

        ion-avatar {
          width: 56px;
          height: 56px;

          ion-icon {
            width: 100%;
            height: 100%;
            color: var(--ion-color-medium);
          }
        }

        .trainer-info {
          ion-card-title {
            margin-bottom: 4px;
          }
        }
      }
    }

    .subscription-details {
      margin-top: 16px;

      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--ion-color-light);

        &:last-child {
          border-bottom: none;
        }

        .label {
          color: var(--ion-color-medium);
        }

        .value {
          font-weight: 500;
        }
      }
    }

    .cancellation-notice {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      background: rgba(var(--ion-color-warning-rgb), 0.1);
    }

    .subscription-actions {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `],
})
export class MySubscriptionPage implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  loading = this.subscriptionService.loading;
  subscription = this.subscriptionService.clientSubscription;
  hasSubscription = this.subscriptionService.hasActiveSubscription;
  portalLoading = computed(() => false);

  private _portalLoading = false;

  // Computed values from subscription
  trainerName = computed(() => {
    const sub = this.subscription();
    return sub?.trainer?.full_name || 'Your Trainer';
  });

  trainerAvatar = computed(() => {
    const sub = this.subscription();
    return sub?.trainer?.avatar_url;
  });

  statusLabel = computed(() => {
    const sub = this.subscription();
    // Check cancel_at_period_end for pending cancellation
    if (sub?.cancel_at_period_end) {
      return 'Canceling';
    }
    switch (sub?.status) {
      case 'active': return 'Active';
      case 'trialing': return 'Trial';
      case 'past_due': return 'Past Due';
      case 'canceled': return 'Canceled';
      default: return sub?.status || 'Unknown';
    }
  });

  statusColor = computed(() => {
    const sub = this.subscription();
    // Check cancel_at_period_end for pending cancellation
    if (sub?.cancel_at_period_end) {
      return 'warning';
    }
    switch (sub?.status) {
      case 'active': return 'success';
      case 'trialing': return 'primary';
      case 'past_due': return 'danger';
      case 'canceled': return 'medium';
      default: return 'medium';
    }
  });

  isCanceling = computed(() => {
    const sub = this.subscription();
    return sub?.cancel_at_period_end === true;
  });

  subscriptionAmount = computed(() => {
    const sub = this.subscription();
    return (sub?.amount_cents || 0) / 100;
  });

  subscriptionCurrency = computed(() => {
    const sub = this.subscription();
    return sub?.currency || 'usd';
  });

  subscriptionInterval = computed(() => {
    const sub = this.subscription();
    return sub?.interval || 'month';
  });

  currentPeriodStart = computed(() => {
    const sub = this.subscription();
    return sub?.current_period_start ? new Date(sub.current_period_start) : null;
  });

  currentPeriodEnd = computed(() => {
    const sub = this.subscription();
    return sub?.current_period_end ? new Date(sub.current_period_end) : null;
  });

  constructor() {
    addIcons({ openOutline, cardOutline, personOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.subscriptionService.loadClientSubscription();
  }

  async openBillingPortal(): Promise<void> {
    this._portalLoading = true;

    const result = await this.subscriptionService.createPortalSession();

    if ('url' in result) {
      window.open(result.url, '_blank');
    } else {
      const toast = await this.toastController.create({
        message: result.error,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    }

    this._portalLoading = false;
  }

  async cancelSubscription(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cancel Subscription',
      message: 'Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.',
      buttons: [
        {
          text: 'Keep Subscription',
          role: 'cancel',
        },
        {
          text: 'Cancel Subscription',
          role: 'destructive',
          handler: async () => {
            const sub = this.subscription();
            if (sub) {
              const result = await this.subscriptionService.cancelSubscription(sub.id);

              if (result.error) {
                const toast = await this.toastController.create({
                  message: result.error,
                  duration: 3000,
                  color: 'danger',
                });
                await toast.present();
              } else {
                const toast = await this.toastController.create({
                  message: 'Subscription will be canceled at the end of the billing period',
                  duration: 3000,
                  color: 'success',
                });
                await toast.present();
              }
            }
          },
        },
      ],
    });

    await alert.present();
  }
}
