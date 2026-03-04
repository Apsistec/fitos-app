/**
 * TeamManagementPage — Sprint 61 / 62 (EP-25)
 *
 * Owner hub for managing Admin Assistants:
 *   - View all AAs with status (active / invited / suspended)
 *   - Invite a new AA (triggers US-004 flow)
 *   - Configure per-user RBAC permissions (US-251/252)
 *   - Apply permission templates (US-250)
 *   - View RBAC audit log (US-253)
 *   - Suspend / reactivate AAs
 *
 * Route: /tabs/settings/team-management  (ownerGuard)
 */

import {
  Component,
  OnInit,
  inject,
  signal,
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
  IonAvatar,
  IonBadge,
  IonToggle,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonActionSheet,
  IonAlert,
  ModalController,
  ToastController,
  AlertController,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personAddOutline,
  personOutline,
  shieldCheckmarkOutline,
  ellipsisVerticalOutline,
  checkmarkCircleOutline,
  timeOutline,
  banOutline,
  refreshOutline,
  mailOutline,
  chevronForwardOutline,
  documentTextOutline,
  lockClosedOutline,
  lockOpenOutline,
} from 'ionicons/icons';
import { RbacService, type AdminAssistantRow } from '../../../../core/services/rbac.service';
import type {
  AdminAssistantPermissions,
  AdminAssistantPermissionTemplate,
  AdminInvitation,
} from '@fitos/shared';

addIcons({
  personAddOutline,
  personOutline,
  shieldCheckmarkOutline,
  ellipsisVerticalOutline,
  checkmarkCircleOutline,
  timeOutline,
  banOutline,
  refreshOutline,
  mailOutline,
  chevronForwardOutline,
  documentTextOutline,
  lockClosedOutline,
  lockOpenOutline,
});

type SegmentTab = 'staff' | 'invitations' | 'audit';

@Component({
  selector: 'app-team-management',
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
    IonAvatar,
    IonBadge,
    IonToggle,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Team Management</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openInviteModal()">
            <ion-icon name="person-add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-container">

        <!-- Segment tabs -->
        <ion-segment [value]="activeTab()" (ionChange)="onTabChange($event)" class="page-segment">
          <ion-segment-button value="staff">
            <ion-label>Staff</ion-label>
          </ion-segment-button>
          <ion-segment-button value="invitations">
            <ion-label>Invites</ion-label>
          </ion-segment-button>
          <ion-segment-button value="audit">
            <ion-label>Audit Log</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- ── Staff Tab ─────────────────────────────────────────────────── -->
        @if (activeTab() === 'staff') {
          @if (isLoading()) {
            <div class="loading-state">
              <ion-spinner name="crescent"></ion-spinner>
            </div>
          } @else if (rbac.adminAssistants().length === 0) {
            <div class="empty-state">
              <ion-icon name="person-outline"></ion-icon>
              <h3>No Admin Assistants</h3>
              <p>Invite someone to help manage your facility's schedule and front desk.</p>
              <ion-button (click)="openInviteModal()" fill="outline" size="small">
                <ion-icon name="person-add-outline" slot="start"></ion-icon>
                Send Invitation
              </ion-button>
            </div>
          } @else {
            @for (aa of rbac.adminAssistants(); track aa.user_id) {
              <ion-card class="staff-card">
                <ion-card-content>
                  <!-- Header -->
                  <div class="staff-header">
                    <ion-avatar class="staff-avatar">
                      @if (aa.profile.avatar_url) {
                        <img [src]="aa.profile.avatar_url" [alt]="aa.profile.full_name" />
                      } @else {
                        <div class="avatar-initials">{{ initials(aa.profile.full_name) }}</div>
                      }
                    </ion-avatar>
                    <div class="staff-info">
                      <div class="staff-name">{{ aa.profile.full_name }}</div>
                      <ion-badge [color]="statusColor(aa.status)">
                        {{ aa.status | titlecase }}
                      </ion-badge>
                    </div>
                    <ion-button fill="clear" size="small" (click)="openActionsSheet(aa)">
                      <ion-icon name="ellipsis-vertical-outline" slot="icon-only"></ion-icon>
                    </ion-button>
                  </div>

                  <!-- Permissions accordion -->
                  <div class="permissions-section">
                    <div
                      class="permissions-header"
                      (click)="toggleExpand(aa.user_id)"
                      role="button"
                      tabindex="0"
                      (keyup.enter)="toggleExpand(aa.user_id)"
                    >
                      <ion-icon name="shield-checkmark-outline"></ion-icon>
                      <span>Permissions</span>
                      <ion-icon
                        [name]="expandedId() === aa.user_id ? 'lock-open-outline' : 'lock-closed-outline'"
                        class="lock-icon"
                      ></ion-icon>
                    </div>

                    @if (expandedId() === aa.user_id) {
                      <!-- Template quick-apply -->
                      <div class="template-row">
                        <ion-note>Quick template:</ion-note>
                        <ion-select
                          placeholder="Apply preset..."
                          interface="action-sheet"
                          (ionChange)="applyTemplate(aa, $event.detail.value)"
                          class="template-select"
                        >
                          <ion-select-option value="scheduling_focus">Scheduling Focus</ion-select-option>
                          <ion-select-option value="front_desk_full">Front Desk Full</ion-select-option>
                          <ion-select-option value="operations_manager">Operations Manager</ion-select-option>
                        </ion-select>
                      </div>

                      <!-- Permission groups -->
                      <div class="perm-group">
                        <div class="perm-group-label">
                          <ion-icon name="time-outline"></ion-icon>
                          Scheduling
                        </div>
                        @for (perm of schedulePerms; track perm.key) {
                          <div class="perm-row">
                            <div class="perm-info">
                              <strong>{{ perm.label }}</strong>
                              <ion-note>{{ perm.description }}</ion-note>
                            </div>
                            <ion-toggle
                              [ngModel]="aa.permission_overrides[perm.key]"
                              (ngModelChange)="updatePerm(aa, perm.key, $event)"
                              [disabled]="aa.status === 'suspended'"
                            ></ion-toggle>
                          </div>
                        }
                      </div>

                      <div class="perm-group">
                        <div class="perm-group-label">
                          <ion-icon name="person-outline"></ion-icon>
                          Client Data
                        </div>
                        @for (perm of clientDataPerms; track perm.key) {
                          <div class="perm-row">
                            <div class="perm-info">
                              <strong>{{ perm.label }}</strong>
                              <ion-note>{{ perm.description }}</ion-note>
                            </div>
                            <ion-toggle
                              [ngModel]="aa.permission_overrides[perm.key]"
                              (ngModelChange)="updatePerm(aa, perm.key, $event)"
                              [disabled]="aa.status === 'suspended'"
                            ></ion-toggle>
                          </div>
                        }
                      </div>

                      <div class="perm-group">
                        <div class="perm-group-label">
                          <ion-icon name="document-text-outline"></ion-icon>
                          Financial
                        </div>
                        @for (perm of financialPerms; track perm.key) {
                          <div class="perm-row">
                            <div class="perm-info">
                              <strong>{{ perm.label }}</strong>
                              <ion-note>{{ perm.description }}</ion-note>
                            </div>
                            <ion-toggle
                              [ngModel]="aa.permission_overrides[perm.key]"
                              (ngModelChange)="updatePerm(aa, perm.key, $event)"
                              [disabled]="aa.status === 'suspended'"
                            ></ion-toggle>
                          </div>
                        }
                      </div>

                      <div class="perm-group">
                        <div class="perm-group-label">
                          <ion-icon name="mail-outline"></ion-icon>
                          Marketing & Comms
                        </div>
                        @for (perm of marketingPerms; track perm.key) {
                          <div class="perm-row">
                            <div class="perm-info">
                              <strong>{{ perm.label }}</strong>
                              <ion-note>{{ perm.description }}</ion-note>
                            </div>
                            <ion-toggle
                              [ngModel]="aa.permission_overrides[perm.key]"
                              (ngModelChange)="updatePerm(aa, perm.key, $event)"
                              [disabled]="aa.status === 'suspended'"
                            ></ion-toggle>
                          </div>
                        }
                      </div>

                    }
                  </div>

                </ion-card-content>
              </ion-card>
            }
          }
        }

        <!-- ── Invitations Tab ──────────────────────────────────────────── -->
        @if (activeTab() === 'invitations') {
          @if (invitations().length === 0) {
            <div class="empty-state">
              <ion-icon name="mail-outline"></ion-icon>
              <h3>No Invitations</h3>
              <p>Pending invitations will appear here.</p>
            </div>
          } @else {
            @for (inv of invitations(); track inv.id) {
              <ion-card class="invite-card">
                <ion-card-content>
                  <div class="invite-row">
                    <div class="invite-info">
                      <div class="invite-email">{{ inv.email }}</div>
                      <ion-note>Sent {{ formatRelativeDate(inv.created_at) }}</ion-note>
                    </div>
                    <ion-badge [color]="inviteBadgeColor(inv.status)">
                      {{ inv.status | titlecase }}
                    </ion-badge>
                  </div>
                  @if (inv.status === 'pending') {
                    <div class="invite-actions">
                      <ion-button fill="clear" size="small" (click)="cancelInvite(inv.id)">
                        Cancel
                      </ion-button>
                    </div>
                  }
                </ion-card-content>
              </ion-card>
            }
          }
        }

        <!-- ── Audit Log Tab ─────────────────────────────────────────────── -->
        @if (activeTab() === 'audit') {
          @if (rbac.auditLog().length === 0) {
            <div class="empty-state">
              <ion-icon name="document-text-outline"></ion-icon>
              <h3>No Changes Yet</h3>
              <p>Permission changes will be logged here for the last 12 months.</p>
            </div>
          } @else {
            <div class="audit-list">
              @for (entry of rbac.auditLog(); track entry.id) {
                <div class="audit-row">
                  <div class="audit-icon">
                    <ion-icon
                      [name]="entry.new_value === 'true' ? 'checkmark-circle-outline' : 'ban-outline'"
                      [class]="entry.new_value === 'true' ? 'granted' : 'revoked'"
                    ></ion-icon>
                  </div>
                  <div class="audit-info">
                    <div class="audit-perm">{{ formatPermKey(entry.permission_key) }}</div>
                    <ion-note>{{ entry.old_value }} → {{ entry.new_value }} · {{ formatRelativeDate(entry.created_at) }}</ion-note>
                  </div>
                </div>
              }
            </div>
          }
        }

      </div>

      <!-- Invite modal (inline alert for simplicity) -->
      @if (showInviteForm()) {
        <div class="invite-overlay" (click)="closeInviteModal()">
          <div class="invite-modal" (click)="$event.stopPropagation()">
            <div class="invite-modal-header">
              <ion-icon name="person-add-outline"></ion-icon>
              <h2>Invite Admin Assistant</h2>
              <p>They'll receive a one-time setup link by email. They cannot self-register.</p>
            </div>
            <input
              class="invite-input"
              type="email"
              placeholder="Email address"
              [(ngModel)]="inviteEmail"
              (keyup.enter)="submitInvite()"
            />
            <div class="invite-modal-actions">
              <ion-button fill="clear" (click)="closeInviteModal()">Cancel</ion-button>
              <ion-button
                [disabled]="!inviteEmail || isSendingInvite()"
                (click)="submitInvite()"
              >
                @if (isSendingInvite()) {
                  <ion-spinner name="crescent" slot="start"></ion-spinner>
                }
                Send Invite
              </ion-button>
            </div>
          </div>
        </div>
      }

    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 700; }

    .page-container { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

    .page-segment {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 12px; margin-bottom: 4px;
    }

    /* States */
    .loading-state {
      display: flex; justify-content: center; padding: 48px;
    }
    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 48px 24px; text-align: center;
      color: var(--fitos-text-tertiary, #737373);
    }
    .empty-state ion-icon { font-size: 48px; }
    .empty-state h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }
    .empty-state p { margin: 0; font-size: 13px; }

    /* Staff card */
    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px; box-shadow: none; margin: 0;
    }
    ion-card-content { padding: 16px; }

    .staff-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    }
    .staff-avatar {
      width: 44px; height: 44px; flex-shrink: 0;
      background: var(--fitos-bg-tertiary, #262626); border-radius: 50%; overflow: hidden;
    }
    .avatar-initials {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; color: var(--ion-color-primary, #10B981);
    }
    .staff-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .staff-name { font-size: 15px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }
    ion-badge { width: fit-content; font-size: 10px; border-radius: 6px; }

    /* Permissions section */
    .permissions-section { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; }
    .permissions-header {
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; color: var(--fitos-text-secondary, #A3A3A3); font-size: 13px;
      padding: 4px 0;
    }
    .permissions-header ion-icon { color: var(--ion-color-primary, #10B981); font-size: 16px; }
    .permissions-header span { flex: 1; }
    .lock-icon { font-size: 14px; }

    .template-row {
      display: flex; align-items: center; gap: 8px; margin: 12px 0 8px;
    }
    .template-row ion-note { font-size: 12px; }
    .template-select {
      --background: var(--fitos-bg-tertiary, #262626);
      --color: var(--fitos-text-primary, #F5F5F5);
      font-size: 12px; border-radius: 8px; flex: 1;
    }

    .perm-group { margin-bottom: 8px; }
    .perm-group-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--fitos-text-tertiary, #737373); padding: 8px 0 4px;
    }
    .perm-group-label ion-icon { font-size: 12px; color: var(--ion-color-primary, #10B981); }

    .perm-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 0; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .perm-row:last-child { border-bottom: none; }
    .perm-info { flex: 1; }
    .perm-info strong { display: block; font-size: 13px; color: var(--fitos-text-primary, #F5F5F5); margin-bottom: 2px; }
    .perm-info ion-note { font-size: 11px; color: var(--fitos-text-tertiary, #737373); }
    ion-toggle { --track-background: rgba(255,255,255,0.15); flex-shrink: 0; }

    /* Invitations */
    .invite-card { --background: var(--fitos-bg-secondary, #1A1A1A); }
    .invite-row { display: flex; align-items: center; gap: 12px; }
    .invite-info { flex: 1; }
    .invite-email { font-size: 14px; font-weight: 600; color: var(--fitos-text-primary, #F5F5F5); }
    .invite-actions { display: flex; justify-content: flex-end; margin-top: 8px; }

    /* Audit log */
    .audit-list { display: flex; flex-direction: column; gap: 0; }
    .audit-row {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .audit-icon ion-icon { font-size: 20px; }
    .audit-icon ion-icon.granted { color: var(--ion-color-primary, #10B981); }
    .audit-icon ion-icon.revoked { color: var(--fitos-nutrition-over, #8B5CF6); }
    .audit-perm { font-size: 13px; font-weight: 600; color: var(--fitos-text-primary, #F5F5F5); }

    /* Invite modal */
    .invite-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 24px;
    }
    .invite-modal {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; padding: 24px;
      width: 100%; max-width: 380px;
    }
    .invite-modal-header { text-align: center; margin-bottom: 20px; }
    .invite-modal-header ion-icon {
      font-size: 40px; color: var(--ion-color-primary, #10B981); display: block; margin: 0 auto 12px;
    }
    .invite-modal-header h2 { margin: 0 0 8px; font-size: 18px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }
    .invite-modal-header p { margin: 0; font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); }
    .invite-input {
      width: 100%; padding: 12px 14px; background: var(--fitos-bg-tertiary, #262626);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      color: var(--fitos-text-primary, #F5F5F5); font-size: 15px;
      outline: none; box-sizing: border-box;
    }
    .invite-input:focus { border-color: var(--ion-color-primary, #10B981); }
    .invite-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class TeamManagementPage implements OnInit {
  rbac = inject(RbacService);
  private toastCtrl    = inject(ToastController);
  private alertCtrl    = inject(AlertController);
  private actionCtrl   = inject(ActionSheetController);

  activeTab     = signal<SegmentTab>('staff');
  expandedId    = signal<string | null>(null);
  invitations   = signal<AdminInvitation[]>([]);
  isLoading     = signal(false);
  showInviteForm = signal(false);
  isSendingInvite = signal(false);
  inviteEmail   = '';

  // ── Permission groups definition ──────────────────────────────────────────

  schedulePerms: Array<{ key: keyof AdminAssistantPermissions; label: string; description: string }> = [
    { key: 'canManageAllSchedules',  label: 'Manage all schedules',  description: 'View and edit all trainers\' appointments' },
    { key: 'canManageOwnSchedule',   label: 'Manage own schedule',   description: 'Only appointments they created' },
    { key: 'canCheckInClients',      label: 'Check in clients',      description: 'Mark clients as arrived' },
    { key: 'canProcessCheckout',     label: 'Process checkout',      description: 'Run POS for completed sessions' },
  ];

  clientDataPerms: Array<{ key: keyof AdminAssistantPermissions; label: string; description: string }> = [
    { key: 'canViewClientList',      label: 'View client list',      description: 'See the full member roster' },
    { key: 'canViewWorkoutHistory',  label: 'View workout history',  description: 'Access client workout logs' },
    { key: 'canViewNutritionData',   label: 'View nutrition data',   description: 'See client nutrition logs' },
    { key: 'canViewHealthData',      label: 'View health data',      description: 'Wearable metrics and recovery scores' },
  ];

  financialPerms: Array<{ key: keyof AdminAssistantPermissions; label: string; description: string }> = [
    { key: 'canViewRevenueDashboard', label: 'View revenue dashboard', description: 'See revenue charts and summaries' },
    { key: 'canExportFinancialData',  label: 'Export financial data',  description: 'Download CSV / PDF reports' },
    { key: 'canProcessRefunds',       label: 'Process refunds',        description: 'Issue refunds through POS' },
  ];

  marketingPerms: Array<{ key: keyof AdminAssistantPermissions; label: string; description: string }> = [
    { key: 'canViewCrmPipeline',      label: 'View CRM pipeline',      description: 'See lead pipeline and contacts' },
    { key: 'canSendBulkMessages',     label: 'Send bulk messages',     description: 'Run email campaigns' },
    { key: 'canAccessEmailTemplates', label: 'Access email templates', description: 'Create and edit email templates' },
    { key: 'canMessageTeam',          label: 'Message team',           description: 'Use team messaging tab' },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    await this.rbac.loadAdminAssistants();
    this.isLoading.set(false);
  }

  // ── Tab ───────────────────────────────────────────────────────────────────

  async onTabChange(event: CustomEvent): Promise<void> {
    const tab = event.detail.value as SegmentTab;
    this.activeTab.set(tab);

    if (tab === 'invitations' && this.invitations().length === 0) {
      const invs = await this.rbac.loadInvitations();
      this.invitations.set(invs);
    }

    if (tab === 'audit') {
      await this.rbac.loadAuditLog();
    }
  }

  // ── Permissions ───────────────────────────────────────────────────────────

  toggleExpand(userId: string): void {
    this.expandedId.set(this.expandedId() === userId ? null : userId);
  }

  async updatePerm(
    aa: AdminAssistantRow,
    key: keyof AdminAssistantPermissions,
    value: boolean,
  ): Promise<void> {
    const ok = await this.rbac.updatePermission(aa.user_id, key, value);
    const t = await this.toastCtrl.create({
      message: ok ? 'Permission updated' : (this.rbac.error() ?? 'Update failed'),
      duration: 1500,
      color: ok ? 'success' : 'warning',
      position: 'top',
    });
    await t.present();
  }

  async applyTemplate(
    aa: AdminAssistantRow,
    template: AdminAssistantPermissionTemplate,
  ): Promise<void> {
    if (!template) return;
    const ok = await this.rbac.applyTemplate(aa.user_id, template);
    const label = {
      scheduling_focus:   'Scheduling Focus',
      front_desk_full:    'Front Desk Full',
      operations_manager: 'Operations Manager',
    }[template];
    const t = await this.toastCtrl.create({
      message: ok ? `Applied "${label}" template` : 'Failed to apply template',
      duration: 2000,
      color: ok ? 'success' : 'warning',
      position: 'top',
    });
    await t.present();
  }

  // ── Invite ────────────────────────────────────────────────────────────────

  openInviteModal(): void {
    this.inviteEmail = '';
    this.showInviteForm.set(true);
  }

  closeInviteModal(): void {
    this.showInviteForm.set(false);
  }

  async submitInvite(): Promise<void> {
    if (!this.inviteEmail) return;
    this.isSendingInvite.set(true);

    const result = await this.rbac.sendInvitation(this.inviteEmail);
    this.isSendingInvite.set(false);
    this.closeInviteModal();

    const t = await this.toastCtrl.create({
      message: result
        ? `Invitation sent to ${this.inviteEmail}`
        : (this.rbac.error() ?? 'Failed to send invitation'),
      duration: 2500,
      color: result ? 'success' : 'warning',
      position: 'top',
    });
    await t.present();

    if (result) {
      // Refresh invitations list if on that tab
      if (this.activeTab() === 'invitations') {
        const invs = await this.rbac.loadInvitations();
        this.invitations.set(invs);
      }
    }
  }

  async cancelInvite(invitationId: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Invitation',
      message: 'This invitation will no longer be usable.',
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Cancel Invite',
          role: 'destructive',
          handler: async () => {
            await this.rbac.cancelInvitation(invitationId);
            const invs = await this.rbac.loadInvitations();
            this.invitations.set(invs);
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Actions sheet ─────────────────────────────────────────────────────────

  async openActionsSheet(aa: AdminAssistantRow): Promise<void> {
    const isActive = aa.status === 'active';
    const sheet = await this.actionCtrl.create({
      header: aa.profile.full_name,
      buttons: [
        {
          text: isActive ? 'Suspend Access' : 'Reactivate Access',
          icon: isActive ? 'ban-outline' : 'refresh-outline',
          role: isActive ? 'destructive' : undefined,
          handler: async () => {
            const ok = isActive
              ? await this.rbac.suspendAdminAssistant(aa.user_id)
              : await this.rbac.reactivateAdminAssistant(aa.user_id);

            const t = await this.toastCtrl.create({
              message: ok
                ? `${aa.profile.full_name} ${isActive ? 'suspended' : 'reactivated'}`
                : 'Action failed',
              duration: 2000,
              color: ok ? 'success' : 'warning',
              position: 'top',
            });
            await t.present();
          },
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  initials(name: string): string {
    return (name ?? '')
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? '')
      .join('');
  }

  statusColor(status: string): string {
    return { active: 'success', invited: 'warning', suspended: 'medium' }[status] ?? 'medium';
  }

  inviteBadgeColor(status: string): string {
    return { pending: 'warning', accepted: 'success', expired: 'medium', cancelled: 'danger' }[status] ?? 'medium';
  }

  formatRelativeDate(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  formatPermKey(key: string): string {
    if (key === 'template_applied') return 'Permission template applied';
    return key
      .replace(/^can/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }
}
