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
  IonList,
  IonItem,
  IonLabel,
  IonListHeader,
  IonNote,
  IonToggle,
  IonChip,
  IonBadge,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonInput,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  ActionSheetController,
  AlertController,
  ToastController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  documentTextOutline,
  checkmarkCircleOutline,
  timeOutline,
  peopleOutline,
  createOutline,
  trashOutline,
  copyOutline,
  eyeOutline,
  shieldCheckmarkOutline,
  alertCircleOutline,
  downloadOutline,
  sendOutline,
} from 'ionicons/icons';

import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Waiver {
  id: string;
  facility_id: string;
  title: string;
  body_html: string;
  signature_type: 'checkbox' | 'digital';
  is_required: boolean;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Computed: count of clients who have signed this waiver */
  signed_count?: number;
  /** Computed: count of clients who need to sign */
  pending_count?: number;
}

export interface WaiverSystemTemplate {
  id: string;
  title: string;
  description: string;
  body_html: string;
}

export interface WaiverSignatureSummary {
  signer_id: string;
  full_name: string;
  avatar_url: string | null;
  signed_at: string;
  waiver_version: number;
}

type ViewMode = 'list' | 'editor' | 'signatures';

@Component({
  selector: 'app-waivers',
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
    IonList,
    IonItem,
    IonLabel,
    IonListHeader,
    IonNote,
    IonToggle,
    IonChip,
    IonBadge,
    IonSpinner,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonInput,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonFab,
    IonFabButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          @if (view() === 'list') {
            <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
          } @else {
            <ion-button (click)="view.set('list')">Cancel</ion-button>
          }
        </ion-buttons>
        <ion-title>
          @switch (view()) {
            @case ('list')       { Waivers }
            @case ('editor')     { {{ editingWaiver()?.id ? 'Edit Waiver' : 'New Waiver' }} }
            @case ('signatures') { Signatures }
          }
        </ion-title>
        @if (view() === 'editor') {
          <ion-buttons slot="end">
            <ion-button
              (click)="saveWaiver()"
              [disabled]="saving() || !editorTitle() || !editorBody()"
              strong
            >
              @if (saving()) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
              }
              Save
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @switch (view()) {

        <!-- ── Waiver list ────────────────────────────────────────────── -->
        @case ('list') {
          <div class="waivers-container">
            @if (loading()) {
              <div class="loading-state">
                <ion-spinner></ion-spinner>
                <p>Loading waivers…</p>
              </div>
            } @else {

              <!-- Active waivers -->
              @if (activeWaivers().length > 0) {
                <ion-list>
                  <ion-list-header>
                    <ion-label>Active Waivers</ion-label>
                  </ion-list-header>

                  @for (waiver of activeWaivers(); track waiver.id) {
                    <ion-item
                      button
                      detail
                      (click)="viewSignatures(waiver)"
                    >
                      <ion-icon
                        slot="start"
                        [name]="waiver.is_required ? 'shield-checkmark-outline' : 'document-text-outline'"
                        [class.required-icon]="waiver.is_required"
                        [class.optional-icon]="!waiver.is_required"
                      ></ion-icon>
                      <ion-label>
                        <h3>{{ waiver.title }}</h3>
                        <p>
                          v{{ waiver.version }} ·
                          {{ waiver.signature_type === 'checkbox' ? 'Checkbox' : 'Digital signature' }} ·
                          @if (waiver.is_required) { <span class="required-label">Required</span> }
                          @else { Optional }
                        </p>
                      </ion-label>
                      <div slot="end" class="sig-counts">
                        <ion-chip color="success" class="count-chip">
                          <ion-icon name="checkmark-circle-outline"></ion-icon>
                          {{ waiver.signed_count ?? 0 }}
                        </ion-chip>
                        @if ((waiver.pending_count ?? 0) > 0) {
                          <ion-chip color="warning" class="count-chip">
                            <ion-icon name="time-outline"></ion-icon>
                            {{ waiver.pending_count }}
                          </ion-chip>
                        }
                      </div>
                    </ion-item>
                  }
                </ion-list>
              }

              <!-- Empty state -->
              @if (activeWaivers().length === 0) {
                <div class="empty-state">
                  <ion-icon name="document-text-outline"></ion-icon>
                  <h3>No waivers yet</h3>
                  <p>Create a custom waiver or start from a template to protect your business.</p>
                  <ion-button (click)="openTemplateSelector()">
                    Start from Template
                  </ion-button>
                  <ion-button fill="outline" (click)="openEditor(null)">
                    Start Blank
                  </ion-button>
                </div>
              }

              <!-- Legal disclaimer -->
              <div class="legal-notice">
                <ion-icon name="alert-circle-outline"></ion-icon>
                <p>
                  FitOS is not a law firm. All templates and tools are for informational purposes only.
                  Consult a qualified attorney before using any waiver for your business.
                </p>
              </div>

              <!-- Archived waivers (collapsed) -->
              @if (archivedWaivers().length > 0) {
                <ion-list>
                  <ion-list-header>
                    <ion-label>Archived</ion-label>
                  </ion-list-header>
                  @for (waiver of archivedWaivers(); track waiver.id) {
                    <ion-item>
                      <ion-icon slot="start" name="document-text-outline" color="medium"></ion-icon>
                      <ion-label color="medium">
                        <h3>{{ waiver.title }}</h3>
                        <p>v{{ waiver.version }} · Archived</p>
                      </ion-label>
                      <ion-button
                        slot="end"
                        fill="clear"
                        size="small"
                        (click)="restoreWaiver(waiver)"
                      >
                        Restore
                      </ion-button>
                    </ion-item>
                  }
                </ion-list>
              }
            }
          </div>

          <!-- FAB: new waiver -->
          <ion-fab slot="fixed" vertical="bottom" horizontal="end">
            <ion-fab-button (click)="openEditor(null)">
              <ion-icon name="add-outline"></ion-icon>
            </ion-fab-button>
          </ion-fab>
        }

        <!-- ── Waiver editor ──────────────────────────────────────────── -->
        @case ('editor') {
          <div class="editor-container">

            <ion-list>
              <ion-list-header>
                <ion-label>Basic Info</ion-label>
              </ion-list-header>

              <ion-item>
                <ion-label position="stacked">Waiver Title *</ion-label>
                <ion-input
                  [(ngModel)]="editorTitle"
                  placeholder="e.g. General Liability Release"
                  maxlength="120"
                ></ion-input>
              </ion-item>

              <ion-item>
                <ion-label>Signature Type</ion-label>
                <ion-select
                  [(ngModel)]="editorSigType"
                  slot="end"
                  interface="popover"
                >
                  <ion-select-option value="checkbox">Checkbox ("I Agree")</ion-select-option>
                  <ion-select-option value="digital">Digital Signature</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>
                  <h3>Require Before Access</h3>
                  <p>Block clients from training features until signed</p>
                </ion-label>
                <ion-toggle slot="end" [(ngModel)]="editorIsRequired"></ion-toggle>
              </ion-item>

              @if (editingWaiver()?.id) {
                <ion-item>
                  <ion-label>
                    <h3>Publish New Version</h3>
                    <p>Requires existing clients to re-sign</p>
                  </ion-label>
                  <ion-toggle slot="end" [(ngModel)]="editorBumpVersion"></ion-toggle>
                </ion-item>
              }
            </ion-list>

            <ion-list>
              <ion-list-header>
                <ion-label>Waiver Text *</ion-label>
              </ion-list-header>

              <ion-item>
                <ion-textarea
                  [(ngModel)]="editorBody"
                  placeholder="Paste your waiver text here. HTML formatting is supported (e.g. &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;)."
                  [autoGrow]="true"
                  rows="12"
                  class="waiver-textarea"
                ></ion-textarea>
              </ion-item>
            </ion-list>

            <ion-note class="editor-hint">
              Tip: Use &lt;h2&gt; for section headers, &lt;p&gt; for paragraphs, and &lt;strong&gt; for emphasis.
            </ion-note>

            @if (editingWaiver()?.id) {
              <div class="editor-actions">
                <ion-button
                  fill="outline"
                  color="danger"
                  expand="block"
                  (click)="archiveWaiver(editingWaiver()!)"
                >
                  <ion-icon name="trash-outline" slot="start"></ion-icon>
                  Archive Waiver
                </ion-button>
              </div>
            }
          </div>
        }

        <!-- ── Signatures view ───────────────────────────────────────── -->
        @case ('signatures') {
          @if (signaturesWaiver()) {
            <div class="signatures-container">

              <!-- Waiver summary card -->
              <ion-card class="waiver-summary-card">
                <ion-card-header>
                  <ion-card-title>{{ signaturesWaiver()!.title }}</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="summary-chips">
                    <ion-chip [color]="signaturesWaiver()!.is_required ? 'danger' : 'medium'">
                      {{ signaturesWaiver()!.is_required ? 'Required' : 'Optional' }}
                    </ion-chip>
                    <ion-chip color="primary">
                      v{{ signaturesWaiver()!.version }}
                    </ion-chip>
                    <ion-chip color="medium">
                      {{ signaturesWaiver()!.signature_type === 'checkbox' ? 'Checkbox' : 'Digital' }}
                    </ion-chip>
                  </div>

                  <div class="summary-stats">
                    <div class="stat">
                      <strong>{{ signatures().length }}</strong>
                      <span>Signed</span>
                    </div>
                    <div class="stat pending">
                      <strong>{{ (signaturesWaiver()!.pending_count ?? 0) }}</strong>
                      <span>Pending</span>
                    </div>
                  </div>

                  <div class="card-actions">
                    <ion-button
                      fill="outline"
                      size="small"
                      (click)="openEditor(signaturesWaiver()!)"
                    >
                      <ion-icon name="create-outline" slot="start"></ion-icon>
                      Edit
                    </ion-button>
                    <ion-button
                      fill="outline"
                      size="small"
                      (click)="sendReminder(signaturesWaiver()!)"
                    >
                      <ion-icon name="send-outline" slot="start"></ion-icon>
                      Remind Unsigned
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>

              <!-- Signature list -->
              @if (loadingSignatures()) {
                <div class="loading-state">
                  <ion-spinner></ion-spinner>
                  <p>Loading signatures…</p>
                </div>
              } @else if (signatures().length > 0) {
                <ion-list>
                  <ion-list-header>
                    <ion-label>Signed Clients</ion-label>
                  </ion-list-header>
                  @for (sig of signatures(); track sig.signer_id) {
                    <ion-item>
                      <ion-label>
                        <h3>{{ sig.full_name }}</h3>
                        <p>
                          Signed {{ formatDate(sig.signed_at) }} ·
                          v{{ sig.waiver_version }}
                          @if (sig.waiver_version < (signaturesWaiver()!.version)) {
                            <ion-badge color="warning">Outdated</ion-badge>
                          }
                        </p>
                      </ion-label>
                      <ion-icon
                        slot="end"
                        name="checkmark-circle-outline"
                        color="success"
                      ></ion-icon>
                    </ion-item>
                  }
                </ion-list>
              } @else {
                <div class="empty-state small">
                  <ion-icon name="people-outline"></ion-icon>
                  <p>No clients have signed this waiver yet.</p>
                </div>
              }
            </div>
          }
        }
      }
    </ion-content>
  `,
  styles: [`
    :host {
      ion-header ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }
      ion-content {
        --background: var(--fitos-bg-primary, #0D0D0D);
      }
    }

    /* ── List view ─────────────────────────────────────────────── */
    .waivers-container {
      max-width: 768px;
      margin: 0 auto;
      padding-bottom: 100px;
    }

    ion-list {
      --background: transparent;
      margin-bottom: 8px;
    }

    ion-list-header {
      --background: transparent;
      padding-top: 20px;
      padding-bottom: 8px;

      ion-label {
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    ion-item {
      --background: transparent;
    }

    .required-icon {
      color: var(--ion-color-danger, #EF4444);
    }

    .optional-icon {
      color: var(--ion-color-primary, #10B981);
    }

    .required-label {
      color: var(--ion-color-danger, #EF4444);
      font-weight: 600;
    }

    .sig-counts {
      display: flex;
      gap: 4px;

      .count-chip {
        --padding-start: 6px;
        --padding-end: 8px;
        height: 24px;
        font-size: 11px;

        ion-icon {
          font-size: 12px;
          margin-inline-end: 2px;
        }
      }
    }

    /* ── Empty state ───────────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px 24px;
      text-align: center;
      gap: 12px;

      ion-icon {
        font-size: 56px;
        color: var(--fitos-text-tertiary, #737373);
      }

      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
        max-width: 280px;
        line-height: 1.5;
      }

      &.small {
        padding: 32px 24px;

        ion-icon {
          font-size: 40px;
        }
      }
    }

    /* ── Loading ───────────────────────────────────────────────── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;

      p {
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    /* ── Legal notice ──────────────────────────────────────────── */
    .legal-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 16px;
      padding: 14px;
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.20);
      border-radius: 12px;

      ion-icon {
        font-size: 18px;
        color: #F59E0B;
        flex-shrink: 0;
        margin-top: 1px;
      }

      p {
        margin: 0;
        font-size: 12px;
        color: var(--fitos-text-secondary, #A3A3A3);
        line-height: 1.5;
      }
    }

    /* ── Editor ────────────────────────────────────────────────── */
    .editor-container {
      max-width: 768px;
      margin: 0 auto;
      padding-bottom: 40px;
    }

    .waiver-textarea {
      --padding-top: 12px;
      font-family: monospace;
      font-size: 13px;
    }

    .editor-hint {
      display: block;
      margin: 8px 16px 16px;
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .editor-actions {
      margin: 16px;
    }

    /* ── Signatures view ───────────────────────────────────────── */
    .signatures-container {
      max-width: 768px;
      margin: 0 auto;
      padding-bottom: 40px;
    }

    .waiver-summary-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      margin: 16px;
      border-radius: 14px;

      ion-card-title {
        font-size: 17px;
        font-weight: 700;
      }
    }

    .summary-chips {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .summary-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;

      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;

        strong {
          font-size: 24px;
          font-weight: 700;
          color: var(--ion-color-success, #10B981);
        }

        span {
          font-size: 12px;
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        &.pending strong {
          color: #F59E0B;
        }
      }
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }
  `],
})
export class WaiversPage implements OnInit {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private actionSheetCtrl = inject(ActionSheetController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  // ── View state ───────────────────────────────────────────────────────────
  view = signal<ViewMode>('list');
  loading = signal(true);
  saving = signal(false);
  loadingSignatures = signal(false);

  // ── Data signals ─────────────────────────────────────────────────────────
  waivers = signal<Waiver[]>([]);
  systemTemplates = signal<WaiverSystemTemplate[]>([]);
  signatures = signal<WaiverSignatureSummary[]>([]);

  // ── Editor state ─────────────────────────────────────────────────────────
  editingWaiver = signal<Waiver | null>(null);
  signaturesWaiver = signal<Waiver | null>(null);

  editorTitle = signal('');
  editorBody = signal('');
  editorSigType = signal<'checkbox' | 'digital'>('checkbox');
  editorIsRequired = signal(false);
  editorBumpVersion = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────
  activeWaivers = computed(() => this.waivers().filter(w => w.is_active));
  archivedWaivers = computed(() => this.waivers().filter(w => !w.is_active));

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadWaivers(),
      this.loadSystemTemplates(),
    ]);
    this.loading.set(false);
  }

  // ── Data loading ─────────────────────────────────────────────────────────

  private async loadWaivers(): Promise<void> {
    try {
      const profile = this.auth.profile();
      const facilityId = (profile as any)?.facility_id;
      if (!facilityId) return;

      const { data, error } = await this.supabase
        .from('waivers')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Augment with signature counts
      const waivers = await Promise.all(
        (data ?? []).map(async (w: any) => {
          const [{ count: signedCount }, clientCount] = await Promise.all([
            this.supabase.client
              .from('waiver_signatures')
              .select('id', { count: 'exact', head: true })
              .eq('waiver_id', w.id)
              .eq('waiver_version', w.version),
            this.getClientCount(facilityId),
          ]);
          return {
            ...w,
            signed_count: signedCount ?? 0,
            pending_count: Math.max(0, clientCount - (signedCount ?? 0)),
          } as Waiver;
        })
      );

      this.waivers.set(waivers);
    } catch (err) {
      console.error('[WaiversPage] loadWaivers error:', err);
    }
  }

  private async getClientCount(facilityId: string): Promise<number> {
    try {
      const { count } = await this.supabase.client
        .from('client_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('facility_id', facilityId);
      return count ?? 0;
    } catch {
      return 0;
    }
  }

  private async loadSystemTemplates(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('waiver_system_templates')
        .select('id, title, description, body_html')
        .order('title');
      this.systemTemplates.set((data ?? []) as WaiverSystemTemplate[]);
    } catch (err) {
      console.error('[WaiversPage] loadSystemTemplates error:', err);
    }
  }

  // ── Editor ────────────────────────────────────────────────────────────────

  openEditor(waiver: Waiver | null): void {
    this.editingWaiver.set(waiver);
    this.editorTitle.set(waiver?.title ?? '');
    this.editorBody.set(waiver?.body_html ?? '');
    this.editorSigType.set(waiver?.signature_type ?? 'checkbox');
    this.editorIsRequired.set(waiver?.is_required ?? false);
    this.editorBumpVersion.set(false);
    this.view.set('editor');
  }

  async openTemplateSelector(): Promise<void> {
    const templates = this.systemTemplates();
    if (templates.length === 0) {
      this.openEditor(null);
      return;
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Start from Template',
      buttons: [
        ...templates.map(t => ({
          text: t.title,
          handler: () => {
            this.editorTitle.set(t.title);
            this.editorBody.set(t.body_html);
            this.editorSigType.set('checkbox');
            this.editorIsRequired.set(false);
            this.editorBumpVersion.set(false);
            this.editingWaiver.set(null);
            this.view.set('editor');
          },
        })),
        {
          text: 'Start Blank',
          handler: () => this.openEditor(null),
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async saveWaiver(): Promise<void> {
    const title = this.editorTitle().trim();
    const body = this.editorBody().trim();
    if (!title || !body) return;

    this.saving.set(true);
    try {
      const profile = this.auth.profile();
      const facilityId = (profile as any)?.facility_id;
      if (!facilityId) throw new Error('No facility_id on profile');

      const existing = this.editingWaiver();

      if (existing?.id) {
        // Update existing waiver
        const updatePayload: Record<string, unknown> = {
          title,
          body_html: body,
          signature_type: this.editorSigType(),
          is_required: this.editorIsRequired(),
          updated_at: new Date().toISOString(),
        };
        if (this.editorBumpVersion()) {
          updatePayload['version'] = existing.version + 1;
        }

        const { error } = await this.supabase
          .from('waivers')
          .update(updatePayload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new waiver
        const { error } = await this.supabase
          .from('waivers')
          .insert({
            facility_id: facilityId,
            title,
            body_html: body,
            signature_type: this.editorSigType(),
            is_required: this.editorIsRequired(),
            version: 1,
            is_active: true,
          });
        if (error) throw error;
      }

      await this.showToast(existing?.id ? 'Waiver updated' : 'Waiver created', 'success');
      await this.loadWaivers();
      this.view.set('list');
    } catch (err) {
      console.error('[WaiversPage] saveWaiver error:', err);
      await this.showToast('Failed to save waiver', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  async archiveWaiver(waiver: Waiver): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Archive Waiver?',
      message: `Archiving "${waiver.title}" will not delete existing signatures, but clients will no longer be prompted to sign it.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Archive',
          role: 'destructive',
          handler: async () => {
            const { error } = await this.supabase
              .from('waivers')
              .update({ is_active: false })
              .eq('id', waiver.id);
            if (!error) {
              await this.showToast('Waiver archived', 'success');
              await this.loadWaivers();
              this.view.set('list');
            } else {
              await this.showToast('Failed to archive waiver', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async restoreWaiver(waiver: Waiver): Promise<void> {
    const { error } = await this.supabase
      .from('waivers')
      .update({ is_active: true })
      .eq('id', waiver.id);
    if (!error) {
      await this.showToast('Waiver restored', 'success');
      await this.loadWaivers();
    }
  }

  // ── Signatures view ───────────────────────────────────────────────────────

  async viewSignatures(waiver: Waiver): Promise<void> {
    this.signaturesWaiver.set(waiver);
    this.view.set('signatures');
    this.loadingSignatures.set(true);

    try {
      const { data, error } = await this.supabase.client
        .from('waiver_signatures')
        .select(`
          signer_id,
          signed_at,
          waiver_version,
          signer:profiles!waiver_signatures_signer_id_fkey(full_name, avatar_url)
        `)
        .eq('waiver_id', waiver.id)
        .order('signed_at', { ascending: false });

      if (error) throw error;

      const sigs: WaiverSignatureSummary[] = (data ?? []).map((row: any) => ({
        signer_id:     row.signer_id,
        full_name:     row.signer?.full_name ?? 'Unknown',
        avatar_url:    row.signer?.avatar_url ?? null,
        signed_at:     row.signed_at,
        waiver_version: row.waiver_version,
      }));

      this.signatures.set(sigs);
    } catch (err) {
      console.error('[WaiversPage] viewSignatures error:', err);
    } finally {
      this.loadingSignatures.set(false);
    }
  }

  async sendReminder(waiver: Waiver): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Send Reminder',
      message: `Send a notification to all clients who haven't signed "${waiver.title}" yet?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send',
          handler: async () => {
            // Invoke the waiver-reminder Edge Function (fire and forget)
            try {
              await this.supabase.client.functions.invoke('send-waiver-reminders', {
                body: { waiver_id: waiver.id },
              });
              await this.showToast('Reminders sent to unsigned clients', 'success');
            } catch {
              await this.showToast('Failed to send reminders', 'danger');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success',
    duration = 2000
  ): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, duration, position: 'bottom' });
    await toast.present();
  }

  constructor() {
    addIcons({
      addOutline,
      documentTextOutline,
      checkmarkCircleOutline,
      timeOutline,
      peopleOutline,
      createOutline,
      trashOutline,
      copyOutline,
      eyeOutline,
      shieldCheckmarkOutline,
      alertCircleOutline,
      downloadOutline,
      sendOutline,
    });
  }
}
