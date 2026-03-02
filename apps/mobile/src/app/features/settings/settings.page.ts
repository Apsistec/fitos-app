import {  Component, inject, computed, OnInit, signal , ChangeDetectionStrategy } from '@angular/core';
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
  briefcaseOutline,
  funnelOutline,
  personAddOutline,
  bulbOutline,
  starOutline,
  bookOutline,
  qrCodeOutline,
  banOutline,
  layersOutline,
  cashOutline,
  barChartOutline,
  receiptOutline,
  alarmOutline,
  imagesOutline,
  globeOutline,                   // Sprint 67: Public Profile link
  chatbubbleEllipsesOutline,      // Sprint 68: Testimonials
  megaphoneOutline,               // Sprint 69: Referral Program
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { StripeService } from '../../core/services/stripe.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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

        <!-- Business Tools - Trainers Only -->
        @if (isTrainer()) {
          <ion-list class="settings-list">
            <div class="section-header">
              <ion-icon name="briefcase-outline"></ion-icon>
              <h2>Business Tools</h2>
            </div>

            <ion-item button detail routerLink="/tabs/crm">
              <ion-icon name="funnel-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>CRM & Lead Pipeline</h3>
                <p>Manage leads and track conversions</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/clients/invite">
              <ion-icon name="person-add-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Invite New Client</h3>
                <p>Send invitation codes to prospects</p>
              </ion-label>
            </ion-item>

            <!-- Sprint 67: Public Profile & SEO Storefront -->
            <ion-item button detail routerLink="/tabs/settings/public-profile">
              <ion-icon name="globe-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Public Profile</h3>
                <p>Your SEO-indexed booking page at nutrifitos.com/t/yourname</p>
              </ion-label>
            </ion-item>

            <!-- Sprint 68: Testimonial approval queue -->
            <ion-item button detail routerLink="/tabs/settings/testimonials">
              <ion-icon name="chatbubble-ellipses-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Testimonials</h3>
                <p>Approve high-rated reviews to show on your public profile</p>
              </ion-label>
            </ion-item>

            <!-- Sprint 69: Referral program configuration -->
            <ion-item button detail routerLink="/tabs/settings/referral-program">
              <ion-icon name="megaphone-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Referral Program</h3>
                <p>Configure rewards when clients refer new members</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/settings/nfc-tags">
              <ion-icon name="qr-code-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>NFC & QR Tags</h3>
                <p>Gym touchpoints for instant client check-in</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/settings/cancellation-policies">
              <ion-icon name="ban-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Cancellation Policies</h3>
                <p>Late-cancel fees, no-show fees, and auto no-show window</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/settings/pricing-options">
              <ion-icon name="layers-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Pricing Options</h3>
                <p>Session packs, time passes, drop-ins, and autopay contracts</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/settings/payroll-settings">
              <ion-icon name="cash-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Payroll Settings</h3>
                <p>Pay rates, no-show policy, and cancellation pay rules</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/settings/payroll-report">
              <ion-icon name="receipt-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Payroll Report</h3>
                <p>View earnings, export CSV, and mark sessions processed</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/settings/revenue-report">
              <ion-icon name="bar-chart-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Revenue Report</h3>
                <p>Daily, weekly, or monthly revenue breakdown and trends</p>
              </ion-label>
            </ion-item>

            @if (isOwner()) {
              <ion-item button detail routerLink="/tabs/settings/staff-permissions">
                <ion-icon name="shield-checkmark-outline" slot="start"></ion-icon>
                <ion-label>
                  <h3>Staff Permissions</h3>
                  <p>Control what each trainer can view and manage</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>

          <ion-list class="settings-list">
            <div class="section-header">
              <ion-icon name="bulb-outline"></ion-icon>
              <h2>Coach Brain AI</h2>
            </div>

            <ion-item button detail routerLink="/tabs/coaching/methodology-setup">
              <ion-icon name="bulb-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>AI Methodology</h3>
                <p>Customize how AI represents your coaching style</p>
              </ion-label>
            </ion-item>

            <ion-item button detail routerLink="/tabs/coaching/response-review">
              <ion-icon name="star-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Review AI Responses</h3>
                <p>Approve and refine AI-generated coaching advice</p>
              </ion-label>
            </ion-item>
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

          @if (!isTrainer()) {
            <ion-item button detail routerLink="/tabs/settings/client-notifications">
              <ion-icon name="alarm-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Session & Workout Alerts</h3>
                <p>Reminders, PR celebrations, weekly recap</p>
              </ion-label>
            </ion-item>
            <ion-item button detail routerLink="/tabs/workouts/progress-photos">
              <ion-icon name="images-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Progress Photos</h3>
                <p>Before & after photos, transformation tracking</p>
              </ion-label>
            </ion-item>
          }

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
            <ion-segment [value]="themeMode()" (ionChange)="onThemeModeChange($event.detail.value)">
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
            <ion-label>Help Center</ion-label>
          </ion-item>

          <ion-item button detail (click)="openDocs()">
            <ion-icon name="book-outline" slot="start"></ion-icon>
            <ion-label>Documentation</ion-label>
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
    ion-header {
      ion-toolbar {
        --background: transparent;
        --border-width: 0;

        ion-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
      }
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

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
        color: var(--ion-color-primary, #10B981);
      }

      h2 {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.3px;
        margin: 0;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    ion-item {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);

      ion-icon[slot="start"] {
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      h3 {
        color: var(--fitos-text-primary, #F5F5F5);
        font-weight: 500;
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .theme-item {
      --border-width: 0;
      margin-bottom: 0;
    }

    .theme-selector {
      padding: 0 16px 16px;

      ion-segment {
        --background: var(--fitos-bg-tertiary, #262626);

        ion-segment-button {
          --background-checked: var(--ion-color-primary, #10B981);
          --color: var(--fitos-text-secondary, #A3A3A3);
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
      background: rgba(239, 68, 68, 0.1);
    }

    .signout-section {
      padding: 16px;
    }

    .version-info {
      text-align: center;
      padding: 24px;

      p {
        margin: 0;
        color: var(--fitos-text-tertiary, #737373);
        font-size: 14px;
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
  isOwner = this.authService.isOwner;
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
      briefcaseOutline,
      funnelOutline,
      personAddOutline,
      bulbOutline,
      starOutline,
      bookOutline,
      qrCodeOutline,
      banOutline,
      layersOutline,
      cashOutline,
      barChartOutline,
      receiptOutline,
      alarmOutline,
      imagesOutline,
      globeOutline,
      chatbubbleEllipsesOutline,
      megaphoneOutline,
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

  onThemeModeChange(value: string | number | undefined): void {
    if (value) {
      const mode = String(value) as ThemeMode;
      this.themeService.setMode(mode);
    }
  }

  toggleDarkMode(event: CustomEvent<{ checked: boolean }>): void {
    this.themeService.setDarkMode(event.detail.checked);
  }

  openDocs(): void {
    window.open('https://github.com/anthropics/fitos-app/tree/main/docs', '_blank');
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }
}
