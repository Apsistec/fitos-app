import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

export interface StripeConnectStatus {
  isConnected: boolean;
  accountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  // State signals
  private _connectStatus = signal<StripeConnectStatus | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Public computed
  readonly connectStatus = this._connectStatus.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isConnected = computed(() => this._connectStatus()?.isConnected ?? false);
  readonly requiresAction = computed(() => this._connectStatus()?.requiresAction ?? false);

  /**
   * Load the trainer's Stripe Connect status from the database
   */
  async loadConnectStatus(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('trainer_profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data?.stripe_account_id) {
        // Trainer has connected, check status via Edge Function
        const status = await this.fetchAccountStatus(data.stripe_account_id);
        this._connectStatus.set(status);
      } else {
        // Not connected
        this._connectStatus.set({
          isConnected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          requiresAction: false,
        });
      }
    } catch (error) {
      console.error('Error loading Stripe status:', error);
      this._error.set((error as Error).message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Fetch account status from Stripe via Edge Function
   */
  private async fetchAccountStatus(accountId: string): Promise<StripeConnectStatus> {
    const { data, error } = await this.supabase.functions.invoke('stripe-account-status', {
      body: { accountId },
    });

    if (error) {
      console.error('Error fetching account status:', error);
      // Return basic status from database if Edge Function fails
      return {
        isConnected: true,
        accountId,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requiresAction: true,
      };
    }

    return data as StripeConnectStatus;
  }

  /**
   * Create a Stripe Connect account link for onboarding
   * Opens in a new window for the trainer to complete setup
   */
  async createConnectAccountLink(): Promise<{ url: string } | { error: string }> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return { error: 'Not authenticated' };
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke('stripe-connect-onboarding', {
        body: {
          userId,
          returnUrl: `${window.location.origin}/tabs/settings`,
          refreshUrl: `${window.location.origin}/tabs/settings?stripe_refresh=true`,
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
   * Create a login link for existing connected accounts
   * Allows trainers to access their Stripe dashboard
   */
  async createDashboardLink(): Promise<{ url: string } | { error: string }> {
    const accountId = this._connectStatus()?.accountId;
    if (!accountId) {
      return { error: 'No Stripe account connected' };
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke('stripe-dashboard-link', {
        body: { accountId },
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
   * Disconnect Stripe account (soft disconnect - keeps account but removes from FitOS)
   */
  async disconnectAccount(): Promise<{ error: string | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return { error: 'Not authenticated' };
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const { error } = await this.supabase
        .from('trainer_profiles')
        .update({
          stripe_account_id: null,
          stripe_onboarding_complete: false,
        })
        .eq('id', userId);

      if (error) throw error;

      this._connectStatus.set({
        isConnected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requiresAction: false,
      });

      return { error: null };
    } catch (error) {
      const message = (error as Error).message;
      this._error.set(message);
      return { error: message };
    } finally {
      this._loading.set(false);
    }
  }
}
