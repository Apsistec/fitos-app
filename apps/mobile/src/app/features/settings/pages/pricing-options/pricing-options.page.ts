import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonToggle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonChip,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  createOutline,
  archiveOutline,
  refreshOutline,
  pricetagsOutline,
  repeatOutline,
  calendarOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import {
  PricingOptionService,
  CreatePricingOptionDto,
} from '../../../../core/services/pricing-option.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import type { PricingOption, ServiceType } from '@fitos/shared';

type FormMode = 'hidden' | 'add' | 'edit';

interface PricingOptionForm {
  mode: FormMode;
  editingId: string | null;
  name: string;
  option_type: PricingOption['option_type'];
  price: number;
  session_count: number | null;
  expiration_days: number | null;
  service_type_ids: string[];
  autopay_interval: PricingOption['autopay_interval'] | null;
  autopay_session_count: number | null;
  sell_online: boolean;
}

const DEFAULT_FORM: PricingOptionForm = {
  mode:                  'hidden',
  editingId:             null,
  name:                  '',
  option_type:           'session_pack',
  price:                 0,
  session_count:         10,
  expiration_days:       null,
  service_type_ids:      [],
  autopay_interval:      null,
  autopay_session_count: null,
  sell_online:           true,
};

const TYPE_LABELS: Record<PricingOption['option_type'], string> = {
  session_pack: 'Session Pack',
  time_pass:    'Time Pass',
  drop_in:      'Drop-In',
  contract:     'Autopay Contract',
};

const TYPE_COLORS: Record<PricingOption['option_type'], string> = {
  session_pack: 'primary',
  time_pass:    'secondary',
  drop_in:      'success',
  contract:     'warning',
};

/**
 * PricingOptionsPage — Sprint 58 (Phase 5C)
 *
 * Trainer settings page for managing session packs, time passes, drop-ins,
 * and autopay contracts. Supports:
 * - Create / edit / archive / restore pricing options
 * - Service type multi-select for coverage
 * - Autopay settings (interval, session count) for contracts
 *
 * Route: /tabs/settings/pricing-options
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pricing-options',
  imports: [
    FormsModule,
    CurrencyPipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonToggle,
    IonButton,
    IonIcon,
    IonSpinner,
    IonNote,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonChip,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Pricing Options</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="showAddForm()">
            <ion-icon name="add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="pricing-container">

        <!-- Explainer -->
        <ion-card class="info-card">
          <ion-card-content>
            <div class="info-row">
              <ion-icon name="information-circle-outline" color="primary"></ion-icon>
              <p>
                Create <strong>session packs</strong>, <strong>time passes</strong>,
                <strong>drop-in rates</strong>, and <strong>autopay contracts</strong>.
                Clients' packages are auto-selected at checkout using FIFO (soonest-expiring first).
              </p>
            </div>
          </ion-card-content>
        </ion-card>

        @if (isLoading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading pricing options…</p>
          </div>
        } @else {

          <!-- ── Active Options ──────────────────────────────────────────── -->
          <div class="section-header">
            <div class="section-title">
              <ion-icon name="pricetags-outline"></ion-icon>
              <h2>Active Options ({{ activeOptions().length }})</h2>
            </div>
          </div>

          @if (activeOptions().length === 0) {
            <ion-card class="empty-card">
              <ion-card-content>
                <p>No pricing options yet. Tap + to create your first package.</p>
              </ion-card-content>
            </ion-card>
          } @else {
            <div class="options-list">
              @for (opt of activeOptions(); track opt.id) {
                <ion-card class="option-card">
                  <ion-card-header>
                    <ion-card-title>
                      {{ opt.name }}
                      <ion-badge [color]="typeColor(opt.option_type)">
                        {{ typeLabel(opt.option_type) }}
                      </ion-badge>
                    </ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="option-summary">
                      <div class="option-stat">
                        <span class="stat-label">Price</span>
                        <span class="stat-value">{{ opt.price | currency }}</span>
                      </div>
                      <div class="option-stat">
                        <span class="stat-label">Sessions</span>
                        <span class="stat-value">
                          @if (opt.option_type === 'time_pass') { Unlimited }
                          @else if (opt.session_count) { {{ opt.session_count }} }
                          @else { 1 }
                        </span>
                      </div>
                      @if (opt.expiration_days) {
                        <div class="option-stat">
                          <span class="stat-label">Expires in</span>
                          <span class="stat-value">{{ opt.expiration_days }}d</span>
                        </div>
                      }
                      @if (opt.autopay_interval) {
                        <div class="option-stat">
                          <span class="stat-label">Autopay</span>
                          <span class="stat-value">{{ opt.autopay_interval }}</span>
                        </div>
                      }
                    </div>

                    @if (opt.service_type_ids.length > 0) {
                      <div class="service-chips">
                        @for (stId of opt.service_type_ids; track stId) {
                          <ion-chip class="service-chip" outline>
                            {{ serviceTypeName(stId) }}
                          </ion-chip>
                        }
                      </div>
                    }

                    <div class="option-actions">
                      <ion-button fill="clear" size="small" (click)="editOption(opt)">
                        <ion-icon name="create-outline" slot="start"></ion-icon>
                        Edit
                      </ion-button>
                      <ion-button fill="clear" size="small" color="medium" (click)="archiveOption(opt)">
                        <ion-icon name="archive-outline" slot="start"></ion-icon>
                        Archive
                      </ion-button>
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </div>
          }

          <!-- ── Archived Options ──────────────────────────────────────────── -->
          @if (archivedOptions().length > 0) {
            <div class="section-header" style="margin-top: 32px">
              <div class="section-title">
                <ion-icon name="archive-outline"></ion-icon>
                <h2>Archived ({{ archivedOptions().length }})</h2>
              </div>
            </div>

            <div class="options-list">
              @for (opt of archivedOptions(); track opt.id) {
                <ion-card class="option-card archived">
                  <ion-card-header>
                    <ion-card-title>
                      {{ opt.name }}
                      <ion-badge color="medium">Archived</ion-badge>
                    </ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="option-summary">
                      <div class="option-stat">
                        <span class="stat-label">Price</span>
                        <span class="stat-value">{{ opt.price | currency }}</span>
                      </div>
                      <div class="option-stat">
                        <span class="stat-label">Type</span>
                        <span class="stat-value">{{ typeLabel(opt.option_type) }}</span>
                      </div>
                    </div>
                    <div class="option-actions">
                      <ion-button fill="clear" size="small" (click)="restoreOption(opt)">
                        <ion-icon name="refresh-outline" slot="start"></ion-icon>
                        Restore
                      </ion-button>
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </div>
          }

          <!-- ── Add / Edit Form ──────────────────────────────────────────── -->
          @if (form().mode !== 'hidden') {
            <ion-card class="form-card" style="margin-top: 32px">
              <ion-card-header>
                <ion-card-title>
                  {{ form().mode === 'add' ? 'New Pricing Option' : 'Edit Pricing Option' }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>

                <ion-list class="form-list">

                  <!-- Name -->
                  <ion-item>
                    <ion-input
                      label="Name"
                      labelPlacement="stacked"
                      placeholder="e.g. 10-Pack Personal Training"
                      [value]="form().name"
                      (ionInput)="onFormChange('name', $event.detail.value ?? '')"
                    ></ion-input>
                  </ion-item>

                  <!-- Type -->
                  <ion-item>
                    <ion-select
                      label="Type"
                      labelPlacement="stacked"
                      [value]="form().option_type"
                      (ionChange)="onTypeChange($event.detail.value)"
                    >
                      <ion-select-option value="session_pack">Session Pack</ion-select-option>
                      <ion-select-option value="time_pass">Time Pass (unlimited)</ion-select-option>
                      <ion-select-option value="drop_in">Drop-In (single session)</ion-select-option>
                      <ion-select-option value="contract">Autopay Contract</ion-select-option>
                    </ion-select>
                  </ion-item>

                  <!-- Price -->
                  <ion-item>
                    <ion-input
                      label="Price ($)"
                      labelPlacement="stacked"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      [value]="form().price"
                      (ionInput)="onFormChange('price', +($event.detail.value ?? 0))"
                    ></ion-input>
                  </ion-item>

                  <!-- Session Count (session_pack only) -->
                  @if (form().option_type === 'session_pack') {
                    <ion-item>
                      <ion-input
                        label="Number of Sessions"
                        labelPlacement="stacked"
                        type="number"
                        min="1"
                        placeholder="10"
                        [value]="form().session_count"
                        (ionInput)="onFormChange('session_count', +($event.detail.value ?? 1))"
                      ></ion-input>
                    </ion-item>
                  }

                  <!-- Expiration Days (session_pack + time_pass) -->
                  @if (form().option_type === 'session_pack' || form().option_type === 'time_pass') {
                    <ion-item>
                      <ion-select
                        label="Expires After (optional)"
                        labelPlacement="stacked"
                        placeholder="No expiry"
                        [value]="form().expiration_days"
                        (ionChange)="onFormChange('expiration_days', $event.detail.value)"
                      >
                        <ion-select-option [value]="null">No expiry</ion-select-option>
                        <ion-select-option [value]="30">30 days</ion-select-option>
                        <ion-select-option [value]="60">60 days</ion-select-option>
                        <ion-select-option [value]="90">90 days</ion-select-option>
                        <ion-select-option [value]="180">180 days</ion-select-option>
                        <ion-select-option [value]="365">1 year</ion-select-option>
                      </ion-select>
                    </ion-item>
                  }

                  <!-- Autopay settings (contract only) -->
                  @if (form().option_type === 'contract') {
                    <ion-item>
                      <ion-select
                        label="Billing Interval"
                        labelPlacement="stacked"
                        [value]="form().autopay_interval"
                        (ionChange)="onFormChange('autopay_interval', $event.detail.value)"
                      >
                        <ion-select-option value="weekly">Weekly</ion-select-option>
                        <ion-select-option value="biweekly">Bi-weekly</ion-select-option>
                        <ion-select-option value="monthly">Monthly</ion-select-option>
                      </ion-select>
                    </ion-item>

                    <ion-item>
                      <ion-input
                        label="Sessions Per Billing Cycle"
                        labelPlacement="stacked"
                        type="number"
                        min="1"
                        placeholder="4"
                        [value]="form().autopay_session_count"
                        (ionInput)="onFormChange('autopay_session_count', +($event.detail.value ?? 4))"
                      ></ion-input>
                    </ion-item>
                  }

                  <!-- Service Types multi-select -->
                  <ion-item>
                    <ion-select
                      label="Applies to Service Types"
                      labelPlacement="stacked"
                      placeholder="Select services…"
                      [multiple]="true"
                      [value]="form().service_type_ids"
                      (ionChange)="onFormChange('service_type_ids', $event.detail.value)"
                    >
                      @for (st of serviceTypes(); track st.id) {
                        <ion-select-option [value]="st.id">{{ st.name }}</ion-select-option>
                      }
                    </ion-select>
                  </ion-item>

                  <!-- Sell Online toggle -->
                  <ion-item>
                    <ion-label>
                      <h3>Sell Online</h3>
                      <p>Allow clients to purchase this option through the app</p>
                    </ion-label>
                    <ion-toggle
                      slot="end"
                      [checked]="form().sell_online"
                      (ionChange)="onFormChange('sell_online', $event.detail.checked)"
                    ></ion-toggle>
                  </ion-item>

                </ion-list>

                @if (saveError()) {
                  <ion-note class="form-error">{{ saveError() }}</ion-note>
                }

                <div class="form-actions">
                  <ion-button fill="outline" (click)="cancelForm()">Cancel</ion-button>
                  <ion-button [disabled]="isSaving() || !formIsValid()" (click)="saveOption()">
                    @if (isSaving()) {
                      <ion-spinner name="crescent"></ion-spinner>
                    } @else {
                      {{ form().mode === 'add' ? 'Create Option' : 'Save Changes' }}
                    }
                  </ion-button>
                </div>

              </ion-card-content>
            </ion-card>
          }

        }
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-header ion-toolbar {
      --background: transparent;
      --border-width: 0;
      --color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0 0 16px;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    ion-list, .form-list {
      --background: transparent;
    }

    ion-item {
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);
    }

    .pricing-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .info-card {
      margin-bottom: 24px;
    }

    .info-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;

      ion-icon {
        flex-shrink: 0;
        font-size: 20px;
        margin-top: 2px;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
        line-height: 1.5;
      }
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;

      ion-icon {
        font-size: 20px;
        color: var(--fitos-accent-primary, #10B981);
      }

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .options-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .option-card.archived {
      opacity: 0.6;
    }

    .option-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .option-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--fitos-text-tertiary, #737373);
      font-weight: 600;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      font-family: 'Space Mono', monospace;
    }

    .service-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .service-chip {
      --background: transparent;
      --color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 12px;
      height: 28px;
      border-color: rgba(255, 255, 255, 0.15);
    }

    .option-actions {
      display: flex;
      gap: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 8px;
      margin-top: 4px;
    }

    .empty-card ion-card-content p {
      margin: 0;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px 0;
      color: var(--fitos-text-secondary, #A3A3A3);

      p { margin-top: 16px; }
    }

    .form-card {
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .form-error {
      display: block;
      padding: 10px 12px;
      margin: 12px 0;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      color: #EF4444;
      font-size: 13px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .form-actions ion-button:last-child {
      --border-radius: 8px;
      height: 44px;
      font-weight: 700;
    }
  `],
})
export class PricingOptionsPage implements OnInit {
  private pricingService = inject(PricingOptionService);
  private auth           = inject(AuthService);
  private supabase       = inject(SupabaseService);
  private alertCtrl      = inject(AlertController);
  private toastCtrl      = inject(ToastController);

  // ── State ─────────────────────────────────────────────────────────────────

  readonly isLoading   = this.pricingService.isLoading;
  readonly serviceTypes = signal<ServiceType[]>([]);
  readonly isSaving    = signal(false);
  readonly saveError   = signal<string | null>(null);
  readonly form        = signal<PricingOptionForm>({ ...DEFAULT_FORM });

  readonly activeOptions   = computed<PricingOption[]>(() =>
    this.pricingService.pricingOptions().filter(o => o.is_active)
  );

  readonly archivedOptions = computed<PricingOption[]>(() =>
    this.pricingService.pricingOptions().filter(o => !o.is_active)
  );

  readonly formIsValid = computed<boolean>(() => {
    const f = this.form();
    if (f.mode === 'hidden') return false;
    if (!f.name.trim()) return false;
    if (f.price < 0) return false;
    if (f.option_type === 'contract' && !f.autopay_interval) return false;
    return true;
  });

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      createOutline,
      archiveOutline,
      refreshOutline,
      pricetagsOutline,
      repeatOutline,
      calendarOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const trainerId = this.auth.profile()?.id;
    if (!trainerId) return;

    await Promise.all([
      this.pricingService.loadPricingOptions(trainerId),
      this.loadServiceTypes(trainerId),
    ]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async loadServiceTypes(trainerId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('service_types')
      .select('id, name')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    this.serviceTypes.set((data ?? []) as ServiceType[]);
  }

  serviceTypeName(id: string): string {
    return this.serviceTypes().find(st => st.id === id)?.name ?? 'Unknown';
  }

  typeLabel(type: PricingOption['option_type']): string {
    return TYPE_LABELS[type];
  }

  typeColor(type: PricingOption['option_type']): string {
    return TYPE_COLORS[type];
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  showAddForm(): void {
    this.saveError.set(null);
    this.form.set({ ...DEFAULT_FORM, mode: 'add' });
  }

  editOption(opt: PricingOption): void {
    this.saveError.set(null);
    this.form.set({
      mode:                  'edit',
      editingId:             opt.id,
      name:                  opt.name,
      option_type:           opt.option_type,
      price:                 opt.price,
      session_count:         opt.session_count ?? null,
      expiration_days:       opt.expiration_days ?? null,
      service_type_ids:      [...opt.service_type_ids],
      autopay_interval:      opt.autopay_interval ?? null,
      autopay_session_count: opt.autopay_session_count ?? null,
      sell_online:           opt.sell_online,
    });
  }

  cancelForm(): void {
    this.form.set({ ...DEFAULT_FORM });
    this.saveError.set(null);
  }

  onFormChange<K extends keyof PricingOptionForm>(key: K, value: PricingOptionForm[K]): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  onTypeChange(type: PricingOption['option_type']): void {
    // Reset type-specific fields when switching type
    const updates: Partial<PricingOptionForm> = {
      option_type: type,
      session_count: type === 'session_pack' ? 10 : type === 'drop_in' ? 1 : null,
      autopay_interval: type === 'contract' ? 'monthly' : null,
      autopay_session_count: type === 'contract' ? 4 : null,
      expiration_days: null,
    };
    this.form.update(f => ({ ...f, ...updates }));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async saveOption(): Promise<void> {
    const f = this.form();
    const trainerId = this.auth.profile()?.id;
    if (!trainerId || !this.formIsValid()) return;

    this.isSaving.set(true);
    this.saveError.set(null);

    const dto: CreatePricingOptionDto = {
      trainer_id:           trainerId,
      name:                 f.name.trim(),
      option_type:          f.option_type,
      price:                f.price,
      session_count:        f.session_count ?? undefined,
      expiration_days:      f.expiration_days ?? undefined,
      service_type_ids:     f.service_type_ids,
      autopay_interval:     f.autopay_interval ?? undefined,
      autopay_session_count: f.autopay_session_count ?? undefined,
      sell_online:          f.sell_online,
    };

    if (f.mode === 'add') {
      const created = await this.pricingService.createPricingOption(dto);
      this.isSaving.set(false);

      if (created) {
        this.cancelForm();
        await this.showToast('Pricing option created', 'success');
      } else {
        this.saveError.set(this.pricingService.error() ?? 'Failed to create option');
      }
    } else if (f.mode === 'edit' && f.editingId) {
      await this.pricingService.updatePricingOption(f.editingId, dto);
      this.isSaving.set(false);

      if (!this.pricingService.error()) {
        this.cancelForm();
        await this.showToast('Pricing option updated', 'success');
      } else {
        this.saveError.set(this.pricingService.error() ?? 'Failed to update option');
      }
    }
  }

  async archiveOption(opt: PricingOption): Promise<void> {
    const alert = await this.alertCtrl.create({
      header:  'Archive Option',
      message: `Archive "${opt.name}"? Clients with existing packages won't be affected, but the option won't appear for new purchases.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text:    'Archive',
          role:    'destructive',
          handler: async () => {
            await this.pricingService.archivePricingOption(opt.id);
            await this.showToast('Option archived', 'success');
          },
        },
      ],
    });
    await alert.present();
  }

  async restoreOption(opt: PricingOption): Promise<void> {
    await this.pricingService.restorePricingOption(opt.id);
    await this.showToast('Option restored', 'success');
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
