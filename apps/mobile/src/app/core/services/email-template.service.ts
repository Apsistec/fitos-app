import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type {
  EmailTemplate,
  EmailSequence,
  SequenceStep,
  CreateSequenceInput,
  TriggerEvent,
} from '@fitos/shared';

/**
 * Email template category
 */
export type TemplateCategory =
  | 'welcome'
  | 'follow_up'
  | 'consultation'
  | 'nurture'
  | 're_engagement'
  | 'custom';

/**
 * Sequence step data
 * NOTE: Using SequenceStep from @fitos/shared
 * Local interface removed to prevent conflicts
 */

/**
 * Lead sequence enrollment
 */
export interface LeadSequence {
  id: string;
  lead_id: string;
  sequence_id: string;
  enrolled_at: string;
  current_step: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  completed_at?: string;
  cancelled_at?: string;
  next_send_at?: string;
  updated_at: string;
}

/**
 * Email send record
 */
export interface EmailSend {
  id: string;
  trainer_id: string;
  lead_id: string;
  email_template_id?: string;
  sequence_id?: string;
  sequence_step_id?: string;
  subject: string;
  body: string;
  sent_at: string;
  opened_at?: string;
  opened_count: number;
  clicked_at?: string;
  clicked_count: number;
  bounced: boolean;
  tracking_pixel_url?: string;
  tracked_links?: Record<string, string>;
  created_at: string;
}

/**
 * Email stats
 */
export interface EmailStats {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
}

/**
 * Template variable for substitution
 */
export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

/**
 * Create template input
 */
export interface CreateTemplateInput {
  name: string;
  subject: string;
  body: string;
  category: TemplateCategory;
  variables?: string[];
}

/**
 * Create sequence input
 * NOTE: Using CreateSequenceInput from @fitos/shared
 * Local interface removed to prevent conflicts
 */

/**
 * EmailTemplateService - Email template and sequence management
 *
 * Features:
 * - Template CRUD with variable substitution
 * - Email sequence/drip campaign builder
 * - Email sending and tracking
 * - Open/click tracking
 * - Template usage analytics
 *
 * Usage:
 * ```typescript
 * const templates = await emailService.getTemplates(trainerId);
 * const rendered = emailService.renderTemplate(template, { first_name: 'John' });
 * await emailService.sendEmail(leadId, templateId, variables);
 * const stats = await emailService.getEmailStats(trainerId);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class EmailTemplateService {
  private supabase = inject(SupabaseService);

  // State
  templates = signal<EmailTemplate[]>([]);
  sequences = signal<EmailSequence[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  isLoading = computed(() => this.loading());
  hasError = computed(() => this.error() !== null);

  // Active templates
  activeTemplates = computed(() =>
    this.templates().filter((t) => t.is_active)
  );

  // Templates by category
  templatesByCategory = computed(() => {
    const templateList = this.templates();
    const byCategory: Partial<Record<TemplateCategory, EmailTemplate[]>> = {};

    templateList.forEach((template) => {
      const category = template.category as TemplateCategory | undefined;
      if (category) {
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category]!.push(template);
      }
    });

    return byCategory;
  });

  // Available template variables
  readonly availableVariables: TemplateVariable[] = [
    {
      name: 'first_name',
      description: "Lead's first name",
      example: 'John',
    },
    {
      name: 'last_name',
      description: "Lead's last name",
      example: 'Smith',
    },
    {
      name: 'full_name',
      description: "Lead's full name",
      example: 'John Smith',
    },
    {
      name: 'email',
      description: "Lead's email address",
      example: 'john@example.com',
    },
    {
      name: 'trainer_name',
      description: "Trainer's full name",
      example: 'Sarah Johnson',
    },
    {
      name: 'trainer_email',
      description: "Trainer's email",
      example: 'sarah@fitpro.com',
    },
    {
      name: 'trainer_phone',
      description: "Trainer's phone",
      example: '(555) 123-4567',
    },
    {
      name: 'current_date',
      description: 'Current date (MM/DD/YYYY)',
      example: '01/13/2026',
    },
    {
      name: 'consultation_link',
      description: 'Link to book consultation',
      example: 'https://app.fitos.com/book/trainer-id',
    },
  ];

  /**
   * Get all templates for trainer
   */
  async getTemplates(trainerId: string): Promise<EmailTemplate[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('email_templates')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('name', { ascending: true });

      if (error) throw error;

      this.templates.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get templates';
      this.error.set(errorMessage);
      console.error('Error getting templates:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Create email template
   */
  async createTemplate(
    trainerId: string,
    input: CreateTemplateInput
  ): Promise<EmailTemplate | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Extract variables from template body
      const extractedVars = this.extractVariables(input.body + ' ' + input.subject);
      const variables = input.variables || extractedVars;

      const { data, error } = await this.supabase.client
        .from('email_templates')
        .insert({
          trainer_id: trainerId,
          ...input,
          variables,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentTemplates = this.templates();
      this.templates.set([...currentTemplates, data]);

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      this.error.set(errorMessage);
      console.error('Error creating template:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update email template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<EmailTemplate>
  ): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Extract variables if body/subject changed
      if (updates.body || updates.subject) {
        const text = (updates.body || '') + ' ' + (updates.subject || '');
        updates.variables = this.extractVariables(text);
      }

      const { error } = await this.supabase.client
        .from('email_templates')
        .update(updates)
        .eq('id', templateId);

      if (error) throw error;

      // Update local state
      const currentTemplates = this.templates();
      const updatedTemplates = currentTemplates.map((t) =>
        t.id === templateId ? { ...t, ...updates } : t
      );
      this.templates.set(updatedTemplates);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      this.error.set(errorMessage);
      console.error('Error updating template:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Delete email template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { error } = await this.supabase.client
        .from('email_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      // Update local state
      const currentTemplates = this.templates();
      this.templates.set(currentTemplates.filter((t) => t.id !== templateId));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete template';
      this.error.set(errorMessage);
      console.error('Error deleting template:', err);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Render template with variable substitution
   */
  renderTemplate(
    template: EmailTemplate,
    variables: Record<string, string>
  ): { subject: string; body: string } {
    let subject = template.subject;
    // Use body_html as primary field, fall back to body alias
    let body = template.body_html || template.body || '';

    // Replace all {variable_name} with values
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    return { subject, body };
  }

  /**
   * Extract variable names from template text
   */
  extractVariables(text: string): string[] {
    const regex = /\{([a-z_]+)\}/g;
    const matches = text.matchAll(regex);
    const variables = new Set<string>();

    for (const match of matches) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Validate template variables
   */
  validateTemplate(template: EmailTemplate): {
    valid: boolean;
    missing: string[];
  } {
    const extractedVars = this.extractVariables(
      template.body + ' ' + template.subject
    );
    const availableVarNames = this.availableVariables.map((v) => v.name);

    const missing = extractedVars.filter(
      (v) => !availableVarNames.includes(v)
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Send email to lead using template
   */
  async sendEmail(
    trainerId: string,
    leadId: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<EmailSend | null> {
    try {
      // Get template
      const { data: template } = await this.supabase.client
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) {
        this.error.set('Template not found');
        return null;
      }

      // Render template
      const rendered = this.renderTemplate(template, variables);

      // Generate tracking URLs
      const trackingPixelUrl = this.generateTrackingPixelUrl(leadId);
      const trackedLinks = this.generateTrackedLinks(rendered.body, leadId);

      // Insert into email_sends
      const { data, error } = await this.supabase.client
        .from('email_sends')
        .insert({
          trainer_id: trainerId,
          lead_id: leadId,
          email_template_id: templateId,
          subject: rendered.subject,
          body: rendered.body,
          tracking_pixel_url: trackingPixelUrl,
          tracked_links: trackedLinks,
        })
        .select()
        .single();

      if (error) throw error;

      // In production, this would trigger actual email send via Edge Function
      // For now, we just log the activity
      console.log('Email sent:', data);

      return data;
    } catch (err) {
      console.error('Error sending email:', err);
      this.error.set('Failed to send email');
      return null;
    }
  }

  /**
   * Record email open
   */
  async recordEmailOpen(emailSendId: string): Promise<boolean> {
    try {
      const { data: emailSend } = await this.supabase.client
        .from('email_sends')
        .select('opened_at, opened_count')
        .eq('id', emailSendId)
        .single();

      if (!emailSend) return false;

      const updates: any = {
        opened_count: emailSend.opened_count + 1,
      };

      // Set opened_at on first open
      if (!emailSend.opened_at) {
        updates.opened_at = new Date().toISOString();
      }

      const { error } = await this.supabase.client
        .from('email_sends')
        .update(updates)
        .eq('id', emailSendId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error recording email open:', err);
      return false;
    }
  }

  /**
   * Record email click
   */
  async recordEmailClick(emailSendId: string): Promise<boolean> {
    try {
      const { data: emailSend } = await this.supabase.client
        .from('email_sends')
        .select('clicked_at, clicked_count')
        .eq('id', emailSendId)
        .single();

      if (!emailSend) return false;

      const updates: any = {
        clicked_count: emailSend.clicked_count + 1,
      };

      // Set clicked_at on first click
      if (!emailSend.clicked_at) {
        updates.clicked_at = new Date().toISOString();
      }

      const { error } = await this.supabase.client
        .from('email_sends')
        .update(updates)
        .eq('id', emailSendId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error recording email click:', err);
      return false;
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(trainerId: string, days = 30): Promise<EmailStats | null> {
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_email_stats', {
          p_trainer_id: trainerId,
          p_days: days,
        });

      if (error) throw error;

      return data ? data[0] : null;
    } catch (err) {
      console.error('Error getting email stats:', err);
      return null;
    }
  }

  /**
   * Get email sequences
   */
  async getSequences(trainerId: string): Promise<EmailSequence[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('email_sequences')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('name', { ascending: true });

      if (error) throw error;

      this.sequences.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting sequences:', err);
      return [];
    }
  }

  /**
   * Create email sequence
   */
  async createSequence(
    trainerId: string,
    input: CreateSequenceInput
  ): Promise<EmailSequence | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('email_sequences')
        .insert({
          trainer_id: trainerId,
          ...input,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const currentSequences = this.sequences();
      this.sequences.set([...currentSequences, data]);

      return data;
    } catch (err) {
      console.error('Error creating sequence:', err);
      return null;
    }
  }

  /**
   * Update email sequence
   */
  async updateSequence(
    sequenceId: string,
    updates: Partial<CreateSequenceInput>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('email_sequences')
        .update(updates)
        .eq('id', sequenceId);

      if (error) throw error;

      // Update local state
      const currentSequences = this.sequences();
      const updatedSequences = currentSequences.map((s) =>
        s.id === sequenceId ? { ...s, ...updates } : s
      );
      this.sequences.set(updatedSequences);

      return true;
    } catch (err) {
      console.error('Error updating sequence:', err);
      return false;
    }
  }

  /**
   * Delete email sequence
   */
  async deleteSequence(sequenceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('email_sequences')
        .delete()
        .eq('id', sequenceId);

      if (error) throw error;

      // Update local state
      const currentSequences = this.sequences();
      this.sequences.set(currentSequences.filter((s) => s.id !== sequenceId));

      return true;
    } catch (err) {
      console.error('Error deleting sequence:', err);
      return false;
    }
  }

  /**
   * Toggle sequence active status
   */
  async toggleSequence(
    sequenceId: string,
    isActive: boolean
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('email_sequences')
        .update({ is_active: isActive })
        .eq('id', sequenceId);

      if (error) throw error;

      // Update local state
      const currentSequences = this.sequences();
      const updatedSequences = currentSequences.map((s) =>
        s.id === sequenceId ? { ...s, is_active: isActive } : s
      );
      this.sequences.set(updatedSequences);

      return true;
    } catch (err) {
      console.error('Error toggling sequence:', err);
      return false;
    }
  }

  /**
   * Add step to sequence
   */
  async addSequenceStep(
    sequenceId: string,
    emailTemplateId: string,
    delayDays: number,
    delayHours = 0
  ): Promise<SequenceStep | null> {
    try {
      // Get current max step order
      const { data: existingSteps } = await this.supabase.client
        .from('sequence_steps')
        .select('step_order')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: false })
        .limit(1);

      const nextOrder = existingSteps && existingSteps.length > 0
        ? existingSteps[0].step_order + 1
        : 1;

      const { data, error } = await this.supabase.client
        .from('sequence_steps')
        .insert({
          sequence_id: sequenceId,
          email_template_id: emailTemplateId,
          step_order: nextOrder,
          delay_days: delayDays,
          delay_hours: delayHours,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error adding sequence step:', err);
      return null;
    }
  }

  /**
   * Get sequence steps
   */
  async getSequenceSteps(sequenceId: string): Promise<SequenceStep[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error getting sequence steps:', err);
      return [];
    }
  }

  /**
   * Enroll lead in sequence
   */
  async enrollLeadInSequence(
    leadId: string,
    sequenceId: string
  ): Promise<LeadSequence | null> {
    try {
      // Get first step to calculate next_send_at
      const steps = await this.getSequenceSteps(sequenceId);
      if (steps.length === 0) {
        this.error.set('Sequence has no steps');
        return null;
      }

      const firstStep = steps[0];
      const nextSendAt = new Date();
      nextSendAt.setDate(nextSendAt.getDate() + firstStep.delay_days);
      nextSendAt.setHours(nextSendAt.getHours() + firstStep.delay_hours);

      const { data, error } = await this.supabase.client
        .from('lead_sequences')
        .insert({
          lead_id: leadId,
          sequence_id: sequenceId,
          current_step: 0,
          status: 'active',
          next_send_at: nextSendAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error enrolling lead in sequence:', err);
      return null;
    }
  }

  /**
   * Get enrollment counts for a sequence
   */
  async getSequenceEnrollmentCounts(
    sequenceId: string
  ): Promise<{ total: number; active: number }> {
    try {
      const { data, error } = await this.supabase.client
        .from('lead_sequences')
        .select('status')
        .eq('sequence_id', sequenceId);

      if (error) throw error;

      const total = data?.length || 0;
      const active =
        data?.filter((ls) => ls.status === 'active').length || 0;

      return { total, active };
    } catch (err) {
      console.error('Error getting sequence enrollment counts:', err);
      return { total: 0, active: 0 };
    }
  }

  /**
   * Pause lead sequence
   */
  async pauseLeadSequence(leadSequenceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('lead_sequences')
        .update({ status: 'paused' })
        .eq('id', leadSequenceId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error pausing lead sequence:', err);
      return false;
    }
  }

  /**
   * Resume lead sequence
   */
  async resumeLeadSequence(leadSequenceId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('lead_sequences')
        .update({ status: 'active' })
        .eq('id', leadSequenceId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error resuming lead sequence:', err);
      return false;
    }
  }

  /**
   * Generate tracking pixel URL
   */
  private generateTrackingPixelUrl(leadId: string): string {
    // In production, this would be a real tracking URL
    return `https://track.fitos.com/pixel/${leadId}`;
  }

  /**
   * Generate tracked links from email body
   */
  private generateTrackedLinks(
    body: string,
    leadId: string
  ): Record<string, string> {
    // Extract all URLs from body
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const matches = body.matchAll(urlRegex);
    const trackedLinks: Record<string, string> = {};

    for (const match of matches) {
      const originalUrl = match[0];
      // In production, this would create actual tracking redirects
      trackedLinks[originalUrl] = `https://track.fitos.com/link/${leadId}?url=${encodeURIComponent(originalUrl)}`;
    }

    return trackedLinks;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
