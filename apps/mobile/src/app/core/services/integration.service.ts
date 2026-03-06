import { Injectable, inject, signal, computed, isDevMode } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * Integration types
 */
export type IntegrationCategory = 'nutrition' | 'calendar' | 'wearable' | 'communication' | 'payment' | 'analytics';
export type IntegrationStatus = 'pending' | 'active' | 'error' | 'disconnected' | 'expired';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
export type SyncType = 'full' | 'incremental' | 'manual' | 'webhook';
export type SyncDirection = 'import' | 'export' | 'bidirectional';
export type SyncStatus = 'success' | 'partial' | 'failed';

export interface Integration {
  id: string;
  integration_key: string;
  name: string;
  description?: string;
  icon_url?: string;
  category: IntegrationCategory;
  provider_name: string;
  provider_url?: string;
  oauth_enabled: boolean;
  oauth_provider?: string;
  oauth_scopes?: string[];
  api_base_url?: string;
  api_version?: string;
  is_active: boolean;
  requires_approval: boolean;
  available_for_roles: string[];
  setup_instructions?: string;
  support_url?: string;
  pricing_info?: string;
  created_at: string;
  updated_at: string;
}

/**
 * UserIntegration — client-side view.
 * SECURITY: access_token and refresh_token are NEVER returned to the client.
 * Token exchange and storage is handled server-side via Edge Functions.
 * RLS policy on user_integrations should exclude token columns from SELECT.
 */
export interface UserIntegration {
  id: string;
  user_id: string;
  integration_id: string;
  status: IntegrationStatus;
  // access_token / refresh_token intentionally excluded — server-side only
  token_expires_at?: string;
  config: Record<string, unknown>;
  auto_sync: boolean;
  sync_frequency: SyncFrequency;
  last_sync_at?: string;
  next_sync_at?: string;
  error_count: number;
  last_error?: string;
  last_error_at?: string;
  connected_at: string;
  disconnected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSyncLog {
  id: string;
  user_integration_id: string;
  sync_type: SyncType;
  direction: SyncDirection;
  status: SyncStatus;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  duration_ms?: number;
  error_message?: string;
  error_details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
}

export interface IntegrationDataMapping {
  id: string;
  user_integration_id: string;
  external_id: string;
  external_type: string;
  internal_id: string;
  internal_type: string;
  last_synced_at: string;
  external_updated_at?: string;
  created_at: string;
}

export interface IntegrationSummary {
  total_integrations: number;
  active_integrations: number;
  error_integrations: number;
  pending_integrations: number;
}

export interface ConnectIntegrationInput {
  integration_id: string;
  config?: Record<string, unknown>;
  sync_frequency?: SyncFrequency;
}

/**
 * IntegrationService - Manage third-party integrations
 *
 * Features:
 * - Browse available integrations (marketplace)
 * - Connect/disconnect integrations (OAuth flow)
 * - Manage sync settings
 * - Track sync history
 * - Handle OAuth token refresh
 * - Data mapping (external ID → internal ID)
 *
 * Sprint 24: Integration Marketplace
 */
@Injectable({
  providedIn: 'root',
})
export class IntegrationService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  /** Derive user ID from authenticated session (never from caller) */
  private get userId(): string {
    const id = this.auth.user()?.id;
    if (!id) throw new Error('Not authenticated');
    return id;
  }

  // State
  availableIntegrations = signal<Integration[]>([]);
  userIntegrations = signal<UserIntegration[]>([]);
  syncLogs = signal<IntegrationSyncLog[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  activeIntegrations = computed(() =>
    this.userIntegrations().filter((i) => i.status === 'active')
  );

  errorIntegrations = computed(() =>
    this.userIntegrations().filter((i) => i.status === 'error')
  );

  integrationsByCategory = computed(() => {
    const integrations = this.availableIntegrations();
    const grouped: Record<IntegrationCategory, Integration[]> = {
      nutrition: [],
      calendar: [],
      wearable: [],
      communication: [],
      payment: [],
      analytics: [],
    };

    integrations.forEach((integration) => {
      grouped[integration.category].push(integration);
    });

    return grouped;
  });

  /**
   * Get all available integrations
   */
  async getAvailableIntegrations(): Promise<Integration[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('integrations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      this.availableIntegrations.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load integrations';
      this.error.set(errorMessage);
      if (isDevMode()) console.error('Error getting integrations:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get user's connected integrations.
   * Identity derived from authenticated session — no userId parameter.
   * Token columns excluded from select to prevent client-side exposure.
   */
  async getUserIntegrations(): Promise<UserIntegration[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Exclude access_token and refresh_token — select only safe columns
      const { data, error } = await this.supabase.client
        .from('user_integrations')
        .select('id,user_id,integration_id,status,token_expires_at,config,auto_sync,sync_frequency,last_sync_at,next_sync_at,error_count,last_error,last_error_at,connected_at,disconnected_at,created_at,updated_at')
        .eq('user_id', this.userId)
        .order('connected_at', { ascending: false });

      if (error) throw error;

      this.userIntegrations.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load user integrations';
      this.error.set(errorMessage);
      if (isDevMode()) console.error('Error getting user integrations:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get integration summary for user
   */
  async getIntegrationSummary(): Promise<IntegrationSummary | null> {
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_user_integration_summary', {
          p_user_id: this.userId,
        });

      if (error) throw error;

      return data?.[0] || null;
    } catch (err) {
      if (isDevMode()) console.error('Error getting integration summary:', err);
      return null;
    }
  }

  /**
   * Connect a new integration.
   * Identity derived from authenticated session — no userId parameter.
   * Note: This initiates OAuth flow — actual token exchange happens server-side.
   */
  async connectIntegration(
    input: ConnectIntegrationInput
  ): Promise<UserIntegration | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('user_integrations')
        .insert({
          user_id: this.userId,
          integration_id: input.integration_id,
          status: 'pending',
          config: input.config || {},
          sync_frequency: input.sync_frequency || 'daily',
        })
        .select('id,user_id,integration_id,status,token_expires_at,config,auto_sync,sync_frequency,last_sync_at,next_sync_at,error_count,last_error,last_error_at,connected_at,disconnected_at,created_at,updated_at')
        .single();

      if (error) throw error;

      // Update local state
      const current = this.userIntegrations();
      this.userIntegrations.set([data, ...current]);

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to connect integration';
      this.error.set(errorMessage);
      if (isDevMode()) console.error('Error connecting integration:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  // updateIntegrationTokens() REMOVED — Sprint 81 security hardening.
  // Token exchange and storage is handled exclusively server-side via Edge Functions.
  // The client NEVER receives or writes access_token / refresh_token.

  /**
   * Disconnect integration.
   * Ownership enforced: only the authenticated user's integrations can be updated.
   * Token nulling handled server-side — client only updates status.
   */
  async disconnectIntegration(userIntegrationId: string): Promise<boolean> {
    try {
      // Client sets status only — token nulling handled server-side by Edge Function / trigger.
      // Ownership enforced: must match both id AND user_id.
      const { error } = await this.supabase.client
        .from('user_integrations')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString(),
        })
        .eq('id', userIntegrationId)
        .eq('user_id', this.userId);

      if (error) throw error;

      // Update local state
      const current = this.userIntegrations();
      const updated = current.map((i) =>
        i.id === userIntegrationId
          ? { ...i, status: 'disconnected' as IntegrationStatus }
          : i
      );
      this.userIntegrations.set(updated);

      return true;
    } catch (err) {
      if (isDevMode()) console.error('Error disconnecting integration:', err);
      return false;
    }
  }

  /**
   * Update sync settings
   */
  async updateSyncSettings(
    userIntegrationId: string,
    autoSync: boolean,
    frequency: SyncFrequency
  ): Promise<boolean> {
    try {
      // Schedule next sync
      const { error: scheduleError } = await this.supabase.client
        .rpc('schedule_next_sync', {
          p_user_integration_id: userIntegrationId,
          p_frequency: frequency,
        });

      if (scheduleError) throw scheduleError;

      // Ownership enforced: must match both id AND user_id
      const { error } = await this.supabase.client
        .from('user_integrations')
        .update({
          auto_sync: autoSync,
          sync_frequency: frequency,
        })
        .eq('id', userIntegrationId)
        .eq('user_id', this.userId);

      if (error) throw error;

      // Update local state
      const current = this.userIntegrations();
      const updated = current.map((i) =>
        i.id === userIntegrationId
          ? { ...i, auto_sync: autoSync, sync_frequency: frequency }
          : i
      );
      this.userIntegrations.set(updated);

      return true;
    } catch (err) {
      if (isDevMode()) console.error('Error updating sync settings:', err);
      return false;
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(userIntegrationId: string): Promise<boolean> {
    try {
      // This would typically call a Supabase Edge Function
      // For now, just update the next_sync_at to trigger it
      // Ownership enforced: must match both id AND user_id
      const { error } = await this.supabase.client
        .from('user_integrations')
        .update({
          next_sync_at: new Date().toISOString(),
        })
        .eq('id', userIntegrationId)
        .eq('user_id', this.userId);

      if (error) throw error;

      return true;
    } catch (err) {
      if (isDevMode()) console.error('Error triggering sync:', err);
      return false;
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(
    userIntegrationId: string,
    limit = 20
  ): Promise<IntegrationSyncLog[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('integration_sync_log')
        .select('*')
        .eq('user_integration_id', userIntegrationId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      this.syncLogs.set(data || []);
      return data || [];
    } catch (err) {
      if (isDevMode()) console.error('Error getting sync history:', err);
      return [];
    }
  }

  /**
   * Check if token needs refresh
   */
  async shouldRefreshToken(userIntegrationId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .rpc('should_refresh_token', {
          p_user_integration_id: userIntegrationId,
        });

      if (error) throw error;

      return data || false;
    } catch (err) {
      if (isDevMode()) console.error('Error checking token refresh:', err);
      return false;
    }
  }

  /**
   * Get data mapping (external ID → internal ID)
   */
  async getDataMapping(
    userIntegrationId: string,
    externalId: string,
    externalType: string
  ): Promise<IntegrationDataMapping | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('integration_data_mappings')
        .select('*')
        .eq('user_integration_id', userIntegrationId)
        .eq('external_id', externalId)
        .eq('external_type', externalType)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (err) {
      if (isDevMode()) console.error('Error getting data mapping:', err);
      return null;
    }
  }

  /**
   * Create data mapping
   */
  async createDataMapping(
    userIntegrationId: string,
    externalId: string,
    externalType: string,
    internalId: string,
    internalType: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('integration_data_mappings')
        .upsert({
          user_integration_id: userIntegrationId,
          external_id: externalId,
          external_type: externalType,
          internal_id: internalId,
          internal_type: internalType,
        });

      if (error) throw error;

      return true;
    } catch (err) {
      if (isDevMode()) console.error('Error creating data mapping:', err);
      return false;
    }
  }

  /**
   * Get integration by key
   */
  getIntegrationByKey(key: string): Integration | null {
    return this.availableIntegrations().find((i) => i.integration_key === key) || null;
  }

  /**
   * Get user integration by key
   */
  getUserIntegrationByKey(integrationKey: string): UserIntegration | null {
    const integration = this.getIntegrationByKey(integrationKey);
    if (!integration) return null;

    return (
      this.userIntegrations().find((ui) => ui.integration_id === integration.id) || null
    );
  }

  /**
   * Check if integration is connected
   */
  isIntegrationConnected(integrationKey: string): boolean {
    const userIntegration = this.getUserIntegrationByKey(integrationKey);
    return userIntegration?.status === 'active';
  }

  /**
   * Get category icon
   */
  getCategoryIcon(category: IntegrationCategory): string {
    switch (category) {
      case 'nutrition':
        return 'restaurant-outline';
      case 'calendar':
        return 'calendar-outline';
      case 'wearable':
        return 'watch-outline';
      case 'communication':
        return 'chatbubbles-outline';
      case 'payment':
        return 'card-outline';
      case 'analytics':
        return 'analytics-outline';
      default:
        return 'extension-puzzle-outline';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: IntegrationStatus): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'error':
        return 'danger';
      case 'disconnected':
        return 'medium';
      case 'expired':
        return 'warning';
      default:
        return 'medium';
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
