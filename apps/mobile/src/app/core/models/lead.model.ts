/**
 * Lead model types for CRM
 */

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'consultation' | 'won' | 'lost';

export type LeadSource = 'website' | 'referral' | 'social' | 'ad' | 'other';

export type LeadActivityType = 'note' | 'email' | 'call' | 'meeting' | 'stage_change';

export interface Lead {
  id: string;
  trainer_id: string;

  // Contact info
  name: string;
  email: string;
  phone?: string;

  // Pipeline
  stage: LeadStage;
  source: LeadSource;
  source_detail?: string;

  // Value tracking
  expected_value?: number;

  // Follow-up
  notes?: string;
  last_contact_at?: string;
  next_follow_up?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: LeadActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  created_by: string;
}

export interface LeadWithActivities extends Lead {
  activities: LeadActivity[];
  activity_count: number;
}

/**
 * Lead stage display configuration
 */
export const LEAD_STAGE_CONFIG: Record<LeadStage, {
  label: string;
  color: string;
  icon: string;
  order: number;
}> = {
  new: {
    label: 'New',
    color: 'primary',
    icon: 'person-add-outline',
    order: 0,
  },
  contacted: {
    label: 'Contacted',
    color: 'secondary',
    icon: 'mail-outline',
    order: 1,
  },
  qualified: {
    label: 'Qualified',
    color: 'tertiary',
    icon: 'checkmark-circle-outline',
    order: 2,
  },
  consultation: {
    label: 'Consultation',
    color: 'warning',
    icon: 'calendar-outline',
    order: 3,
  },
  won: {
    label: 'Won',
    color: 'success',
    icon: 'trophy-outline',
    order: 4,
  },
  lost: {
    label: 'Lost',
    color: 'danger',
    icon: 'close-circle-outline',
    order: 5,
  },
};

/**
 * Lead source display configuration
 */
export const LEAD_SOURCE_CONFIG: Record<LeadSource, {
  label: string;
  icon: string;
}> = {
  website: {
    label: 'Website',
    icon: 'globe-outline',
  },
  referral: {
    label: 'Referral',
    icon: 'people-outline',
  },
  social: {
    label: 'Social Media',
    icon: 'logo-instagram',
  },
  ad: {
    label: 'Advertisement',
    icon: 'megaphone-outline',
  },
  other: {
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
  },
};

/**
 * Lead activity type configuration
 */
export const LEAD_ACTIVITY_TYPE_CONFIG: Record<LeadActivityType, {
  label: string;
  icon: string;
  color: string;
}> = {
  note: {
    label: 'Note',
    icon: 'document-text-outline',
    color: 'medium',
  },
  email: {
    label: 'Email',
    icon: 'mail-outline',
    color: 'primary',
  },
  call: {
    label: 'Call',
    icon: 'call-outline',
    color: 'success',
  },
  meeting: {
    label: 'Meeting',
    icon: 'calendar-outline',
    color: 'warning',
  },
  stage_change: {
    label: 'Stage Change',
    icon: 'swap-horizontal-outline',
    color: 'tertiary',
  },
};

/**
 * Create lead request
 */
export interface CreateLeadRequest {
  name: string;
  email: string;
  phone?: string;
  source: LeadSource;
  source_detail?: string;
  expected_value?: number;
  notes?: string;
  next_follow_up?: string;
}

/**
 * Update lead request
 */
export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  stage?: LeadStage;
  source?: LeadSource;
  source_detail?: string;
  expected_value?: number;
  notes?: string;
  last_contact_at?: string;
  next_follow_up?: string;
}

/**
 * Create activity request
 */
export interface CreateActivityRequest {
  lead_id: string;
  type: LeadActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Pipeline statistics
 */
export interface PipelineStats {
  total_leads: number;
  by_stage: Record<LeadStage, number>;
  by_source: Record<LeadSource, number>;
  conversion_rates: {
    new_to_contacted: number;
    contacted_to_qualified: number;
    qualified_to_consultation: number;
    consultation_to_won: number;
    overall: number;
  };
  total_value: number;
  average_value: number;
}
