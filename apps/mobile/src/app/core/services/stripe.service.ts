import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '@env/environment';

export interface StripeConnectStatus {
  isConnected: boolean;
  accountId?: string;
  stripeAccountId?: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  onboardingCompletedAt?: string | null;
  accountType?: 'express' | 'standard' | 'custom';
}

export interface StripePayout {
  id: string;
  stripePayoutId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled';
  arrivalDate: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
}

export interface StripeTransfer {
  id: string;
  stripeTransferId: string;
  amountCents: number;
  currency: string;
  description: string | null;
  trainerId: string | null;
  facilityId: string | null;
  commissionPercent: number | null;
  createdAt: string;
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
        .from('stripe_connect_accounts')
        .select('id, stripe_account_id, account_type, charges_enabled, payouts_enabled, details_submitted, onboarding_completed_at')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      if (data) {
        // User has a Stripe Connect account
        const requiresAction = !data.onboarding_completed_at ||
                               !data.charges_enabled ||
                               !data.payouts_enabled ||
                               !data.details_submitted;

        this._connectStatus.set({
          isConnected: true,
          accountId: data.id,
          stripeAccountId: data.stripe_account_id,
          accountType: data.account_type as 'express' | 'standard' | 'custom',
          chargesEnabled: data.charges_enabled,
          payoutsEnabled: data.payouts_enabled,
          detailsSubmitted: data.details_submitted,
          onboardingCompletedAt: data.onboarding_completed_at,
          requiresAction,
        });
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
  async createConnectAccountLink(businessType: 'individual' | 'company' = 'individual'): Promise<{ url: string; expiresAt: string } | { error: string }> {
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
          businessType,
          returnUrl: `${window.location.origin}/tabs/settings/payments?success=true`,
          refreshUrl: `${window.location.origin}/tabs/settings/payments?refresh=true`,
        },
      });

      if (error) throw error;

      return { url: data.url, expiresAt: data.expiresAt };
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
      // Delete from stripe_connect_accounts (will cascade to settings)
      const { error } = await this.supabase
        .from('stripe_connect_accounts')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Also clear from trainer_profiles for backward compatibility
      await this.supabase
        .from('trainer_profiles')
        .update({
          stripe_account_id: null,
          stripe_onboarding_complete: false,
        })
        .eq('id', userId);

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

  /**
   * Get payout history for the connected account
   */
  async getPayouts(limit: number = 50): Promise<StripePayout[]> {
    const accountId = this._connectStatus()?.accountId;
    if (!accountId) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('stripe_payouts')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(payout => ({
        id: payout.id,
        stripePayoutId: payout.stripe_payout_id,
        amountCents: payout.amount_cents,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message,
        createdAt: payout.created_at,
      }));
    } catch (error) {
      console.error('Error fetching payouts:', error);
      return [];
    }
  }

  /**
   * Get transfer history (for trainers who receive transfers from facilities)
   */
  async getTransfers(limit: number = 50): Promise<StripeTransfer[]> {
    const accountId = this._connectStatus()?.accountId;
    if (!accountId) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('stripe_transfers')
        .select('*')
        .eq('destination_account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(transfer => ({
        id: transfer.id,
        stripeTransferId: transfer.stripe_transfer_id,
        amountCents: transfer.amount_cents,
        currency: transfer.currency,
        description: transfer.description,
        trainerId: transfer.trainer_id,
        facilityId: transfer.facility_id,
        commissionPercent: transfer.commission_percent,
        createdAt: transfer.created_at,
      }));
    } catch (error) {
      console.error('Error fetching transfers:', error);
      return [];
    }
  }

  /**
   * Get current commission rate for a trainer at a facility
   */
  async getCommissionRate(trainerId: string, facilityId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('trainer_commissions')
        .select('commission_percent')
        .eq('trainer_id', trainerId)
        .eq('facility_id', facilityId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.commission_percent ?? 80.00; // Default 80%
    } catch (error) {
      console.error('Error fetching commission rate:', error);
      return 80.00; // Default
    }
  }

  /**
   * Set commission rate for a trainer at a facility (facility owners only)
   */
  async setCommissionRate(
    trainerId: string,
    facilityId: string,
    commissionPercent: number,
    effectiveDate: string = new Date().toISOString().split('T')[0],
    notes?: string
  ): Promise<{ error: string | null }> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const { error } = await this.supabase
        .from('trainer_commissions')
        .insert({
          trainer_id: trainerId,
          facility_id: facilityId,
          commission_percent: commissionPercent,
          effective_date: effectiveDate,
          notes,
          created_by: userId,
        });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      const message = (error as Error).message;
      console.error('Error setting commission rate:', error);
      return { error: message };
    }
  }
}
