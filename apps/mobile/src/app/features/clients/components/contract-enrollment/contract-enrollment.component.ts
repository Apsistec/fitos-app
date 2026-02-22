/**
 * ContractEnrollmentComponent — Sprint 59 (Phase 5C)
 *
 * Modal sheet for enrolling a client in an autopay contract.
 * - Lists available contract pricing options
 * - Shows billing amount, interval, and sessions per cycle
 * - Calls create-subscription Edge Function
 * - Requires stripe_payment_method_id on client profile
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonNote,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  cardOutline,
  calendarOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  repeatOutline,
  layersOutline,
} from 'ionicons/icons';
import { PricingOptionService } from '../../../../core/services/pricing-option.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { PricingOption } from '@fitos/shared';

addIcons({
  closeOutline,
  cardOutline,
  calendarOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  repeatOutline,
  layersOutline,
});

@Component({
  selector: 'app-contract-enrollment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonBadge,
    IonIcon,
    IonSpinner,
    IonNote,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Enroll in Contract</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()" aria-label="Close">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="enrollment-container">

        <!-- Client payment method warning -->
        @if (!clientHasCard()) {
          <div class="warning-banner">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <div class="warning-text">
              <strong>No card on file</strong>
              <p>This client needs a payment method before enrolling in an autopay contract.</p>
            </div>
          </div>
        }

        <!-- Loading -->
        @if (isLoading()) {
          <div class="loading-state">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading contract options…</p>
          </div>
        }

        <!-- No contracts available -->
        @else if (contractOptions().length === 0) {
          <div class="empty-state">
            <ion-icon name="layers-outline"></ion-icon>
            <h3>No Contract Plans</h3>
            <p>Create a contract pricing option in Settings → Pricing Options first.</p>
          </div>
        }

        <!-- Contract option list -->
        @else {
          <p class="section-label">SELECT A CONTRACT PLAN</p>

          @for (option of contractOptions(); track option.id) {
            <ion-card
              class="contract-card"
              [class.selected]="selectedOption()?.id === option.id"
              (click)="selectOption(option)"
            >
              <ion-card-content>
                <div class="contract-header">
                  <div class="contract-name">{{ option.name }}</div>
                  <div class="contract-price">${{ option.price | number:'1.2-2' }}</div>
                </div>

                <div class="contract-meta">
                  <span class="meta-chip">
                    <ion-icon name="repeat-outline"></ion-icon>
                    {{ formatInterval(option.autopay_interval) }}
                  </span>
                  @if (option.autopay_session_count) {
                    <span class="meta-chip">
                      <ion-icon name="calendar-outline"></ion-icon>
                      {{ option.autopay_session_count }} session{{ option.autopay_session_count !== 1 ? 's' : '' }} / cycle
                    </span>
                  }
                </div>

                @if (selectedOption()?.id === option.id) {
                  <div class="selected-indicator">
                    <ion-icon name="checkmark-circle-outline" color="primary"></ion-icon>
                    <span>Selected</span>
                  </div>
                }
              </ion-card-content>
            </ion-card>
          }

          <!-- Billing summary -->
          @if (selectedOption()) {
            <div class="billing-summary">
              <div class="summary-row">
                <span class="summary-label">Billing Amount</span>
                <span class="summary-value">${{ selectedOption()!.price | number:'1.2-2' }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Billing Cycle</span>
                <span class="summary-value">{{ formatInterval(selectedOption()!.autopay_interval) }}</span>
              </div>
              @if (selectedOption()!.autopay_session_count) {
                <div class="summary-row">
                  <span class="summary-label">Sessions per Cycle</span>
                  <span class="summary-value">{{ selectedOption()!.autopay_session_count }}</span>
                </div>
              }
              <div class="summary-row">
                <span class="summary-label">First Charge</span>
                <span class="summary-value">Today (immediately)</span>
              </div>
              <div class="summary-divider"></div>
              <p class="summary-note">
                <ion-icon name="card-outline"></ion-icon>
                Charged automatically to client's card on file. Client can cancel anytime.
              </p>
            </div>
          }

          <!-- Enroll button -->
          <ion-button
            expand="block"
            [disabled]="!selectedOption() || !clientHasCard() || enrolling()"
            (click)="enroll()"
            class="enroll-button"
          >
            @if (enrolling()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              Enroll in Autopay Contract
            }
          </ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
    }

    .enrollment-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Warning banner */
    .warning-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
    }

    .warning-banner ion-icon {
      font-size: 20px;
      color: var(--fitos-status-warning, #F59E0B);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .warning-text strong {
      display: block;
      color: var(--fitos-status-warning, #F59E0B);
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .warning-text p {
      margin: 0;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      line-height: 1.4;
    }

    /* States */
    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px 20px;
      text-align: center;
    }

    .empty-state ion-icon {
      font-size: 48px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .empty-state h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      line-height: 1.5;
    }

    .loading-state p {
      margin: 0;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    /* Section label */
    .section-label {
      margin: 4px 0;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.8px;
      color: var(--fitos-text-tertiary, #737373);
    }

    /* Contract card */
    .contract-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1.5px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .contract-card.selected {
      border-color: var(--ion-color-primary, #10B981);
      --background: rgba(16, 185, 129, 0.05);
    }

    .contract-card ion-card-content {
      padding: 14px;
    }

    .contract-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }

    .contract-name {
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      flex: 1;
      padding-right: 12px;
    }

    .contract-price {
      font-size: 20px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      color: var(--ion-color-primary, #10B981);
      white-space: nowrap;
    }

    .contract-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 4px;
    }

    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .meta-chip ion-icon {
      font-size: 13px;
    }

    .selected-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      font-size: 13px;
      font-weight: 500;
      color: var(--ion-color-primary, #10B981);
    }

    .selected-indicator ion-icon {
      font-size: 16px;
    }

    /* Billing summary */
    .billing-summary {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 16px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }

    .summary-label {
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .summary-value {
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .summary-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 10px 0;
    }

    .summary-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0;
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      line-height: 1.5;
    }

    .summary-note ion-icon {
      font-size: 14px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Enroll button */
    .enroll-button {
      margin-top: 4px;
      --border-radius: 10px;
      height: 52px;
      font-size: 16px;
      font-weight: 700;
      --box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
    }
  `],
})
export class ContractEnrollmentComponent implements OnInit {
  // ── Inputs ──────────────────────────────────────────────────────────────────

  /** The client being enrolled */
  clientId = input.required<string>();

  /** Whether the client has stripe_payment_method_id set */
  clientHasCard = input<boolean>(false);

  // ── Outputs ─────────────────────────────────────────────────────────────────

  /** Emits clientServiceId on successful enrollment */
  enrolled = output<{ clientServiceId: string; subscriptionId: string }>();

  // ── DI ──────────────────────────────────────────────────────────────────────

  private pricingOptionService = inject(PricingOptionService);
  private supabase = inject(SupabaseService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  // ── State ───────────────────────────────────────────────────────────────────

  isLoading = signal(false);
  enrolling = signal(false);
  selectedOption = signal<PricingOption | null>(null);

  contractOptions = computed(() =>
    this.pricingOptionService.contractOptions()
  );

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadOptions();
  }

  private async loadOptions(): Promise<void> {
    const trainerId = (await this.supabase.client.auth.getUser()).data.user?.id;
    if (!trainerId) return;

    this.isLoading.set(true);
    try {
      await this.pricingOptionService.loadAll(trainerId);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Interaction ───────────────────────────────────────────────────────────────

  selectOption(option: PricingOption): void {
    this.selectedOption.set(option);
  }

  async enroll(): Promise<void> {
    const option = this.selectedOption();
    if (!option) return;

    this.enrolling.set(true);
    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'create-subscription',
        {
          body: {
            client_id:         this.clientId(),
            pricing_option_id: option.id,
          },
        },
      );

      if (error) throw error;

      const toast = await this.toastCtrl.create({
        message: `✓ Enrolled in ${option.name}. First charge will process shortly.`,
        duration: 3500,
        color:    'success',
        position: 'top',
      });
      await toast.present();

      this.enrolled.emit({
        clientServiceId: data.clientServiceId,
        subscriptionId:  data.stripeSubscriptionId,
      });

      await this.dismiss();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Enrollment failed';
      console.error('Contract enrollment error:', message);

      const toast = await this.toastCtrl.create({
        message: `Enrollment failed: ${message}`,
        duration: 4000,
        color:    'warning',
        position: 'top',
      });
      await toast.present();
    } finally {
      this.enrolling.set(false);
    }
  }

  async dismiss(): Promise<void> {
    await this.modalCtrl.dismiss();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  formatInterval(interval?: string): string {
    const map: Record<string, string> = {
      weekly:   'Weekly',
      biweekly: 'Every 2 Weeks',
      monthly:  'Monthly',
    };
    return interval ? (map[interval] ?? interval) : '—';
  }
}
