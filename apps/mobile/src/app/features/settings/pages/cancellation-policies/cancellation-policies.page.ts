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
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { CurrencyPipe } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  createOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  informationCircleOutline,
  globeOutline,
  layersOutline,
} from 'ionicons/icons';
import { CancellationPolicyService, CreatePolicyDto } from '../../../../core/services/cancellation-policy.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import type { CancellationPolicy, ServiceType } from '@fitos/shared';

type PolicyFormMode = 'hidden' | 'add' | 'edit';

interface PolicyFormState {
  mode:                        PolicyFormMode;
  editingId:                   string | null;
  serviceTypeId:               string | null;  // null = global policy
  lateCancelWindowMinutes:     number;
  lateCancelFeeAmount:         number;
  noShowFeeAmount:             number;
  forfeitSession:              boolean;
  appliesToMemberships:        boolean;
}

const DEFAULT_FORM: PolicyFormState = {
  mode:                    'hidden',
  editingId:               null,
  serviceTypeId:           null,
  lateCancelWindowMinutes: 1440,
  lateCancelFeeAmount:     0,
  noShowFeeAmount:         0,
  forfeitSession:          true,
  appliesToMemberships:    true,
};

/**
 * CancellationPoliciesPage
 * Sprint 57.1 — Phase 5B
 *
 * Trainer settings page for managing cancellation policies.
 * Supports one global (fallback) policy + per-service-type overrides.
 *
 * Route: /tabs/settings/cancellation-policies
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cancellation-policies',
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
    IonBadge
],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Cancellation Policies</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="policies-container">

        <!-- Explainer card -->
        <ion-card class="info-card">
          <ion-card-content>
            <div class="info-row">
              <ion-icon name="information-circle-outline" color="primary"></ion-icon>
              <p>
                Set a <strong>global policy</strong> as a fallback for all sessions,
                then add <strong>per-service overrides</strong> for specific appointment types.
                Late-cancel and no-show fees are charged automatically via the saved card on file.
              </p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Loading -->
        @if (isLoading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>Loading policies…</p>
          </div>
        } @else {

          <!-- ── Global Policy ──────────────────────────────────────────────── -->
          <div class="section-header">
            <div class="section-title">
              <ion-icon name="globe-outline"></ion-icon>
              <h2>Global Policy</h2>
            </div>
            @if (!globalPolicy()) {
              <ion-button fill="clear" size="small" (click)="showAddGlobal()">
                <ion-icon name="add-outline" slot="start"></ion-icon>
                Add
              </ion-button>
            }
          </div>

          @if (globalPolicy(); as gp) {
            <ion-card class="policy-card">
              <ion-card-content>
                <div class="policy-summary">
                  <div class="policy-stat">
                    <span class="stat-label">Cancel window</span>
                    <span class="stat-value">{{ formatWindow(gp.late_cancel_window_minutes) }}</span>
                  </div>
                  <div class="policy-stat">
                    <span class="stat-label">Late-cancel fee</span>
                    <span class="stat-value">
                      {{ gp.late_cancel_fee_amount | currency }}
                    </span>
                  </div>
                  <div class="policy-stat">
                    <span class="stat-label">No-show fee</span>
                    <span class="stat-value">
                      {{ gp.no_show_fee_amount | currency }}
                    </span>
                  </div>
                  <div class="policy-stat">
                    <span class="stat-label">Forfeit session</span>
                    <span class="stat-value">{{ gp.forfeit_session ? 'Yes' : 'No' }}</span>
                  </div>
                </div>
                <div class="policy-actions">
                  <ion-button fill="clear" size="small" (click)="editPolicy(gp)">
                    <ion-icon name="create-outline" slot="start"></ion-icon>
                    Edit
                  </ion-button>
                  <ion-button fill="clear" size="small" color="danger" (click)="deletePolicy(gp)">
                    <ion-icon name="trash-outline" slot="start"></ion-icon>
                    Remove
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          } @else {
            <ion-card class="empty-card">
              <ion-card-content>
                <p>No global policy set. Cancellations will incur no fees by default.</p>
              </ion-card-content>
            </ion-card>
          }

          <!-- ── Per-Service Overrides ──────────────────────────────────────── -->
          <div class="section-header" style="margin-top: 32px">
            <div class="section-title">
              <ion-icon name="layers-outline"></ion-icon>
              <h2>Service Overrides</h2>
            </div>
            @if (availableServiceTypes().length > 0) {
              <ion-button fill="clear" size="small" (click)="showAddOverride()">
                <ion-icon name="add-outline" slot="start"></ion-icon>
                Add
              </ion-button>
            }
          </div>

          @if (serviceOverrides().length === 0) {
            <ion-card class="empty-card">
              <ion-card-content>
                <p>No service-specific overrides. The global policy (if set) applies to all session types.</p>
              </ion-card-content>
            </ion-card>
          } @else {
            <div class="override-list">
              @for (policy of serviceOverrides(); track policy.id) {
                <ion-card class="policy-card">
                  <ion-card-header>
                    <ion-card-title>
                      {{ serviceTypeName(policy.service_type_id) }}
                      <ion-badge color="primary" class="override-badge">Override</ion-badge>
                    </ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="policy-summary">
                      <div class="policy-stat">
                        <span class="stat-label">Cancel window</span>
                        <span class="stat-value">{{ formatWindow(policy.late_cancel_window_minutes) }}</span>
                      </div>
                      <div class="policy-stat">
                        <span class="stat-label">Late-cancel fee</span>
                        <span class="stat-value">{{ policy.late_cancel_fee_amount | currency }}</span>
                      </div>
                      <div class="policy-stat">
                        <span class="stat-label">No-show fee</span>
                        <span class="stat-value">{{ policy.no_show_fee_amount | currency }}</span>
                      </div>
                      <div class="policy-stat">
                        <span class="stat-label">Forfeit session</span>
                        <span class="stat-value">{{ policy.forfeit_session ? 'Yes' : 'No' }}</span>
                      </div>
                    </div>
                    <div class="policy-actions">
                      <ion-button fill="clear" size="small" (click)="editPolicy(policy)">
                        <ion-icon name="create-outline" slot="start"></ion-icon>
                        Edit
                      </ion-button>
                      <ion-button fill="clear" size="small" color="danger" (click)="deletePolicy(policy)">
                        <ion-icon name="trash-outline" slot="start"></ion-icon>
                        Remove
                      </ion-button>
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </div>
          }

          <!-- ── Add / Edit Form ──────────────────────────────────────────────── -->
          @if (form().mode !== 'hidden') {
            <ion-card class="form-card" style="margin-top: 32px">
              <ion-card-header>
                <ion-card-title>
                  {{ form().mode === 'add' ? 'New Policy' : 'Edit Policy' }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>

                <!-- Service type selector (only for overrides) -->
                @if (form().mode === 'add' && form().serviceTypeId !== '__global__') {
                  <ion-list class="form-list">
                    <ion-item>
                      <ion-select
                        label="Service Type"
                        labelPlacement="stacked"
                        placeholder="Select service…"
                        [value]="form().serviceTypeId"
                        (ionChange)="onFormChange('serviceTypeId', $event.detail.value)"
                      >
                        @for (st of availableServiceTypes(); track st.id) {
                          <ion-select-option [value]="st.id">{{ st.name }}</ion-select-option>
                        }
                      </ion-select>
                    </ion-item>
                  </ion-list>
                }

                <ion-list class="form-list">
                  <!-- Cancel window -->
                  <ion-item>
                    <ion-select
                      label="Cancellation Window"
                      labelPlacement="stacked"
                      [value]="form().lateCancelWindowMinutes"
                      (ionChange)="onFormChange('lateCancelWindowMinutes', +$event.detail.value)"
                    >
                      <ion-select-option [value]="60">1 hour</ion-select-option>
                      <ion-select-option [value]="120">2 hours</ion-select-option>
                      <ion-select-option [value]="240">4 hours</ion-select-option>
                      <ion-select-option [value]="480">8 hours</ion-select-option>
                      <ion-select-option [value]="720">12 hours</ion-select-option>
                      <ion-select-option [value]="1440">24 hours</ion-select-option>
                      <ion-select-option [value]="2880">48 hours</ion-select-option>
                    </ion-select>
                  </ion-item>

                  <!-- Late-cancel fee -->
                  <ion-item>
                    <ion-input
                      label="Late-Cancel Fee ($)"
                      labelPlacement="stacked"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      [value]="form().lateCancelFeeAmount"
                      (ionInput)="onFormChange('lateCancelFeeAmount', +($event.detail.value ?? 0))"
                    ></ion-input>
                  </ion-item>

                  <!-- No-show fee -->
                  <ion-item>
                    <ion-input
                      label="No-Show Fee ($)"
                      labelPlacement="stacked"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      [value]="form().noShowFeeAmount"
                      (ionInput)="onFormChange('noShowFeeAmount', +($event.detail.value ?? 0))"
                    ></ion-input>
                  </ion-item>

                  <!-- Forfeit session toggle -->
                  <ion-item>
                    <ion-label>
                      <h3>Forfeit Session</h3>
                      <p>Deduct the session from the client's package on late-cancel or no-show</p>
                    </ion-label>
                    <ion-toggle
                      slot="end"
                      [checked]="form().forfeitSession"
                      (ionChange)="onFormChange('forfeitSession', $event.detail.checked)"
                    ></ion-toggle>
                  </ion-item>

                  <!-- Applies to memberships toggle -->
                  <ion-item>
                    <ion-label>
                      <h3>Apply to Memberships</h3>
                      <p>Enforce fees even for clients on active membership plans</p>
                    </ion-label>
                    <ion-toggle
                      slot="end"
                      [checked]="form().appliesToMemberships"
                      (ionChange)="onFormChange('appliesToMemberships', $event.detail.checked)"
                    ></ion-toggle>
                  </ion-item>
                </ion-list>

                @if (saveError()) {
                  <ion-note class="form-error">{{ saveError() }}</ion-note>
                }

                <div class="form-actions">
                  <ion-button fill="outline" (click)="cancelForm()">Cancel</ion-button>
                  <ion-button [disabled]="isSaving() || !formIsValid()" (click)="savePolicy()">
                    @if (isSaving()) {
                      <ion-spinner name="crescent"></ion-spinner>
                    } @else {
                      {{ form().mode === 'add' ? 'Create Policy' : 'Save Changes' }}
                    }
                  </ion-button>
                </div>

              </ion-card-content>
            </ion-card>
          }

          <!-- ── Auto No-Show Setting ─────────────────────────────────────── -->
          <div class="section-header" style="margin-top: 32px">
            <div class="section-title">
              <ion-icon name="alert-circle-outline"></ion-icon>
              <h2>Auto No-Show</h2>
            </div>
          </div>

          <ion-card>
            <ion-card-content>
              <ion-list class="form-list">
                <ion-item>
                  <ion-select
                    label="Mark no-show after"
                    labelPlacement="stacked"
                    [value]="autoNoshowMinutes()"
                    (ionChange)="saveAutoNoshowMinutes($event.detail.value)"
                  >
                    <ion-select-option [value]="5">5 minutes</ion-select-option>
                    <ion-select-option [value]="10">10 minutes</ion-select-option>
                    <ion-select-option [value]="15">15 minutes</ion-select-option>
                    <ion-select-option [value]="20">20 minutes</ion-select-option>
                    <ion-select-option [value]="30">30 minutes</ion-select-option>
                    <ion-select-option [value]="60">60 minutes</ion-select-option>
                  </ion-select>
                </ion-item>
              </ion-list>
              <ion-note class="section-note">
                FitOS automatically marks clients as no-shows if they haven't checked in within this window.
                The system checks every 5 minutes.
              </ion-note>
            </ion-card-content>
          </ion-card>

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
    }

    ion-list, .form-list {
      --background: transparent;
    }

    ion-item {
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);
    }

    .policies-container {
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Info card ── */
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

    /* ── Section headers ── */
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

    /* ── Policy cards ── */
    .policy-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .policy-stat {
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

    .policy-actions {
      display: flex;
      gap: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 8px;
      margin-top: 4px;
    }

    .override-badge {
      font-size: 10px;
      font-weight: 600;
    }

    .override-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* ── Empty / loading states ── */
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

    /* ── Form ── */
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

    ion-button[type="submit"],
    .form-actions ion-button:last-child {
      --border-radius: 8px;
      height: 44px;
      font-weight: 700;
    }

    /* ── Notes ── */
    .section-note {
      display: block;
      margin-top: 8px;
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
      line-height: 1.5;
    }
  `],
})
export class CancellationPoliciesPage implements OnInit {
  private policyService  = inject(CancellationPolicyService);
  private auth           = inject(AuthService);
  private supabase       = inject(SupabaseService);
  private alertCtrl      = inject(AlertController);
  private toastCtrl      = inject(ToastController);

  // ── State forwarded from service ─────────────────────────────────────────
  readonly isLoading   = this.policyService.isLoading;
  readonly globalPolicy = this.policyService.globalPolicy;

  readonly serviceOverrides = computed<CancellationPolicy[]>(() =>
    this.policyService.policies().filter(p => !!p.service_type_id)
  );

  // ── Local state ──────────────────────────────────────────────────────────
  readonly serviceTypes      = signal<ServiceType[]>([]);
  readonly autoNoshowMinutes = signal<number>(10);
  readonly isSaving          = signal(false);
  readonly saveError         = signal<string | null>(null);
  readonly form              = signal<PolicyFormState>({ ...DEFAULT_FORM });

  /** Service types that don't already have an override policy */
  readonly availableServiceTypes = computed<ServiceType[]>(() => {
    const overrideIds = new Set(this.serviceOverrides().map(p => p.service_type_id));
    return this.serviceTypes().filter(st => !overrideIds.has(st.id));
  });

  readonly formIsValid = computed<boolean>(() => {
    const f = this.form();
    if (f.mode === 'hidden') return false;
    // For new overrides, a service type must be selected
    if (f.mode === 'add' && f.serviceTypeId !== '__global__' && !f.serviceTypeId) return false;
    return true;
  });

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      createOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      informationCircleOutline,
      globeOutline,
      layersOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const trainerId = this.auth.profile()?.id;
    if (!trainerId) return;

    await Promise.all([
      this.policyService.loadPolicies(trainerId),
      this.loadServiceTypes(trainerId),
      this.loadAutoNoshowMinutes(trainerId),
    ]);
  }

  // ── Data loaders ─────────────────────────────────────────────────────────

  private async loadServiceTypes(trainerId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('service_types')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    this.serviceTypes.set((data ?? []) as ServiceType[]);
  }

  private async loadAutoNoshowMinutes(trainerId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('auto_noshow_minutes')
      .eq('id', trainerId)
      .single();

    if (data?.auto_noshow_minutes) {
      this.autoNoshowMinutes.set(data.auto_noshow_minutes);
    }
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  serviceTypeName(serviceTypeId?: string): string {
    if (!serviceTypeId) return 'Global Policy';
    return this.serviceTypes().find(st => st.id === serviceTypeId)?.name ?? 'Unknown Service';
  }

  formatWindow(minutes: number): string {
    if (minutes >= 1440) {
      const days = minutes / 1440;
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    if (minutes >= 60) {
      const hrs = minutes / 60;
      return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
    }
    return `${minutes} min`;
  }

  onFormChange<K extends keyof PolicyFormState>(key: K, value: PolicyFormState[K]): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  // ── Form open/close ───────────────────────────────────────────────────────

  showAddGlobal(): void {
    this.saveError.set(null);
    this.form.set({
      ...DEFAULT_FORM,
      mode: 'add',
      serviceTypeId: '__global__',   // sentinel for global policy
    });
  }

  showAddOverride(): void {
    this.saveError.set(null);
    this.form.set({
      ...DEFAULT_FORM,
      mode: 'add',
      serviceTypeId: null,           // user must pick a service type
    });
  }

  editPolicy(policy: CancellationPolicy): void {
    this.saveError.set(null);
    this.form.set({
      mode:                    'edit',
      editingId:               policy.id,
      serviceTypeId:           policy.service_type_id ?? '__global__',
      lateCancelWindowMinutes: policy.late_cancel_window_minutes,
      lateCancelFeeAmount:     policy.late_cancel_fee_amount,
      noShowFeeAmount:         policy.no_show_fee_amount,
      forfeitSession:          policy.forfeit_session,
      appliesToMemberships:    policy.applies_to_memberships,
    });
  }

  cancelForm(): void {
    this.form.set({ ...DEFAULT_FORM });
    this.saveError.set(null);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async savePolicy(): Promise<void> {
    const f = this.form();
    const trainerId = this.auth.profile()?.id;
    if (!trainerId || !this.formIsValid()) return;

    this.isSaving.set(true);
    this.saveError.set(null);

    // '__global__' sentinel → null service_type_id (global policy)
    const serviceTypeId = f.serviceTypeId === '__global__' ? undefined : (f.serviceTypeId ?? undefined);

    const dto: CreatePolicyDto = {
      trainer_id:                 trainerId,
      service_type_id:            serviceTypeId,
      late_cancel_window_minutes: f.lateCancelWindowMinutes,
      late_cancel_fee_amount:     f.lateCancelFeeAmount,
      no_show_fee_amount:         f.noShowFeeAmount,
      forfeit_session:            f.forfeitSession,
      applies_to_memberships:     f.appliesToMemberships,
    };

    let success = false;

    if (f.mode === 'add') {
      const created = await this.policyService.createPolicy(dto);
      success = !!created;
    } else if (f.mode === 'edit' && f.editingId) {
      await this.policyService.updatePolicy(f.editingId, dto);
      success = !this.policyService.error();
    }

    this.isSaving.set(false);

    if (success) {
      this.cancelForm();
      await this.showToast(
        f.mode === 'add' ? 'Policy created' : 'Policy updated',
        'success'
      );
    } else {
      this.saveError.set(this.policyService.error() ?? 'Failed to save policy');
    }
  }

  async deletePolicy(policy: CancellationPolicy): Promise<void> {
    const name = policy.service_type_id
      ? this.serviceTypeName(policy.service_type_id)
      : 'Global Policy';

    const alert = await this.alertCtrl.create({
      header: 'Remove Policy',
      message: `Remove the cancellation policy for "${name}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            await this.policyService.deletePolicy(policy.id);
            await this.showToast('Policy removed', 'success');
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Auto no-show ──────────────────────────────────────────────────────────

  async saveAutoNoshowMinutes(minutes: number): Promise<void> {
    const trainerId = this.auth.profile()?.id;
    if (!trainerId) return;

    this.autoNoshowMinutes.set(minutes);

    const { error } = await this.supabase.client
      .from('profiles')
      .update({ auto_noshow_minutes: minutes })
      .eq('id', trainerId);

    if (error) {
      await this.showToast('Failed to save setting', 'danger');
    } else {
      await this.showToast(`Auto no-show set to ${this.formatWindow(minutes)}`, 'success');
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
