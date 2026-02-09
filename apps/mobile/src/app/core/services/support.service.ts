import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { SupportTicketPayload, SupportTicketResponse } from '@fitos/libs';

export interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  description: string;
  device_info: Record<string, unknown>;
  screenshot_url: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class SupportService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // State signals
  ticketsSignal = signal<SupportTicket[]>([]);
  isLoadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  /**
   * Submit a new support ticket
   *
   * This method will:
   * 1. Try to use the backend API endpoint if available
   * 2. Fall back to direct Supabase insert if API is unavailable
   */
  async submitTicket(payload: SupportTicketPayload): Promise<SupportTicketResponse> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const user = this.auth.user();
      if (!user) {
        throw new Error('User must be authenticated to submit a ticket');
      }

      // Try backend API first (if available)
      try {
        const response = await this.submitViaBackendAPI(payload);
        return response;
      } catch (apiError) {
        console.warn('Backend API unavailable, falling back to direct Supabase insert:', apiError);

        // Fall back to direct Supabase insert
        const { data, error } = await this.supabase.client
          .from('support_tickets')
          .insert({
            user_id: user.id,
            category: payload.category,
            subject: payload.subject,
            description: payload.description,
            device_info: payload.deviceInfo,
            screenshot_url: payload.screenshotUrl || null,
            status: 'open',
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return {
          success: true,
          ticketId: data.id,
          message: 'Support ticket created successfully. We\'ll respond within 24 hours.',
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit support ticket';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Submit ticket via backend API endpoint
   */
  private async submitViaBackendAPI(payload: SupportTicketPayload): Promise<SupportTicketResponse> {
    // Get Supabase session for auth token
    const { data: { session } } = await this.supabase.client.auth.getSession();

    if (!session) {
      throw new Error('No active session');
    }

    // TODO: Get actual backend URL from environment
    const backendUrl = 'http://localhost:8000'; // Development URL

    const response = await fetch(`${backendUrl}/api/support/ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        category: payload.category,
        subject: payload.subject,
        description: payload.description,
        device_info: payload.deviceInfo,
        screenshot_url: payload.screenshotUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }

    return await response.json();
  }

  /**
   * Get all support tickets for the current user
   */
  async getUserTickets(status?: 'open' | 'in_progress' | 'resolved' | 'closed'): Promise<SupportTicket[]> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const user = this.auth.user();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      let query = this.supabase.client
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      this.ticketsSignal.set(data || []);
      return data || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch support tickets';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Get a specific support ticket by ID
   */
  async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const user = this.auth.user();
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { data, error } = await this.supabase.client
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch support ticket';
      this.errorSignal.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
