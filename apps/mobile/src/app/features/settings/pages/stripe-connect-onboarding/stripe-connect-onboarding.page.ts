import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
  IonIcon,
  IonButton,
  IonNote,
  IonSpinner,
  IonBadge,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  lockClosedOutline,
  cashOutline,
  timeOutline,
  documentTextOutline,
  openOutline,
  refreshOutline,
} from 'ionicons/icons';

import { StripeService } from '../../../../core/services/stripe.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * StripeConnectOnboardingPage - Stripe Connect Express account onboarding
 *
 * Features:
 * - Quick 2-minute Express account setup
 * - Business type selection (individual vs company)
 * - Onboarding status tracking
 * - Dashboard access for completed accounts
 * - Payout history view
 *
 * Sprint 27: Stripe Connect Foundation
 */
@Component({
  selector: 'app-stripe-connect-onboarding',
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
    IonIcon,
    IonButton,
    IonNote,
    IonSpinner,
    IonBadge,
    IonLabel,
    IonRadioGroup,
    IonRadio,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings" />
        </ion-buttons>
        <ion-title>Payment Setup</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (stripeService.loading()) {
        <div class="loading-container">
          <ion-spinner name="crescent" color="primary" />
          <p>Loading payment settings...</p>
        </div>
      } @else if (status()?.isConnected && !status()?.requiresAction) {
        <!-- Fully Connected State -->
        <ion-card color="success">
          <ion-card-content>
            <div class="status-badge">
              <ion-icon name="checkmark-circle-outline" />
              <div>
                <h3>Payments Enabled</h3>
                <p>You can now receive payments from clients</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Account Details</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="none">
              <ion-item>
                <ion-icon name="card-outline" slot="start" />
                <ion-label>
                  <h3>Account Type</h3>
                  <p>{{ status()?.accountType || 'Express' }}</p>
                </ion-label>
                <ion-badge slot="end" color="success">Active</ion-badge>
              </ion-item>

              <ion-item>
                <ion-icon name="cash-outline" slot="start" />
                <ion-label>
                  <h3>Charges</h3>
                  <p>{{ status()?.chargesEnabled ? 'Enabled' : 'Disabled' }}</p>
                </ion-label>
                @if (status()?.chargesEnabled) {
                  <ion-icon name="checkmark-circle-outline" color="success" slot="end" />
                }
              </ion-item>

              <ion-item>
                <ion-icon name="cash-outline" slot="start" />
                <ion-label>
                  <h3>Payouts</h3>
                  <p>{{ status()?.payoutsEnabled ? 'Enabled' : 'Disabled' }}</p>
                </ion-label>
                @if (status()?.payoutsEnabled) {
                  <ion-icon name="checkmark-circle-outline" color="success" slot="end" />
                }
              </ion-item>
            </ion-list>

            <ion-button expand="block" (click)="openDashboard()" class="ion-margin-top">
              <ion-icon name="open-outline" slot="start" />
              View Stripe Dashboard
            </ion-button>

            <ion-button expand="block" fill="outline" (click)="viewPayouts()" class="ion-margin-top">
              <ion-icon name="time-outline" slot="start" />
              View Payout History
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Platform Fee</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>FitOS charges a 10% platform fee on all transactions. This helps us maintain and improve the platform.</p>
            <div class="fee-example">
              <strong>Example:</strong> Client pays $100
              <ul>
                <li>You receive: $90</li>
                <li>Platform fee: $10</li>
              </ul>
            </div>
          </ion-card-content>
        </ion-card>
      } @else if (status()?.isConnected && status()?.requiresAction) {
        <!-- Incomplete Onboarding State -->
        <ion-card color="warning">
          <ion-card-content>
            <div class="status-badge">
              <ion-icon name="alert-circle-outline" />
              <div>
                <h3>Action Required</h3>
                <p>Complete your account setup to accept payments</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Complete Setup</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>Your Stripe account needs additional information before you can accept payments.</p>

            <ion-list lines="none" class="ion-margin-top">
              <ion-item>
                <ion-label>
                  <h3>Details Submitted</h3>
                </ion-label>
                @if (status()?.detailsSubmitted) {
                  <ion-icon name="checkmark-circle-outline" color="success" slot="end" />
                } @else {
                  <ion-icon name="alert-circle-outline" color="warning" slot="end" />
                }
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Charges Enabled</h3>
                </ion-label>
                @if (status()?.chargesEnabled) {
                  <ion-icon name="checkmark-circle-outline" color="success" slot="end" />
                } @else {
                  <ion-icon name="alert-circle-outline" color="warning" slot="end" />
                }
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Payouts Enabled</h3>
                </ion-label>
                @if (status()?.payoutsEnabled) {
                  <ion-icon name="checkmark-circle-outline" color="success" slot="end" />
                } @else {
                  <ion-icon name="alert-circle-outline" color="warning" slot="end" />
                }
              </ion-item>
            </ion-list>

            <ion-button expand="block" (click)="continueOnboarding()" class="ion-margin-top">
              <ion-icon name="refresh-outline" slot="start" />
              Continue Setup
            </ion-button>
          </ion-card-content>
        </ion-card>
      } @else {
        <!-- Not Connected State -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Enable Payments</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="hero-section">
              <ion-icon name="card-outline" size="large" color="primary" />
              <h2>Start Accepting Payments</h2>
              <p>Set up your payment account to receive payments from clients directly.</p>
            </div>

            <div class="benefits">
              <h3>Benefits:</h3>
              <ion-list lines="none">
                <ion-item>
                  <ion-icon name="checkmark-circle-outline" color="success" slot="start" />
                  <ion-label>Instant payouts available</ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="checkmark-circle-outline" color="success" slot="start" />
                  <ion-label>Accept cards and Apple Pay</ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="checkmark-circle-outline" color="success" slot="start" />
                  <ion-label>Automatic tax documents</ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="checkmark-circle-outline" color="success" slot="start" />
                  <ion-label>2-minute setup</ion-label>
                </ion-item>
              </ion-list>
            </div>

            <div class="business-type ion-margin-top">
              <h3>Business Type:</h3>
              <ion-radio-group [value]="businessType()" (ionChange)="onBusinessTypeChange($event)">
                <ion-item>
                  <ion-radio value="individual" slot="start" />
                  <ion-label>
                    <h3>Individual</h3>
                    <p>Sole proprietor or freelance trainer</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-radio value="company" slot="start" />
                  <ion-label>
                    <h3>Company</h3>
                    <p>Registered business or LLC</p>
                  </ion-label>
                </ion-item>
              </ion-radio-group>
            </div>

            <ion-button
              expand="block"
              (click)="startOnboarding()"
              [disabled]="stripeService.loading()"
              class="ion-margin-top"
            >
              @if (stripeService.loading()) {
                <ion-spinner name="crescent" slot="start" />
                Setting up...
              } @else {
                <ion-icon name="card-outline" slot="start" />
                Get Started
              }
            </ion-button>

            <div class="powered-by">
              <ion-icon name="lock-closed-outline" />
              <span>Powered by Stripe</span>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>How It Works</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ol class="steps-list">
              <li>Click "Get Started" to create your Stripe account</li>
              <li>Provide your business information (2 minutes)</li>
              <li>Stripe verifies your identity</li>
              <li>Start accepting payments immediately</li>
            </ol>

            <ion-note class="ion-margin-top">
              <ion-icon name="document-text-outline" />
              Stripe handles all compliance and security. Your financial information is never stored on FitOS servers.
            </ion-note>
          </ion-card-content>
        </ion-card>
      }

      @if (showSuccessMessage()) {
        <ion-card color="success">
          <ion-card-content>
            <div class="status-badge">
              <ion-icon name="checkmark-circle-outline" />
              <div>
                <h3>Setup Complete!</h3>
                <p>Your payment account has been successfully configured.</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      gap: 1rem;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 1rem;

      ion-icon {
        font-size: 3rem;
      }

      h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.25rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        font-size: 0.9rem;
        opacity: 0.9;
      }
    }

    .hero-section {
      text-align: center;
      padding: 2rem 0;

      ion-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 1rem 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      p {
        margin: 0;
        color: var(--ion-color-medium);
      }
    }

    .benefits {
      margin-top: 2rem;

      h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        font-weight: 600;
      }

      ion-item {
        --padding-start: 0;
      }
    }

    .business-type {
      h3 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        font-weight: 600;
      }

      ion-item {
        --padding-start: 0;
        margin-bottom: 0.5rem;
      }
    }

    .powered-by {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1rem;
      font-size: 0.9rem;
      color: var(--ion-color-medium);

      ion-icon {
        font-size: 1rem;
      }
    }

    .steps-list {
      padding-left: 1.25rem;
      margin: 0;

      li {
        margin-bottom: 0.75rem;
        line-height: 1.5;
      }
    }

    .fee-example {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--ion-color-light);
      border-radius: 8px;

      strong {
        display: block;
        margin-bottom: 0.5rem;
      }

      ul {
        margin: 0.5rem 0 0 0;
        padding-left: 1.25rem;

        li {
          margin-bottom: 0.25rem;
        }
      }
    }

    ion-note {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.85rem;
      line-height: 1.5;

      ion-icon {
        margin-top: 0.125rem;
        flex-shrink: 0;
      }
    }
  `],
})
export class StripeConnectOnboardingPage implements OnInit {
  stripeService = inject(StripeService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // State
  businessType = signal<'individual' | 'company'>('individual');
  showSuccessMessage = signal(false);

  // Computed
  status = this.stripeService.connectStatus;

  constructor() {
    addIcons({
      cardOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      lockClosedOutline,
      cashOutline,
      timeOutline,
      documentTextOutline,
      openOutline,
      refreshOutline,
    });
  }

  async ngOnInit() {
    // Load current Stripe Connect status
    await this.stripeService.loadConnectStatus();

    // Check for success/refresh query params
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true') {
        this.showSuccessMessage.set(true);
        setTimeout(() => this.showSuccessMessage.set(false), 5000);
        // Reload status to get updated info
        this.stripeService.loadConnectStatus();
      } else if (params['refresh'] === 'true') {
        this.presentRefreshAlert();
      }
    });
  }

  onBusinessTypeChange(event: CustomEvent) {
    this.businessType.set(event.detail.value);
  }

  async startOnboarding() {
    const result = await this.stripeService.createConnectAccountLink(this.businessType());

    if ('error' in result) {
      this.presentErrorToast(result.error);
      return;
    }

    // Redirect to Stripe onboarding
    window.location.href = result.url;
  }

  async continueOnboarding() {
    const result = await this.stripeService.createConnectAccountLink(this.businessType());

    if ('error' in result) {
      this.presentErrorToast(result.error);
      return;
    }

    // Redirect to Stripe onboarding
    window.location.href = result.url;
  }

  async openDashboard() {
    const result = await this.stripeService.createDashboardLink();

    if ('error' in result) {
      this.presentErrorToast(result.error);
      return;
    }

    // Open Stripe dashboard in new tab
    window.open(result.url, '_blank');
  }

  async viewPayouts() {
    const payouts = await this.stripeService.getPayouts(50);

    if (payouts.length === 0) {
      this.presentInfoToast('No payouts yet. Payouts will appear here once you start receiving payments.');
      return;
    }

    // Show payouts in an alert
    const alert = await this.alertController.create({
      header: 'Recent Payouts',
      message: this.formatPayoutsMessage(payouts.slice(0, 5)),
      buttons: ['Close'],
    });

    await alert.present();
  }

  private formatPayoutsMessage(payouts: any[]): string {
    return payouts
      .map(p => {
        const amount = (p.amountCents / 100).toFixed(2);
        const date = new Date(p.createdAt).toLocaleDateString();
        const status = p.status.replace('_', ' ');
        return `${date}: $${amount} USD - ${status}`;
      })
      .join('<br>');
  }

  private async presentRefreshAlert() {
    const alert = await this.alertController.create({
      header: 'Continue Setup',
      message: 'Please continue with your Stripe account setup to enable payments.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Continue',
          handler: () => {
            this.continueOnboarding();
          },
        },
      ],
    });

    await alert.present();
  }

  private async presentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top',
    });

    await toast.present();
  }

  private async presentInfoToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'primary',
      position: 'top',
    });

    await toast.present();
  }
}
