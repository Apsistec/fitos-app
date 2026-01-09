import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  ToastController,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, createOutline } from 'ionicons/icons';
import { SubscriptionService, TrainerPricing } from '@app/core/services/subscription.service';
import { StripeService } from '@app/core/services/stripe.service';

@Component({
  standalone: true,
  selector: 'app-trainer-pricing',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonIcon,
    IonSpinner,
    IonNote,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Pricing Tiers</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="pricing-container">
        @if (!stripeConnected()) {
          <ion-card color="warning">
            <ion-card-content>
              <p>Connect your Stripe account in Settings to create pricing tiers and accept payments.</p>
              <ion-button fill="outline" (click)="goToSettings()">
                Go to Settings
              </ion-button>
            </ion-card-content>
          </ion-card>
        } @else {
          <!-- Existing Pricing Tiers -->
          <div class="section-header">
            <h2>Your Pricing Tiers</h2>
            <ion-button fill="clear" size="small" (click)="showAddForm()">
              <ion-icon name="add-outline" slot="start"></ion-icon>
              Add Tier
            </ion-button>
          </div>

          @if (loading()) {
            <div class="loading-state">
              <ion-spinner name="crescent"></ion-spinner>
              <p>Loading pricing...</p>
            </div>
          } @else if (pricingTiers().length === 0 && !showForm()) {
            <ion-card>
              <ion-card-content class="empty-state">
                <p>No pricing tiers yet. Create your first tier to start accepting subscriptions.</p>
                <ion-button (click)="showAddForm()">
                  <ion-icon name="add-outline" slot="start"></ion-icon>
                  Create Pricing Tier
                </ion-button>
              </ion-card-content>
            </ion-card>
          } @else {
            <div class="pricing-list">
              @for (tier of pricingTiers(); track tier.stripePriceId) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>{{ tier.name }}</ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="tier-price">
                      {{ tier.amountCents / 100 | currency:tier.currency.toUpperCase() }}
                      <span class="interval">/ {{ tier.interval }}</span>
                    </div>
                    @if (tier.description) {
                      <p class="tier-description">{{ tier.description }}</p>
                    }
                    <div class="tier-status">
                      @if (tier.isActive) {
                        <ion-note color="success">Active</ion-note>
                      } @else {
                        <ion-note color="medium">Inactive</ion-note>
                      }
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </div>
          }

          <!-- Add/Edit Pricing Form -->
          @if (showForm()) {
            <ion-card class="form-card">
              <ion-card-header>
                <ion-card-title>{{ editingTier() ? 'Edit' : 'New' }} Pricing Tier</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <form [formGroup]="pricingForm" (ngSubmit)="savePricing()">
                  <ion-list>
                    <ion-item>
                      <ion-input
                        label="Tier Name"
                        labelPlacement="stacked"
                        placeholder="e.g., Basic, Premium, Pro"
                        formControlName="name"
                        type="text"
                      ></ion-input>
                    </ion-item>

                    <ion-item>
                      <ion-textarea
                        label="Description (optional)"
                        labelPlacement="stacked"
                        placeholder="What's included in this tier?"
                        formControlName="description"
                        rows="2"
                      ></ion-textarea>
                    </ion-item>

                    <ion-item>
                      <ion-input
                        label="Price"
                        labelPlacement="stacked"
                        placeholder="99.00"
                        formControlName="amount"
                        type="number"
                        min="1"
                        step="0.01"
                      ></ion-input>
                    </ion-item>

                    <ion-item>
                      <ion-select
                        label="Currency"
                        labelPlacement="stacked"
                        formControlName="currency"
                      >
                        <ion-select-option value="usd">USD ($)</ion-select-option>
                        <ion-select-option value="eur">EUR (€)</ion-select-option>
                        <ion-select-option value="gbp">GBP (£)</ion-select-option>
                        <ion-select-option value="cad">CAD ($)</ion-select-option>
                        <ion-select-option value="aud">AUD ($)</ion-select-option>
                      </ion-select>
                    </ion-item>

                    <ion-item>
                      <ion-select
                        label="Billing Interval"
                        labelPlacement="stacked"
                        formControlName="interval"
                      >
                        <ion-select-option value="week">Weekly</ion-select-option>
                        <ion-select-option value="month">Monthly</ion-select-option>
                        <ion-select-option value="year">Yearly</ion-select-option>
                      </ion-select>
                    </ion-item>
                  </ion-list>

                  @if (error()) {
                    <ion-note color="danger" class="form-error">
                      {{ error() }}
                    </ion-note>
                  }

                  <div class="form-actions">
                    <ion-button fill="outline" (click)="cancelForm()">
                      Cancel
                    </ion-button>
                    <ion-button type="submit" [disabled]="!pricingForm.valid || saving()">
                      @if (saving()) {
                        <ion-spinner name="crescent"></ion-spinner>
                      } @else {
                        Save Tier
                      }
                    </ion-button>
                  </div>
                </form>
              </ion-card-content>
            </ion-card>
          }

          <!-- Platform Fee Info -->
          <ion-note class="fee-note">
            FitOS charges a 10% platform fee on subscription payments. You receive 90% of each payment directly to your Stripe account.
          </ion-note>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .pricing-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      color: var(--ion-color-medium);

      p {
        margin-top: 16px;
      }
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;

      p {
        margin-bottom: 16px;
        color: var(--ion-color-medium);
      }
    }

    .pricing-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .tier-price {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ion-color-primary);

      .interval {
        font-size: 0.875rem;
        font-weight: 400;
        color: var(--ion-color-medium);
      }
    }

    .tier-description {
      margin: 8px 0;
      color: var(--ion-color-medium);
    }

    .tier-status {
      margin-top: 8px;
    }

    .form-card {
      margin-top: 24px;
    }

    .form-error {
      display: block;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 8px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .fee-note {
      display: block;
      text-align: center;
      padding: 16px;
      margin-top: 24px;
      font-size: 0.875rem;
    }
  `],
})
export class TrainerPricingPage implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private stripeService = inject(StripeService);
  private toastController = inject(ToastController);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // State signals
  loading = this.subscriptionService.loading;
  error = this.subscriptionService.error;
  pricingTiers = this.subscriptionService.trainerPricing;
  stripeConnected = this.stripeService.isConnected;

  showForm = signal(false);
  editingTier = signal<TrainerPricing | null>(null);
  saving = signal(false);

  pricingForm: FormGroup;

  constructor() {
    addIcons({ addOutline, trashOutline, createOutline });

    this.pricingForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      amount: [null, [Validators.required, Validators.min(1)]],
      currency: ['usd', Validators.required],
      interval: ['month', Validators.required],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.stripeService.loadConnectStatus();
    if (this.stripeConnected()) {
      await this.subscriptionService.loadTrainerPricing();
    }
  }

  showAddForm(): void {
    this.editingTier.set(null);
    this.pricingForm.reset({
      name: '',
      description: '',
      amount: null,
      currency: 'usd',
      interval: 'month',
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingTier.set(null);
  }

  async savePricing(): Promise<void> {
    if (!this.pricingForm.valid) return;

    this.saving.set(true);

    const formValue = this.pricingForm.value;
    const pricing: TrainerPricing = {
      name: formValue.name,
      description: formValue.description || undefined,
      amountCents: Math.round(formValue.amount * 100),
      currency: formValue.currency,
      interval: formValue.interval,
      isActive: true,
    };

    const result = await this.subscriptionService.savePricing(pricing);

    this.saving.set(false);

    if (result.error) {
      const toast = await this.toastController.create({
        message: result.error,
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    } else {
      const toast = await this.toastController.create({
        message: 'Pricing tier created successfully',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
      this.showForm.set(false);
    }
  }

  goToSettings(): void {
    this.router.navigate(['/tabs/settings']);
  }
}
