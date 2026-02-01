import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Database } from '@fitos/shared';

type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ClientWithProfile extends ClientProfile {
  profile: Profile;
  // Convenience properties for commonly accessed profile fields
  full_name?: string;
  email?: string;
  avatar_url?: string;
  role?: Database['public']['Enums']['user_role'];
}

export interface ClientStats {
  total: number;
  active: number;
  activeToday: number;
}

export interface ClientNeedingAttention {
  client: ClientWithProfile;
  reason: 'missed_workout' | 'inactive' | 'low_adherence';
  details: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  // State
  private clientsSignal = signal<ClientWithProfile[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed values
  clients = computed(() => this.clientsSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // Active clients only (subscription active)
  activeClients = computed(() =>
    this.clientsSignal().filter(c => c.subscription_status === 'active')
  );

  /**
   * Load all clients for the current trainer
   */
  async loadClients(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('client_profiles')
        .select(`
          *,
          profile:profiles!client_profiles_id_fkey(*)
        `)
        .eq('trainer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map data to include convenience properties
      const clients = (data || []).map(client => ({
        ...client,
        full_name: client.profile?.full_name,
        email: client.profile?.email,
        avatar_url: client.profile?.avatar_url,
        role: client.profile?.role,
      })) as ClientWithProfile[];

      this.clientsSignal.set(clients);
    } catch (error) {
      console.error('Error loading clients:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load clients');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<ClientWithProfile | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('client_profiles')
        .select(`
          *,
          profile:profiles!client_profiles_id_fkey(*)
        `)
        .eq('id', clientId)
        .single();

      if (error) throw error;

      // Map data to include convenience properties
      return {
        ...data,
        full_name: data.profile?.full_name,
        email: data.profile?.email,
        avatar_url: data.profile?.avatar_url,
        role: data.profile?.role,
      } as ClientWithProfile;
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
    }
  }

  /**
   * Search clients by name
   */
  searchClients(query: string): ClientWithProfile[] {
    if (!query.trim()) {
      return this.clients();
    }

    const searchLower = query.toLowerCase();
    return this.clients().filter(client => {
      const fullName = (client.profile?.full_name || '').toLowerCase();
      const email = client.profile?.email?.toLowerCase() || '';

      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }

  /**
   * Reset state
   */
  reset(): void {
    this.clientsSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }

  /**
   * Get client statistics for trainer dashboard
   * Returns total clients, active clients, and clients active today
   */
  async getClientStats(trainerId: string): Promise<ClientStats> {
    try {
      // Get all clients count
      const { count: totalCount, error: totalError } = await this.supabase.client
        .from('client_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainerId);

      if (totalError) throw totalError;

      // Get active clients count (subscription_status = 'active')
      const { count: activeCount, error: activeError } = await this.supabase.client
        .from('client_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .eq('subscription_status', 'active');

      if (activeError) throw activeError;

      // Get clients active today (have workout today or completed today)
      const today = new Date().toISOString().split('T')[0];
      const { data: todayWorkouts, error: todayError } = await this.supabase.client
        .from('workouts')
        .select('client_id')
        .eq('trainer_id', trainerId)
        .or(`scheduled_date.eq.${today},completed_at.gte.${today}`);

      if (todayError) throw todayError;

      // Count unique clients
      const activeToday = new Set(todayWorkouts?.map(w => w.client_id) || []).size;

      return {
        total: totalCount || 0,
        active: activeCount || 0,
        activeToday,
      };
    } catch (error) {
      console.error('Error fetching client stats:', error);
      return { total: 0, active: 0, activeToday: 0 };
    }
  }

  /**
   * Get clients needing attention for trainer dashboard
   * Returns clients with missed workouts, inactive streaks, or low adherence
   */
  async getClientsNeedingAttention(trainerId: string, limit = 5): Promise<ClientNeedingAttention[]> {
    try {
      const clientsNeedingAttention: ClientNeedingAttention[] = [];

      // Get all active clients
      const { data: clients, error: clientsError } = await this.supabase.client
        .from('client_profiles')
        .select(`
          *,
          profile:profiles!client_profiles_id_fkey(*)
        `)
        .eq('trainer_id', trainerId)
        .eq('subscription_status', 'active');

      if (clientsError) throw clientsError;
      if (!clients || clients.length === 0) return [];

      // Check each client for issues
      for (const client of clients as ClientWithProfile[]) {
        // Check for missed workouts (scheduled in past, status still 'scheduled')
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const { data: missedWorkouts, error: missedError } = await this.supabase.client
          .from('workouts')
          .select('scheduled_date')
          .eq('client_id', client.id)
          .eq('status', 'scheduled')
          .lt('scheduled_date', yesterdayStr)
          .limit(1);

        if (!missedError && missedWorkouts && missedWorkouts.length > 0) {
          clientsNeedingAttention.push({
            client,
            reason: 'missed_workout',
            details: `Missed workout on ${missedWorkouts[0].scheduled_date}`,
          });
          continue;
        }

        // Check for inactivity (no completed workouts in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const { count: recentWorkouts, error: recentError } = await this.supabase.client
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .eq('status', 'completed')
          .gte('completed_at', sevenDaysAgoStr);

        if (!recentError && recentWorkouts === 0) {
          clientsNeedingAttention.push({
            client,
            reason: 'inactive',
            details: 'No workouts completed in 7 days',
          });
          continue;
        }

        // If we have enough, stop checking
        if (clientsNeedingAttention.length >= limit) {
          break;
        }
      }

      return clientsNeedingAttention.slice(0, limit);
    } catch (error) {
      console.error('Error fetching clients needing attention:', error);
      return [];
    }
  }
}
