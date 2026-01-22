import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { OutcomePricingService, PricingTier } from '../../services/outcome-pricing.service';

/**
 * Pricing Tiers Page
 *
 * Lists all outcome-based pricing tiers for the trainer.
 * Allows creation, editing, and deactivation of tiers.
 */
@Component({
  selector: 'fit-pricing-tiers',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Outcome Pricing</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="createTier()">
            <ion-icon name="add" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Empty State -->
      @if (tiers().length === 0 && !isLoading()) {
        <div class="empty-state">
          <ion-icon name="receipt-outline" class="empty-icon"></ion-icon>
          <h2>No Pricing Tiers</h2>
          <p>Create outcome-based pricing tiers that reward client results.</p>
          <ion-button (click)="createTier()" expand="block">
            <ion-icon name="add" slot="start"></ion-icon>
            Create First Tier
          </ion-button>
        </div>
      }

      <!-- Tiers List -->
      @if (tiers().length > 0) {
        <ion-list>
          <ion-list-header>
            <ion-label>
              <h2>Active Pricing Tiers</h2>
              <p>{{ tiers().length }} tier{{ tiers().length !== 1 ? 's' : '' }}</p>
            </ion-label>
          </ion-list-header>

          @for (tier of tiers(); track tier.id) {
            <ion-item (click)="viewTier(tier)" button detail>
              <ion-label>
                <h2>{{ tier.name }}</h2>
                <p>{{ tier.description || 'No description' }}</p>
                <div class="tier-details">
                  <ion-chip color="primary" size="small">
                    <ion-icon name="cash-outline"></ion-icon>
                    <ion-label>{{ formatPrice(tier.base_price_cents) }}/mo</ion-label>
                  </ion-chip>
                  @if (tier.outcome_bonus_cents) {
                    <ion-chip color="success" size="small">
                      <ion-icon name="trophy-outline"></ion-icon>
                      <ion-label>+{{ formatPrice(tier.outcome_bonus_cents) }} bonus</ion-label>
                    </ion-chip>
                  }
                  <ion-chip color="medium" size="small">
                    <ion-label>{{ formatVerificationMethod(tier.verification_method) }}</ion-label>
                  </ion-chip>
                </div>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading pricing tiers...</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      min-height: 400px;
    }

    .empty-icon {
      font-size: 96px;
      color: var(--ion-color-medium);
      margin-bottom: 24px;
    }

    .empty-state h2 {
      color: var(--ion-color-step-850, #000);
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      margin-bottom: 24px;
      max-width: 300px;
    }

    .tier-details {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    ion-chip {
      margin: 0;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      min-height: 400px;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--ion-color-medium);
    }
  `]
})
export class PricingTiersPage implements OnInit {
  private readonly outcomePricingService = inject(OutcomePricingService);
  private readonly router = inject(Router);

  tiers = signal<PricingTier[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadTiers();
  }

  async loadTiers() {
    this.isLoading.set(true);
    this.error.set(null);

    this.outcomePricingService.listPricingTiers().subscribe({
      next: (tiers) => {
        this.tiers.set(tiers);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load pricing tiers:', err);
        this.error.set('Failed to load pricing tiers');
        this.isLoading.set(false);
      }
    });
  }

  createTier() {
    this.router.navigate(['/outcome-pricing/tiers/create']);
  }

  viewTier(tier: PricingTier) {
    this.router.navigate(['/outcome-pricing/tiers', tier.id]);
  }

  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  formatVerificationMethod(method: string): string {
    const labels: Record<string, string> = {
      weight_loss: 'Weight Loss',
      strength_gain: 'Strength Gain',
      body_comp: 'Body Composition',
      consistency: 'Consistency',
      custom: 'Custom'
    };
    return labels[method] || method;
  }
}
