/**
 * RbacService — Sprint 61 (EP-25)
 *
 * Manages Admin Assistant permission overrides for gym owners.
 * All permission checks are server-authoritative — this service coordinates
 * the UI, but the DB (RLS + get_admin_assistant_permissions()) is the source of truth.
 *
 * Responsibilities:
 *   - Load all admin assistants for a facility
 *   - Update permission_overrides for a specific AA user
 *   - Write rbac_audit_log entries on every change
 *   - Load audit log for display in Settings > Team > Audit
 *   - Apply built-in permission templates (US-250)
 *   - Cache current user's own permissions (for route guards)
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type {
  AdminAssistantPermissions,
  AdminAssistantPermissionTemplate,
  AdminAssistantProfile,
  AdminInvitation,
  RbacAuditLogEntry,
  ADMIN_ASSISTANT_PERMISSION_TEMPLATES,
} from '@fitos/shared';
import { ADMIN_ASSISTANT_PERMISSION_TEMPLATES as TEMPLATES } from '@fitos/shared';

export interface AdminAssistantRow {
  user_id: string;
  owner_id: string;
  facility_id: string | null;
  status: 'invited' | 'active' | 'suspended';
  permission_overrides: AdminAssistantPermissions;
  invited_at: string;
  activated_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class RbacService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // State
  adminAssistants = signal<AdminAssistantRow[]>([]);
  auditLog        = signal<RbacAuditLogEntry[]>([]);
  ownPermissions  = signal<AdminAssistantPermissions | null>(null);
  isLoading       = signal(false);
  error           = signal<string | null>(null);

  // Derived
  activeAssistants = computed(() =>
    this.adminAssistants().filter(aa => aa.status === 'active')
  );

  // ── Load ──────────────────────────────────────────────────────────────────

  /**
   * Load all admin assistants for the current owner.
   * Called from Settings > Team Management.
   */
  async loadAdminAssistants(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const ownerId = this.auth.user()?.id;
      if (!ownerId) throw new Error('Not authenticated');

      const { data, error } = await this.supabase.client
        .from('admin_assistants')
        .select(`
          *,
          profile:profiles!admin_assistants_user_id_fkey(
            id, full_name, email, avatar_url, role
          )
        `)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      this.adminAssistants.set((data ?? []) as AdminAssistantRow[]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load staff');
      console.error('[RbacService] loadAdminAssistants:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Load the current user's own permission_overrides.
   * Used by route guards and tab visibility logic.
   */
  async loadOwnPermissions(): Promise<AdminAssistantPermissions | null> {
    const userId = this.auth.user()?.id;
    if (!userId) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('admin_assistants')
        .select('permission_overrides')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Not an admin assistant — no permissions record
        this.ownPermissions.set(null);
        return null;
      }

      const perms = data?.permission_overrides as AdminAssistantPermissions;
      this.ownPermissions.set(perms);
      return perms;
    } catch (err) {
      console.error('[RbacService] loadOwnPermissions:', err);
      return null;
    }
  }

  // ── Update permissions ────────────────────────────────────────────────────

  /**
   * Update a single permission key for an admin assistant.
   * Writes an audit log entry and updates the local signal optimistically.
   * (US-251, US-252)
   */
  async updatePermission(
    targetUserId: string,
    permKey: keyof AdminAssistantPermissions,
    newValue: boolean,
  ): Promise<boolean> {
    const ownerId = this.auth.user()?.id;
    if (!ownerId) return false;

    // Find current value for audit log
    const current = this.adminAssistants().find(aa => aa.user_id === targetUserId);
    const oldValue = current?.permission_overrides[permKey];

    // Optimistic update
    this.adminAssistants.update(list =>
      list.map(aa =>
        aa.user_id === targetUserId
          ? {
              ...aa,
              permission_overrides: {
                ...aa.permission_overrides,
                [permKey]: newValue,
              },
            }
          : aa
      )
    );

    try {
      // Build updated overrides object
      const updated: AdminAssistantPermissions = {
        ...(current?.permission_overrides ?? {} as AdminAssistantPermissions),
        [permKey]: newValue,
      };

      const { error: updateError } = await this.supabase.client
        .from('admin_assistants')
        .update({ permission_overrides: updated })
        .eq('user_id', targetUserId)
        .eq('owner_id', ownerId);

      if (updateError) throw updateError;

      // Write audit log entry (US-253)
      await this.supabase.client
        .from('rbac_audit_log')
        .insert({
          changed_by:     ownerId,
          target_user_id: targetUserId,
          permission_key: permKey,
          old_value:      String(oldValue ?? 'undefined'),
          new_value:      String(newValue),
        });

      return true;
    } catch (err) {
      // Revert optimistic update
      if (current) {
        this.adminAssistants.update(list =>
          list.map(aa => (aa.user_id === targetUserId ? current : aa))
        );
      }
      this.error.set(err instanceof Error ? err.message : 'Failed to update permission');
      console.error('[RbacService] updatePermission:', err);
      return false;
    }
  }

  /**
   * Apply a built-in permission template to an admin assistant.
   * Writes a single bulk audit log entry. (US-250)
   */
  async applyTemplate(
    targetUserId: string,
    template: AdminAssistantPermissionTemplate,
  ): Promise<boolean> {
    const ownerId = this.auth.user()?.id;
    if (!ownerId) return false;

    const newOverrides = TEMPLATES[template];

    // Optimistic update
    this.adminAssistants.update(list =>
      list.map(aa =>
        aa.user_id === targetUserId
          ? { ...aa, permission_overrides: newOverrides }
          : aa
      )
    );

    try {
      const { error: updateError } = await this.supabase.client
        .from('admin_assistants')
        .update({ permission_overrides: newOverrides })
        .eq('user_id', targetUserId)
        .eq('owner_id', ownerId);

      if (updateError) throw updateError;

      // Single audit entry for bulk template apply
      await this.supabase.client
        .from('rbac_audit_log')
        .insert({
          changed_by:     ownerId,
          target_user_id: targetUserId,
          permission_key: 'template_applied',
          old_value:      null,
          new_value:      template,
          notes:          `Applied "${template}" template`,
        });

      return true;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to apply template');
      console.error('[RbacService] applyTemplate:', err);
      return false;
    }
  }

  // ── Admin Invitations ─────────────────────────────────────────────────────

  /**
   * Send an invitation to a new admin assistant. (EP-01 US-004)
   * Creates a record in admin_invitations and triggers the invite email
   * via the send-admin-invitation Edge Function.
   */
  async sendInvitation(email: string, facilityId?: string): Promise<AdminInvitation | null> {
    const ownerId = this.auth.user()?.id;
    if (!ownerId) return null;

    this.error.set(null);

    try {
      // Check for existing pending invite
      const { data: existing } = await this.supabase.client
        .from('admin_invitations')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        throw new Error(`An active invitation for ${email} already exists.`);
      }

      // Insert invitation record
      const { data, error } = await this.supabase.client
        .from('admin_invitations')
        .insert({
          owner_id:    ownerId,
          email,
          facility_id: facilityId ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger invitation email via Edge Function
      const { error: fnError } = await this.supabase.client.functions.invoke(
        'send-admin-invitation',
        {
          body: {
            invitation_id: data.id,
            email,
            owner_id: ownerId,
          },
        }
      );

      if (fnError) {
        console.warn('[RbacService] send-admin-invitation Edge Fn error:', fnError);
        // Non-fatal — invitation record is created; email can be resent
      }

      return data as AdminInvitation;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to send invitation');
      console.error('[RbacService] sendInvitation:', err);
      return null;
    }
  }

  /**
   * Load all invitations sent by this owner.
   */
  async loadInvitations(): Promise<AdminInvitation[]> {
    const ownerId = this.auth.user()?.id;
    if (!ownerId) return [];

    try {
      const { data, error } = await this.supabase.client
        .from('admin_invitations')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as AdminInvitation[];
    } catch (err) {
      console.error('[RbacService] loadInvitations:', err);
      return [];
    }
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('admin_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('[RbacService] cancelInvitation:', err);
      return false;
    }
  }

  /**
   * Look up an invitation by token (used in the AA registration flow).
   * No auth required — token is the secret.
   */
  async getInvitationByToken(token: string): Promise<AdminInvitation | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('admin_invitations')
        .select('*')
        .eq('invite_token', token)
        .single();

      if (error) return null;
      return data as AdminInvitation;
    } catch {
      return null;
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  /**
   * Load RBAC audit log for the current owner's facility. (US-253)
   */
  async loadAuditLog(limit = 100): Promise<void> {
    const ownerId = this.auth.user()?.id;
    if (!ownerId) return;

    try {
      const { data, error } = await this.supabase.client
        .from('rbac_audit_log')
        .select('*')
        .eq('changed_by', ownerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      this.auditLog.set((data ?? []) as RbacAuditLogEntry[]);
    } catch (err) {
      console.error('[RbacService] loadAuditLog:', err);
    }
  }

  // ── Status management ─────────────────────────────────────────────────────

  async suspendAdminAssistant(userId: string): Promise<boolean> {
    return this._setStatus(userId, 'suspended');
  }

  async reactivateAdminAssistant(userId: string): Promise<boolean> {
    return this._setStatus(userId, 'active');
  }

  private async _setStatus(
    userId: string,
    status: 'active' | 'suspended',
  ): Promise<boolean> {
    const ownerId = this.auth.user()?.id;
    if (!ownerId) return false;

    try {
      const { error } = await this.supabase.client
        .from('admin_assistants')
        .update({ status })
        .eq('user_id', userId)
        .eq('owner_id', ownerId);

      if (error) throw error;

      this.adminAssistants.update(list =>
        list.map(aa => (aa.user_id === userId ? { ...aa, status } : aa))
      );
      return true;
    } catch (err) {
      console.error('[RbacService] _setStatus:', err);
      return false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Check if the current user (an AA) has a specific permission */
  hasPermission(key: keyof AdminAssistantPermissions): boolean {
    const perms = this.ownPermissions();
    if (!perms) return false;
    return perms[key] === true;
  }

  /** Format a permission key for human-readable display */
  formatPermissionKey(key: string): string {
    return key
      .replace(/^can/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }
}
