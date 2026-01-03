import { Component, inject, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
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
  IonSpinner,
  IonBadge,
  IonNote,
  AlertController,
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
  cardOutline,
  checkmarkCircle,
  alertCircle,
  openOutline,
  pricetagOutline,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { StripeService } from '@app/core/services/stripe.service';

@Component({
  selector: 'app-settings',
  imports: [
    RouterLink,
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
    IonSpinner,
    IonBadge,
    IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="settings-container">
        <!-- Client Subscription Section -->
        @if (!isTrainer()) {
          <ion-list>
            <ion-item class="section-header" lines="none">
              <ion-label>
                <h2>Subscription</h2>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/settings/subscription">
              <ion-icon name="card-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>My Subscription</h3>
                <p>View and manage your trainer subscription</p>
              </ion-label>
            </ion-item>
          </ion-list>
        }

        <!-- Trainer Payments Section -->
        @if (isTrainer()) {
          <ion-list>
            <ion-item class="section-header" lines="none">
              <ion-label>
                <h2>Payments</h2>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-icon name="card-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Stripe Connect</h3>
                <p>
                  @if (stripeLoading()) {
                    Checking status...
                  } @else if (stripeConnected()) {
                    @if (stripeRequiresAction()) {
                      Setup incomplete - action required
                    } @else {
                      Connected and ready to accept payments
                    }
                  } @else {
                    Connect to receive payments from clients
                  }
                </p>
              </ion-label>
              @if (stripeLoading()) {
                <ion-spinner slot="end" name="crescent"></ion-spinner>
              } @else if (stripeConnected()) {
                @if (stripeRequiresAction()) {
                  <ion-badge color="warning" slot="end">Action Required</ion-badge>
                } @else {
                  <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                }
              }
            </ion-item>

            <!-- Stripe Action Buttons -->
            <div class="stripe-actions">
              @if (stripeLoading()) {
                <!-- Loading state -->
              } @else if (!stripeConnected()) {
                <ion-button expand="block" (click)="connectStripe()" [disabled]="stripeConnecting()">
                  @if (stripeConnecting()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else {
                    Connect Stripe Account
                  }
                </ion-button>
              } @else if (stripeRequiresAction()) {
                <ion-button expand="block" (click)="connectStripe()" [disabled]="stripeConnecting()">
                  @if (stripeConnecting()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else {
                    Complete Setup
                  }
                </ion-button>
              } @else {
                <ion-button expand="block" fill="outline" (click)="openStripeDashboard()" [disabled]="stripeConnecting()">
                  @if (stripeConnecting()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else {
                    Open Stripe Dashboard
                    <ion-icon name="open-outline" slot="end"></ion-icon>
                  }
                </ion-button>
                <ion-button expand="block" fill="clear" color="medium" (click)="disconnectStripe()">
                  Disconnect Account
                </ion-button>
              }
            </div>

            @if (stripeError()) {
              <ion-note color="danger" class="stripe-error">
                {{ stripeError() }}
              </ion-note>
            }

            <!-- Pricing Tiers Link -->
            @if (stripeConnected() && !stripeRequiresAction()) {
              <ion-item button detail routerLink="/tabs/settings/pricing">
                <ion-icon name="pricetag-outline" slot="start"></ion-icon>
                <ion-label>
                  <h3>Pricing Tiers</h3>
                  <p>Configure your subscription pricing</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }

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

    .section-header {
      --background: transparent;

      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0;
        color: var(--ion-color-dark);
      }
    }

    .stripe-actions {
      padding: 0 16px 16px;

      ion-button {
        margin-bottom: 8px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    .stripe-error {
      display: block;
      padding: 12px 16px;
      margin: 0 16px 16px;
      border-radius: 8px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
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
export class SettingsPage implements OnInit {
  private authService = inject(AuthService);
  private stripeService = inject(StripeService);
  private alertController = inject(AlertController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isAuthenticated = computed(() => this.authService.isAuthenticated());
  isTrainer = computed(() => this.authService.isTrainer() || this.authService.isOwner());

  // Stripe signals
  stripeLoading = computed(() => this.stripeService.loading());
  stripeConnected = computed(() => this.stripeService.isConnected());
  stripeRequiresAction = computed(() => this.stripeService.requiresAction());
  stripeError = computed(() => this.stripeService.error());
  stripeConnecting = computed(() => false); // Local loading state for connect action

  private _stripeConnecting = false;

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
      cardOutline,
      checkmarkCircle,
      alertCircle,
      openOutline,
      pricetagOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    // Load Stripe status for trainers
    if (this.isTrainer()) {
      await this.stripeService.loadConnectStatus();
    }

    // Check for Stripe refresh (user returned from Stripe but didn't complete)
    const stripeRefresh = this.route.snapshot.queryParamMap.get('stripe_refresh');
    if (stripeRefresh === 'true') {
      // Reload status after returning from Stripe
      await this.stripeService.loadConnectStatus();
    }
  }

  async connectStripe(): Promise<void> {
    this._stripeConnecting = true;
    const result = await this.stripeService.createConnectAccountLink();

    if ('url' in result) {
      // Open Stripe onboarding in a new window
      window.open(result.url, '_blank');
    } else {
      // Error occurred
      console.error('Stripe connect error:', result.error);
    }

    this._stripeConnecting = false;
  }

  async openStripeDashboard(): Promise<void> {
    this._stripeConnecting = true;
    const result = await this.stripeService.createDashboardLink();

    if ('url' in result) {
      window.open(result.url, '_blank');
    } else {
      console.error('Stripe dashboard error:', result.error);
    }

    this._stripeConnecting = false;
  }

  async disconnectStripe(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Disconnect Stripe',
      message: 'Are you sure you want to disconnect your Stripe account? You will not be able to receive payments until you reconnect.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Disconnect',
          role: 'destructive',
          handler: async () => {
            await this.stripeService.disconnectAccount();
          },
        },
      ],
    });

    await alert.present();
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
