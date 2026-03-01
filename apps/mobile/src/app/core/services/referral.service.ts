/**
 * Sprint 69 — ReferralService
 *
 * Manages the client referral program:
 *   - Client: generate + share referral code; view stats
 *   - Trainer: configure reward program; view full analytics
 *
 * Referral URL pattern: https://www.nutrifitos.app/join/[CODE]
 */
import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReferralCode {
  id: string;
  code: string;
  clicks: number;
  conversions: number;
  rewards_earned: number;
  created_at: string;
  /** Convenience: full share URL */
  share_url: string;
}

export interface ReferralProgram {
  id: string;
  trainer_id: string;
  reward_type: 'session_credit' | 'discount_pct' | 'discount_flat';
  reward_value: number;
  conversions_required: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainerReferralStats {
  total_codes: number;
  total_clicks: number;
  total_conversions: number;
  total_rewards_issued: number;
  conversion_rate: number;
  top_referrers: Array<{
    full_name: string;
    code: string;
    clicks: number;
    conversions: number;
    rewards_earned: number;
  }>;
}

export interface ReferralConversion {
  id: string;
  referral_code_id: string;
  new_client_id: string;
  converted_at: string;
  reward_issued: boolean;
  reward_issued_at: string | null;
}

export const REFERRAL_BASE_URL = 'https://www.nutrifitos.app/join/';

export const REWARD_TYPE_LABELS: Record<ReferralProgram['reward_type'], string> = {
  session_credit: 'Free session credit',
  discount_pct:   'Percentage discount',
  discount_flat:  'Flat rate discount',
};

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ReferralService {
  private supabase = inject(SupabaseService);

  // ── Shared signals ─────────────────────────────────────────────────────────
  myCode      = signal<ReferralCode | null>(null);
  program     = signal<ReferralProgram | null>(null);
  trainerStats = signal<TrainerReferralStats | null>(null);
  isLoading   = signal(false);
  error       = signal<string | null>(null);

  // ── Client API ────────────────────────────────────────────────────────────

  /**
   * Get or create the client's referral code for their primary trainer.
   * Stores result in `myCode` signal.
   */
  async getOrCreateCode(trainerId: string): Promise<ReferralCode | null> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_or_create_referral_code', { p_trainer_id: trainerId });
      if (error) throw error;
      const code: ReferralCode = {
        ...data,
        share_url: REFERRAL_BASE_URL + data.code,
      };
      this.myCode.set(code);
      return code;
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to get referral code');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Trainer API ───────────────────────────────────────────────────────────

  /** Load the trainer's current referral program configuration */
  async getMyProgram(): Promise<ReferralProgram | null> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client
        .from('referral_programs')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      this.program.set(data);
      return data;
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load referral program');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Upsert the trainer's referral program */
  async saveProgram(dto: {
    reward_type: ReferralProgram['reward_type'];
    reward_value: number;
    conversions_required: number;
    is_active: boolean;
  }): Promise<boolean> {
    this.error.set(null);
    try {
      const { data: { user } } = await this.supabase.client.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await this.supabase.client
        .from('referral_programs')
        .upsert({
          trainer_id: user.id,
          ...dto,
        }, { onConflict: 'trainer_id' })
        .select()
        .single();
      if (error) throw error;
      this.program.set(data);
      return true;
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to save referral program');
      return false;
    }
  }

  /** Load full referral stats for the trainer */
  async getTrainerStats(): Promise<TrainerReferralStats | null> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_trainer_referral_stats');
      if (error) throw error;
      const stats = data as TrainerReferralStats;
      this.trainerStats.set(stats);
      return stats;
    } catch (err: any) {
      this.error.set(err.message ?? 'Failed to load referral stats');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Track a click on a referral code (called from landing page / Edge Function) */
  async trackClick(code: string): Promise<void> {
    // Uses service role in Edge Function; this is a fallback client-side call
    await this.supabase.client
      .from('referral_codes')
      .update({ clicks: this.supabase.client.rpc('increment' as any) })
      .eq('code', code);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatRewardLabel(program: ReferralProgram): string {
    switch (program.reward_type) {
      case 'session_credit':
        return `${program.reward_value} free session${program.reward_value !== 1 ? 's' : ''}`;
      case 'discount_pct':
        return `${program.reward_value}% discount`;
      case 'discount_flat':
        return `$${program.reward_value.toFixed(2)} off`;
    }
  }

  formatRewardTrigger(program: ReferralProgram): string {
    const n = program.conversions_required;
    return `per ${n} successful referral${n !== 1 ? 's' : ''}`;
  }
}
