import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Database } from '@fitos/shared';

type WearableConnection = Database['public']['Tables']['wearable_connections']['Row'];
type WearableDailyData = Database['public']['Tables']['wearable_daily_data']['Row'];

export interface TerraProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const TERRA_PROVIDERS: TerraProvider[] = [
  { id: 'GARMIN', name: 'Garmin', icon: 'watch-outline', color: 'primary' },
  { id: 'FITBIT', name: 'Fitbit', icon: 'fitness-outline', color: 'tertiary' },
  { id: 'OURA', name: 'Oura Ring', icon: 'ellipse-outline', color: 'dark' },
  { id: 'APPLE', name: 'Apple Health', icon: 'heart-outline', color: 'danger' },
  { id: 'GOOGLE_FIT', name: 'Google Fit', icon: 'fitness-outline', color: 'success' },
  { id: 'WHOOP', name: 'Whoop', icon: 'pulse-outline', color: 'warning' },
];

@Injectable({
  providedIn: 'root'
})
export class TerraService {
  private supabase = inject(SupabaseService);

  connections = signal<WearableConnection[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  /**
   * Get all wearable connections for the current user
   */
  async getConnections(): Promise<WearableConnection[]> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('wearable_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.connections.set(data || []);
      return data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch connections';
      this.error.set(message);
      console.error('Error fetching wearable connections:', err);
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Initiate Terra authentication flow for a provider
   * Returns the authentication URL to redirect the user to
   */
  async connectDevice(provider: string): Promise<string> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'terra-authenticate',
        {
          body: { provider }
        }
      );

      if (error) throw error;

      if (!data?.auth_url) {
        throw new Error('No authentication URL returned');
      }

      return data.auth_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect device';
      this.error.set(message);
      console.error('Error connecting device:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Disconnect a wearable device
   */
  async disconnectDevice(connectionId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.client.functions.invoke(
        'terra-deauthenticate',
        {
          body: { connection_id: connectionId }
        }
      );

      if (error) throw error;

      // Remove from local state
      this.connections.update(conns =>
        conns.filter(c => c.id !== connectionId)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect device';
      this.error.set(message);
      console.error('Error disconnecting device:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get wearable data for a date range
   */
  async getDailyData(
    startDate: string,
    endDate: string,
    clientId?: string
  ): Promise<WearableDailyData[]> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      let query = this.supabase.client
        .from('wearable_daily_data')
        .select('*')
        .gte('data_date', startDate)
        .lte('data_date', endDate)
        .order('data_date', { ascending: false });

      // If clientId provided (trainer viewing client data), filter by it
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch wearable data';
      this.error.set(message);
      console.error('Error fetching wearable data:', err);
      return [];
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get latest wearable data (most recent day)
   */
  async getLatestData(clientId?: string): Promise<WearableDailyData | null> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      let query = this.supabase.client
        .from('wearable_daily_data')
        .select('*')
        .order('data_date', { ascending: false })
        .limit(1);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.[0] || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch latest data';
      this.error.set(message);
      console.error('Error fetching latest wearable data:', err);
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Manually trigger a sync for all connected devices
   */
  async syncData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.client.functions.invoke(
        'terra-sync',
        { body: {} }
      );

      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync data';
      this.error.set(message);
      console.error('Error syncing wearable data:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get provider info by ID
   */
  getProviderInfo(providerId: string): TerraProvider | undefined {
    return TERRA_PROVIDERS.find(p => p.id === providerId);
  }
}
