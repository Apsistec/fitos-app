/**
 * PayrollSettingsPage — Sprint 60 (Phase 5D)
 *
 * Settings page for configuring trainer pay rates and no-show/cancel policies.
 * Route: /tabs/settings/payroll-settings  (trainerOrOwnerGuard)
 *
 * Sections:
 *   1. Pay Rates — per service type (or default catch-all)
 *   2. No-Show & Cancellation Pay Policy
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonNote,
  IonBadge,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  createOutline,
  cashOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  receiptOutline,
} from 'ionicons/icons';
import { PayrollService } from '../../../../core/services/payroll.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { TrainerPayRate, PayRateType } from '@fitos/shared';

addIcons({
  addOutline,
  trashOutline,
  createOutline,
  cashOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  receiptOutline,
});

interface ServiceTypeOption {
  id: string;
  name: string;
}

interface PayRateForm {
  service_type_id: string | null; // null = default
  pay_rate_type: PayRateType;
  flat_amount: number | null;
  percentage: number | null;
  hourly_rate: number | null;
  commission_percentage: number | null;
}

@Component({
  selector: 'app-payroll-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonNote,
    IonBadge
],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Pay Configuration</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-container">

        <!-- ── Section: Pay Rates ──────────────────────────────── -->
        <div class="section-header">
          <div class="section-title">
            <ion-icon name="cash-outline"></ion-icon>
            Pay Rates
          </div>
          <ion-note>Configure how much you earn per session type.</ion-note>
        </div>

        @if (isLoading()) {
          <div class="loading-state"><ion-spinner name="crescent"></ion-spinner></div>
        }

        <!-- Existing rates -->
        @for (rate of payrollService.payRates(); track rate.id) {
          <ion-card class="rate-card">
            <ion-card-content>
              <div class="rate-row">
                <div class="rate-info">
                  <div class="rate-service">
                    {{ rate.service_type?.name ?? 'All Service Types (Default)' }}
                  </div>
                  <ion-badge [color]="rateTypeColor(rate.pay_rate_type)">
                    {{ payrollService.formatRateType(rate.pay_rate_type) }}
                  </ion-badge>
                  <div class="rate-value">{{ payrollService.formatPayRate(rate) }}</div>
                </div>
                <div class="rate-actions">
                  <ion-button fill="clear" size="small" (click)="editRate(rate)">
                    <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                  </ion-button>
                  <ion-button fill="clear" size="small" color="danger" (click)="deleteRate(rate.id)">
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        }

        @if (!isLoading() && payrollService.payRates().length === 0) {
          <div class="empty-state">
            <ion-icon name="cash-outline"></ion-icon>
            <p>No pay rates configured yet.</p>
          </div>
        }

        <!-- Add / Edit rate form -->
        @if (showRateForm()) {
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                {{ editingRate() ? 'Edit Pay Rate' : 'Add Pay Rate' }}
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <!-- Service type selector -->
              <ion-item lines="full">
                <ion-label position="stacked">Service Type</ion-label>
                <ion-select [(ngModel)]="rateForm.service_type_id" placeholder="All types (default)">
                  <ion-select-option [value]="null">All Types (Default)</ion-select-option>
                  @for (st of serviceTypes(); track st.id) {
                    <ion-select-option [value]="st.id">{{ st.name }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <!-- Pay type -->
              <ion-item lines="full">
                <ion-label position="stacked">Pay Type</ion-label>
                <ion-select [(ngModel)]="rateForm.pay_rate_type" (ngModelChange)="onRateTypeChange()">
                  <ion-select-option value="flat_per_session">Flat per Session</ion-select-option>
                  <ion-select-option value="percentage_of_revenue">% of Revenue</ion-select-option>
                  <ion-select-option value="hourly">Hourly Rate</ion-select-option>
                  <ion-select-option value="commission_on_sale">Commission on Sale</ion-select-option>
                </ion-select>
              </ion-item>

              <!-- Amount fields — shown based on rate type -->
              @if (rateForm.pay_rate_type === 'flat_per_session') {
                <ion-item lines="full">
                  <ion-label position="stacked">Amount per Session ($)</ion-label>
                  <ion-input
                    type="number"
                    [(ngModel)]="rateForm.flat_amount"
                    placeholder="e.g. 50.00"
                    min="0"
                  ></ion-input>
                </ion-item>
              }

              @if (rateForm.pay_rate_type === 'percentage_of_revenue') {
                <ion-item lines="full">
                  <ion-label position="stacked">Percentage of Service Price (%)</ion-label>
                  <ion-input
                    type="number"
                    [(ngModel)]="rateForm.percentage"
                    placeholder="e.g. 60"
                    min="0"
                    max="100"
                  ></ion-input>
                </ion-item>
              }

              @if (rateForm.pay_rate_type === 'hourly') {
                <ion-item lines="full">
                  <ion-label position="stacked">Hourly Rate ($/hr)</ion-label>
                  <ion-input
                    type="number"
                    [(ngModel)]="rateForm.hourly_rate"
                    placeholder="e.g. 40.00"
                    min="0"
                  ></ion-input>
                </ion-item>
              }

              @if (rateForm.pay_rate_type === 'commission_on_sale') {
                <ion-item lines="full">
                  <ion-label position="stacked">Commission Percentage (%)</ion-label>
                  <ion-input
                    type="number"
                    [(ngModel)]="rateForm.commission_percentage"
                    placeholder="e.g. 10"
                    min="0"
                    max="100"
                  ></ion-input>
                </ion-item>
              }

              <div class="form-actions">
                <ion-button fill="outline" (click)="cancelRateForm()">Cancel</ion-button>
                <ion-button [disabled]="!isRateFormValid() || saving()" (click)="saveRate()">
                  @if (saving()) { <ion-spinner name="crescent"></ion-spinner> }
                  @else { Save Rate }
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }

        @if (!showRateForm()) {
          <ion-button expand="block" fill="outline" (click)="openRateForm()" class="add-button">
            <ion-icon slot="start" name="add-outline"></ion-icon>
            Add Pay Rate
          </ion-button>
        }

        <!-- ── Section: No-Show & Cancel Policy ───────────────── -->
        <div class="section-header">
          <div class="section-title">
            <ion-icon name="receipt-outline"></ion-icon>
            No-Show & Cancel Pay Policy
          </div>
          <ion-note>Define what you earn when clients don't show up.</ion-note>
        </div>

        <ion-card class="policy-card">
          <ion-card-content>
            <!-- No-show -->
            <div class="policy-row">
              <div class="policy-label">
                <strong>No-Show</strong>
                <ion-note>Client doesn't arrive</ion-note>
              </div>
              <ion-toggle
                [(ngModel)]="policyForm.pay_for_no_show"
                (ngModelChange)="onPolicyToggle('no_show')"
              ></ion-toggle>
            </div>
            @if (policyForm.pay_for_no_show) {
              <ion-item lines="none" class="percentage-item">
                <ion-label position="stacked">Pay % of normal rate</ion-label>
                <ion-input
                  type="number"
                  [(ngModel)]="policyForm.no_show_pay_percentage"
                  placeholder="0–100"
                  min="0"
                  max="100"
                ></ion-input>
              </ion-item>
            }

            <div class="policy-divider"></div>

            <!-- Late cancel -->
            <div class="policy-row">
              <div class="policy-label">
                <strong>Late Cancel</strong>
                <ion-note>Cancelled within late-cancel window</ion-note>
              </div>
              <ion-toggle
                [(ngModel)]="policyForm.pay_for_late_cancel"
                (ngModelChange)="onPolicyToggle('late_cancel')"
              ></ion-toggle>
            </div>
            @if (policyForm.pay_for_late_cancel) {
              <ion-item lines="none" class="percentage-item">
                <ion-label position="stacked">Pay % of normal rate</ion-label>
                <ion-input
                  type="number"
                  [(ngModel)]="policyForm.late_cancel_pay_percentage"
                  placeholder="0–100"
                  min="0"
                  max="100"
                ></ion-input>
              </ion-item>
            }

            <div class="policy-divider"></div>

            <!-- Early cancel -->
            <div class="policy-row">
              <div class="policy-label">
                <strong>Early Cancel</strong>
                <ion-note>Cancelled outside late-cancel window</ion-note>
              </div>
              <ion-toggle
                [(ngModel)]="policyForm.pay_for_early_cancel"
                (ngModelChange)="onPolicyToggle('early_cancel')"
              ></ion-toggle>
            </div>
            @if (policyForm.pay_for_early_cancel) {
              <ion-item lines="none" class="percentage-item">
                <ion-label position="stacked">Pay % of normal rate</ion-label>
                <ion-input
                  type="number"
                  [(ngModel)]="policyForm.early_cancel_pay_percentage"
                  placeholder="0–100"
                  min="0"
                  max="100"
                ></ion-input>
              </ion-item>
            }

            <ion-button
              expand="block"
              [disabled]="saving()"
              (click)="savePolicy()"
              class="save-policy-button"
            >
              @if (saving()) { <ion-spinner name="crescent"></ion-spinner> }
              @else { Save Policy }
            </ion-button>
          </ion-card-content>
        </ion-card>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 700; }

    .page-container { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

    .section-header { padding: 8px 4px 4px; }
    .section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 15px; font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5); margin-bottom: 4px;
    }
    .section-title ion-icon { font-size: 18px; color: var(--ion-color-primary, #10B981); }
    ion-note { font-size: 12px; color: var(--fitos-text-tertiary, #737373); }

    .loading-state { display: flex; justify-content: center; padding: 24px; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 24px; color: var(--fitos-text-tertiary, #737373); text-align: center;
    }
    .empty-state ion-icon { font-size: 36px; }
    .empty-state p { margin: 0; font-size: 14px; }

    /* Rate card */
    .rate-card, .form-card, .policy-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px; box-shadow: none; margin: 0;
    }
    .rate-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .rate-info { flex: 1; }
    .rate-service { font-size: 14px; font-weight: 600; color: var(--fitos-text-primary, #F5F5F5); margin-bottom: 6px; }
    .rate-value { font-size: 18px; font-weight: 700; font-family: 'Space Mono', monospace; color: var(--ion-color-primary, #10B981); margin-top: 6px; }
    .rate-actions { display: flex; flex-direction: column; gap: 4px; }

    ion-card-title { font-size: 15px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }

    ion-item { --background: transparent; --border-color: rgba(255,255,255,0.08); }
    ion-label { font-size: 12px !important; font-weight: 600 !important; color: var(--fitos-text-tertiary, #737373) !important; text-transform: uppercase; letter-spacing: 0.5px; }
    ion-input { color: var(--fitos-text-primary, #F5F5F5); font-size: 16px; }
    ion-select { color: var(--fitos-text-primary, #F5F5F5); font-size: 15px; }

    .form-actions { display: flex; gap: 12px; margin-top: 16px; }
    .form-actions ion-button { flex: 1; --border-radius: 8px; height: 44px; font-weight: 700; }

    .add-button { --border-radius: 10px; height: 48px; font-weight: 700; }

    /* Policy card */
    .policy-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0;
    }
    .policy-label strong { display: block; font-size: 14px; color: var(--fitos-text-primary, #F5F5F5); margin-bottom: 2px; }
    .policy-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0; }
    .percentage-item { --background: var(--fitos-bg-tertiary, #262626); border-radius: 8px; margin: 4px 0 8px; }
    .save-policy-button { margin-top: 16px; --border-radius: 10px; height: 48px; font-weight: 700; --box-shadow: 0 4px 12px rgba(16,185,129,0.25); }
  `],
})
export class PayrollSettingsPage implements OnInit {
  payrollService = inject(PayrollService);
  private auth   = inject(AuthService);
  private supabase = inject(SupabaseService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  // ── State ──────────────────────────────────────────────────────────────────
  isLoading    = signal(false);
  saving       = signal(false);
  showRateForm = signal(false);
  editingRate  = signal<TrainerPayRate | null>(null);
  serviceTypes = signal<ServiceTypeOption[]>([]);

  rateForm: PayRateForm = {
    service_type_id:       null,
    pay_rate_type:         'flat_per_session',
    flat_amount:           null,
    percentage:            null,
    hourly_rate:           null,
    commission_percentage: null,
  };

  policyForm = {
    pay_for_no_show:             false,
    no_show_pay_percentage:      0,
    pay_for_late_cancel:         false,
    late_cancel_pay_percentage:  0,
    pay_for_early_cancel:        false,
    early_cancel_pay_percentage: 0,
  };

  isRateFormValid = computed(() => {
    switch (this.rateForm.pay_rate_type) {
      case 'flat_per_session':      return (this.rateForm.flat_amount ?? 0) > 0;
      case 'percentage_of_revenue': return (this.rateForm.percentage ?? 0) > 0;
      case 'hourly':                return (this.rateForm.hourly_rate ?? 0) > 0;
      case 'commission_on_sale':    return (this.rateForm.commission_percentage ?? 0) > 0;
      default:                      return false;
    }
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    this.isLoading.set(true);
    await Promise.all([
      this.payrollService.loadPayRates(trainerId),
      this.payrollService.loadPayPolicy(trainerId),
      this.loadServiceTypes(trainerId),
    ]);
    this.isLoading.set(false);

    // Pre-fill policy form from loaded data
    const policy = this.payrollService.payPolicy();
    if (policy) {
      this.policyForm = {
        pay_for_no_show:             policy.pay_for_no_show,
        no_show_pay_percentage:      policy.no_show_pay_percentage,
        pay_for_late_cancel:         policy.pay_for_late_cancel,
        late_cancel_pay_percentage:  policy.late_cancel_pay_percentage,
        pay_for_early_cancel:        policy.pay_for_early_cancel,
        early_cancel_pay_percentage: policy.early_cancel_pay_percentage,
      };
    }
  }

  private async loadServiceTypes(trainerId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('service_types')
      .select('id, name')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .order('name');

    this.serviceTypes.set((data ?? []) as ServiceTypeOption[]);
  }

  // ── Rate form ─────────────────────────────────────────────────────────────

  openRateForm(): void {
    this.editingRate.set(null);
    this.rateForm = {
      service_type_id:       null,
      pay_rate_type:         'flat_per_session',
      flat_amount:           null,
      percentage:            null,
      hourly_rate:           null,
      commission_percentage: null,
    };
    this.showRateForm.set(true);
  }

  editRate(rate: TrainerPayRate): void {
    this.editingRate.set(rate);
    this.rateForm = {
      service_type_id:       rate.service_type_id ?? null,
      pay_rate_type:         rate.pay_rate_type,
      flat_amount:           rate.flat_amount ?? null,
      percentage:            rate.percentage ?? null,
      hourly_rate:           rate.hourly_rate ?? null,
      commission_percentage: rate.commission_percentage ?? null,
    };
    this.showRateForm.set(true);
  }

  cancelRateForm(): void {
    this.showRateForm.set(false);
    this.editingRate.set(null);
  }

  onRateTypeChange(): void {
    // Reset amount fields when type changes
    this.rateForm.flat_amount           = null;
    this.rateForm.percentage            = null;
    this.rateForm.hourly_rate           = null;
    this.rateForm.commission_percentage = null;
  }

  async saveRate(): Promise<void> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    this.saving.set(true);
    const result = await this.payrollService.upsertPayRate(trainerId, {
      service_type_id:       this.rateForm.service_type_id ?? undefined,
      pay_rate_type:         this.rateForm.pay_rate_type,
      flat_amount:           this.rateForm.flat_amount ?? undefined,
      percentage:            this.rateForm.percentage ?? undefined,
      hourly_rate:           this.rateForm.hourly_rate ?? undefined,
      commission_percentage: this.rateForm.commission_percentage ?? undefined,
    });
    this.saving.set(false);

    if (result) {
      this.showRateForm.set(false);
      this.editingRate.set(null);
      await this.toast('Pay rate saved ✓', 'success');
    } else {
      await this.toast(this.payrollService.error() ?? 'Save failed', 'warning');
    }
  }

  async deleteRate(rateId: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header:  'Delete Pay Rate?',
      message: 'This will remove the pay rate. Existing visit records are unaffected.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: async () => {
            const ok = await this.payrollService.deletePayRate(rateId);
            if (ok) await this.toast('Rate deleted', 'success');
            else await this.toast(this.payrollService.error() ?? 'Delete failed', 'warning');
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Policy form ───────────────────────────────────────────────────────────

  onPolicyToggle(type: 'no_show' | 'late_cancel' | 'early_cancel'): void {
    // When toggled off, reset percentage to 0
    if (type === 'no_show' && !this.policyForm.pay_for_no_show)
      this.policyForm.no_show_pay_percentage = 0;
    if (type === 'late_cancel' && !this.policyForm.pay_for_late_cancel)
      this.policyForm.late_cancel_pay_percentage = 0;
    if (type === 'early_cancel' && !this.policyForm.pay_for_early_cancel)
      this.policyForm.early_cancel_pay_percentage = 0;
  }

  async savePolicy(): Promise<void> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    this.saving.set(true);
    const result = await this.payrollService.upsertPayPolicy(trainerId, {
      ...this.policyForm,
    });
    this.saving.set(false);

    if (result) await this.toast('Policy saved ✓', 'success');
    else await this.toast(this.payrollService.error() ?? 'Save failed', 'warning');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  rateTypeColor(type: PayRateType): string {
    const map: Record<PayRateType, string> = {
      flat_per_session:      'primary',
      percentage_of_revenue: 'secondary',
      hourly:                'tertiary',
      commission_on_sale:    'warning',
    };
    return map[type] ?? 'medium';
  }

  private async toast(message: string, color: 'success' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'top' });
    await t.present();
  }
}
