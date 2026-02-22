import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonInput,
  IonCard,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonNote,
  IonBadge,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  cardOutline,
  cashOutline,
  walletOutline,
  receiptOutline,
  personOutline,
  timeOutline,
  pricetagOutline,
  chevronForward,
} from 'ionicons/icons';
import { PricingOptionService } from '../../../../core/services/pricing-option.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import type {
  Appointment,
  ClientService,
  CheckoutPaymentMethod,
  CheckoutResult,
} from '@fitos/shared';


/**
 * CheckoutPanelComponent — Sprint 58 (Phase 5C)
 *
 * Slide-out modal sheet for completing appointment checkout from the calendar.
 * - Auto-selects client's applicable pricing option (FIFO by expiry)
 * - Supports session_pack, card, cash, account_balance, comp, split payments
 * - Tip entry and optional discount
 * - Calls process-checkout Edge Function to atomically complete the transaction
 *
 * Usage: open as modal from AppointmentBlockComponent or SchedulePage.
 *   modal.componentProps = { appointment: appt }
 *   modal.onDidDismiss → { data: { result } }
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-checkout-panel',
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonInput,
    IonCard,
    IonCardContent,
    IonIcon,
    IonSpinner,
    IonNote,
    IonBadge
],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Checkout</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="checkout-container">

        @if (isLoading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading checkout…</p>
          </div>
        } @else {

          <!-- ── Session Summary Card ─────────────────────────────────────── -->
          <ion-card class="summary-card">
            <ion-card-content>
              <div class="summary-row">
                <ion-icon name="person-outline" class="summary-icon"></ion-icon>
                <div>
                  <div class="summary-label">Client</div>
                  <div class="summary-value">{{ clientName() }}</div>
                </div>
              </div>
              <div class="summary-row">
                <ion-icon name="time-outline" class="summary-icon"></ion-icon>
                <div>
                  <div class="summary-label">Session</div>
                  <div class="summary-value">{{ serviceName() }}</div>
                  <div class="summary-sub">{{ appointment().start_at | date:'shortTime' }} · {{ appointment().duration_minutes }} min</div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- ── Payment Method ───────────────────────────────────────────── -->
          <ion-card>
            <ion-card-content>
              <h3 class="section-label">Payment Method</h3>

              <!-- Auto-detected package -->
              @if (applicableServices().length > 0) {
                <div class="package-options">
                  @for (cs of applicableServices(); track cs.id) {
                    <button
                      class="package-btn"
                      [class.selected]="selectedClientServiceId() === cs.id && paymentMethod() === 'session_pack'"
                      (click)="selectPackage(cs)"
                    >
                      <div class="package-name">{{ cs.pricing_option?.name ?? 'Package' }}</div>
                      <div class="package-meta">
                        @if (cs.sessions_remaining !== null && cs.sessions_remaining !== undefined) {
                          {{ cs.sessions_remaining }} session{{ cs.sessions_remaining !== 1 ? 's' : '' }} left
                        } @else {
                          Unlimited
                        }
                        @if (cs.expires_at) {
                          · exp {{ cs.expires_at | date:'M/d/yy' }}
                        }
                      </div>
                      @if (selectedClientServiceId() === cs.id && paymentMethod() === 'session_pack') {
                        <ion-badge color="success" class="selected-badge">Selected</ion-badge>
                      }
                    </button>
                  }
                </div>
              }

              <!-- Other payment methods -->
              <div class="payment-method-grid">
                <button
                  class="method-btn"
                  [class.selected]="paymentMethod() === 'card'"
                  (click)="setPaymentMethod('card')"
                >
                  <ion-icon name="card-outline"></ion-icon>
                  <span>Card</span>
                </button>
                <button
                  class="method-btn"
                  [class.selected]="paymentMethod() === 'cash'"
                  (click)="setPaymentMethod('cash')"
                >
                  <ion-icon name="cash-outline"></ion-icon>
                  <span>Cash</span>
                </button>
                <button
                  class="method-btn"
                  [class.selected]="paymentMethod() === 'account_balance'"
                  (click)="setPaymentMethod('account_balance')"
                >
                  <ion-icon name="wallet-outline"></ion-icon>
                  <span>Balance</span>
                </button>
                <button
                  class="method-btn"
                  [class.selected]="paymentMethod() === 'comp'"
                  (click)="setPaymentMethod('comp')"
                >
                  <ion-icon name="receipt-outline"></ion-icon>
                  <span>Comp</span>
                </button>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- ── Adjustments ──────────────────────────────────────────────── -->
          <ion-card>
            <ion-card-content>
              <h3 class="section-label">Adjustments</h3>

              <ion-item class="adj-item">
                <ion-input
                  label="Tip ($)"
                  labelPlacement="stacked"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  [value]="tipAmount()"
                  (ionInput)="tipAmount.set(+($event.detail.value ?? 0))"
                ></ion-input>
              </ion-item>

              <ion-item class="adj-item">
                <ion-input
                  label="Discount ($)"
                  labelPlacement="stacked"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  [value]="discountAmount()"
                  (ionInput)="discountAmount.set(+($event.detail.value ?? 0))"
                ></ion-input>
              </ion-item>
            </ion-card-content>
          </ion-card>

          <!-- ── Receipt Preview ─────────────────────────────────────────── -->
          <ion-card class="receipt-card">
            <ion-card-content>
              <div class="receipt-line">
                <span>Service</span>
                <span>{{ effectiveServicePrice() | currency }}</span>
              </div>
              @if (tipAmount() > 0) {
                <div class="receipt-line">
                  <span>Tip</span>
                  <span>{{ tipAmount() | currency }}</span>
                </div>
              }
              @if (discountAmount() > 0) {
                <div class="receipt-line discount-line">
                  <span>Discount</span>
                  <span>-{{ discountAmount() | currency }}</span>
                </div>
              }
              <div class="receipt-total">
                <span>Total</span>
                <span>{{ receiptTotal() | currency }}</span>
              </div>
            </ion-card-content>
          </ion-card>

          @if (checkoutError()) {
            <ion-note class="error-note">{{ checkoutError() }}</ion-note>
          }

          <!-- ── Complete Checkout Button ─────────────────────────────────── -->
          <ion-button
            expand="block"
            class="checkout-btn"
            [disabled]="isProcessing() || !canCheckout()"
            (click)="completeCheckout()"
          >
            @if (isProcessing()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
              Complete Checkout · {{ receiptTotal() | currency }}
            }
          </ion-button>

        }
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-header ion-toolbar {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-width: 0;
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0 0 12px;
    }

    ion-item {
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);
    }

    .checkout-container {
      max-width: 520px;
      margin: 0 auto;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 0;
      color: var(--fitos-text-secondary, #A3A3A3);

      p { margin-top: 16px; }
    }

    /* ── Summary card ── */
    .summary-card {
      border-color: rgba(16, 185, 129, 0.2);
    }

    .summary-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;

      &:last-child { margin-bottom: 0; }
    }

    .summary-icon {
      font-size: 20px;
      color: var(--fitos-accent-primary, #10B981);
      margin-top: 2px;
      flex-shrink: 0;
    }

    .summary-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--fitos-text-tertiary, #737373);
      font-weight: 600;
      margin-bottom: 2px;
    }

    .summary-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .summary-sub {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-top: 2px;
    }

    /* ── Section label ── */
    .section-label {
      margin: 0 0 12px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--fitos-text-tertiary, #737373);
      font-weight: 700;
    }

    /* ── Package buttons ── */
    .package-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }

    .package-btn {
      position: relative;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 12px 14px;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s;
      min-height: 44px;

      &.selected {
        border-color: var(--fitos-accent-primary, #10B981);
        background: rgba(16, 185, 129, 0.08);
      }
    }

    .package-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      margin-bottom: 2px;
    }

    .package-meta {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .selected-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 10px;
    }

    /* ── Payment method grid ── */
    .payment-method-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .method-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 6px;
      cursor: pointer;
      transition: border-color 0.15s;
      min-height: 60px;

      ion-icon {
        font-size: 20px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      span {
        font-size: 11px;
        color: var(--fitos-text-secondary, #A3A3A3);
        font-weight: 600;
      }

      &.selected {
        border-color: var(--fitos-accent-primary, #10B981);
        background: rgba(16, 185, 129, 0.08);

        ion-icon, span {
          color: var(--fitos-accent-primary, #10B981);
        }
      }
    }

    /* ── Receipt ── */
    .receipt-card {
      border-color: rgba(255, 255, 255, 0.1);
    }

    .receipt-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .discount-line {
      color: var(--fitos-accent-primary, #10B981);
    }

    .receipt-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      font-family: 'Space Mono', monospace;
    }

    /* ── Error note ── */
    .error-note {
      display: block;
      padding: 10px 12px;
      margin: 0 0 12px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      font-size: 13px;
    }

    /* ── Checkout button ── */
    .checkout-btn {
      --border-radius: 12px;
      height: 52px;
      font-size: 16px;
      font-weight: 700;
      margin-top: 8px;
      margin-bottom: 16px;
    }

    .adj-item {
      --padding-start: 0;
    }
  `],
})
export class CheckoutPanelComponent implements OnInit {
  // ── Component props (set via modal.componentProps) ────────────────────────

  /** The appointment being checked out */
  appointment = input.required<Appointment>();

  /** Optional: pre-resolved client name (avoids extra query) */
  clientDisplayName = input<string>('');

  /** Optional: pre-resolved service name */
  serviceDisplayName = input<string>('');

  // ── Outputs ───────────────────────────────────────────────────────────────

  checkoutCompleted = output<CheckoutResult>();

  // ── DI ────────────────────────────────────────────────────────────────────

  private pricingService = inject(PricingOptionService);
  private supabase       = inject(SupabaseService);
  private modalCtrl      = inject(ModalController);
  private toastCtrl      = inject(ToastController);

  // ── Local state ───────────────────────────────────────────────────────────

  readonly isLoading            = signal(true);
  readonly isProcessing         = signal(false);
  readonly checkoutError        = signal<string | null>(null);
  readonly applicableServices   = signal<ClientService[]>([]);
  readonly selectedClientServiceId = signal<string | null>(null);
  readonly paymentMethod        = signal<CheckoutPaymentMethod>('session_pack');
  readonly tipAmount            = signal(0);
  readonly discountAmount       = signal(0);
  readonly baseServicePrice     = signal(0);
  readonly clientName           = signal('');
  readonly serviceName          = signal('');

  /** Price charged for the service itself (0 when using session pack) */
  readonly effectiveServicePrice = computed<number>(() =>
    this.paymentMethod() === 'session_pack' ? 0 : this.baseServicePrice()
  );

  readonly receiptTotal = computed<number>(() => {
    const subtotal = this.effectiveServicePrice();
    return Math.max(0, subtotal + this.tipAmount() - this.discountAmount());
  });

  readonly canCheckout = computed<boolean>(() => {
    if (this.paymentMethod() === 'session_pack' && !this.selectedClientServiceId()) return false;
    return true;
  });

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      cardOutline,
      cashOutline,
      walletOutline,
      receiptOutline,
      personOutline,
      timeOutline,
      pricetagOutline,
      chevronForward,
    });
  }

  async ngOnInit(): Promise<void> {
    const appt = this.appointment();

    // Client and service names
    this.clientName.set(this.clientDisplayName() || 'Client');
    this.serviceName.set(this.serviceDisplayName() || 'Session');

    // Resolve base price from service type
    if (appt.service_type_id) {
      const { data: stData } = await this.supabase.client
        .from('service_types')
        .select('base_price, name')
        .eq('id', appt.service_type_id)
        .single();

      if (stData) {
        this.baseServicePrice.set(stData.base_price ?? 0);
        if (!this.serviceDisplayName()) {
          this.serviceName.set(stData.name);
        }
      }
    }

    // If pre-linked package exists, load it first
    if (appt.client_service_id) {
      const { data: csData } = await this.supabase.client
        .from('client_services')
        .select('*, pricing_option:pricing_options(*)')
        .eq('id', appt.client_service_id)
        .single();

      if (csData) {
        this.applicableServices.set([csData as ClientService]);
        this.selectedClientServiceId.set(csData.id);
        this.paymentMethod.set('session_pack');
      }
    } else {
      // FIFO: fetch applicable packages for this client + service type
      const services = await this.pricingService.getApplicableServices(
        appt.client_id,
        appt.service_type_id
      );
      this.applicableServices.set(services);

      // Auto-select the first (soonest-expiring) applicable package
      if (services.length > 0) {
        this.selectedClientServiceId.set(services[0].id);
        this.paymentMethod.set('session_pack');
      } else {
        // No packages → default to card
        this.paymentMethod.set('card');
      }
    }

    this.isLoading.set(false);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  selectPackage(cs: ClientService): void {
    this.selectedClientServiceId.set(cs.id);
    this.paymentMethod.set('session_pack');
  }

  setPaymentMethod(method: CheckoutPaymentMethod): void {
    this.paymentMethod.set(method);
    if (method !== 'session_pack') {
      this.selectedClientServiceId.set(null);
    }
  }

  async completeCheckout(): Promise<void> {
    const appt = this.appointment();
    this.isProcessing.set(true);
    this.checkoutError.set(null);

    const { data, error } = await this.supabase.client.functions.invoke<CheckoutResult>(
      'process-checkout',
      {
        body: {
          appointment_id:    appt.id,
          payment_method:    this.paymentMethod(),
          client_service_id: this.selectedClientServiceId() ?? undefined,
          tip_amount:        this.tipAmount(),
          discount_amount:   this.discountAmount(),
        },
      }
    );

    this.isProcessing.set(false);

    if (error || !data?.success) {
      this.checkoutError.set(data?.error ?? error?.message ?? 'Checkout failed');
      return;
    }

    const toast = await this.toastCtrl.create({
      message:  'Checkout complete',
      duration: 2000,
      color:    'success',
      position: 'bottom',
    });
    await toast.present();

    this.checkoutCompleted.emit(data);
    await this.modalCtrl.dismiss({ result: data });
  }

  async dismiss(): Promise<void> {
    await this.modalCtrl.dismiss(null);
  }
}
