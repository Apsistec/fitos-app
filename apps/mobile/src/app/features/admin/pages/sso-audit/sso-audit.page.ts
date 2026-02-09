/**
 * SSO Audit Log Viewer
 *
 * Displays comprehensive audit trail for SSO events.
 * Sprint 41: Enterprise Single Sign-On
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface AuditEvent {
  id: string;
  organizationId: string;
  userId?: string;
  ssoConfigId?: string;
  eventType: string;
  eventStatus: string;
  eventMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  errorCode?: string;
  errorDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

@Component({
  selector: 'app-sso-audit',
  templateUrl: './sso-audit.page.html',
  styleUrls: ['./sso-audit.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class SSOAuditPage implements OnInit {
  private http = inject(HttpClient);

  // State
  events = signal<AuditEvent[]>([]);
  loading = signal(true);
  selectedEventType = signal<string>('all');
  selectedStatus = signal<string>('all');
  searchTerm = signal<string>('');

  // Computed
  filteredEvents = computed(() => {
    let filtered = this.events();

    // Filter by event type
    if (this.selectedEventType() !== 'all') {
      filtered = filtered.filter((e) => e.eventType === this.selectedEventType());
    }

    // Filter by status
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter((e) => e.eventStatus === this.selectedStatus());
    }

    // Filter by search term
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.eventMessage?.toLowerCase().includes(search) ||
          e.userId?.toLowerCase().includes(search) ||
          e.ipAddress?.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  eventCounts = computed(() => {
    const events = this.events();
    return {
      total: events.length,
      success: events.filter((e) => e.eventStatus === 'success').length,
      failure: events.filter((e) => e.eventStatus === 'failure').length,
      pending: events.filter((e) => e.eventStatus === 'pending').length,
    };
  });

  ngOnInit() {
    this.loadAuditLog();
  }

  /**
   * Load audit log events
   */
  async loadAuditLog() {
    this.loading.set(true);
    try {
      const organizationId = 'org_123'; // TODO: Get from auth service

      const events = await this.http
        .get<AuditEvent[]>(`${environment.apiUrl}/sso/audit/${organizationId}`)
        .toPromise();

      this.events.set(events || []);
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Refresh audit log
   */
  async refresh(event?: CustomEvent) {
    await this.loadAuditLog();
    if (event) {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  /**
   * Export audit log
   */
  async exportLog() {
    const events = this.filteredEvents();
    const csv = this.convertToCSV(events);

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sso-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Convert events to CSV
   */
  private convertToCSV(events: AuditEvent[]): string {
    const headers = [
      'Timestamp',
      'Event Type',
      'Status',
      'User ID',
      'IP Address',
      'Message',
      'Error Code',
    ];

    const rows = events.map((e) => [
      e.createdAt,
      e.eventType,
      e.eventStatus,
      e.userId || '',
      e.ipAddress || '',
      e.eventMessage || '',
      e.errorCode || '',
    ]);

    const csvRows = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ];

    return csvRows.join('\n');
  }

  /**
   * Get event icon
   */
  getEventIcon(eventType: string): string {
    const icons: Record<string, string> = {
      login_initiated: 'log-in-outline',
      login_success: 'checkmark-circle-outline',
      login_failure: 'close-circle-outline',
      logout: 'log-out-outline',
      jit_provision: 'person-add-outline',
      role_mapped: 'shield-checkmark-outline',
      session_expired: 'time-outline',
      session_revoked: 'ban-outline',
      config_created: 'create-outline',
      config_updated: 'pencil-outline',
      config_deleted: 'trash-outline',
      assertion_validated: 'checkbox-outline',
      token_exchanged: 'swap-horizontal-outline',
      error: 'alert-circle-outline',
    };

    return icons[eventType] || 'information-circle-outline';
  }

  /**
   * Get event color
   */
  getEventColor(eventStatus: string): string {
    const colors: Record<string, string> = {
      success: 'success',
      failure: 'danger',
      pending: 'warning',
    };

    return colors[eventStatus] || 'medium';
  }

  /**
   * Get event type display name
   */
  getEventTypeDisplay(eventType: string): string {
    const displayNames: Record<string, string> = {
      login_initiated: 'Login Initiated',
      login_success: 'Login Success',
      login_failure: 'Login Failure',
      logout: 'Logout',
      jit_provision: 'User Provisioned',
      role_mapped: 'Role Mapped',
      session_expired: 'Session Expired',
      session_revoked: 'Session Revoked',
      config_created: 'Config Created',
      config_updated: 'Config Updated',
      config_deleted: 'Config Deleted',
      assertion_validated: 'Assertion Validated',
      token_exchanged: 'Token Exchanged',
      error: 'Error',
    };

    return displayNames[eventType] || eventType;
  }

  /**
   * Handle search
   */
  handleSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value || '');
  }
}
