import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Database } from '@fitos/shared';

type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ClientWithProfile extends ClientProfile {
  profile: Profile;
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

  // Active clients only (subscription active)
  activeClients = computed(() =>
    this.clientsSignal().filter(c => c.subscription_status === 'active')
  );

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

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
          profile:profiles!client_profiles_user_id_fkey(*)
        `)
        .eq('trainer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.clientsSignal.set(data as any || []);
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
          profile:profiles!client_profiles_user_id_fkey(*)
        `)
        .eq('user_id', clientId)
        .single();

      if (error) throw error;

      return data as any;
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
}
