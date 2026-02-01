import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { OutcomePricingService, CreatePricingTierRequest } from '../../services/outcome-pricing.service';

/**
 * Create Pricing Tier Page
 *
 * Wizard-style interface for creating outcome-based pricing tiers.
 */
@Component({
  selector: 'fit-create-tier',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/outcome-pricing/tiers"></ion-back-button>
        </ion-buttons>
        <ion-title>Create Pricing Tier</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <form #tierForm="ngForm" (ngSubmit)="onSubmit()">
        <!-- Basic Info -->
        <ion-list>
          <ion-list-header>
            <ion-label>
              <h2>Basic Information</h2>
            </ion-label>
          </ion-list-header>

          <ion-item>
            <ion-input
              label="Tier Name"
              labelPlacement="stacked"
              placeholder="e.g., Results-Driven Package"
              [(ngModel)]="tierData.name"
              name="name"
              required
              maxlength="100"
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-textarea
              label="Description (Optional)"
              labelPlacement="stacked"
              placeholder="Describe this pricing tier..."
              [(ngModel)]="tierData.description"
              name="description"
              rows="3"
              maxlength="500"
            ></ion-textarea>
          </ion-item>
        </ion-list>

        <!-- Pricing -->
        <ion-list>
          <ion-list-header>
            <ion-label>
              <h2>Pricing Structure</h2>
            </ion-label>
          </ion-list-header>

          <ion-item>
            <ion-input
              label="Base Monthly Price"
              labelPlacement="stacked"
              type="number"
              placeholder="200"
              [(ngModel)]="basePriceDollars"
              name="basePrice"
              required
              min="0"
              step="0.01"
            ></ion-input>
            <ion-note slot="helper">Base subscription price per month</ion-note>
          </ion-item>

          <ion-item>
            <ion-input
              label="Outcome Bonus (Optional)"
              labelPlacement="stacked"
              type="number"
              placeholder="50"
              [(ngModel)]="bonusPriceDollars"
              name="bonusPrice"
              min="0"
              step="0.01"
            ></ion-input>
            <ion-note slot="helper">Bonus paid when milestones are achieved</ion-note>
          </ion-item>
        </ion-list>

        <!-- Goal Type -->
        <ion-list>
          <ion-list-header>
            <ion-label>
              <h2>Goal Type</h2>
              <p>What outcome will be tracked and verified?</p>
            </ion-label>
          </ion-list-header>

          <ion-radio-group [(ngModel)]="tierData.verification_method" name="verificationMethod" required>
            <ion-item>
              <ion-radio value="weight_loss" slot="start"></ion-radio>
              <ion-label>
                <h3>Weight Loss</h3>
                <p>Track weight changes via nutrition logs</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-radio value="strength_gain" slot="start"></ion-radio>
              <ion-label>
                <h3>Strength Gain</h3>
                <p>Track 1RM improvements from workout logs</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-radio value="consistency" slot="start"></ion-radio>
              <ion-label>
                <h3>Consistency</h3>
                <p>Track workout or nutrition adherence</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-radio value="body_comp" slot="start"></ion-radio>
              <ion-label>
                <h3>Body Composition</h3>
                <p>Manual verification with photos</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-radio value="custom" slot="start"></ion-radio>
              <ion-label>
                <h3>Custom Goal</h3>
                <p>Define a custom outcome metric</p>
              </ion-label>
            </ion-item>
          </ion-radio-group>
        </ion-list>

        <!-- Preview -->
        @if (tierData.name && tierData.verification_method) {
          <ion-list>
            <ion-list-header>
              <ion-label>
                <h2>Preview</h2>
              </ion-label>
            </ion-list-header>

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ tierData.name }}</ion-card-title>
                <ion-card-subtitle>{{ formatVerificationMethod(tierData.verification_method) }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <div class="pricing-preview">
                  <div class="base-price">
                    <ion-icon name="cash-outline"></ion-icon>
                    <div>
                      <strong>{{ formatPrice(basePriceDollars) }}/month</strong>
                      <p>Base subscription</p>
                    </div>
                  </div>
                  @if (bonusPriceDollars > 0) {
                    <ion-icon name="add" class="plus-icon"></ion-icon>
                    <div class="bonus-price">
                      <ion-icon name="trophy-outline" color="success"></ion-icon>
                      <div>
                        <strong>{{ formatPrice(bonusPriceDollars) }} bonus</strong>
                        <p>Per milestone achieved</p>
                      </div>
                    </div>
                  }
                </div>
                @if (tierData.description) {
                  <p class="description">{{ tierData.description }}</p>
                }
              </ion-card-content>
            </ion-card>
          </ion-list>
        }

        <!-- Actions -->
        <div class="form-actions">
          <ion-button expand="block" type="submit" [disabled]="!tierForm.valid || isSaving()">
            @if (isSaving()) {
              <ion-spinner slot="start"></ion-spinner>
              Creating...
            } @else {
              Create Pricing Tier
            }
          </ion-button>
        </div>

        <!-- Error Message -->
        @if (error()) {
          <ion-text color="danger" class="error-message">
            <p>{{ error() }}</p>
          </ion-text>
        }
      </form>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-list {
      margin-bottom: 16px;
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    .pricing-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .base-price,
    .bonus-price {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .base-price ion-icon,
    .bonus-price ion-icon {
      font-size: 32px;
    }

    .base-price strong,
    .bonus-price strong {
      display: block;
      font-size: 18px;
      font-family: 'Space Mono', monospace;
      margin-bottom: 2px;
    }

    .base-price p,
    .bonus-price p {
      margin: 0;
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .plus-icon {
      font-size: 20px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .description {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      color: var(--fitos-text-secondary, #A3A3A3);
      line-height: 1.5;
    }

    .form-actions {
      padding: 24px 16px;
    }

    .error-message {
      text-align: center;
      padding: 0 16px 16px;
    }

    .error-message p {
      margin: 0;
    }
  `]
})
export class CreateTierPage {
  private readonly outcomePricingService = inject(OutcomePricingService);
  private readonly router = inject(Router);

  tierData: Partial<CreatePricingTierRequest> = {
    name: '',
    description: '',
    verification_method: undefined
  };

  basePriceDollars = 200;
  bonusPriceDollars = 0;

  isSaving = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    if (!this.tierData.name || !this.tierData.verification_method) {
      return;
    }

    const request: CreatePricingTierRequest = {
      name: this.tierData.name,
      description: this.tierData.description || undefined,
      base_price_cents: Math.round(this.basePriceDollars * 100),
      outcome_bonus_cents: this.bonusPriceDollars > 0 ? Math.round(this.bonusPriceDollars * 100) : undefined,
      verification_method: this.tierData.verification_method,
      tier_config: {}
    };

    this.isSaving.set(true);
    this.error.set(null);

    this.outcomePricingService.createPricingTier(request).subscribe({
      next: (tier) => {
        console.log('Pricing tier created:', tier);
        this.isSaving.set(false);
        // Navigate back to tiers list
        this.router.navigate(['/outcome-pricing/tiers']);
      },
      error: (err) => {
        console.error('Failed to create pricing tier:', err);
        this.error.set(err.error?.detail || 'Failed to create pricing tier. Please try again.');
        this.isSaving.set(false);
      }
    });
  }

  formatPrice(dollars: number): string {
    return `$${dollars.toFixed(2)}`;
  }

  formatVerificationMethod(method: string): string {
    const labels: Record<string, string> = {
      weight_loss: 'Weight Loss Goal',
      strength_gain: 'Strength Gain Goal',
      body_comp: 'Body Composition Goal',
      consistency: 'Consistency Goal',
      custom: 'Custom Goal'
    };
    return labels[method] || method;
  }
}
