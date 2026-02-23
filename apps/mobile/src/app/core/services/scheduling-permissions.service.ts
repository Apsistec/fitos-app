import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { SchedulingPermissions, UpsertSchedulingPermissionsDto } from '@fitos/shared';

/**
 * SchedulingPermissionsService — Sprint 61.1 (Phase 5D)
 *
 * Manages per-user scheduling permission flags.
 * - Owners/managers use this to control what staff can see and do
 * - The service also exposes the *current user's own* permissions for guard/UI use
 *
 * Design decisions:
 * - Trainers/owners get full access by default (no row needed)
 * - Gym staff default to restricted access unless explicitly granted
 * - Permissions take effect immediately via RLS (no restart required)
 */

/** Sensible defaults for trainers and gym owners (full access) */
const TRAINER_DEFAULTS: Omit<SchedulingPermissions, 'user_id' | 'updated_at'> = {
  can_view_all_schedules:           true,
  can_edit_other_trainer_appts:     true,
  can_view_other_trainer_pay_rates: true,
  can_manage_pricing_options:       true,
  can_access_payroll_reports:       true,
  can_manage_cancellation_policies: true,
  can_configure_resources:          true,
  allow_double_booking:             false,
  travel_buffer_minutes:            0,
};

/** Sensible defaults for gym staff (restricted) */
const STAFF_DEFAULTS: Omit<SchedulingPermissions, 'user_id' | 'updated_at'> = {
  can_view_all_schedules:           false,
  can_edit_other_trainer_appts:     false,
  can_view_other_trainer_pay_rates: false,
  can_manage_pricing_options:       false,
  can_access_payroll_reports:       false,
  can_manage_cancellation_policies: false,
  can_configure_resources:          false,
  allow_double_booking:             false,
  travel_buffer_minutes:            0,
};

@Injectable({ providedIn: 'root' })
export class SchedulingPermissionsService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  // ── State ──────────────────────────────────────────────────────────────────

  /** Permissions for all staff (owner view) */
  allPermissions = signal<SchedulingPermissions[]>([]);

  /** The current user's own permissions (resolved from DB or defaults) */
  myPermissions  = signal<Omit<SchedulingPermissions, 'user_id' | 'updated_at'>>(STAFF_DEFAULTS);

  isLoading = signal(false);
  isSaving  = signal(false);
  error     = signal<string | null>(null);

  // ── Computed helpers (for guards and templates) ────────────────────────────

  canViewAllSchedules          = computed(() => this.myPermissions().can_view_all_schedules);
  canEditOtherAppts            = computed(() => this.myPermissions().can_edit_other_trainer_appts);
  canViewOtherPayRates         = computed(() => this.myPermissions().can_view_other_trainer_pay_rates);
  canManagePricingOptions      = computed(() => this.myPermissions().can_manage_pricing_options);
  canAccessPayrollReports      = computed(() => this.myPermissions().can_access_payroll_reports);
  canManageCancellationPolicies = computed(() => this.myPermissions().can_manage_cancellation_policies);
  canConfigureResources        = computed(() => this.myPermissions().can_configure_resources);
  allowDoubleBooking           = computed(() => this.myPermissions().allow_double_booking);
  travelBufferMinutes          = computed(() => this.myPermissions().travel_buffer_minutes);

  // ── Load ──────────────────────────────────────────────────────────────────

  /**
   * Loads the current user's own scheduling permissions.
   * Call this once during app init (or after login).
   */
  async loadMyPermissions(): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;

    const isPrivileged = ['trainer', 'gym_owner'].includes(user.role);
    const defaults     = isPrivileged ? TRAINER_DEFAULTS : STAFF_DEFAULTS;

    const { data } = await this.supabase.client
      .from('scheduling_permissions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      const { user_id, updated_at, ...perms } = data as SchedulingPermissions;
      // Merge with defaults so any missing columns fall back sensibly
      this.myPermissions.set({ ...defaults, ...perms });
    } else {
      this.myPermissions.set(defaults);
    }
  }

  /**
   * Loads all staff scheduling permissions for the owner/manager view.
   * Joins with profiles to get names and roles.
   */
  async loadAllPermissions(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('scheduling_permissions')
      .select('*')
      .order('user_id');

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.allPermissions.set((data ?? []) as SchedulingPermissions[]);
  }

  /**
   * Loads permissions for all staff under a given gym owner.
   * Joins profiles by gym_owner_id to find the staff roster.
   */
  async loadPermissionsForGym(gymOwnerId: string): Promise<StaffPermissionRow[]> {
    this.isLoading.set(true);
    this.error.set(null);

    // Fetch all profiles that belong to this gym
    const { data: profiles, error: profileErr } = await this.supabase.client
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .eq('gym_owner_id', gymOwnerId)
      .in('role', ['trainer', 'gym_staff'])
      .order('full_name');

    if (profileErr) {
      this.error.set(profileErr.message);
      this.isLoading.set(false);
      return [];
    }

    const staffList = (profiles ?? []) as StaffProfile[];

    if (staffList.length === 0) {
      this.isLoading.set(false);
      return [];
    }

    const userIds = staffList.map(p => p.id);

    // Fetch existing permission rows
    const { data: permRows } = await this.supabase.client
      .from('scheduling_permissions')
      .select('*')
      .in('user_id', userIds);

    const permMap = new Map<string, SchedulingPermissions>(
      ((permRows ?? []) as SchedulingPermissions[]).map(p => [p.user_id, p])
    );

    this.isLoading.set(false);

    return staffList.map(profile => {
      const isPrivileged = profile.role === 'trainer';
      const defaults     = isPrivileged ? TRAINER_DEFAULTS : STAFF_DEFAULTS;
      const stored       = permMap.get(profile.id);
      const perms        = stored
        ? { ...defaults, ...stored }
        : { ...defaults };

      return { profile, permissions: perms };
    });
  }

  // ── Upsert ────────────────────────────────────────────────────────────────

  /**
   * Saves (creates or updates) scheduling permissions for a specific user.
   * Used by the staff permissions settings page.
   */
  async upsertPermissions(dto: UpsertSchedulingPermissionsDto): Promise<boolean> {
    this.isSaving.set(true);
    this.error.set(null);

    const { error } = await this.supabase.client
      .from('scheduling_permissions')
      .upsert(
        { ...dto, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    this.isSaving.set(false);

    if (error) {
      this.error.set(error.message);
      return false;
    }

    // Keep allPermissions signal in sync
    this.allPermissions.update(list => {
      const idx = list.findIndex(p => p.user_id === dto.user_id);
      const updated: SchedulingPermissions = { ...dto, updated_at: new Date().toISOString() };
      return idx >= 0
        ? list.map((p, i) => i === idx ? updated : p)
        : [...list, updated];
    });

    // Update myPermissions if editing self
    const currentUserId = this.auth.currentUser()?.id;
    if (dto.user_id === currentUserId) {
      const { user_id, ...perms } = dto;
      this.myPermissions.set(perms);
    }

    return true;
  }

  /**
   * Seeds a default permission row for a newly onboarded trainer/owner.
   * Called after account creation to ensure the row exists.
   */
  async seed(userId: string, role: 'trainer' | 'gym_owner' | 'gym_staff'): Promise<void> {
    const defaults = role === 'gym_staff' ? STAFF_DEFAULTS : TRAINER_DEFAULTS;

    await this.supabase.client
      .from('scheduling_permissions')
      .upsert(
        { user_id: userId, ...defaults, updated_at: new Date().toISOString() },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );
  }

  // ── Convenience: update travel buffer for current user ────────────────────

  async updateTravelBuffer(userId: string, minutes: number): Promise<boolean> {
    const current = this.myPermissions();
    return this.upsertPermissions({ user_id: userId, ...current, travel_buffer_minutes: minutes });
  }

  async updateDoubleBooking(userId: string, allow: boolean): Promise<boolean> {
    const current = this.myPermissions();
    return this.upsertPermissions({ user_id: userId, ...current, allow_double_booking: allow });
  }
}

// ── Supporting types (local to service, not exported from @fitos/shared) ─────

export interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

export interface StaffPermissionRow {
  profile: StaffProfile;
  permissions: Omit<SchedulingPermissions, 'user_id' | 'updated_at'>;
}
