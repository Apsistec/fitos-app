import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  EmailTemplate,
  EmailSequence,
  SequenceStep,
  EmailSend,
  EmailMetrics,
  CampaignPerformance,
  TriggerEvent,
} from '../models/email.model';

/**
 * EmailService - Email marketing and automation
 *
 * Features:
 * - Email template management
 * - Automated sequences
 * - Email sending via Resend/SendGrid
 * - Open/click tracking
 * - Campaign analytics
 * - CAN-SPAM compliance
 *
 * Usage:
 * ```typescript
 * await emailService.sendEmail(templateId, recipientEmail, variables);
 * const metrics = await emailService.getEmailMetrics();
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private supabase = inject(SupabaseService);

  // State
  templates = signal<EmailTemplate[]>([]);
  sequences = signal<EmailSequence[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  /**
   * Get all email templates
   */
  async getTemplates(): Promise<EmailTemplate[]> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.templates.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch templates';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Create email template
   */
  async createTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await this.supabase.client
        .from('email_templates')
        .insert({
          ...template,
          trainer_id: user.user.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;

      this.templates.update(templates => [data, ...templates]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get all sequences
   */
  async getSequences(): Promise<EmailSequence[]> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('email_sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.sequences.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sequences';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Create email sequence
   */
  async createSequence(
    name: string,
    description: string,
    triggerEvent: TriggerEvent,
    steps: Array<{ template_id: string; delay_days: number; delay_hours: number }>
  ): Promise<EmailSequence> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Create sequence
      const { data: sequence, error: seqError } = await this.supabase.client
        .from('email_sequences')
        .insert({
          trainer_id: user.user.id,
          name,
          description,
          trigger_event: triggerEvent,
          is_active: true,
        })
        .select()
        .single();

      if (seqError) throw seqError;

      // Create steps
      const stepsData = steps.map((step, index) => ({
        sequence_id: sequence.id,
        ...step,
        step_order: index,
        condition_type: 'always',
      }));

      const { error: stepsError } = await this.supabase.client
        .from('sequence_steps')
        .insert(stepsData);

      if (stepsError) throw stepsError;

      this.sequences.update(sequences => [sequence, ...sequences]);
      return sequence;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create sequence';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Send email using template via Resend Edge Function
   */
  async sendEmail(
    templateId: string,
    recipientEmail: string,
    variables: Record<string, string> = {}
  ): Promise<EmailSend> {
    try {
      // Get template
      const { data: template, error: templateError } = await this.supabase.client
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Replace variables in subject and body
      let subject = template.subject;
      let bodyHtml = template.body_html;

      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        bodyHtml = bodyHtml.replace(regex, value);
      });

      // Send via Resend Edge Function
      const { data: sendResult, error: sendError } = await this.supabase.client.functions.invoke(
        'send-email',
        {
          body: {
            to: recipientEmail,
            subject,
            html: bodyHtml,
            tags: [
              { name: 'template_id', value: templateId },
              { name: 'source', value: 'email_campaign' },
            ],
          },
        }
      );

      if (sendError) {
        console.error('Resend Edge Function error:', sendError);
        throw new Error(sendError.message || 'Email delivery failed');
      }

      // Log to email_sends table for tracking
      const { data, error } = await this.supabase.client
        .from('email_sends')
        .insert({
          template_id: templateId,
          recipient_email: recipientEmail,
          recipient_type: 'lead',
          subject,
          metadata: {
            variables,
            resend_id: sendResult?.id,
          },
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Email sent via Resend:', { subject, to: recipientEmail, resendId: sendResult?.id });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get email performance metrics
   */
  async getEmailMetrics(): Promise<EmailMetrics> {
    try {
      const { data, error } = await this.supabase.client
        .from('email_sends')
        .select('opened_at, clicked_at, bounced_at, unsubscribed_at');

      if (error) throw error;

      const totalSent = data?.length || 0;
      const totalOpened = data?.filter(e => e.opened_at).length || 0;
      const totalClicked = data?.filter(e => e.clicked_at).length || 0;
      const totalBounced = data?.filter(e => e.bounced_at).length || 0;
      const totalUnsubscribed = data?.filter(e => e.unsubscribed_at).length || 0;

      return {
        total_sent: totalSent,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        total_bounced: totalBounced,
        total_unsubscribed: totalUnsubscribed,
        open_rate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        click_rate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        bounce_rate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        unsubscribe_rate: totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 : 0,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(): Promise<CampaignPerformance[]> {
    try {
      const { data: templates, error: templateError } = await this.supabase.client
        .from('email_templates')
        .select('id, name');

      if (templateError) throw templateError;

      const { data: sends, error: sendsError } = await this.supabase.client
        .from('email_sends')
        .select('template_id, opened_at, clicked_at');

      if (sendsError) throw sendsError;

      // Calculate performance per template
      const performance = templates.map(template => {
        const templateSends = sends.filter(s => s.template_id === template.id);
        const sent = templateSends.length;
        const opened = templateSends.filter(s => s.opened_at).length;
        const clicked = templateSends.filter(s => s.clicked_at).length;

        return {
          template_id: template.id,
          template_name: template.name,
          sent,
          opened,
          clicked,
          open_rate: sent > 0 ? (opened / sent) * 100 : 0,
          click_rate: sent > 0 ? (clicked / sent) * 100 : 0,
        };
      });

      return performance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch campaign performance';
      throw new Error(errorMessage);
    }
  }

  /**
   * Track email open
   */
  async trackOpen(emailId: string): Promise<void> {
    try {
      await this.supabase.client
        .from('email_sends')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', emailId)
        .is('opened_at', null); // Only update if not already opened
    } catch (err) {
      console.error('Error tracking email open:', err);
    }
  }

  /**
   * Track email click
   */
  async trackClick(emailId: string): Promise<void> {
    try {
      const updates: any = {
        clicked_at: new Date().toISOString(),
      };

      // Also mark as opened if not already
      const { data } = await this.supabase.client
        .from('email_sends')
        .select('opened_at')
        .eq('id', emailId)
        .single();

      if (data && !data.opened_at) {
        updates.opened_at = new Date().toISOString();
      }

      await this.supabase.client
        .from('email_sends')
        .update(updates)
        .eq('id', emailId);
    } catch (err) {
      console.error('Error tracking email click:', err);
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
