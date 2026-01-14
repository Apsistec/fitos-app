-- =====================================================
-- Sprint 21: Progressive Autonomy Transfer System
-- Client independence scoring and graduation tracking
-- =====================================================

-- =====================================================
-- AUTONOMY_ASSESSMENTS TABLE
-- Track client readiness for independent training
-- =====================================================
CREATE TABLE IF NOT EXISTS autonomy_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Knowledge scores (0-100)
  workout_knowledge JSONB DEFAULT '{
    "form": 0,
    "periodization": 0,
    "modification": 0,
    "exercise_selection": 0
  }',

  nutrition_knowledge JSONB DEFAULT '{
    "tracking_accuracy": 0,
    "portion_estimation": 0,
    "flexibility": 0,
    "meal_planning": 0
  }',

  behavior_consistency JSONB DEFAULT '{
    "workout_90d": 0,
    "nutrition_90d": 0,
    "self_initiated": 0,
    "recovery_awareness": 0
  }',

  -- Overall metrics
  overall_score INTEGER DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),

  readiness_level TEXT DEFAULT 'learning' CHECK (
    readiness_level IN ('learning', 'progressing', 'near_ready', 'ready')
  ),

  recommended_action TEXT CHECK (
    recommended_action IN (
      'continue_current',
      'increase_independence',
      'reduce_frequency',
      'offer_graduation'
    )
  ),

  -- Assessment metadata
  notes TEXT,
  next_assessment_at TIMESTAMPTZ,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_autonomy_client ON autonomy_assessments(client_id, assessed_at DESC);
CREATE INDEX idx_autonomy_trainer ON autonomy_assessments(trainer_id);
CREATE INDEX idx_autonomy_readiness ON autonomy_assessments(client_id, readiness_level);
CREATE INDEX idx_autonomy_next_assessment ON autonomy_assessments(next_assessment_at)
  WHERE next_assessment_at IS NOT NULL;

-- =====================================================
-- CLIENT_GRADUATIONS TABLE
-- Track graduation events and maintenance mode
-- =====================================================
CREATE TABLE IF NOT EXISTS client_graduations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Graduation details
  graduation_type TEXT DEFAULT 'full' CHECK (
    graduation_type IN ('full', 'maintenance', 'check_in_only')
  ),

  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'completed', 'reverted')
  ),

  -- Pricing changes
  previous_pricing_tier TEXT,
  new_pricing_tier TEXT,
  pricing_reduced_by INTEGER, -- percentage reduction
  pricing_change_effective_date DATE,

  -- Check-in schedule
  check_in_frequency TEXT CHECK (
    check_in_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'none')
  ),
  next_check_in_at TIMESTAMPTZ,

  -- Journey stats (before graduation)
  journey_stats JSONB DEFAULT '{}', -- {days_trained: 180, workouts_completed: 72, weight_change: -15, ...}
  achievements TEXT[], -- Array of achievement descriptions

  -- Celebration
  celebration_sent BOOLEAN DEFAULT false,
  celebration_sent_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  graduated_at TIMESTAMPTZ DEFAULT NOW(),
  reverted_at TIMESTAMPTZ,
  revert_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_graduations_client ON client_graduations(client_id, graduated_at DESC);
CREATE INDEX idx_graduations_trainer ON client_graduations(trainer_id, status);
CREATE INDEX idx_graduations_next_checkin ON client_graduations(next_check_in_at)
  WHERE status = 'active' AND next_check_in_at IS NOT NULL;
CREATE INDEX idx_graduations_status ON client_graduations(status);

-- =====================================================
-- MAINTENANCE_CHECK_INS TABLE
-- Track quarterly/periodic check-ins with graduated clients
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graduation_id UUID NOT NULL REFERENCES client_graduations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Check-in details
  check_in_type TEXT DEFAULT 'scheduled' CHECK (
    check_in_type IN ('scheduled', 'client_initiated', 'concern_flagged')
  ),

  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'skipped', 'rescheduled')
  ),

  -- Assessment
  current_performance JSONB DEFAULT '{}', -- {workout_frequency: 3, adherence: 85, confidence: 90}
  concerns TEXT[],
  action_items TEXT[],

  -- Outcome
  outcome TEXT CHECK (
    outcome IN ('continue_maintenance', 'increase_support', 'revert_to_full_coaching', 'extend_graduation')
  ),

  notes TEXT,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_check_ins_graduation ON maintenance_check_ins(graduation_id);
CREATE INDEX idx_check_ins_client ON maintenance_check_ins(client_id, scheduled_for DESC);
CREATE INDEX idx_check_ins_scheduled ON maintenance_check_ins(scheduled_for)
  WHERE status = 'pending';

-- =====================================================
-- AUTONOMY_MILESTONES TABLE
-- Track key independence milestones achieved
-- =====================================================
CREATE TABLE IF NOT EXISTS autonomy_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Milestone details
  milestone_type TEXT NOT NULL CHECK (
    milestone_type IN (
      'first_self_modified_workout',
      'first_deload_week_recognized',
      'consistent_nutrition_tracking_30d',
      'proactive_recovery_management',
      'exercise_form_mastery',
      'periodization_understanding',
      'nutrition_flexibility_demonstrated',
      'injury_prevention_awareness',
      'plateau_troubleshooting',
      'goal_adjustment_initiated'
    )
  ),

  title TEXT NOT NULL,
  description TEXT,
  evidence TEXT, -- What demonstrated this milestone

  -- Impact
  autonomy_score_increase INTEGER DEFAULT 0,

  -- Celebration
  celebrated BOOLEAN DEFAULT false,
  celebration_message TEXT,

  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_milestones_client ON autonomy_milestones(client_id, achieved_at DESC);
CREATE INDEX idx_milestones_type ON autonomy_milestones(milestone_type);
CREATE INDEX idx_milestones_celebrated ON autonomy_milestones(celebrated);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Autonomy Assessments
ALTER TABLE autonomy_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their clients' autonomy assessments"
  ON autonomy_assessments FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
  );

CREATE POLICY "Trainers can create autonomy assessments"
  ON autonomy_assessments FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their autonomy assessments"
  ON autonomy_assessments FOR UPDATE
  USING (trainer_id = auth.uid());

-- Client Graduations
ALTER TABLE client_graduations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers and clients can view graduations"
  ON client_graduations FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
  );

CREATE POLICY "Trainers can create graduations"
  ON client_graduations FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their graduations"
  ON client_graduations FOR UPDATE
  USING (trainer_id = auth.uid());

-- Maintenance Check-ins
ALTER TABLE maintenance_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers and clients can view check-ins"
  ON maintenance_check_ins FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
  );

CREATE POLICY "Trainers can manage check-ins"
  ON maintenance_check_ins FOR ALL
  USING (trainer_id = auth.uid());

-- Autonomy Milestones
ALTER TABLE autonomy_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers and clients can view milestones"
  ON autonomy_milestones FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
  );

CREATE POLICY "Trainers can create milestones"
  ON autonomy_milestones FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their milestones"
  ON autonomy_milestones FOR UPDATE
  USING (trainer_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate autonomy score from assessment JSON
CREATE OR REPLACE FUNCTION calculate_autonomy_score(
  p_workout_knowledge JSONB,
  p_nutrition_knowledge JSONB,
  p_behavior_consistency JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_workout_avg NUMERIC;
  v_nutrition_avg NUMERIC;
  v_behavior_avg NUMERIC;
  v_total_score INTEGER;
BEGIN
  -- Calculate averages from each category
  v_workout_avg := (
    (p_workout_knowledge->>'form')::NUMERIC +
    (p_workout_knowledge->>'periodization')::NUMERIC +
    (p_workout_knowledge->>'modification')::NUMERIC +
    (p_workout_knowledge->>'exercise_selection')::NUMERIC
  ) / 4.0;

  v_nutrition_avg := (
    (p_nutrition_knowledge->>'tracking_accuracy')::NUMERIC +
    (p_nutrition_knowledge->>'portion_estimation')::NUMERIC +
    (p_nutrition_knowledge->>'flexibility')::NUMERIC +
    (p_nutrition_knowledge->>'meal_planning')::NUMERIC
  ) / 4.0;

  v_behavior_avg := (
    (p_behavior_consistency->>'workout_90d')::NUMERIC +
    (p_behavior_consistency->>'nutrition_90d')::NUMERIC +
    (p_behavior_consistency->>'self_initiated')::NUMERIC +
    (p_behavior_consistency->>'recovery_awareness')::NUMERIC
  ) / 4.0;

  -- Weighted average: behavior 40%, workout 35%, nutrition 25%
  v_total_score := ROUND(
    (v_behavior_avg * 0.40) +
    (v_workout_avg * 0.35) +
    (v_nutrition_avg * 0.25)
  );

  RETURN v_total_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Determine readiness level from score
CREATE OR REPLACE FUNCTION get_readiness_level(p_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN p_score >= 80 THEN 'ready'
    WHEN p_score >= 65 THEN 'near_ready'
    WHEN p_score >= 40 THEN 'progressing'
    ELSE 'learning'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get recommended action based on readiness level and assessment count
CREATE OR REPLACE FUNCTION get_recommended_action(
  p_client_id UUID,
  p_readiness_level TEXT
) RETURNS TEXT AS $$
DECLARE
  v_assessment_count INTEGER;
  v_months_as_client INTEGER;
BEGIN
  -- Count previous assessments
  SELECT COUNT(*) INTO v_assessment_count
  FROM autonomy_assessments
  WHERE client_id = p_client_id;

  -- Get months as client
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / (30 * 24 * 60 * 60)
  INTO v_months_as_client
  FROM profiles
  WHERE id = p_client_id;

  RETURN CASE
    WHEN p_readiness_level = 'ready' AND v_months_as_client >= 6 THEN 'offer_graduation'
    WHEN p_readiness_level = 'near_ready' THEN 'reduce_frequency'
    WHEN p_readiness_level = 'progressing' AND v_assessment_count >= 3 THEN 'increase_independence'
    ELSE 'continue_current'
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- TRIGGER: Auto-update graduation updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_graduation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_graduation_timestamp
  BEFORE UPDATE ON client_graduations
  FOR EACH ROW
  EXECUTE FUNCTION update_graduation_updated_at();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE autonomy_assessments IS 'Tracks client readiness for independent training through scoring knowledge, nutrition, and behavioral consistency';
COMMENT ON TABLE client_graduations IS 'Manages client graduation to maintenance mode with reduced pricing and check-in schedules';
COMMENT ON TABLE maintenance_check_ins IS 'Schedules and tracks periodic check-ins with graduated clients';
COMMENT ON TABLE autonomy_milestones IS 'Records key independence achievements that contribute to autonomy score';

COMMENT ON FUNCTION calculate_autonomy_score IS 'Calculates weighted autonomy score: 40% behavior, 35% workout knowledge, 25% nutrition knowledge';
COMMENT ON FUNCTION get_readiness_level IS 'Maps autonomy score to readiness level: 80+ ready, 65+ near_ready, 40+ progressing, <40 learning';
COMMENT ON FUNCTION get_recommended_action IS 'Recommends next action based on readiness level and client tenure';
