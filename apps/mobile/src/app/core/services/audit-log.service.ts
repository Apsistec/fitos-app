import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * HIPAA-Compliant Audit Logging Service
 *
 * Tracks all access to Protected Health Information (PHI) for HIPAA compliance.
 * Automatically logs PHI access, modifications, and exports.
 *
 * HIPAA Requirements:
 * - Track who accessed what PHI and when
 * - Track all modifications to PHI
 * - Immutable audit trail
 * - Retention for minimum 6 years (we use 7)
 * - Suspicious activity detection
 *
 * Sprint 80 Hardening:
 * - Writes directly to Supabase (insert-only RLS, not through AI backend)
 * - Identity always derived from authenticated session (never caller-supplied)
 * - Retry 3x on failure; queued entries flushed on next write
 * - before_data/after_data sanitized to field names only (no raw PHI)
 * - crypto.randomUUID() for session IDs
 * - Read methods gated by compliance role
 */

export interface AuditLogEntry {
  id?: string;
  timestamp?: string;

  // Actor (overridden from authenticated session — do not supply manually)
  user_id?: string;
  user_email?: string;
  user_role?: string;
  // NOTE: ip_address captured server-side only (removed from client interface)
  user_agent?: string;

  // Action
  action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'print' | 'share';
  resource_type: string;
  resource_id: string;

  // PHI classification
  contains_phi: boolean;
  phi_categories?: PhiCategory[];

  // Context
  session_id?: string;
  request_id?: string;
  api_endpoint?: string;
  http_method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  http_status_code?: number;

  // Data changes (sanitized on write — field names + types only)
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;

  // Security
  access_reason?: AccessReason;
  authorization_level?: string;

  // Compliance
  retention_policy?: 'standard' | 'extended';
}

export type PhiCategory =
  | 'demographics'
  | 'health_metrics'
  | 'medical_history'
  | 'photos'
  | 'consent_management'
  | 'payment_info';

export type AccessReason =
  | 'treatment'
  | 'payment'
  | 'operations'
  | 'research'
  | 'emergency'
  | 'other';

export interface AuditLogQuery {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  resource_type?: string;
  action?: string;
  contains_phi?: boolean;
  limit?: number;
  offset?: number;
}

export interface PhiAccessSummary {
  access_date: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  access_count: number;
  phi_categories_accessed: string[][];
}

export interface SuspiciousActivity {
  user_id: string;
  user_email: string;
  user_role: string;
  access_date: string;
  access_count: number;
  unique_records_accessed: number;
  resource_types_accessed: number;
  actions_performed: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  // Cryptographically random session ID (stable for app lifecycle)
  private readonly sessionId = crypto.randomUUID();

  // Retry queue for failed writes (flushed on next successful write)
  private retryQueue: AuditLogEntry[] = [];
  private flushingQueue = false;
  private static readonly MAX_RETRIES = 3;

  // State signals
  lastLoggedEntry = signal<AuditLogEntry | null>(null);

  constructor() {
    // Flush any queued entries from previous failures
    this.flushQueue();
  }

  // ─── Write Methods (fire-and-forget with retry) ──────────────────────

  /**
   * Log an action that involves PHI access.
   *
   * Identity fields (user_id, user_email, user_role) are always overridden
   * from the authenticated session. The DB trigger provides a second layer
   * of defence by resolving identity from the JWT.
   */
  async logPhiAccess(entry: AuditLogEntry): Promise<void> {
    const user = this.auth.user();
    const profile = this.auth.profile();

    // Enrich with authenticated context (never trust caller-supplied identity)
    const enrichedEntry: AuditLogEntry = {
      ...entry,
      user_id: user?.id,
      user_email: user?.email ?? 'unknown',
      user_role: profile?.role ?? 'unknown',
      user_agent: navigator.userAgent,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      // Sanitize data change fields — store field names + types, not raw PHI
      before_data: this.sanitizeData(entry.before_data),
      after_data: this.sanitizeData(entry.after_data),
    };

    await this.writeWithRetry(enrichedEntry);
    this.lastLoggedEntry.set(enrichedEntry);

    if (isDevMode()) {
      console.debug('[HIPAA Audit] Logged:', enrichedEntry.resource_type, enrichedEntry.action);
    }
  }

  /**
   * Log a client profile view (PHI - demographics)
   */
  async logClientProfileView(
    clientId: string,
    reason: AccessReason = 'treatment',
  ): Promise<void> {
    return this.logPhiAccess({
      action: 'read',
      resource_type: 'client_profile',
      resource_id: clientId,
      contains_phi: true,
      phi_categories: ['demographics'],
      access_reason: reason,
    });
  }

  /**
   * Log health data access (weight, body comp, etc.)
   */
  async logHealthDataAccess(
    dataType: string,
    dataId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment',
  ): Promise<void> {
    return this.logPhiAccess({
      action,
      resource_type: dataType,
      resource_id: dataId,
      contains_phi: true,
      phi_categories: ['health_metrics'],
      access_reason: reason,
    });
  }

  /**
   * Log progress photo access (high-sensitivity PHI)
   */
  async logProgressPhotoAccess(
    photoId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment',
  ): Promise<void> {
    return this.logPhiAccess({
      action,
      resource_type: 'progress_photo',
      resource_id: photoId,
      contains_phi: true,
      phi_categories: ['photos'],
      access_reason: reason,
    });
  }

  /**
   * Log workout data access
   */
  async logWorkoutAccess(
    workoutId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment',
  ): Promise<void> {
    return this.logPhiAccess({
      action,
      resource_type: 'workout_log',
      resource_id: workoutId,
      contains_phi: true,
      phi_categories: ['health_metrics'],
      access_reason: reason,
    });
  }

  /**
   * Log nutrition data access
   */
  async logNutritionAccess(
    nutritionId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment',
  ): Promise<void> {
    return this.logPhiAccess({
      action,
      resource_type: 'nutrition_log',
      resource_id: nutritionId,
      contains_phi: true,
      phi_categories: ['health_metrics'],
      access_reason: reason,
    });
  }

  /**
   * Log data export (HIPAA requires tracking of all exports).
   * Resource IDs stored as JSON array (not comma-joined).
   */
  async logDataExport(
    exportType: string,
    resourceIds: string[],
    containsPhi: boolean,
    reason: AccessReason = 'operations',
  ): Promise<void> {
    return this.logPhiAccess({
      action: 'export',
      resource_type: exportType,
      resource_id: JSON.stringify(resourceIds),
      contains_phi: containsPhi,
      phi_categories: containsPhi ? ['demographics', 'health_metrics'] : undefined,
      access_reason: reason,
    });
  }

  /**
   * Log data sharing (sending PHI to third party)
   */
  async logDataSharing(
    resourceType: string,
    resourceId: string,
    recipient: string,
    reason: AccessReason = 'treatment',
  ): Promise<void> {
    return this.logPhiAccess({
      action: 'share',
      resource_type: resourceType,
      resource_id: resourceId,
      contains_phi: true,
      access_reason: reason,
      // Recipient is not PHI — safe to store
      after_data: { shared_with: recipient },
    });
  }

  // ─── Read Methods (compliance role required) ─────────────────────────

  /**
   * Query audit logs (gym_owner / admin / compliance_officer only).
   * RLS enforces server-side; client-side check provides fast feedback.
   */
  async queryAuditLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    this.assertComplianceRole();

    let q = this.supabase.client
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (query.start_date) q = q.gte('timestamp', query.start_date);
    if (query.end_date) q = q.lte('timestamp', query.end_date);
    if (query.user_id) q = q.eq('user_id', query.user_id);
    if (query.resource_type) q = q.eq('resource_type', query.resource_type);
    if (query.action) q = q.eq('action', query.action);
    if (query.contains_phi !== undefined) q = q.eq('contains_phi', query.contains_phi);
    if (query.limit) q = q.limit(query.limit);
    if (query.offset) q = q.range(query.offset, query.offset + (query.limit ?? 50) - 1);

    const { data, error } = await q;

    if (error) {
      if (isDevMode()) console.error('[Audit] queryAuditLogs error:', error);
      throw error;
    }
    return (data ?? []) as AuditLogEntry[];
  }

  /**
   * Get PHI access summary (from Supabase view).
   */
  async getPhiAccessSummary(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<PhiAccessSummary[]> {
    this.assertComplianceRole();

    const { data, error } = await this.supabase.client
      .from('phi_access_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('access_date', startDate)
      .lte('access_date', endDate);

    if (error) {
      if (isDevMode()) console.error('[Audit] getPhiAccessSummary error:', error);
      throw error;
    }
    return (data ?? []) as PhiAccessSummary[];
  }

  /**
   * Get suspicious activity alerts (via RPC).
   */
  async getSuspiciousActivity(daysBack = 7): Promise<SuspiciousActivity[]> {
    this.assertComplianceRole();

    const { data, error } = await this.supabase.client
      .rpc('detect_suspicious_activity', {
        p_threshold_per_day: 100,
        p_days_back: daysBack,
      });

    if (error) {
      if (isDevMode()) console.error('[Audit] getSuspiciousActivity error:', error);
      throw error;
    }
    return (data ?? []) as SuspiciousActivity[];
  }

  /**
   * Get after-hours PHI access (from Supabase view).
   */
  async getAfterHoursAccess(
    startDate: string,
    endDate: string,
  ): Promise<AuditLogEntry[]> {
    this.assertComplianceRole();

    const { data, error } = await this.supabase.client
      .from('after_hours_phi_access')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate);

    if (error) {
      if (isDevMode()) console.error('[Audit] getAfterHoursAccess error:', error);
      throw error;
    }
    return (data ?? []) as AuditLogEntry[];
  }

  /**
   * Export audit logs for compliance audit (via RPC).
   * Returns structured data (caller converts to CSV/PDF).
   */
  async exportAuditLogs(
    startDate: string,
    endDate: string,
    containsPhi?: boolean,
  ): Promise<AuditLogEntry[]> {
    this.assertComplianceRole();

    const { data, error } = await this.supabase.client
      .rpc('export_audit_logs', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_contains_phi: containsPhi ?? null,
      });

    if (error) {
      if (isDevMode()) console.error('[Audit] exportAuditLogs error:', error);
      throw error;
    }
    return (data ?? []) as AuditLogEntry[];
  }

  // ─── Private Helpers ─────────────────────────────────────────────────

  /**
   * Write an audit entry with 3x retry.
   * Failed entries are queued and flushed on the next successful write.
   */
  private async writeWithRetry(entry: AuditLogEntry): Promise<void> {
    for (let attempt = 1; attempt <= AuditLogService.MAX_RETRIES; attempt++) {
      try {
        const { error } = await this.supabase.client
          .from('audit_logs')
          .insert(entry);

        if (error) throw error;

        // Success — also flush any queued entries
        this.flushQueue();
        return;
      } catch (err) {
        if (isDevMode()) {
          console.warn(`[Audit] Write attempt ${attempt}/${AuditLogService.MAX_RETRIES} failed:`, err);
        }
        if (attempt === AuditLogService.MAX_RETRIES) {
          // All retries exhausted — queue for later
          this.retryQueue.push(entry);
        }
      }
    }
  }

  /**
   * Flush queued entries (best-effort, non-blocking).
   */
  private async flushQueue(): Promise<void> {
    if (this.flushingQueue || this.retryQueue.length === 0) return;
    this.flushingQueue = true;

    const entries = [...this.retryQueue];
    this.retryQueue = [];

    for (const entry of entries) {
      try {
        const { error } = await this.supabase.client
          .from('audit_logs')
          .insert(entry);
        if (error) throw error;
      } catch {
        // Re-queue on failure (will be retried on next flush)
        this.retryQueue.push(entry);
      }
    }

    this.flushingQueue = false;
  }

  /**
   * Sanitize data change objects — store field names and types only, never raw PHI values.
   * Example: { weight: 185, notes: "felt good" } → { weight: "number", notes: "string" }
   */
  private sanitizeData(
    data: Record<string, unknown> | undefined,
  ): Record<string, string> | undefined {
    if (!data) return undefined;
    const sanitized: Record<string, string> = {};
    for (const key of Object.keys(data)) {
      sanitized[key] = typeof data[key];
    }
    return sanitized;
  }

  /**
   * Assert that the current user has a compliance-level role.
   * Throws immediately on the client; RLS enforces server-side.
   */
  private assertComplianceRole(): void {
    const profile = this.auth.profile();
    const allowedRoles = ['gym_owner', 'admin', 'compliance_officer'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw new Error('Audit log read access requires owner or compliance role');
    }
  }
}
