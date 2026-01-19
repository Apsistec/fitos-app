-- =====================================================
-- Sprint 23: Wearable Recovery Integration
-- Calculate recovery scores and auto-adjust workouts
-- =====================================================

-- =====================================================
-- RECOVERY_SCORES TABLE
-- Daily recovery status from wearable data + subjective
-- =====================================================
CREATE TABLE IF NOT EXISTS recovery_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,

  -- Component scores (0-100 scale)
  hrv_score INTEGER CHECK (hrv_score >= 0 AND hrv_score <= 100),
  sleep_score INTEGER CHECK (sleep_score >= 0 AND sleep_score <= 100),
  resting_hr_score INTEGER CHECK (resting_hr_score >= 0 AND resting_hr_score <= 100),
  subjective_score INTEGER CHECK (subjective_score >= 0 AND subjective_score <= 100),

  -- Overall calculated score (0-100)
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Recovery category
  category TEXT NOT NULL CHECK (
    category IN ('recovered', 'moderate', 'under_recovered', 'critical')
  ),

  -- Workout adjustment modifiers
  intensity_modifier DECIMAL(3,2) DEFAULT 1.0 CHECK (intensity_modifier >= 0.5 AND intensity_modifier <= 1.2),
  volume_modifier DECIMAL(3,2) DEFAULT 1.0 CHECK (volume_modifier >= 0.5 AND volume_modifier <= 1.2),

  -- Recommendation text
  suggested_action TEXT NOT NULL,

  -- Data source tracking
  data_sources JSONB DEFAULT '[]'::JSONB, -- ['terra_api', 'manual_input', etc.]

  -- Confidence score (0-1)
  confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1.0),

  -- User acknowledgment
  user_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,

  -- Workout adjustment tracking
  adjustment_applied BOOLEAN DEFAULT false,
  adjustment_details JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One score per user per day
  UNIQUE(user_id, score_date)
);

-- Indexes
CREATE INDEX idx_recovery_scores_user_date ON recovery_scores(user_id, score_date DESC);
CREATE INDEX idx_recovery_scores_category ON recovery_scores(user_id, category)
  WHERE category IN ('under_recovered', 'critical');
CREATE INDEX idx_recovery_scores_unacknowledged ON recovery_scores(user_id, user_acknowledged)
  WHERE user_acknowledged = false;

-- =====================================================
-- RECOVERY_DATA_POINTS TABLE
-- Raw wearable data used for recovery calculation
-- =====================================================
CREATE TABLE IF NOT EXISTS recovery_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data_date DATE NOT NULL,

  -- HRV data
  hrv_rmssd DECIMAL(6,2), -- Root mean square of successive differences (ms)
  hrv_sdnn DECIMAL(6,2),  -- Standard deviation of NN intervals (ms)

  -- Heart rate data
  resting_hr INTEGER,
  avg_hr_awake INTEGER,
  hr_variability_index DECIMAL(5,2),

  -- Sleep data
  sleep_duration_minutes INTEGER,
  sleep_efficiency DECIMAL(5,2), -- Percentage
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  awakenings_count INTEGER,
  sleep_quality_rating INTEGER CHECK (sleep_quality_rating >= 1 AND sleep_quality_rating <= 5),

  -- Activity data (for context, not score calculation)
  steps INTEGER,
  active_minutes INTEGER,
  training_load DECIMAL(6,2), -- From previous workouts

  -- Subjective data
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  muscle_soreness INTEGER CHECK (muscle_soreness >= 1 AND muscle_soreness <= 5),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),

  -- Source tracking
  source TEXT DEFAULT 'manual' CHECK (
    source IN ('terra_api', 'manual', 'whoop', 'oura', 'garmin', 'apple_health', 'fitbit')
  ),
  raw_data JSONB, -- Store original API response

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, data_date, source)
);

-- Indexes
CREATE INDEX idx_recovery_data_user_date ON recovery_data_points(user_id, data_date DESC);
CREATE INDEX idx_recovery_data_source ON recovery_data_points(source);

-- =====================================================
-- RECOVERY_ADJUSTMENT_LOG TABLE
-- Track when users accept/reject recovery recommendations
-- =====================================================
CREATE TABLE IF NOT EXISTS recovery_adjustment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recovery_score_id UUID REFERENCES recovery_scores(id) ON DELETE SET NULL,
  workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,

  -- Recovery state at time of workout
  recovery_category TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  suggested_intensity_modifier DECIMAL(3,2),
  suggested_volume_modifier DECIMAL(3,2),

  -- User action
  action_taken TEXT NOT NULL CHECK (
    action_taken IN ('accepted', 'rejected', 'modified', 'skipped_workout')
  ),

  -- If accepted or modified
  actual_intensity_modifier DECIMAL(3,2),
  actual_volume_modifier DECIMAL(3,2),

  -- User feedback
  user_notes TEXT,
  felt_appropriate BOOLEAN, -- Retrospective: was recommendation helpful?

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recovery_adjustment_user ON recovery_adjustment_log(user_id, created_at DESC);
CREATE INDEX idx_recovery_adjustment_action ON recovery_adjustment_log(action_taken);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Recovery Scores
ALTER TABLE recovery_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recovery scores"
  ON recovery_scores FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own recovery scores"
  ON recovery_scores FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recovery scores"
  ON recovery_scores FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can view their clients' recovery scores"
  ON recovery_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = recovery_scores.user_id
        AND cp.trainer_id = auth.uid()
        AND true
    )
  );

-- Recovery Data Points
ALTER TABLE recovery_data_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recovery data"
  ON recovery_data_points FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can view their clients' recovery data"
  ON recovery_data_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = recovery_data_points.user_id
        AND cp.trainer_id = auth.uid()
        AND true
    )
  );

-- Recovery Adjustment Log
ALTER TABLE recovery_adjustment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recovery logs"
  ON recovery_adjustment_log FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can view their clients' recovery logs"
  ON recovery_adjustment_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = recovery_adjustment_log.user_id
        AND cp.trainer_id = auth.uid()
        AND true
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recovery_score_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recovery_score_timestamp
  BEFORE UPDATE ON recovery_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_recovery_score_updated_at();

-- Calculate overall recovery score from components
CREATE OR REPLACE FUNCTION calculate_recovery_score(
  p_hrv_score INTEGER,
  p_sleep_score INTEGER,
  p_resting_hr_score INTEGER,
  p_subjective_score INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_overall_score INTEGER;
  v_weight_sum DECIMAL(3,2);
  v_score_sum DECIMAL(6,2);
BEGIN
  -- Weighted average of available scores
  v_weight_sum := 0;
  v_score_sum := 0;

  IF p_hrv_score IS NOT NULL THEN
    v_score_sum := v_score_sum + (p_hrv_score * 0.35);
    v_weight_sum := v_weight_sum + 0.35;
  END IF;

  IF p_sleep_score IS NOT NULL THEN
    v_score_sum := v_score_sum + (p_sleep_score * 0.35);
    v_weight_sum := v_weight_sum + 0.35;
  END IF;

  IF p_resting_hr_score IS NOT NULL THEN
    v_score_sum := v_score_sum + (p_resting_hr_score * 0.20);
    v_weight_sum := v_weight_sum + 0.20;
  END IF;

  IF p_subjective_score IS NOT NULL THEN
    v_score_sum := v_score_sum + (p_subjective_score * 0.10);
    v_weight_sum := v_weight_sum + 0.10;
  END IF;

  -- Normalize to 0-100
  IF v_weight_sum > 0 THEN
    v_overall_score := ROUND(v_score_sum / v_weight_sum);
  ELSE
    v_overall_score := 50; -- Default if no data
  END IF;

  RETURN v_overall_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Determine recovery category from score
CREATE OR REPLACE FUNCTION get_recovery_category(p_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'recovered';
  ELSIF p_score >= 60 THEN
    RETURN 'moderate';
  ELSIF p_score >= 40 THEN
    RETURN 'under_recovered';
  ELSE
    RETURN 'critical';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get intensity modifier based on recovery category
CREATE OR REPLACE FUNCTION get_intensity_modifier(p_category TEXT)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  CASE p_category
    WHEN 'recovered' THEN RETURN 1.1;
    WHEN 'moderate' THEN RETURN 1.0;
    WHEN 'under_recovered' THEN RETURN 0.8;
    WHEN 'critical' THEN RETURN 0.6;
    ELSE RETURN 1.0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get volume modifier based on recovery category
CREATE OR REPLACE FUNCTION get_volume_modifier(p_category TEXT)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  CASE p_category
    WHEN 'recovered' THEN RETURN 1.0;
    WHEN 'moderate' THEN RETURN 1.0;
    WHEN 'under_recovered' THEN RETURN 0.8;
    WHEN 'critical' THEN RETURN 0.7;
    ELSE RETURN 1.0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get suggested action text
CREATE OR REPLACE FUNCTION get_recovery_action(p_category TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE p_category
    WHEN 'recovered' THEN
      RETURN 'Great recovery! You''re ready for high-intensity training.';
    WHEN 'moderate' THEN
      RETURN 'Good recovery. Proceed with your planned workout.';
    WHEN 'under_recovered' THEN
      RETURN 'Consider reducing intensity by 20% and volume by 20% today.';
    WHEN 'critical' THEN
      RETURN 'Poor recovery. Consider rest day or very light activity only.';
    ELSE
      RETURN 'Proceed with your planned workout.';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- VIEWS
-- =====================================================

-- Latest recovery score per user
CREATE OR REPLACE VIEW latest_recovery_scores AS
SELECT DISTINCT ON (user_id)
  id,
  user_id,
  score_date,
  overall_score,
  category,
  intensity_modifier,
  volume_modifier,
  suggested_action,
  user_acknowledged,
  created_at
FROM recovery_scores
ORDER BY user_id, score_date DESC, created_at DESC;

-- Recovery trend (last 7 days)
CREATE OR REPLACE VIEW recovery_trends AS
SELECT
  user_id,
  AVG(overall_score) AS avg_score_7d,
  MIN(overall_score) AS min_score_7d,
  MAX(overall_score) AS max_score_7d,
  COUNT(*) AS days_tracked,
  COUNT(*) FILTER (WHERE category IN ('under_recovered', 'critical')) AS days_under_recovered
FROM recovery_scores
WHERE score_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY user_id;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE recovery_scores IS 'Daily recovery status calculated from wearable data and subjective input';
COMMENT ON TABLE recovery_data_points IS 'Raw wearable data points used for recovery score calculation';
COMMENT ON TABLE recovery_adjustment_log IS 'Track user response to recovery recommendations';

COMMENT ON COLUMN recovery_scores.overall_score IS '0-100 weighted average of component scores (HRV 35%, Sleep 35%, HR 20%, Subjective 10%)';
COMMENT ON COLUMN recovery_scores.category IS 'recovered (80+), moderate (60-79), under_recovered (40-59), critical (<40)';
COMMENT ON COLUMN recovery_scores.intensity_modifier IS 'Suggested workout intensity adjustment: 1.1 (recovered), 1.0 (moderate), 0.8 (under), 0.6 (critical)';
COMMENT ON COLUMN recovery_scores.volume_modifier IS 'Suggested workout volume adjustment: 1.0 (recovered/moderate), 0.8 (under), 0.7 (critical)';
COMMENT ON COLUMN recovery_scores.confidence IS 'Confidence in score based on data completeness (1.0 = all sources, <1.0 = partial data)';

COMMENT ON FUNCTION calculate_recovery_score IS 'Weighted average: HRV 35%, Sleep 35%, HR 20%, Subjective 10%';
COMMENT ON FUNCTION get_recovery_category IS 'Map score to category: 80+ recovered, 60-79 moderate, 40-59 under_recovered, <40 critical';
COMMENT ON FUNCTION get_intensity_modifier IS 'Workout intensity adjustment based on recovery category';
COMMENT ON FUNCTION get_volume_modifier IS 'Workout volume adjustment based on recovery category';
