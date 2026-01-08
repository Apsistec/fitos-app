-- CRM: Leads and Marketing Tables
-- Migration: 00010_crm_leads.sql

-- Lead stages enum
CREATE TYPE lead_stage AS ENUM (
  'new',
  'contacted', 
  'qualified',
  'consultation',
  'won',
  'lost'
);

-- Lead sources enum
CREATE TYPE lead_source AS ENUM (
  'website',
  'referral',
  'social',
  'ad',
  'other'
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  
  -- Contact info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Pipeline
  stage lead_stage NOT NULL DEFAULT 'new',
  source lead_source NOT NULL DEFAULT 'other',
  source_detail TEXT,
  
  -- Value tracking
  expected_value DECIMAL(10,2),
  
  -- Follow-up
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead activities table
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('note', 'email', 'call', 'meeting', 'stage_change')),
  description TEXT NOT NULL,
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Template variables: {{name}}, {{first_name}}, etc.
  variables TEXT[] DEFAULT '{}',
  
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email sequences table
CREATE TABLE email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- 'lead_created', 'client_onboarded', 'workout_missed', etc.
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence steps table
CREATE TABLE sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  
  template_id UUID NOT NULL REFERENCES email_templates(id),
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  
  -- Conditions
  condition_type TEXT CHECK (condition_type IN ('always', 'if_not_opened', 'if_not_clicked')),
  
  step_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email sends tracking
CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id),
  sequence_id UUID REFERENCES email_sequences(id),
  step_id UUID REFERENCES sequence_steps(id),
  
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('lead', 'client')),
  recipient_id UUID,
  
  subject TEXT NOT NULL,
  
  -- Tracking
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  
  -- Metadata
  provider_message_id TEXT,
  metadata JSONB
);

-- Lead capture forms
CREATE TABLE lead_capture_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainer_profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Form configuration
  fields JSONB NOT NULL DEFAULT '[]', -- Array of field definitions
  redirect_url TEXT,
  thank_you_message TEXT,
  
  -- Lead magnet
  lead_magnet_url TEXT,
  lead_magnet_name TEXT,
  
  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX idx_leads_trainer ON leads(trainer_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_updated ON leads(updated_at DESC);
CREATE INDEX idx_leads_follow_up ON leads(next_follow_up) WHERE next_follow_up IS NOT NULL;
CREATE INDEX idx_leads_email ON leads(email);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_created ON lead_activities(created_at DESC);
CREATE INDEX idx_lead_activities_type ON lead_activities(type);

CREATE INDEX idx_email_templates_trainer ON email_templates(trainer_id);
CREATE INDEX idx_email_sequences_trainer ON email_sequences(trainer_id);
CREATE INDEX idx_email_sequences_trigger ON email_sequences(trigger_event);
CREATE INDEX idx_email_sequences_active ON email_sequences(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_sequence_steps_sequence ON sequence_steps(sequence_id);
CREATE INDEX idx_sequence_steps_order ON sequence_steps(sequence_id, step_order);

CREATE INDEX idx_email_sends_recipient ON email_sends(recipient_email);
CREATE INDEX idx_email_sends_sent ON email_sends(sent_at DESC);
CREATE INDEX idx_email_sends_sequence ON email_sends(sequence_id) WHERE sequence_id IS NOT NULL;

CREATE INDEX idx_lead_capture_forms_trainer ON lead_capture_forms(trainer_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_capture_forms ENABLE ROW LEVEL SECURITY;

-- Helper function to get trainer_id for current user
CREATE OR REPLACE FUNCTION get_trainer_id_for_user()
RETURNS UUID AS $$
  SELECT id FROM trainer_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================
-- LEADS POLICIES
-- =====================

CREATE POLICY "Trainers can view own leads"
  ON leads FOR SELECT
  USING (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can insert own leads"
  ON leads FOR INSERT
  WITH CHECK (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can update own leads"
  ON leads FOR UPDATE
  USING (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can delete own leads"
  ON leads FOR DELETE
  USING (trainer_id = get_trainer_id_for_user());

-- =====================
-- LEAD ACTIVITIES POLICIES
-- =====================

CREATE POLICY "Users can view activities for own leads"
  ON lead_activities FOR SELECT
  USING (lead_id IN (
    SELECT id FROM leads WHERE trainer_id = get_trainer_id_for_user()
  ));

CREATE POLICY "Users can insert activities for own leads"
  ON lead_activities FOR INSERT
  WITH CHECK (lead_id IN (
    SELECT id FROM leads WHERE trainer_id = get_trainer_id_for_user()
  ));

CREATE POLICY "Users can update own activities"
  ON lead_activities FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own activities"
  ON lead_activities FOR DELETE
  USING (created_by = auth.uid());

-- =====================
-- EMAIL TEMPLATES POLICIES
-- =====================

CREATE POLICY "Trainers can view own templates"
  ON email_templates FOR SELECT
  USING (trainer_id = get_trainer_id_for_user() OR is_system = TRUE);

CREATE POLICY "Trainers can insert own templates"
  ON email_templates FOR INSERT
  WITH CHECK (trainer_id = get_trainer_id_for_user() AND is_system = FALSE);

CREATE POLICY "Trainers can update own templates"
  ON email_templates FOR UPDATE
  USING (trainer_id = get_trainer_id_for_user() AND is_system = FALSE);

CREATE POLICY "Trainers can delete own templates"
  ON email_templates FOR DELETE
  USING (trainer_id = get_trainer_id_for_user() AND is_system = FALSE);

-- =====================
-- EMAIL SEQUENCES POLICIES
-- =====================

CREATE POLICY "Trainers can view own sequences"
  ON email_sequences FOR SELECT
  USING (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can insert own sequences"
  ON email_sequences FOR INSERT
  WITH CHECK (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can update own sequences"
  ON email_sequences FOR UPDATE
  USING (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can delete own sequences"
  ON email_sequences FOR DELETE
  USING (trainer_id = get_trainer_id_for_user());

-- =====================
-- SEQUENCE STEPS POLICIES
-- =====================

CREATE POLICY "Trainers can view own sequence steps"
  ON sequence_steps FOR SELECT
  USING (sequence_id IN (
    SELECT id FROM email_sequences WHERE trainer_id = get_trainer_id_for_user()
  ));

CREATE POLICY "Trainers can insert own sequence steps"
  ON sequence_steps FOR INSERT
  WITH CHECK (sequence_id IN (
    SELECT id FROM email_sequences WHERE trainer_id = get_trainer_id_for_user()
  ));

CREATE POLICY "Trainers can update own sequence steps"
  ON sequence_steps FOR UPDATE
  USING (sequence_id IN (
    SELECT id FROM email_sequences WHERE trainer_id = get_trainer_id_for_user()
  ));

CREATE POLICY "Trainers can delete own sequence steps"
  ON sequence_steps FOR DELETE
  USING (sequence_id IN (
    SELECT id FROM email_sequences WHERE trainer_id = get_trainer_id_for_user()
  ));

-- =====================
-- EMAIL SENDS POLICIES
-- =====================

CREATE POLICY "Trainers can view own email sends"
  ON email_sends FOR SELECT
  USING (
    template_id IN (SELECT id FROM email_templates WHERE trainer_id = get_trainer_id_for_user())
    OR sequence_id IN (SELECT id FROM email_sequences WHERE trainer_id = get_trainer_id_for_user())
  );

CREATE POLICY "Trainers can insert own email sends"
  ON email_sends FOR INSERT
  WITH CHECK (
    template_id IN (SELECT id FROM email_templates WHERE trainer_id = get_trainer_id_for_user())
    OR sequence_id IN (SELECT id FROM email_sequences WHERE trainer_id = get_trainer_id_for_user())
  );

-- =====================
-- LEAD CAPTURE FORMS POLICIES
-- =====================

CREATE POLICY "Trainers can view own forms"
  ON lead_capture_forms FOR SELECT
  USING (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can insert own forms"
  ON lead_capture_forms FOR INSERT
  WITH CHECK (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can update own forms"
  ON lead_capture_forms FOR UPDATE
  USING (trainer_id = get_trainer_id_for_user());

CREATE POLICY "Trainers can delete own forms"
  ON lead_capture_forms FOR DELETE
  USING (trainer_id = get_trainer_id_for_user());

-- Public policy for form submissions (leads created via public forms)
CREATE POLICY "Public can submit to active forms"
  ON leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_capture_forms 
      WHERE trainer_id = leads.trainer_id 
      AND is_active = TRUE
    )
  );

-- =====================
-- TRIGGERS
-- =====================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sequences_updated_at
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lead_capture_forms_updated_at
  BEFORE UPDATE ON lead_capture_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- SEED SYSTEM TEMPLATES
-- =====================

-- Note: These will be inserted when a trainer is created, not here
-- This is just documentation of the templates we'll create

COMMENT ON TABLE email_templates IS 'Email templates for marketing campaigns. System templates (is_system=true) are pre-built templates available to all trainers.';
COMMENT ON TABLE email_sequences IS 'Automated email sequences triggered by events like lead_created, client_onboarded, workout_missed.';
COMMENT ON TABLE leads IS 'CRM leads for trainers. Stages: new -> contacted -> qualified -> consultation -> won/lost';
COMMENT ON TABLE lead_capture_forms IS 'Embeddable lead capture forms for trainer websites.';
