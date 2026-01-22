import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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
 */

export interface AuditLogEntry {
  id?: string;
  timestamp?: string;

  // Actor
  user_id?: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
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

  // Data changes
  before_data?: any;
  after_data?: any;

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
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.aiBackendUrl}/audit-logs`;

  // State signals
  lastLoggedEntry = signal<AuditLogEntry | null>(null);

  /**
   * Log an action that involves PHI access
   */
  logPhiAccess(entry: AuditLogEntry): Observable<void> {
    // Auto-populate browser context
    const enrichedEntry: AuditLogEntry = {
      ...entry,
      user_agent: navigator.userAgent,
      session_id: this.getSessionId(),
    };

    return this.http.post<void>(`${this.baseUrl}/log`, enrichedEntry).pipe(
      tap(() => {
        this.lastLoggedEntry.set(enrichedEntry);
        console.debug('[HIPAA Audit] Logged PHI access:', enrichedEntry.resource_type, enrichedEntry.action);
      })
    );
  }

  /**
   * Log a client profile view (PHI - demographics)
   */
  logClientProfileView(clientId: string, reason: AccessReason = 'treatment'): Observable<void> {
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
  logHealthDataAccess(
    dataType: string,
    dataId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment'
  ): Observable<void> {
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
  logProgressPhotoAccess(
    photoId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment'
  ): Observable<void> {
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
  logWorkoutAccess(
    workoutId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment'
  ): Observable<void> {
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
  logNutritionAccess(
    nutritionId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    reason: AccessReason = 'treatment'
  ): Observable<void> {
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
   * Log data export (HIPAA requires tracking of all exports)
   */
  logDataExport(
    exportType: string,
    resourceIds: string[],
    containsPhi: boolean,
    reason: AccessReason = 'operations'
  ): Observable<void> {
    return this.logPhiAccess({
      action: 'export',
      resource_type: exportType,
      resource_id: resourceIds.join(','),
      contains_phi: containsPhi,
      phi_categories: containsPhi ? ['demographics', 'health_metrics'] : undefined,
      access_reason: reason,
    });
  }

  /**
   * Log data sharing (sending PHI to third party)
   */
  logDataSharing(
    resourceType: string,
    resourceId: string,
    recipient: string,
    reason: AccessReason = 'treatment'
  ): Observable<void> {
    return this.logPhiAccess({
      action: 'share',
      resource_type: resourceType,
      resource_id: resourceId,
      contains_phi: true,
      access_reason: reason,
      after_data: { shared_with: recipient },
    });
  }

  /**
   * Query audit logs (admin/compliance officer only)
   */
  queryAuditLogs(query: AuditLogQuery): Observable<AuditLogEntry[]> {
    return this.http.post<AuditLogEntry[]>(`${this.baseUrl}/query`, query);
  }

  /**
   * Get PHI access summary for a user
   */
  getPhiAccessSummary(
    userId: string,
    startDate: string,
    endDate: string
  ): Observable<PhiAccessSummary[]> {
    return this.http.get<PhiAccessSummary[]>(`${this.baseUrl}/phi-summary`, {
      params: { user_id: userId, start_date: startDate, end_date: endDate },
    });
  }

  /**
   * Get suspicious activity alerts
   */
  getSuspiciousActivity(daysBack: number = 7): Observable<SuspiciousActivity[]> {
    return this.http.get<SuspiciousActivity[]>(`${this.baseUrl}/suspicious-activity`, {
      params: { days_back: daysBack.toString() },
    });
  }

  /**
   * Get after-hours PHI access (for security monitoring)
   */
  getAfterHoursAccess(startDate: string, endDate: string): Observable<AuditLogEntry[]> {
    return this.http.get<AuditLogEntry[]>(`${this.baseUrl}/after-hours`, {
      params: { start_date: startDate, end_date: endDate },
    });
  }

  /**
   * Export audit logs for compliance audit
   */
  exportAuditLogs(
    startDate: string,
    endDate: string,
    containsPhi?: boolean
  ): Observable<Blob> {
    return this.http.post(
      `${this.baseUrl}/export`,
      { start_date: startDate, end_date: endDate, contains_phi: containsPhi },
      { responseType: 'blob' }
    );
  }

  /**
   * Helper: Get current session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = this.generateUuid();
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Helper: Generate UUID
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
