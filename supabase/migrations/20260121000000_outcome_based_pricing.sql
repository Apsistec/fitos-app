-- Sprint 43: Outcome-Based Pricing
-- Migration: 20260121000000_outcome_based_pricing
-- Description: Implements outcome-based pricing system where pricing scales with verified client results

-- =============================================================================
-- OUTCOME-BASED PRICING TIERS
-- =============================================================================

CREATE TABLE outcome_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price_cents INTEGER NOT NULL CHECK (base_price_cents >= 0),
  outcome_bonus_cents INTEGER CHECK (outcome_bonus_cents >= 0),
  verification_method TEXT NOT NULL CHECK (verification_method IN ('weight_loss', 'strength_gain', 'body_comp', 'consistency', 'custom')),
  tier_config JSONB DEFAULT '{}', -- Additional configuration (thresholds, frequencies, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_pricing CHECK (base_price_cents > 0 OR outcome_bonus_cents > 0)
);

COMMENT ON TABLE outcome_pricing_tiers IS 'Pricing tiers that scale based on verified client outcomes';
COMMENT ON COLUMN outcome_pricing_tiers.base_price_cents IS 'Base monthly price in cents';
COMMENT ON COLUMN outcome_pricing_tiers.outcome_bonus_cents IS 'Bonus amount per milestone in cents';
COMMENT ON COLUMN outcome_pricing_tiers.tier_config IS 'JSON config for milestone thresholds, bonus structure, etc.';

-- =============================================================================
-- CLIENT OUTCOME GOALS
-- =============================================================================

CREATE TABLE client_outcome_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pricing_tier_id UUID REFERENCES outcome_pricing_tiers(id) ON DELETE SET NULL,

  -- Goal details
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weight_loss', 'strength_gain', 'body_comp', 'consistency', 'custom')),
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2),
  start_value DECIMAL(10,2) NOT NULL,
  unit TEXT, -- 'lbs', 'kg', '%', 'reps', etc.

  -- Timeline
  target_date DATE NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  achieved_date DATE,

  -- Verification
  verification_frequency TEXT DEFAULT 'weekly' CHECK (verification_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  last_verified_at TIMESTAMPTZ,
  next_verification_due TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned', 'expired')),

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_goal_values CHECK (
    (goal_type = 'weight_loss' AND target_value < start_value) OR
    (goal_type = 'strength_gain' AND target_value > start_value) OR
    (goal_type IN ('body_comp', 'consistency', 'custom'))
  ),
  CONSTRAINT valid_dates CHECK (target_date > start_date)
);

COMMENT ON TABLE client_outcome_goals IS 'Client goals linked to outcome-based pricing tiers';
COMMENT ON COLUMN client_outcome_goals.metadata IS 'Additional goal context (exercise IDs for strength, body parts for comp, etc.)';

-- =============================================================================
-- OUTCOME VERIFICATIONS
-- =============================================================================

CREATE TABLE outcome_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES client_outcome_goals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Verification details
  verification_type TEXT NOT NULL, -- 'weight_check', '1rm_test', 'body_scan', 'workout_consistency'
  measured_value DECIMAL(10,2) NOT NULL,
  unit TEXT,

  -- Method and confidence
  verification_method TEXT NOT NULL CHECK (verification_method IN ('manual', 'workout_data', 'nutrition_data', 'photo', 'wearable', 'ai_analyzed')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00), -- 0.00-1.00

  -- Timing
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES profiles(id), -- NULL if automated

  -- Supporting data
  notes TEXT,
  photo_urls TEXT[], -- Evidence photos
  source_ids UUID[], -- IDs of workout_logs, nutrition_logs, etc.
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE outcome_verifications IS 'Records of outcome measurements and verifications';
COMMENT ON COLUMN outcome_verifications.confidence_score IS 'AI confidence in verification accuracy (1.0 = highest)';
COMMENT ON COLUMN outcome_verifications.source_ids IS 'Reference IDs to source data (workout logs, nutrition entries, etc.)';

-- =============================================================================
-- OUTCOME MILESTONES
-- =============================================================================

CREATE TABLE outcome_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES client_outcome_goals(id) ON DELETE CASCADE,

  -- Milestone definition
  milestone_percent DECIMAL(5,2) NOT NULL CHECK (milestone_percent > 0 AND milestone_percent <= 100), -- 25.00 = 25%
  milestone_value DECIMAL(10,2), -- The actual value at this milestone

  -- Achievement
  achieved_at TIMESTAMPTZ,
  verification_id UUID REFERENCES outcome_verifications(id),

  -- Bonus
  bonus_applied BOOLEAN DEFAULT false,
  bonus_amount_cents INTEGER CHECK (bonus_amount_cents >= 0),

  -- Celebration
  celebration_sent BOOLEAN DEFAULT false,
  celebration_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE outcome_milestones IS 'Progress milestones for outcome goals (25%, 50%, 75%, 100%)';

-- =============================================================================
-- PRICING ADJUSTMENTS
-- =============================================================================

CREATE TABLE pricing_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES client_outcome_goals(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES outcome_milestones(id) ON DELETE SET NULL,

  -- Adjustment details
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('milestone_bonus', 'goal_achieved', 'consistency_bonus', 'early_achievement', 'manual_adjustment')),
  amount_cents INTEGER NOT NULL, -- Can be negative for refunds/adjustments
  description TEXT,

  -- Payment processing
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_invoice_id TEXT,
  stripe_invoice_item_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'invoiced', 'paid', 'failed', 'refunded')),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pricing_adjustments IS 'History of pricing adjustments based on outcome achievements';

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Outcome pricing tiers
CREATE INDEX idx_outcome_pricing_tiers_trainer ON outcome_pricing_tiers(trainer_id) WHERE is_active = true;
CREATE INDEX idx_outcome_pricing_tiers_active ON outcome_pricing_tiers(is_active);

-- Client outcome goals
CREATE INDEX idx_outcome_goals_client ON client_outcome_goals(client_id);
CREATE INDEX idx_outcome_goals_trainer ON client_outcome_goals(trainer_id);
CREATE INDEX idx_outcome_goals_status ON client_outcome_goals(status);
CREATE INDEX idx_outcome_goals_active ON client_outcome_goals(client_id, trainer_id) WHERE status = 'active';
CREATE INDEX idx_outcome_goals_next_verification ON client_outcome_goals(next_verification_due) WHERE status = 'active';

-- Verifications
CREATE INDEX idx_verifications_goal ON outcome_verifications(goal_id);
CREATE INDEX idx_verifications_client ON outcome_verifications(client_id);
CREATE INDEX idx_verifications_date ON outcome_verifications(verified_at DESC);
CREATE INDEX idx_verifications_confidence ON outcome_verifications(confidence_score) WHERE confidence_score < 0.80;

-- Milestones
CREATE INDEX idx_milestones_goal ON outcome_milestones(goal_id);
CREATE INDEX idx_milestones_achieved ON outcome_milestones(achieved_at) WHERE achieved_at IS NOT NULL;
CREATE INDEX idx_milestones_pending_celebration ON outcome_milestones(goal_id) WHERE achieved_at IS NOT NULL AND celebration_sent = false;

-- Pricing adjustments
CREATE INDEX idx_pricing_adjustments_client ON pricing_adjustments(client_id);
CREATE INDEX idx_pricing_adjustments_trainer ON pricing_adjustments(trainer_id);
CREATE INDEX idx_pricing_adjustments_goal ON pricing_adjustments(goal_id);
CREATE INDEX idx_pricing_adjustments_payment_status ON pricing_adjustments(payment_status);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE outcome_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_outcome_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_adjustments ENABLE ROW LEVEL SECURITY;

-- Outcome Pricing Tiers Policies
CREATE POLICY "Trainers can view their own pricing tiers"
  ON outcome_pricing_tiers FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create their own pricing tiers"
  ON outcome_pricing_tiers FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own pricing tiers"
  ON outcome_pricing_tiers FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own pricing tiers"
  ON outcome_pricing_tiers FOR DELETE
  USING (auth.uid() = trainer_id);

-- Client Outcome Goals Policies
CREATE POLICY "Clients and trainers can view their goals"
  ON client_outcome_goals FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = trainer_id);

CREATE POLICY "Trainers can create goals for clients"
  ON client_outcome_goals FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers and clients can update their goals"
  ON client_outcome_goals FOR UPDATE
  USING (auth.uid() = trainer_id OR auth.uid() = client_id);

-- Outcome Verifications Policies
CREATE POLICY "Clients and trainers can view verifications"
  ON outcome_verifications FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = trainer_id);

CREATE POLICY "Trainers can create verifications"
  ON outcome_verifications FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update verifications"
  ON outcome_verifications FOR UPDATE
  USING (auth.uid() = trainer_id);

-- Outcome Milestones Policies
CREATE POLICY "Clients and trainers can view milestones"
  ON outcome_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_outcome_goals
      WHERE id = goal_id AND (client_id = auth.uid() OR trainer_id = auth.uid())
    )
  );

CREATE POLICY "System can manage milestones"
  ON outcome_milestones FOR ALL
  USING (true) -- Managed via service_role key
  WITH CHECK (true);

-- Pricing Adjustments Policies
CREATE POLICY "Clients and trainers can view pricing adjustments"
  ON pricing_adjustments FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = trainer_id);

CREATE POLICY "System can create pricing adjustments"
  ON pricing_adjustments FOR INSERT
  WITH CHECK (true); -- Managed via service_role key

-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================

-- Function to calculate goal progress percentage
CREATE OR REPLACE FUNCTION calculate_goal_progress(goal_id_param UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  goal_record client_outcome_goals%ROWTYPE;
  progress_percent DECIMAL(5,2);
BEGIN
  SELECT * INTO goal_record FROM client_outcome_goals WHERE id = goal_id_param;

  IF goal_record IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate progress based on goal type
  IF goal_record.goal_type = 'weight_loss' THEN
    -- Weight loss: progress = (start - current) / (start - target) * 100
    progress_percent := (goal_record.start_value - COALESCE(goal_record.current_value, goal_record.start_value)) /
                        (goal_record.start_value - goal_record.target_value) * 100;
  ELSIF goal_record.goal_type = 'strength_gain' THEN
    -- Strength gain: progress = (current - start) / (target - start) * 100
    progress_percent := (COALESCE(goal_record.current_value, goal_record.start_value) - goal_record.start_value) /
                        (goal_record.target_value - goal_record.start_value) * 100;
  ELSE
    -- Other types: simple percentage
    progress_percent := (COALESCE(goal_record.current_value, 0) / goal_record.target_value) * 100;
  END IF;

  -- Cap at 100%
  RETURN LEAST(progress_percent, 100.00);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_goal_progress IS 'Calculates progress percentage for a given outcome goal';

-- Function to check and create milestones
CREATE OR REPLACE FUNCTION check_and_create_milestones(goal_id_param UUID)
RETURNS void AS $$
DECLARE
  progress_percent DECIMAL(5,2);
  milestone_percent DECIMAL(5,2);
  goal_record client_outcome_goals%ROWTYPE;
BEGIN
  -- Get current progress
  progress_percent := calculate_goal_progress(goal_id_param);
  SELECT * INTO goal_record FROM client_outcome_goals WHERE id = goal_id_param;

  -- Check standard milestones: 25%, 50%, 75%, 100%
  FOR milestone_percent IN VALUES (25.00), (50.00), (75.00), (100.00) LOOP
    IF progress_percent >= milestone_percent THEN
      -- Create milestone if it doesn't exist
      INSERT INTO outcome_milestones (goal_id, milestone_percent, achieved_at)
      VALUES (goal_id_param, milestone_percent, NOW())
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Mark goal as achieved if 100%
  IF progress_percent >= 100.00 THEN
    UPDATE client_outcome_goals
    SET status = 'achieved', achieved_date = CURRENT_DATE
    WHERE id = goal_id_param AND status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_and_create_milestones IS 'Checks progress and creates milestone records at 25%, 50%, 75%, 100%';

-- Function to update goal current value after verification
CREATE OR REPLACE FUNCTION update_goal_from_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_value and last_verified_at in goal
  UPDATE client_outcome_goals
  SET
    current_value = NEW.measured_value,
    last_verified_at = NEW.verified_at,
    updated_at = NOW()
  WHERE id = NEW.goal_id;

  -- Check for new milestones
  PERFORM check_and_create_milestones(NEW.goal_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update goal after verification
CREATE TRIGGER trigger_update_goal_from_verification
  AFTER INSERT ON outcome_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_from_verification();

COMMENT ON FUNCTION update_goal_from_verification IS 'Trigger function to update goal progress after verification';

-- Function to calculate next verification due date
CREATE OR REPLACE FUNCTION calculate_next_verification_due(
  current_date TIMESTAMPTZ,
  frequency TEXT
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CASE frequency
    WHEN 'daily' THEN current_date + INTERVAL '1 day'
    WHEN 'weekly' THEN current_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN current_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN current_date + INTERVAL '1 month'
    ELSE current_date + INTERVAL '1 week'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get trainer's outcome pricing analytics
CREATE OR REPLACE FUNCTION get_trainer_outcome_analytics(trainer_id_param UUID)
RETURNS TABLE (
  total_outcome_clients BIGINT,
  active_goals BIGINT,
  achieved_goals BIGINT,
  avg_completion_rate DECIMAL(5,2),
  total_bonus_revenue_cents BIGINT,
  pending_verifications BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cog.client_id) AS total_outcome_clients,
    COUNT(*) FILTER (WHERE cog.status = 'active') AS active_goals,
    COUNT(*) FILTER (WHERE cog.status = 'achieved') AS achieved_goals,
    AVG(calculate_goal_progress(cog.id)) AS avg_completion_rate,
    COALESCE(SUM(pa.amount_cents) FILTER (WHERE pa.adjustment_type LIKE '%bonus%'), 0) AS total_bonus_revenue_cents,
    COUNT(*) FILTER (WHERE cog.status = 'active' AND cog.next_verification_due < NOW()) AS pending_verifications
  FROM client_outcome_goals cog
  LEFT JOIN pricing_adjustments pa ON pa.goal_id = cog.id
  WHERE cog.trainer_id = trainer_id_param;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_trainer_outcome_analytics IS 'Returns analytics summary for trainer outcome-based pricing';

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER set_outcome_pricing_tiers_updated_at
  BEFORE UPDATE ON outcome_pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_client_outcome_goals_updated_at
  BEFORE UPDATE ON client_outcome_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
