import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Database } from '@fitos/shared';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export interface TrainerPricing {
  id?: string;
  name: string;
  description?: string;
  amountCents: number;
  currency: string;
  interval: 'week' | 'month' | 'year';
  stripePriceId?: string;
  isActive: boolean;
}

export interface SubscriptionWithClient extends Subscription {
  client?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface SubscriptionWithTrainer extends Subscription {
  trainer?: {
    id: string;
    full_name: string;
    business_name?: string;
    avatar_url?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  // State
  private _subscriptions = signal<Subscription[]>([]);
  private _clientSubscription = signal<SubscriptionWithTrainer | null>(null);
  private _trainerPricing = signal<TrainerPricing[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Public signals
  readonly subscriptions = this._subscriptions.asReadonly();
  readonly clientSubscription = this._clientSubscription.asReadonly();
  readonly trainerPricing = this._trainerPricing.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly hasActiveSubscription = computed(() => {
    const sub = this._clientSubscription();
    return sub && (sub.status === 'active' || sub.status === 'trialing');
  });

  readonly activeSubscriberCount = computed(() => {
    return this._subscriptions().filter(
      s => s.status === 'active' || s.status === 'trialing'
    ).length;
  });

  readonly monthlyRevenue = computed(() => {
    return this._subscriptions()
      .filter(s => s.status === 'active')
      .reduce((total, sub) => {
        // Normalize to monthly
        let monthlyAmount = sub.amount_cents;
        if (sub.interval === 'week') monthlyAmount *= 4;
        if (sub.interval === 'year') monthlyAmount /= 12;
        return total + monthlyAmount;
      }, 0);
  });

  /**
   * Load trainer's subscriptions (all clients who subscribe to this trainer)
   */
  async loadTrainerSubscriptions(): Promise<void> {
    const trainerId = this.authService.user()?.id;
    if (!trainerId) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select(`
          *,
          client:client_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this._subscriptions.set(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      this._error.set((error as Error).message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Load client's subscription (the trainer they're subscribed to)
   */
  async loadClientSubscription(): Promise<void> {
    const clientId = this.authService.user()?.id;
    if (!clientId) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select(`
          *,
          trainer:trainer_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('client_id', clientId)
        .in('status', ['active', 'trialing', 'past_due'])
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

      this._clientSubscription.set(data as SubscriptionWithTrainer || null);
    } catch (error) {
      console.error('Error loading client subscription:', error);
      this._error.set((error as Error).message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a checkout session for client to subscribe to a trainer
   */
  async createCheckoutSession(
    trainerId: string,
    priceId: string
  ): Promise<{ url: string } | { error: string }> {
    const clientId = this.authService.user()?.id;
    if (!clientId) {
      return { error: 'Not authenticated' };
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke('stripe-create-checkout', {
        body: {
          clientId,
          trainerId,
          priceId,
          successUrl: `${window.location.origin}/tabs/settings?subscription_success=true`,
          cancelUrl: `${window.location.origin}/tabs/settings?subscription_canceled=true`,
        },
      });

      if (error) throw error;

      return { url: data.url };
    } catch (error) {
      const message = (error as Error).message;
      this._error.set(message);
      return { error: message };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a portal session for client to manage their subscription
   */
  async createPortalSession(): Promise<{ url: string } | { error: string }> {
    const clientId = this.authService.user()?.id;
    if (!clientId) {
      return { error: 'Not authenticated' };
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke('stripe-customer-portal', {
        body: {
          clientId,
          returnUrl: `${window.location.origin}/tabs/settings`,
        },
      });

      if (error) throw error;

      return { url: data.url };
    } catch (error) {
      const message = (error as Error).message;
      this._error.set(message);
      return { error: message };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get trainer's pricing configuration
   */
  async loadTrainerPricing(trainerId?: string): Promise<void> {
    const id = trainerId || this.authService.user()?.id;
    if (!id) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke('stripe-get-prices', {
        body: { trainerId: id },
      });

      if (error) throw error;

      this._trainerPricing.set(data.prices || []);
    } catch (error) {
      console.error('Error loading pricing:', error);
      this._error.set((error as Error).message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create or update trainer pricing
   */
  async savePricing(pricing: TrainerPricing): Promise<{ error: string | null }> {
    const trainerId = this.authService.user()?.id;
    if (!trainerId) {
      return { error: 'Not authenticated' };
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const { error } = await this.supabase.functions.invoke('stripe-create-price', {
        body: {
          trainerId,
          ...pricing,
        },
      });

      if (error) throw error;

      // Reload pricing
      await this.loadTrainerPricing();

      return { error: null };
    } catch (error) {
      const message = (error as Error).message;
      this._error.set(message);
      return { error: message };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Cancel a subscription (trainer canceling client, or client canceling themselves)
   */
  async cancelSubscription(subscriptionId: string): Promise<{ error: string | null }> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const { error } = await this.supabase.functions.invoke('stripe-cancel-subscription', {
        body: { subscriptionId },
      });

      if (error) throw error;

      // Reload subscriptions
      if (this.authService.isTrainer()) {
        await this.loadTrainerSubscriptions();
      } else {
        await this.loadClientSubscription();
      }

      return { error: null };
    } catch (error) {
      const message = (error as Error).message;
      this._error.set(message);
      return { error: message };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Format price for display
   */
  formatPrice(amountCents: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  }

  /**
   * Format interval for display
   */
  formatInterval(interval: string): string {
    switch (interval) {
      case 'week': return 'weekly';
      case 'month': return 'monthly';
      case 'year': return 'yearly';
      default: return interval;
    }
  }
}
