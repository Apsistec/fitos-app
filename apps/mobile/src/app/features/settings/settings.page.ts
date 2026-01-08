import { Component, inject, computed, OnInit, signal } from '@angular/core';
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
  IonSegment,
  IonSegmentButton,
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
  watchOutline,
  settingsOutline,
  shieldCheckmarkOutline,
  cogOutline,
  sunnyOutline,
  phonePortraitOutline,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { StripeService } from '@app/core/services/stripe.service';
import { ThemeService, ThemeMode } from '@app/core/services/theme.service';

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
    IonButton,
    IonSpinner,
    IonBadge,
    IonNote,
    IonSegment,
    IonSegmentButton,
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
          <ion-list class="settings-list">
            <div class="section-header">
              <ion-icon name="card-outline"></ion-icon>
              <h2>Subscription</h2>
            </div>

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
          <ion-list class="settings-list">
            <div class="section-header">
              <ion-icon name="card-outline"></ion-icon>
              <h2>Payments</h2>
            </div>

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

              <ion-item button detail routerLink="/tabs/settings/payments">
                <ion-icon name="card-outline" slot="start"></ion-icon>
                <ion-label>
                  <h3>Payment History</h3>
                  <p>View your payment transactions</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }

        <ion-list class="settings-list">
          <div class="section-header">
            <ion-icon name="cog-outline"></ion-icon>
            <h2>Preferences</h2>
          </div>

          <ion-item button detail routerLink="/tabs/settings/profile">
            <ion-icon name="person-outline" slot="start"></ion-icon>
            <ion-label>Edit Profile</ion-label>
          </ion-item>

          <ion-item button detail routerLink="/tabs/settings/notifications">
            <ion-icon name="notifications-outline" slot="start"></ion-icon>
            <ion-label>Notifications</ion-label>
          </ion-item>

          <ion-item button detail routerLink="/tabs/settings/wearables">
            <ion-icon name="watch-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Wearable Devices</h3>
              <p>Connect fitness trackers and smartwatches</p>
            </ion-label>
          </ion-item>

          <!-- Theme Selector -->
          <ion-item class="theme-item">
            <ion-icon name="moon-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Appearance</h3>
            </ion-label>
          </ion-item>

          <div class="theme-selector">
            <ion-segment [value]="themeMode()" (ionChange)="onThemeModeChange($event)">
              <ion-segment-button value="dark">
                <ion-icon name="moon-outline"></ion-icon>
                <ion-label>Dark</ion-label>
              </ion-segment-button>
              <ion-segment-button value="light">
                <ion-icon name="sunny-outline"></ion-icon>
                <ion-label>Light</ion-label>
              </ion-segment-button>
              <ion-segment-button value="system">
                <ion-icon name="phone-portrait-outline"></ion-icon>
                <ion-label>System</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>
        </ion-list>

        <ion-list class="settings-list">
          <div class="section-header">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            <h2>Support & Legal</h2>
          </div>

          <ion-item button detail routerLink="/tabs/settings/privacy">
            <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
            <ion-label>Privacy & Security</ion-label>
          </ion-item>

          <ion-item button detail routerLink="/tabs/settings/help">
            <ion-icon name="help-circle-outline" slot="start"></ion-icon>
            <ion-label>Help & Support</ion-label>
          </ion-item>

          <ion-item button detail routerLink="/tabs/settings/terms">
            <ion-icon name="document-text-outline" slot="start"></ion-icon>
            <ion-label>Terms & Privacy Policy</ion-label>
          </ion-item>
        </ion-list>

        @if (isAuthenticated()) {
          <div class="signout-section">
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
      padding-bottom: env(safe-area-inset-bottom, 16px);
    }

    .settings-list {
      margin-bottom: 24px;
      background: transparent;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 16px 12px;

      ion-icon {
        font-size: 24px;
        color: var(--fitos-accent-primary);
      }

      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0;
        color: var(--fitos-text-primary);
      }
    }

    ion-item {
      --background: var(--fitos-bg-secondary);
      --color: var(--fitos-text-primary);
      --border-color: var(--fitos-border-subtle);

      ion-icon[slot="start"] {
        color: var(--fitos-text-secondary);
      }

      h3 {
        color: var(--fitos-text-primary);
        font-weight: 500;
      }

      p {
        color: var(--fitos-text-secondary);
      }
    }

    .theme-item {
      --border-width: 0;
      margin-bottom: 0;
    }

    .theme-selector {
      padding: 0 16px 16px;

      ion-segment {
        --background: var(--fitos-bg-tertiary);

        ion-segment-button {
          --background-checked: var(--fitos-accent-primary);
          --color: var(--fitos-text-secondary);
          --color-checked: #ffffff;
          --indicator-color: transparent;
          min-height: 48px;

          ion-icon {
            font-size: 18px;
            margin-bottom: 4px;
          }

          ion-label {
            font-size: 12px;
            text-transform: none;
          }
        }
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

    .signout-section {
      padding: 16px;
    }

    .version-info {
      text-align: center;
      padding: 24px;

      p {
        margin: 0;
        color: var(--fitos-text-tertiary);
        font-size: 0.875rem;
      }
    }
  `],
})
export class SettingsPage implements OnInit {
  private authService = inject(AuthService);
  private stripeService = inject(StripeService);
  private themeService = inject(ThemeService);
  private alertController = inject(AlertController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isAuthenticated = computed(() => this.authService.isAuthenticated());
  isTrainer = computed(() => this.authService.isTrainer() || this.authService.isOwner());
  isDarkMode = this.themeService.isDarkMode;
  themeMode = this.themeService.mode;

  // Stripe signals
  stripeLoading = computed(() => this.stripeService.loading());
  stripeConnected = computed(() => this.stripeService.isConnected());
  stripeRequiresAction = computed(() => this.stripeService.requiresAction());
  stripeError = computed(() => this.stripeService.error());
  stripeConnecting = signal(false);

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
      watchOutline,
      settingsOutline,
      shieldCheckmarkOutline,
      cogOutline,
      sunnyOutline,
      phonePortraitOutline,
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
    this.stripeConnecting.set(true);
    const result = await this.stripeService.createConnectAccountLink();

    if ('url' in result) {
      window.open(result.url, '_blank');
    } else {
      console.error('Stripe connect error:', result.error);
    }

    this.stripeConnecting.set(false);
  }

  async openStripeDashboard(): Promise<void> {
    this.stripeConnecting.set(true);
    const result = await this.stripeService.createDashboardLink();

    if ('url' in result) {
      window.open(result.url, '_blank');
    } else {
      console.error('Stripe dashboard error:', result.error);
    }

    this.stripeConnecting.set(false);
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

  onThemeModeChange(event: any): void {
    const mode = event.detail.value as ThemeMode;
    this.themeService.setMode(mode);
  }

  toggleDarkMode(event: any): void {
    this.themeService.setDarkMode(event.detail.checked);
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
