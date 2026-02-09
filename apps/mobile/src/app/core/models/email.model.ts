/**
 * Email marketing model types
 */

export interface EmailTemplate {
  id: string;
  trainer_id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailSequence {
  id: string;
  trainer_id: string;
  name: string;
  description?: string;
  trigger_event: TriggerEvent;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  template_id: string;
  delay_days: number;
  delay_hours: number;
  condition_type: 'always' | 'if_not_opened' | 'if_not_clicked';
  step_order: number;
  created_at: string;
}

export interface EmailSend {
  id: string;
  template_id?: string;
  sequence_id?: string;
  step_id?: string;
  recipient_email: string;
  recipient_type: 'lead' | 'client';
  recipient_id?: string;
  subject: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  unsubscribed_at?: string;
  provider_message_id?: string;
  metadata?: Record<string, unknown>;
}

export type TriggerEvent =
  | 'lead_created'
  | 'client_onboarded'
  | 'workout_missed'
  | 'subscription_expiring'
  | 'manual';

/**
 * Pre-built sequence templates
 */
export const SEQUENCE_TEMPLATES = {
  welcome: {
    name: 'Welcome Sequence',
    description: 'Welcome new leads with 4 emails over 7 days',
    trigger_event: 'lead_created' as TriggerEvent,
    steps: [
      { delay_days: 0, subject: 'Welcome! Let\'s get started' },
      { delay_days: 2, subject: 'Your first workout tips' },
      { delay_days: 4, subject: 'Success stories from clients like you' },
      { delay_days: 7, subject: 'Ready to transform? Book your consultation' },
    ],
  },
  nurture: {
    name: 'Lead Nurture',
    description: 'Nurture leads with 5 emails over 14 days',
    trigger_event: 'lead_created' as TriggerEvent,
    steps: [
      { delay_days: 0, subject: 'Free workout plan inside' },
      { delay_days: 3, subject: 'Nutrition tips for beginners' },
      { delay_days: 6, subject: 'Common fitness mistakes to avoid' },
      { delay_days: 10, subject: 'Client transformation: Meet Sarah' },
      { delay_days: 14, subject: 'Limited spots available this month' },
    ],
  },
  winback: {
    name: 'Win-Back Campaign',
    description: 'Re-engage churned clients with 3 emails over 21 days',
    trigger_event: 'manual' as TriggerEvent,
    steps: [
      { delay_days: 0, subject: 'We miss you! Come back offer' },
      { delay_days: 7, subject: 'What we\'ve improved since you left' },
      { delay_days: 14, subject: 'Last chance: Special comeback pricing' },
    ],
  },
};

/**
 * Email performance metrics
 */
export interface EmailMetrics {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

/**
 * Campaign performance
 */
export interface CampaignPerformance {
  template_id: string;
  template_name: string;
  sent: number;
  opened: number;
  clicked: number;
  open_rate: number;
  click_rate: number;
}
