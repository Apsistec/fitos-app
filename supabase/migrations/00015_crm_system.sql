-- =====================================================
-- Sprint 20: CRM Pipeline & Email Marketing System
-- Lead management, email templates, automated sequences
-- =====================================================

-- =====================================================
-- LEADS TABLE
-- Prospect and client lead tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Lead information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Lead status
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'contacted', 'qualified', 'consultation', 'won', 'lost')
  ),

  -- Source tracking
  source TEXT CHECK (
    source IN ('referral', 'social', 'website', 'gym', 'event', 'other')
  ),
  source_details TEXT,

  -- Lead scoring
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),

  -- Conversion tracking
  converted_to_client_id UUID REFERENCES profiles(id),
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,

  -- Contact preferences
  preferred_contact_method TEXT DEFAULT 'email' CHECK (
    preferred_contact_method IN ('email', 'phone', 'text', 'none')
  ),
  do_not_contact BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  tags TEXT[], -- Array of custom tags
  custom_fields JSONB DEFAULT '{}', -- Flexible custom data

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contacted_at TIMESTAMPTZ,

  -- Ensure email is unique per trainer
  UNIQUE(trainer_id, email)
);

-- Indexes for efficient queries
CREATE INDEX idx_leads_trainer ON leads(trainer_id);
CREATE INDEX idx_leads_status ON leads(trainer_id, status);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);
CREATE INDEX idx_leads_score ON leads(trainer_id, lead_score DESC);

-- =====================================================
-- LEAD_ACTIVITIES TABLE
-- Activity timeline for each lead
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (
    activity_type IN (
      'email_sent', 'email_opened', 'email_clicked',
      'phone_call', 'text_message', 'meeting',
      'note', 'status_change', 'task_completed'
    )
  ),

  subject TEXT,
  description TEXT,

  -- Related records
  email_template_id UUID REFERENCES email_templates(id),

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Store additional data (e.g., link clicked)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity queries
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);
CREATE INDEX idx_lead_activities_trainer ON lead_activities(trainer_id, created_at DESC);
CREATE INDEX idx_lead_activities_type ON lead_activities(activity_type);

-- =====================================================
-- EMAIL_TEMPLATES TABLE
-- Reusable email templates with variables
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Template details
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Template metadata
  category TEXT CHECK (
    category IN ('welcome', 'follow_up', 'consultation', 'nurture', 're_engagement', 'custom')
  ),

  is_active BOOLEAN DEFAULT true,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Variables used (for validation)
  variables TEXT[] DEFAULT ARRAY['first_name', 'last_name', 'trainer_name'],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(trainer_id, name)
);

-- Indexes for template queries
CREATE INDEX idx_email_templates_trainer ON email_templates(trainer_id);
CREATE INDEX idx_email_templates_category ON email_templates(trainer_id, category);
CREATE INDEX idx_email_templates_active ON email_templates(trainer_id, is_active) WHERE is_active = true;

-- =====================================================
-- EMAIL_SEQUENCES TABLE
-- Automated email drip campaigns
-- =====================================================
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Sequence details
  name TEXT NOT NULL,
  description TEXT,

  -- Trigger conditions
  trigger_on TEXT NOT NULL CHECK (
    trigger_on IN ('lead_created', 'status_change', 'manual', 'date')
  ),
  trigger_status TEXT, -- Which status change triggers this

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(trainer_id, name)
);

-- Indexes for sequence queries
CREATE INDEX idx_email_sequences_trainer ON email_sequences(trainer_id);
CREATE INDEX idx_email_sequences_active ON email_sequences(trainer_id, is_active) WHERE is_active = true;

-- =====================================================
-- SEQUENCE_STEPS TABLE
-- Individual emails in a sequence
-- =====================================================
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  email_template_id UUID NOT NULL REFERENCES email_templates(id),

  -- Step configuration
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  delay_days INTEGER NOT NULL DEFAULT 0 CHECK (delay_days >= 0),
  delay_hours INTEGER DEFAULT 0 CHECK (delay_hours >= 0 AND delay_hours < 24),

  -- Conditions (optional)
  conditions JSONB DEFAULT '{}', -- e.g., only send if previous email opened

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(sequence_id, step_order)
);

-- Indexes for step queries
CREATE INDEX idx_sequence_steps_sequence ON sequence_steps(sequence_id, step_order);

-- =====================================================
-- LEAD_SEQUENCES TABLE
-- Track which leads are enrolled in sequences
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,

  -- Enrollment details
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  current_step INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'completed', 'cancelled')
  ),

  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Next scheduled send
  next_send_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(lead_id, sequence_id)
);

-- Indexes for lead sequence queries
CREATE INDEX idx_lead_sequences_lead ON lead_sequences(lead_id);
CREATE INDEX idx_lead_sequences_next_send ON lead_sequences(next_send_at)
  WHERE status = 'active' AND next_send_at IS NOT NULL;

-- =====================================================
-- EMAIL_SENDS TABLE
-- Track all sent emails
-- =====================================================
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Email details
  email_template_id UUID REFERENCES email_templates(id),
  sequence_id UUID REFERENCES email_sequences(id),
  sequence_step_id UUID REFERENCES sequence_steps(id),

  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  opened_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  clicked_count INTEGER DEFAULT 0,
  bounced BOOLEAN DEFAULT false,

  -- Tracking pixel and links
  tracking_pixel_url TEXT,
  tracked_links JSONB DEFAULT '{}', -- Map of original URL to tracking URL

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email tracking
CREATE INDEX idx_email_sends_trainer ON email_sends(trainer_id, sent_at DESC);
CREATE INDEX idx_email_sends_lead ON email_sends(lead_id, sent_at DESC);
CREATE INDEX idx_email_sends_template ON email_sends(email_template_id);
CREATE INDEX idx_email_sends_tracking ON email_sends(id) WHERE opened_at IS NULL;

-- =====================================================
-- PIPELINE_STAGES TABLE
-- Customizable pipeline stages (beyond default statuses)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stage details
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280', -- Hex color code

  -- Stage order
  display_order INTEGER NOT NULL CHECK (display_order > 0),

  -- Maps to lead status
  maps_to_status TEXT NOT NULL CHECK (
    maps_to_status IN ('new', 'contacted', 'qualified', 'consultation', 'won', 'lost')
  ),

  -- Automation
  auto_move_after_days INTEGER, -- Auto-move leads after N days

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(trainer_id, name),
  UNIQUE(trainer_id, display_order)
);

-- Indexes for pipeline queries
CREATE INDEX idx_pipeline_stages_trainer ON pipeline_stages(trainer_id, display_order);

-- =====================================================
-- LEAD_TASKS TABLE
-- Follow-up tasks and reminders
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (
    task_type IN ('call', 'email', 'meeting', 'follow_up', 'other')
  ),

  -- Scheduling
  due_date DATE,
  due_time TIME,

  -- Status
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Priority
  priority TEXT DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for task queries
CREATE INDEX idx_lead_tasks_trainer ON lead_tasks(trainer_id);
CREATE INDEX idx_lead_tasks_lead ON lead_tasks(lead_id);
CREATE INDEX idx_lead_tasks_due ON lead_tasks(trainer_id, due_date, due_time) WHERE completed = false;
CREATE INDEX idx_lead_tasks_overdue ON lead_tasks(trainer_id, due_date)
  WHERE completed = false AND due_date < CURRENT_DATE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update leads.updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_timestamp();

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_timestamp();

CREATE TRIGGER email_sequences_updated_at
  BEFORE UPDATE ON email_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_timestamp();

CREATE TRIGGER pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_timestamp();

-- Create activity when lead status changes
CREATE OR REPLACE FUNCTION log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_activities (
      lead_id,
      trainer_id,
      activity_type,
      subject,
      description
    ) VALUES (
      NEW.id,
      NEW.trainer_id,
      'status_change',
      'Status changed',
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_status_change_log
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_lead_status_change();

-- Update lead.last_contacted_at when activity is created
CREATE OR REPLACE FUNCTION update_lead_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type IN ('email_sent', 'phone_call', 'text_message', 'meeting') THEN
    UPDATE leads
    SET last_contacted_at = NEW.created_at
    WHERE id = NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_activity_update_last_contacted
  AFTER INSERT ON lead_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_contacted();

-- Increment email template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_template_id IS NOT NULL THEN
    UPDATE email_templates
    SET
      times_used = times_used + 1,
      last_used_at = NOW()
    WHERE id = NEW.email_template_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_send_increment_template
  AFTER INSERT ON email_sends
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Calculate lead score based on activities
CREATE OR REPLACE FUNCTION calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_email_opens INTEGER;
  v_email_clicks INTEGER;
  v_days_since_created INTEGER;
  v_activities_count INTEGER;
BEGIN
  -- Get lead age
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER
  INTO v_days_since_created
  FROM leads
  WHERE id = p_lead_id;

  -- Get activity counts
  SELECT
    COUNT(*) FILTER (WHERE activity_type = 'email_opened'),
    COUNT(*) FILTER (WHERE activity_type = 'email_clicked'),
    COUNT(*)
  INTO v_email_opens, v_email_clicks, v_activities_count
  FROM lead_activities
  WHERE lead_id = p_lead_id;

  -- Scoring logic
  v_score := 0;

  -- Email engagement
  v_score := v_score + (v_email_opens * 5);      -- +5 per open
  v_score := v_score + (v_email_clicks * 10);    -- +10 per click

  -- Activity frequency
  v_score := v_score + (v_activities_count * 3); -- +3 per activity

  -- Recency (decay over time)
  IF v_days_since_created < 7 THEN
    v_score := v_score + 20; -- New leads get boost
  ELSIF v_days_since_created > 30 THEN
    v_score := v_score - 10; -- Old leads lose points
  END IF;

  -- Clamp to 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Update lead
  UPDATE leads
  SET lead_score = v_score
  WHERE id = p_lead_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Get pipeline metrics for trainer
CREATE OR REPLACE FUNCTION get_pipeline_metrics(p_trainer_id UUID)
RETURNS TABLE(
  status TEXT,
  count BIGINT,
  total_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.status,
    COUNT(*)::BIGINT,
    SUM(l.lead_score)::INTEGER
  FROM leads l
  WHERE l.trainer_id = p_trainer_id
    AND l.status NOT IN ('won', 'lost')
  GROUP BY l.status
  ORDER BY
    CASE l.status
      WHEN 'new' THEN 1
      WHEN 'contacted' THEN 2
      WHEN 'qualified' THEN 3
      WHEN 'consultation' THEN 4
    END;
END;
$$ LANGUAGE plpgsql;

-- Get email performance stats
CREATE OR REPLACE FUNCTION get_email_stats(
  p_trainer_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_sent BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  open_rate NUMERIC,
  click_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::BIGINT,
    ROUND(
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::NUMERIC /
      NULLIF(COUNT(*)::NUMERIC, 0) * 100,
      2
    ),
    ROUND(
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::NUMERIC /
      NULLIF(COUNT(*)::NUMERIC, 0) * 100,
      2
    )
  FROM email_sends
  WHERE trainer_id = p_trainer_id
    AND sent_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Trainers can view their own leads"
  ON leads FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can manage their own leads"
  ON leads FOR ALL
  USING (auth.uid() = trainer_id);

-- Lead activities policies
CREATE POLICY "Trainers can view their lead activities"
  ON lead_activities FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create lead activities"
  ON lead_activities FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

-- Email templates policies
CREATE POLICY "Trainers can view their own templates"
  ON email_templates FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can manage their own templates"
  ON email_templates FOR ALL
  USING (auth.uid() = trainer_id);

-- Email sequences policies
CREATE POLICY "Trainers can view their own sequences"
  ON email_sequences FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can manage their own sequences"
  ON email_sequences FOR ALL
  USING (auth.uid() = trainer_id);

-- Sequence steps policies (inherit from parent sequence)
CREATE POLICY "Trainers can view sequence steps"
  ON sequence_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_sequences es
      WHERE es.id = sequence_id AND es.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can manage sequence steps"
  ON sequence_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM email_sequences es
      WHERE es.id = sequence_id AND es.trainer_id = auth.uid()
    )
  );

-- Lead sequences policies
CREATE POLICY "Trainers can view their lead sequences"
  ON lead_sequences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id AND l.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can manage their lead sequences"
  ON lead_sequences FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id AND l.trainer_id = auth.uid()
    )
  );

-- Email sends policies
CREATE POLICY "Trainers can view their email sends"
  ON email_sends FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create email sends"
  ON email_sends FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

-- Pipeline stages policies
CREATE POLICY "Trainers can view their pipeline stages"
  ON pipeline_stages FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can manage their pipeline stages"
  ON pipeline_stages FOR ALL
  USING (auth.uid() = trainer_id);

-- Lead tasks policies
CREATE POLICY "Trainers can view their lead tasks"
  ON lead_tasks FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can manage their lead tasks"
  ON lead_tasks FOR ALL
  USING (auth.uid() = trainer_id);

-- =====================================================
-- SEED DEFAULT PIPELINE STAGES
-- =====================================================

-- Note: This will be run per-trainer on first setup
-- Example seed data (not auto-inserted):
/*
INSERT INTO pipeline_stages (trainer_id, name, description, color, display_order, maps_to_status)
VALUES
  ('TRAINER_UUID', 'New Lead', 'Just entered the system', '#6B7280', 1, 'new'),
  ('TRAINER_UUID', 'Contacted', 'Initial contact made', '#3B82F6', 2, 'contacted'),
  ('TRAINER_UUID', 'Qualified', 'Determined to be a good fit', '#10B981', 3, 'qualified'),
  ('TRAINER_UUID', 'Consultation Scheduled', 'Meeting booked', '#8B5CF6', 4, 'consultation'),
  ('TRAINER_UUID', 'Client', 'Converted to paying client', '#059669', 5, 'won'),
  ('TRAINER_UUID', 'Lost', 'Did not convert', '#DC2626', 6, 'lost');
*/

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE leads IS 'Lead and prospect tracking for trainers';
COMMENT ON TABLE lead_activities IS 'Activity timeline for each lead (emails, calls, notes)';
COMMENT ON TABLE email_templates IS 'Reusable email templates with variable substitution';
COMMENT ON TABLE email_sequences IS 'Automated email drip campaigns';
COMMENT ON TABLE sequence_steps IS 'Individual emails in a sequence with delays';
COMMENT ON TABLE lead_sequences IS 'Tracks which leads are enrolled in which sequences';
COMMENT ON TABLE email_sends IS 'All sent emails with open/click tracking';
COMMENT ON TABLE pipeline_stages IS 'Customizable pipeline stages for kanban view';
COMMENT ON TABLE lead_tasks IS 'Follow-up tasks and reminders for leads';

COMMENT ON COLUMN leads.lead_score IS 'Auto-calculated score (0-100) based on engagement';
COMMENT ON COLUMN leads.do_not_contact IS 'Opt-out flag - do not send emails';
COMMENT ON COLUMN email_templates.variables IS 'Supported variables: {first_name}, {last_name}, {trainer_name}, etc.';
COMMENT ON COLUMN email_sequences.trigger_on IS 'What event triggers enrollment: lead_created, status_change, manual, date';
COMMENT ON COLUMN sequence_steps.delay_days IS 'Days to wait after previous step (or enrollment)';
COMMENT ON COLUMN email_sends.tracking_pixel_url IS 'URL for open tracking pixel';
COMMENT ON COLUMN email_sends.tracked_links IS 'Map of original URLs to tracking URLs for click tracking';
