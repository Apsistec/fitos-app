import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Invitation {
  id: string;
  trainer_id: string;
  email: string;
  invite_code: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  personal_message: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvitationService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // State
  private invitationsSignal = signal<Invitation[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed values
  invitations = computed(() => this.invitationsSignal());
  loading = computed(() => this.loadingSignal());
  error = computed(() => this.errorSignal());

  // Pending invitations only
  pendingInvitations = computed(() =>
    this.invitationsSignal().filter(i => i.status === 'pending')
  );

  /**
   * Load all invitations for the current trainer
   */
  async loadInvitations(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('invitations')
        .select('*')
        .eq('trainer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.invitationsSignal.set(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to load invitations');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Create a new client invitation
   */
  async createInvitation(email: string, personalMessage?: string): Promise<Invitation | null> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      // Check if invitation already exists
      const { data: existing } = await this.supabase.client
        .from('invitations')
        .select('*')
        .eq('trainer_id', userId)
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (existing) {
        throw new Error('An active invitation already exists for this email');
      }

      const { data, error } = await this.supabase.client
        .from('invitations')
        .insert({
          trainer_id: userId,
          email,
          personal_message: personalMessage || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      this.invitationsSignal.update(invitations => [data, ...invitations]);

      return data;
    } catch (error) {
      console.error('Error creating invitation:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to create invitation');
      return null;
    }
  }

  /**
   * Resend an expired invitation (creates new invitation with same email)
   */
  async resendInvitation(invitationId: string): Promise<Invitation | null> {
    try {
      // Get the original invitation
      const original = this.invitationsSignal().find(i => i.id === invitationId);
      if (!original) throw new Error('Invitation not found');

      // Mark old invitation as cancelled
      await this.cancelInvitation(invitationId);

      // Create new invitation
      return await this.createInvitation(original.email, original.personal_message || undefined);
    } catch (error) {
      console.error('Error resending invitation:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to resend invitation');
      return null;
    }
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      // Update local state
      this.invitationsSignal.update(invitations =>
        invitations.map(i =>
          i.id === invitationId ? { ...i, status: 'cancelled' as InvitationStatus } : i
        )
      );

      return true;
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to cancel invitation');
      return false;
    }
  }

  /**
   * Get invitation by code (for acceptance flow)
   */
  async getInvitationByCode(code: string): Promise<Invitation | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('invitations')
        .select('*')
        .eq('invite_code', code)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting invitation:', error);
      return null;
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(code: string): Promise<boolean> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .rpc('accept_invitation', {
          p_invite_code: code,
          p_user_id: userId,
        });

      if (error) throw error;

      return data === true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      this.errorSignal.set(error instanceof Error ? error.message : 'Failed to accept invitation');
      return false;
    }
  }

  /**
   * Generate shareable invite link
   */
  getInviteLink(inviteCode: string): string {
    // TODO: Update with actual production domain
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/register?invite=${inviteCode}`;
  }

  /**
   * Copy invite link to clipboard
   */
  async copyInviteLink(inviteCode: string): Promise<boolean> {
    try {
      const link = this.getInviteLink(inviteCode);
      await navigator.clipboard.writeText(link);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Share invite link via Web Share API
   */
  async shareInviteLink(inviteCode: string, trainerName: string): Promise<boolean> {
    try {
      const link = this.getInviteLink(inviteCode);

      if (navigator.share) {
        await navigator.share({
          title: 'Join FitOS',
          text: `${trainerName} has invited you to train together on FitOS!`,
          url: link,
        });
        return true;
      } else {
        // Fallback to clipboard
        return await this.copyInviteLink(inviteCode);
      }
    } catch (error) {
      console.error('Error sharing invitation:', error);
      return false;
    }
  }

  /**
   * Check if invitation is expired
   */
  isExpired(invitation: Invitation): boolean {
    return new Date(invitation.expires_at) < new Date();
  }

  /**
   * Reset state
   */
  reset(): void {
    this.invitationsSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}
