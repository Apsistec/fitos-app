import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Lead status in pipeline
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'consultation' | 'won' | 'lost';

/**
 * Lead source
 */
export type LeadSource = 'referral' | 'social' | 'website' | 'gym' | 'event' | 'other';

/**
 * Contact preference
 */
export type ContactMethod = 'email' | 'phone' | 'text' | 'none';

/**
 * Activity type
 */
export type ActivityType =
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'phone_call'
  | 'text_message'
  | 'meeting'
  | 'note'
  | 'status_change'
  | 'task_completed';

/**
 * Lead data
 */
export interface Lead {
  id: string;
  trainer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  source?: LeadSource;
  source_details?: string;
  lead_score: number;
  converted_to_client_id?: string;
  converted_at?: string;
  lost_reason?: string;
  preferred_contact_method: ContactMethod;
  do_not_contact: boolean;
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string;
}

/**
 * Lead activity entry
 */
export interface LeadActivity {
  id: string;
  lead_id: string;
  trainer_id: string;
  activity_type: ActivityType;
  subject?: string;
  description?: string;
  email_template_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Pipeline stage
 */
export interface PipelineStage {
  id: string;
  trainer_id: string;
  name: string;
  description?: string;
  color: string;
  display_order: number;
  maps_to_status: LeadStatus;
  auto_move_after_days?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Lead task
 */
export interface LeadTask {
  id: string;
  trainer_id: string;
  lead_id: string;
  title: string;
  description?: string;
  task_type?: 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
  due_date?: string;
  due_time?: string;
  completed: boolean;
  completed_at?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

/**
 * Pipeline metrics
 */
export interface PipelineMetrics {
  status: LeadStatus;
  count: number;
  total_score: number;
}

/**
 * Lead with computed properties
 */
export interface LeadWithExtras extends Lead {
  full_name: string;
  activities?: LeadActivity[];
  tasks?: LeadTask[];
}

/**
 * Create lead input
 */
export interface CreateLeadInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source?: LeadSource;
  source_details?: string;
  notes?: string;
  tags?: string[];
  preferred_contact_method?: ContactMethod;
}

/**
 * Update lead input
 */
export interface UpdateLeadInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
  source?: LeadSource;
  source_details?: string;
  notes?: string;
  tags?: string[];
  preferred_contact_method?: ContactMethod;
  do_not_contact?: boolean;
  lost_reason?: string;
}

/**
 * LeadService - Lead management and pipeline operations
 *
 * Features:
 * - CRUD operations for leads
 * - Pipeline stage management
 * - Activity tracking
 * - Task management
 * - Lead scoring
 * - Bulk operations
 *
 * Usage:
 * ```typescript
 * const leads = await leadService.getLeads(trainerId);
 * await leadService.createLead(trainerId, { first_name, last_name, email });
 * await leadService.updateLeadStatus(leadId, 'qualified');
 * await leadService.addActivity(leadId, { activity_type: 'phone_call', ... });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class LeadService {
  private supabase = inject(SupabaseService);

  // State
  leads = signal<LeadWithExtras[]>([]);
  selectedLead = signal<LeadWithExtras | null>(null);
  pipelineStages = signal<PipelineStage[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  isLoading = computed(() => this.loading());
  hasError = computed(() => this.error() !== null);

  // Leads by status
  leadsByStatus = computed(() => {
    const leadsList = this.leads();
    const byStatus: Record<LeadStatus, LeadWithExtras[]> = {
      new: [],
      contacted: [],
      qualified: [],
      consultation: [],
      won: [],
      lost: [],
    };

    leadsList.forEach((lead) => {
      byStatus[lead.status].push(lead);
    });

    return byStatus;
  });

  // Alias for backward compatibility
  leadsByStage = computed(() => this.leadsByStatus());

  // Pipeline statistics
  pipelineStats = computed(() => {
    const leadsList = this.leads();
    const total = leadsList.length;
    const won = leadsList.filter(l => l.status === 'won').length;
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
    // Note: totalValue is placeholder since Lead doesn't have expected_value
    const totalValue = 0;

    return { total, conversionRate, totalValue };
  });

  // Active leads (not won/lost)
  activeLeads = computed(() => {
    return this.leads().filter(
      (lead) => lead.status !== 'won' && lead.status !== 'lost'
    );
  });

  /**
   * Get all leads for trainer
   */
  async getLeads(trainerId: string, includeArchived = false): Promise<LeadWithExtras[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      let query = this.supabase.client
        .from('leads')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.not('status', 'in', '("won","lost")');
      }

      const { data, error } = await query;

      if (error) throw error;

      const leadsWithExtras: LeadWithExtras[] = (data || []).map((lead) => ({
        ...lead,
        full_name: `${lead.first_name} ${lead.last_name}`,
      }));

      this.leads.set(leadsWithExtras);
      return leadsWithExtras;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get leads';
      this.error.set(errorMessage);
      console.error('Error getting leads:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get single lead by ID with activities and tasks
   */
  async getLead(leadId: string): Promise<LeadWithExtras | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Get lead
      const { data: lead, error: leadError } = await this.supabase.client
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;
      if (!lead) return null;

      // Get activities
      const { data: activities } = await this.supabase.client
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get tasks
      const { data: tasks } = await this.supabase.client
        .from('lead_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .order('due_date', { ascending: true });

      const leadWithExtras: LeadWithExtras = {
        ...lead,
        full_name: `${lead.first_name} ${lead.last_name}`,
        activities: activities || [],
        tasks: tasks || [],
      };

      this.selectedLead.set(leadWithExtras);
      return leadWithExtras;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get lead';
      this.error.set(errorMessage);
      console.error('Error getting lead:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Create new lead
   */
  async createLead(trainerId: string, input: CreateLeadInput): Promise<Lead | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('leads')
        .insert({
          trainer_id: trainerId,
          ...input,
          status: 'new',
          lead_score: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh leads
      await this.getLeads(trainerId);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create lead';
      this.error.set(errorMessage);
      console.error('Error creating lead:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update lead
   */
  async updateLead(leadId: string, input: UpdateLeadInput): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.client
        .from('leads')
        .update(input)
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      const currentLeads = this.leads();
      const updatedLeads = currentLeads.map((lead) =>
        lead.id === leadId
          ? { ...lead, ...input, full_name: `${input.first_name || lead.first_name} ${input.last_name || lead.last_name}` }
          : lead
      );
      this.leads.set(updatedLeads);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead';
      this.error.set(errorMessage);
      console.error('Error updating lead:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update lead status (triggers status_change activity via trigger)
   */
  async updateLeadStatus(leadId: string, status: LeadStatus, reason?: string): Promise<boolean> {
    const updates: UpdateLeadInput = { status };

    if (status === 'lost' && reason) {
      updates.lost_reason = reason;
    }

    if (status === 'won') {
      updates.lost_reason = undefined; // Clear lost reason if won
    }

    return this.updateLead(leadId, updates);
  }

  /**
   * Delete lead
   */
  async deleteLead(leadId: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.client
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      const currentLeads = this.leads();
      this.leads.set(currentLeads.filter((lead) => lead.id !== leadId));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete lead';
      this.error.set(errorMessage);
      console.error('Error deleting lead:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Add activity to lead timeline
   */
  async addActivity(
    leadId: string,
    trainerId: string,
    activity: {
      activity_type: ActivityType;
      subject?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<LeadActivity | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          trainer_id: trainerId,
          ...activity,
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate lead score if email activity
      if (activity.activity_type.startsWith('email_')) {
        await this.calculateLeadScore(leadId);
      }

      return data;
    } catch (err) {
      console.error('Error adding activity:', err);
      return null;
    }
  }

  /**
   * Get activities for lead
   */
  async getActivities(leadId: string, limit = 50): Promise<LeadActivity[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting activities:', err);
      return [];
    }
  }

  /**
   * Create task for lead
   */
  async createTask(
    trainerId: string,
    leadId: string,
    task: {
      title: string;
      description?: string;
      task_type?: LeadTask['task_type'];
      due_date?: string;
      due_time?: string;
      priority?: LeadTask['priority'];
    }
  ): Promise<LeadTask | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('lead_tasks')
        .insert({
          trainer_id: trainerId,
          lead_id: leadId,
          ...task,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      return null;
    }
  }

  /**
   * Complete task
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('lead_tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error completing task:', err);
      return false;
    }
  }

  /**
   * Get upcoming tasks for trainer
   */
  async getUpcomingTasks(trainerId: string, days = 7): Promise<LeadTask[]> {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const { data, error } = await this.supabase.client
        .from('lead_tasks')
        .select('*, lead:leads(first_name, last_name)')
        .eq('trainer_id', trainerId)
        .eq('completed', false)
        .lte('due_date', endDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting upcoming tasks:', err);
      return [];
    }
  }

  /**
   * Calculate and update lead score
   */
  async calculateLeadScore(leadId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.client
        .rpc('calculate_lead_score', { p_lead_id: leadId });

      if (error) throw error;
      return data || 0;
    } catch (err) {
      console.error('Error calculating lead score:', err);
      return 0;
    }
  }

  /**
   * Get pipeline metrics
   */
  async getPipelineMetrics(trainerId: string): Promise<PipelineMetrics[]> {
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_pipeline_metrics', { p_trainer_id: trainerId });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting pipeline metrics:', err);
      return [];
    }
  }

  /**
   * Get pipeline stages
   */
  async getPipelineStages(trainerId: string): Promise<PipelineStage[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('pipeline_stages')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('display_order', { ascending: true});

      if (error) throw error;

      const stages = data || [];
      this.pipelineStages.set(stages);
      return stages;
    } catch (err) {
      console.error('Error getting pipeline stages:', err);
      return [];
    }
  }

  /**
   * Create default pipeline stages for new trainer
   */
  async createDefaultPipelineStages(trainerId: string): Promise<boolean> {
    const defaultStages = [
      {
        trainer_id: trainerId,
        name: 'New Lead',
        description: 'Just entered the system',
        color: '#6B7280',
        display_order: 1,
        maps_to_status: 'new' as LeadStatus,
      },
      {
        trainer_id: trainerId,
        name: 'Contacted',
        description: 'Initial contact made',
        color: '#3B82F6',
        display_order: 2,
        maps_to_status: 'contacted' as LeadStatus,
      },
      {
        trainer_id: trainerId,
        name: 'Qualified',
        description: 'Determined to be a good fit',
        color: '#10B981',
        display_order: 3,
        maps_to_status: 'qualified' as LeadStatus,
      },
      {
        trainer_id: trainerId,
        name: 'Consultation',
        description: 'Meeting scheduled',
        color: '#8B5CF6',
        display_order: 4,
        maps_to_status: 'consultation' as LeadStatus,
      },
      {
        trainer_id: trainerId,
        name: 'Client',
        description: 'Converted to paying client',
        color: '#059669',
        display_order: 5,
        maps_to_status: 'won' as LeadStatus,
      },
      {
        trainer_id: trainerId,
        name: 'Lost',
        description: 'Did not convert',
        color: '#DC2626',
        display_order: 6,
        maps_to_status: 'lost' as LeadStatus,
      },
    ];

    try {
      const { error } = await this.supabase.client
        .from('pipeline_stages')
        .insert(defaultStages);

      if (error) throw error;

      await this.getPipelineStages(trainerId);
      return true;
    } catch (err) {
      console.error('Error creating default pipeline stages:', err);
      return false;
    }
  }

  /**
   * Update pipeline stage
   */
  async updatePipelineStage(
    stageId: string,
    updates: Partial<PipelineStage>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('pipeline_stages')
        .update(updates)
        .eq('id', stageId);

      if (error) throw error;

      // Update local state
      const currentStages = this.pipelineStages();
      const updatedStages = currentStages.map((stage) =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      );
      this.pipelineStages.set(updatedStages);

      return true;
    } catch (err) {
      console.error('Error updating pipeline stage:', err);
      return false;
    }
  }

  /**
   * Bulk add tags to leads
   */
  async addTagsToLeads(leadIds: string[], tags: string[]): Promise<boolean> {
    try {
      // Get current leads
      const { data: leads } = await this.supabase.client
        .from('leads')
        .select('id, tags')
        .in('id', leadIds);

      if (!leads) return false;

      // Update each lead
      const updates = leads.map((lead) => {
        const currentTags = lead.tags || [];
        const newTags = Array.from(new Set([...currentTags, ...tags]));
        return { id: lead.id, tags: newTags };
      });

      const { error } = await this.supabase.client
        .from('leads')
        .upsert(updates);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error adding tags to leads:', err);
      return false;
    }
  }

  /**
   * Bulk update lead status
   */
  async bulkUpdateStatus(leadIds: string[], status: LeadStatus): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('leads')
        .update({ status })
        .in('id', leadIds);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error bulk updating status:', err);
      return false;
    }
  }

  /**
   * Search leads by name or email
   */
  searchLeads(query: string): LeadWithExtras[] {
    if (!query.trim()) return this.leads();

    const lowerQuery = query.toLowerCase();
    return this.leads().filter(
      (lead) =>
        lead.full_name.toLowerCase().includes(lowerQuery) ||
        lead.email.toLowerCase().includes(lowerQuery) ||
        (lead.phone && lead.phone.includes(query))
    );
  }

  /**
   * Filter leads by tags
   */
  filterByTags(tags: string[]): LeadWithExtras[] {
    if (tags.length === 0) return this.leads();

    return this.leads().filter((lead) =>
      tags.some((tag) => lead.tags?.includes(tag))
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Clear selected lead
   */
  clearSelectedLead(): void {
    this.selectedLead.set(null);
  }
}
