import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * Lead Service for FitOS CRM
 * Manages lead pipeline, activities, and conversion tracking
 */

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'consultation' | 'won' | 'lost';
export type LeadSource = 'website' | 'referral' | 'social' | 'ad' | 'other';

export interface Lead {
  id: string;
  trainer_id: string;
  name: string;
  email: string;
  phone?: string;
  stage: LeadStage;
  source: LeadSource;
  source_detail?: string;
  notes?: string;
  expected_value?: number;
  last_contact_at?: string;
  next_follow_up?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'status_change';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
  created_by: string;
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  source: LeadSource;
  source_detail?: string;
  notes?: string;
  expected_value?: number;
}

export interface PipelineStats {
  new: number;
  contacted: number;
  qualified: number;
  consultation: number;
  won: number;
  lost: number;
  total: number;
  conversionRate: number;
  totalValue: number;
}

@Injectable({
  providedIn: 'root',
})
export class LeadService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // State
  private _leads = signal<Lead[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly
  leads = this._leads.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();

  // Computed stats
  pipelineStats = computed<PipelineStats>(() => {
    const leads = this._leads();
    const byStage = {
      new: leads.filter(l => l.stage === 'new').length,
      contacted: leads.filter(l => l.stage === 'contacted').length,
      qualified: leads.filter(l => l.stage === 'qualified').length,
      consultation: leads.filter(l => l.stage === 'consultation').length,
      won: leads.filter(l => l.stage === 'won').length,
      lost: leads.filter(l => l.stage === 'lost').length,
    };
    
    const total = leads.length;
    const wonCount = byStage.won;
    const completedDeals = wonCount + byStage.lost;
    const conversionRate = completedDeals > 0 
      ? Math.round((wonCount / completedDeals) * 100) 
      : 0;
    
    const totalValue = leads
      .filter(l => l.stage === 'won')
      .reduce((sum, l) => sum + (l.expected_value || 0), 0);

    return {
      ...byStage,
      total,
      conversionRate,
      totalValue,
    };
  });

  // Leads by stage for Kanban view
  leadsByStage = computed(() => ({
    new: this._leads().filter(l => l.stage === 'new'),
    contacted: this._leads().filter(l => l.stage === 'contacted'),
    qualified: this._leads().filter(l => l.stage === 'qualified'),
    consultation: this._leads().filter(l => l.stage === 'consultation'),
    won: this._leads().filter(l => l.stage === 'won'),
    lost: this._leads().filter(l => l.stage === 'lost'),
  }));

  /**
   * Load all leads for current trainer
   */
  async loadLeads(): Promise<void> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('leads')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      this._leads.set(data || []);
    } catch (err) {
      console.error('Error loading leads:', err);
      this._error.set('Failed to load leads');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a new lead
   */
  async createLead(input: CreateLeadInput): Promise<Lead | null> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('leads')
        .insert({
          trainer_id: trainerId,
          ...input,
          stage: 'new',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      this._leads.update(leads => [data, ...leads]);

      // Log activity
      await this.logActivity(data.id, 'note', `Lead created from ${input.source}`);

      return data;
    } catch (err) {
      console.error('Error creating lead:', err);
      this._error.set('Failed to create lead');
      return null;
    }
  }

  /**
   * Update lead stage (for drag-and-drop)
   */
  async updateStage(leadId: string, newStage: LeadStage): Promise<boolean> {
    const lead = this._leads().find(l => l.id === leadId);
    if (!lead) return false;

    const oldStage = lead.stage;
    
    try {
      const { error } = await this.supabase.client
        .from('leads')
        .update({ 
          stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      this._leads.update(leads => 
        leads.map(l => l.id === leadId 
          ? { ...l, stage: newStage, updated_at: new Date().toISOString() }
          : l
        )
      );

      // Log stage change
      await this.logActivity(
        leadId,
        'status_change',
        `Stage changed from ${oldStage} to ${newStage}`,
        { old_stage: oldStage, new_stage: newStage }
      );

      return true;
    } catch (err) {
      console.error('Error updating lead stage:', err);
      return false;
    }
  }

  /**
   * Update lead details
   */
  async updateLead(leadId: string, updates: Partial<Lead>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      this._leads.update(leads => 
        leads.map(l => l.id === leadId 
          ? { ...l, ...updates, updated_at: new Date().toISOString() }
          : l
        )
      );

      return true;
    } catch (err) {
      console.error('Error updating lead:', err);
      return false;
    }
  }

  /**
   * Delete lead
   */
  async deleteLead(leadId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      // Remove from local state
      this._leads.update(leads => leads.filter(l => l.id !== leadId));

      return true;
    } catch (err) {
      console.error('Error deleting lead:', err);
      return false;
    }
  }

  /**
   * Get a single lead by ID
   */
  async getLeadById(leadId: string): Promise<Lead | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error loading lead:', err);
      return null;
    }
  }

  /**
   * Log lead activity
   */
  async logActivity(
    leadId: string,
    type: LeadActivity['type'],
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    try {
      await this.supabase.client
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          type,
          content,
          metadata,
          created_by: userId,
        });
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  }

  /**
   * Get activities for a lead
   */
  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error loading activities:', err);
      return [];
    }
  }

  /**
   * Search leads
   */
  searchLeads(query: string): Lead[] {
    const searchLower = query.toLowerCase();
    return this._leads().filter(lead => 
      lead.name.toLowerCase().includes(searchLower) ||
      lead.email.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(query)
    );
  }

  /**
   * Get leads needing follow-up
   */
  getLeadsNeedingFollowUp(): Lead[] {
    const now = new Date();
    return this._leads().filter(lead => {
      if (!lead.next_follow_up) return false;
      return new Date(lead.next_follow_up) <= now;
    });
  }
}
