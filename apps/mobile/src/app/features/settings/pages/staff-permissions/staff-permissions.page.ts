/**
 * StaffPermissionsPage — Sprint 61.1 (Phase 5D)
 *
 * Allows gym owners/managers to control what each staff member can see and do
 * in the scheduling, billing, and payroll subsystems.
 *
 * Route: /tabs/settings/staff-permissions  (ownerGuard)
 *
 * UI:
 *   - Staff roster cards (avatar, name, role badge)
 *   - Per-card: accordion of permission toggles
 *   - Travel buffer + double-booking controls
 *   - Changes auto-save on toggle (debounced 500ms)
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
  IonItem,
  IonLabel,
  IonToggle,
  IonNote,
  IonSelect,
  IonSelectOption,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  personOutline,
  chevronDownOutline,
  chevronUpOutline,
  shieldCheckmarkOutline,
  lockClosedOutline,
  carOutline,
  calendarOutline,
  cashOutline,
  settingsOutline,
} from 'ionicons/icons';
import { SchedulingPermissionsService, StaffPermissionRow } from '../../../../core/services/scheduling-permissions.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { UpsertSchedulingPermissionsDto } from '@fitos/shared';

addIcons({
  peopleOutline, personOutline, chevronDownOutline, chevronUpOutline,
  shieldCheckmarkOutline, lockClosedOutline, carOutline,
  calendarOutline, cashOutline, settingsOutline,
});

@Component({
  selector: 'app-staff-permissions',
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
    IonItem,
    IonLabel,
    IonToggle,
    IonNote,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Staff Permissions</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page-container">

        <div class="section-intro">
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          <p>Control what each trainer and staff member can see and do in scheduling, billing, and payroll.</p>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading staff...</p>
          </div>
        }

        @if (!isLoading() && staff().length === 0) {
          <div class="empty-state">
            <ion-icon name="people-outline"></ion-icon>
            <p>No staff members found.</p>
            <ion-note>Invite trainers to your gym to manage their permissions here.</ion-note>
          </div>
        }

        @for (row of staff(); track row.profile.id) {
          <ion-card class="staff-card">
            <ion-card-content>

              <!-- Staff header row -->
              <div class="staff-header" (click)="toggleExpand(row.profile.id)" role="button" tabindex="0" (keyup.enter)="toggleExpand(row.profile.id)">
                <ion-avatar class="staff-avatar">
                  @if (row.profile.avatar_url) {
                    <img [src]="row.profile.avatar_url" [alt]="row.profile.full_name" />
                  } @else {
                    <div class="avatar-initials">{{ initials(row.profile.full_name) }}</div>
                  }
                </ion-avatar>

                <div class="staff-info">
                  <div class="staff-name">{{ row.profile.full_name }}</div>
                  <ion-badge [color]="roleBadgeColor(row.profile.role)">{{ formatRole(row.profile.role) }}</ion-badge>
                </div>

                <ion-icon
                  [name]="expandedId() === row.profile.id ? 'chevron-up-outline' : 'chevron-down-outline'"
                  class="expand-icon"
                ></ion-icon>
              </div>

              <!-- Expandable permissions panel -->
              @if (expandedId() === row.profile.id) {
                <div class="permissions-panel">

                  <!-- Schedule visibility -->
                  <div class="perm-section-label">
                    <ion-icon name="calendar-outline"></ion-icon>
                    Schedule
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>View all schedules</strong>
                      <ion-note>See other trainers' appointment details</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.can_view_all_schedules"
                      (ngModelChange)="updatePerm(row, 'can_view_all_schedules', $event)"
                    ></ion-toggle>
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>Edit other trainers' appointments</strong>
                      <ion-note>Cancel, reschedule, update notes on any appointment</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.can_edit_other_trainer_appts"
                      (ngModelChange)="updatePerm(row, 'can_edit_other_trainer_appts', $event)"
                    ></ion-toggle>
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>Allow double-booking</strong>
                      <ion-note>Shows warning but permits overlapping appointments</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.allow_double_booking"
                      (ngModelChange)="updatePerm(row, 'allow_double_booking', $event)"
                    ></ion-toggle>
                  </div>

                  <!-- Travel buffer -->
                  <div class="perm-row align-start">
                    <div class="perm-info">
                      <ion-icon name="car-outline" class="inline-icon"></ion-icon>
                      <strong>Travel buffer</strong>
                      <ion-note>Block slots between appointments at different locations</ion-note>
                    </div>
                    <ion-select
                      [ngModel]="row.permissions.travel_buffer_minutes"
                      (ngModelChange)="updatePerm(row, 'travel_buffer_minutes', $event)"
                      interface="popover"
                      class="buffer-select"
                    >
                      <ion-select-option [value]="0">None</ion-select-option>
                      <ion-select-option [value]="15">15 min</ion-select-option>
                      <ion-select-option [value]="30">30 min</ion-select-option>
                      <ion-select-option [value]="45">45 min</ion-select-option>
                      <ion-select-option [value]="60">60 min</ion-select-option>
                    </ion-select>
                  </div>

                  <div class="perm-divider"></div>

                  <!-- Financial -->
                  <div class="perm-section-label">
                    <ion-icon name="cash-outline"></ion-icon>
                    Financial
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>View other trainers' pay rates</strong>
                      <ion-note>See pay rate configuration for all trainers</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.can_view_other_trainer_pay_rates"
                      (ngModelChange)="updatePerm(row, 'can_view_other_trainer_pay_rates', $event)"
                    ></ion-toggle>
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>Manage pricing options</strong>
                      <ion-note>Create / archive session packs, passes, and contracts</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.can_manage_pricing_options"
                      (ngModelChange)="updatePerm(row, 'can_manage_pricing_options', $event)"
                    ></ion-toggle>
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>Access payroll reports</strong>
                      <ion-note>View pay amounts and revenue reports for all trainers</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.can_access_payroll_reports"
                      (ngModelChange)="updatePerm(row, 'can_access_payroll_reports', $event)"
                    ></ion-toggle>
                  </div>

                  <div class="perm-divider"></div>

                  <!-- Business tools -->
                  <div class="perm-section-label">
                    <ion-icon name="settings-outline"></ion-icon>
                    Business Tools
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>Manage cancellation policies</strong>
                      <ion-note>Edit late-cancel windows and fee rules</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.can_manage_cancellation_policies"
                      (ngModelChange)="updatePerm(row, 'can_manage_cancellation_policies', $event)"
                    ></ion-toggle>
                  </div>

                  <div class="perm-row">
                    <div class="perm-info">
                      <strong>Configure facility resources</strong>
                      <ion-note>Manage rooms and equipment for appointment booking</ion-note>
                    </div>
                    <ion-toggle
                      [ngModel]="row.permissions.can_configure_resources"
                      (ngModelChange)="updatePerm(row, 'can_configure_resources', $event)"
                    ></ion-toggle>
                  </div>

                </div>
              }

            </ion-card-content>
          </ion-card>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 700; }

    .page-container { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

    .section-intro {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px; background: rgba(16,185,129,0.08); border-radius: 12px;
      border: 1px solid rgba(16,185,129,0.2);
    }
    .section-intro ion-icon { font-size: 22px; color: var(--ion-color-primary, #10B981); flex-shrink: 0; margin-top: 2px; }
    .section-intro p { margin: 0; font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); line-height: 1.5; }

    .loading-state, .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 48px 24px; text-align: center; color: var(--fitos-text-tertiary, #737373);
    }
    .loading-state ion-icon, .empty-state ion-icon { font-size: 48px; }
    .loading-state p, .empty-state p { margin: 0; font-size: 14px; }
    .empty-state ion-note { font-size: 12px; }

    /* Staff card */
    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px; box-shadow: none; margin: 0;
    }
    ion-card-content { padding: 16px; }

    .staff-header {
      display: flex; align-items: center; gap: 12px;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
    }
    .staff-avatar {
      width: 44px; height: 44px; flex-shrink: 0;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 50%; overflow: hidden;
    }
    .avatar-initials {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700;
      color: var(--ion-color-primary, #10B981);
    }
    .staff-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .staff-name { font-size: 15px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }
    ion-badge { width: fit-content; font-size: 10px; border-radius: 6px; }
    .expand-icon { font-size: 18px; color: var(--fitos-text-tertiary, #737373); flex-shrink: 0; }

    /* Permissions panel */
    .permissions-panel {
      margin-top: 16px; padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex; flex-direction: column; gap: 0;
    }

    .perm-section-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
      color: var(--fitos-text-tertiary, #737373);
      padding: 8px 0 4px;
    }
    .perm-section-label ion-icon { font-size: 14px; color: var(--ion-color-primary, #10B981); }

    .perm-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 0; gap: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .perm-row:last-child { border-bottom: none; }
    .perm-row.align-start { align-items: flex-start; }

    .perm-info { flex: 1; }
    .perm-info strong { display: block; font-size: 13px; color: var(--fitos-text-primary, #F5F5F5); margin-bottom: 2px; }
    .perm-info ion-note { font-size: 11px; color: var(--fitos-text-tertiary, #737373); }
    .inline-icon { margin-right: 4px; color: var(--ion-color-primary, #10B981); vertical-align: middle; }

    ion-toggle { --track-background: rgba(255,255,255,0.15); flex-shrink: 0; }

    .buffer-select {
      --background: var(--fitos-bg-tertiary, #262626);
      --color: var(--fitos-text-primary, #F5F5F5);
      font-size: 13px; border-radius: 8px; min-width: 80px;
      flex-shrink: 0;
    }

    .perm-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 8px 0; }
  `],
})
export class StaffPermissionsPage implements OnInit {
  private permsSvc  = inject(SchedulingPermissionsService);
  private auth      = inject(AuthService);
  private toastCtrl = inject(ToastController);

  staff      = signal<StaffPermissionRow[]>([]);
  isLoading  = signal(false);
  expandedId = signal<string | null>(null);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;

    // The owner's user id acts as gym_owner_id for staff profiles
    this.isLoading.set(true);
    const rows = await this.permsSvc.loadPermissionsForGym(user.id);
    this.staff.set(rows);
    this.isLoading.set(false);

    // Auto-expand first staff member for usability
    if (rows.length > 0) {
      this.expandedId.set(rows[0].profile.id);
    }
  }

  // ── UI actions ─────────────────────────────────────────────────────────────

  toggleExpand(userId: string): void {
    this.expandedId.set(this.expandedId() === userId ? null : userId);
  }

  async updatePerm(
    row: StaffPermissionRow,
    field: keyof Omit<StaffPermissionRow['permissions'], never>,
    value: boolean | number,
  ): Promise<void> {
    // Optimistic update
    this.staff.update(list =>
      list.map(r =>
        r.profile.id === row.profile.id
          ? { ...r, permissions: { ...r.permissions, [field]: value } }
          : r
      )
    );

    const dto: UpsertSchedulingPermissionsDto = {
      user_id: row.profile.id,
      ...row.permissions,
      [field]: value,
    };

    const ok = await this.permsSvc.upsertPermissions(dto);
    if (!ok) {
      // Revert on failure
      this.staff.update(list =>
        list.map(r =>
          r.profile.id === row.profile.id
            ? { ...r, permissions: { ...r.permissions, [field]: row.permissions[field as keyof typeof row.permissions] } }
            : r
        )
      );
      const t = await this.toastCtrl.create({
        message: this.permsSvc.error() ?? 'Save failed',
        duration: 2500,
        color: 'warning',
        position: 'top',
      });
      await t.present();
    } else {
      const t = await this.toastCtrl.create({
        message: 'Permissions updated',
        duration: 1500,
        color: 'success',
        position: 'top',
      });
      await t.present();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? '')
      .join('');
  }

  formatRole(role: string): string {
    const map: Record<string, string> = {
      trainer:   'Trainer',
      gym_staff: 'Staff',
      gym_owner: 'Owner',
    };
    return map[role] ?? role;
  }

  roleBadgeColor(role: string): string {
    return role === 'trainer' ? 'primary' : 'medium';
  }
}
