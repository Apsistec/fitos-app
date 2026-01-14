-- Sprint 19: Adaptive Streak Healing
-- Weekly-based streak system with forgiveness mechanisms

-- Streaks table: Track user streak progress
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('workout', 'nutrition', 'combined')),
  current_weeks INTEGER DEFAULT 0,
  longest_weeks INTEGER DEFAULT 0,
  target_days_per_week INTEGER DEFAULT 4,
  grace_days_remaining INTEGER DEFAULT 4,
  last_grace_reset TIMESTAMPTZ DEFAULT NOW(),
  repair_available BOOLEAN DEFAULT false,
  repair_expires_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

-- Weekly consistency tracking
CREATE TABLE weekly_consistency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('workout', 'nutrition', 'combined')),
  target_days INTEGER NOT NULL DEFAULT 4,
  completed_days INTEGER DEFAULT 0,
  bonus_days INTEGER DEFAULT 0, -- From repairs
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'partial', 'missed')),
  repair_used BOOLEAN DEFAULT false,
  repair_method TEXT CHECK (repair_method IN ('bonus_workout', 'extended_session', 'grace_day')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start, streak_type)
);

-- Streak repair log: Track repair attempts and outcomes
CREATE TABLE streak_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_id UUID NOT NULL REFERENCES streaks(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  repair_method TEXT NOT NULL CHECK (repair_method IN ('bonus_workout', 'extended_session', 'grace_day')),
  days_earned INTEGER DEFAULT 1,
  accepted BOOLEAN DEFAULT true,
  repaired_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streak milestones: Track achievement milestones
CREATE TABLE streak_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('workout', 'nutrition', 'combined')),
  milestone_weeks INTEGER NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, streak_type, milestone_weeks)
);

-- Indexes
CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_user_type ON streaks(user_id, streak_type);
CREATE INDEX idx_weekly_consistency_user_week ON weekly_consistency(user_id, week_start);
CREATE INDEX idx_weekly_consistency_status ON weekly_consistency(status);
CREATE INDEX idx_streak_repairs_user_id ON streak_repairs(user_id);
CREATE INDEX idx_streak_milestones_user_id ON streak_milestones(user_id);

-- RLS Policies
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_consistency ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;

-- Users can view and modify their own streaks
CREATE POLICY "Users can view their own streaks"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view and modify their own weekly consistency
CREATE POLICY "Users can view their own weekly consistency"
  ON weekly_consistency FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly consistency"
  ON weekly_consistency FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly consistency"
  ON weekly_consistency FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view their own repairs
CREATE POLICY "Users can view their own repairs"
  ON streak_repairs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repairs"
  ON streak_repairs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own milestones
CREATE POLICY "Users can view their own milestones"
  ON streak_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own milestones"
  ON streak_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trainers can view their clients' streaks
CREATE POLICY "Trainers can view client streaks"
  ON streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_trainers ct
      WHERE ct.client_id = streaks.user_id
        AND ct.trainer_id = auth.uid()
        AND ct.status = 'active'
    )
  );

CREATE POLICY "Trainers can view client weekly consistency"
  ON weekly_consistency FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_trainers ct
      WHERE ct.client_id = weekly_consistency.user_id
        AND ct.trainer_id = auth.uid()
        AND ct.status = 'active'
    )
  );

-- Function: Get current week start (Monday)
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
  -- Monday is start of week
  RETURN input_date - ((EXTRACT(ISODOW FROM input_date)::INTEGER - 1) || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate streak status for a week
CREATE OR REPLACE FUNCTION calculate_week_status(
  p_completed_days INTEGER,
  p_target_days INTEGER,
  p_bonus_days INTEGER DEFAULT 0
)
RETURNS TEXT AS $$
DECLARE
  v_total_days INTEGER;
BEGIN
  v_total_days := p_completed_days + p_bonus_days;

  IF v_total_days >= p_target_days THEN
    RETURN 'achieved';
  ELSIF v_total_days >= (p_target_days - 1) THEN
    RETURN 'partial'; -- Within 1 day
  ELSE
    RETURN 'missed';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if repair is needed
CREATE OR REPLACE FUNCTION check_repair_needed(
  p_user_id UUID,
  p_streak_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_week DATE;
  v_week_status TEXT;
BEGIN
  -- Get last completed week (not current week)
  v_last_week := get_week_start(CURRENT_DATE - INTERVAL '7 days');

  SELECT status INTO v_week_status
  FROM weekly_consistency
  WHERE user_id = p_user_id
    AND streak_type = p_streak_type
    AND week_start = v_last_week;

  -- Repair needed if missed or partial without repair
  RETURN v_week_status IN ('missed', 'partial')
    AND NOT COALESCE((
      SELECT repair_used FROM weekly_consistency
      WHERE user_id = p_user_id
        AND streak_type = p_streak_type
        AND week_start = v_last_week
    ), false);
END;
$$ LANGUAGE plpgsql;

-- Function: Use grace day
CREATE OR REPLACE FUNCTION use_grace_day(
  p_user_id UUID,
  p_streak_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_grace_days INTEGER;
  v_last_week DATE;
BEGIN
  -- Check grace days available
  SELECT grace_days_remaining INTO v_grace_days
  FROM streaks
  WHERE user_id = p_user_id
    AND streak_type = p_streak_type;

  IF v_grace_days <= 0 THEN
    RETURN false;
  END IF;

  -- Get last week
  v_last_week := get_week_start(CURRENT_DATE - INTERVAL '7 days');

  -- Update weekly consistency
  UPDATE weekly_consistency
  SET bonus_days = bonus_days + 1,
      repair_used = true,
      repair_method = 'grace_day',
      status = calculate_week_status(completed_days, target_days, bonus_days + 1),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND streak_type = p_streak_type
    AND week_start = v_last_week;

  -- Decrement grace days
  UPDATE streaks
  SET grace_days_remaining = grace_days_remaining - 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND streak_type = p_streak_type;

  -- Log repair
  INSERT INTO streak_repairs (user_id, streak_id, week_start, repair_method, days_earned)
  SELECT p_user_id, id, v_last_week, 'grace_day', 1
  FROM streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function: Apply workout repair (bonus workout or extended session)
CREATE OR REPLACE FUNCTION apply_workout_repair(
  p_user_id UUID,
  p_streak_type TEXT,
  p_repair_method TEXT,
  p_workout_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_week DATE;
  v_current_week DATE;
BEGIN
  -- Validate repair method
  IF p_repair_method NOT IN ('bonus_workout', 'extended_session') THEN
    RETURN false;
  END IF;

  -- Get last week and current week
  v_last_week := get_week_start(CURRENT_DATE - INTERVAL '7 days');
  v_current_week := get_week_start(CURRENT_DATE);

  -- Can repair last week or current week
  -- For now, repair last week
  UPDATE weekly_consistency
  SET bonus_days = bonus_days + 1,
      repair_used = true,
      repair_method = p_repair_method,
      status = calculate_week_status(completed_days, target_days, bonus_days + 1),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND streak_type = p_streak_type
    AND week_start = v_last_week;

  -- Log repair
  INSERT INTO streak_repairs (user_id, streak_id, week_start, repair_method, days_earned)
  SELECT p_user_id, id, v_last_week, p_repair_method, 1
  FROM streaks
  WHERE user_id = p_user_id AND streak_type = p_streak_type;

  -- Clear repair availability
  UPDATE streaks
  SET repair_available = false,
      repair_expires_at = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND streak_type = p_streak_type;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function: Refresh grace days (monthly)
CREATE OR REPLACE FUNCTION refresh_grace_days()
RETURNS void AS $$
BEGIN
  UPDATE streaks
  SET grace_days_remaining = 4,
      last_grace_reset = NOW(),
      updated_at = NOW()
  WHERE last_grace_reset < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Function: Check and award milestones
CREATE OR REPLACE FUNCTION check_milestones(
  p_user_id UUID,
  p_streak_type TEXT,
  p_current_weeks INTEGER
)
RETURNS void AS $$
DECLARE
  v_milestone INTEGER;
BEGIN
  -- Milestone thresholds: 1 week, 4 weeks (month), 13 weeks (quarter), 26 weeks (half year), 52 weeks (year)
  FOR v_milestone IN (SELECT UNNEST(ARRAY[1, 4, 13, 26, 52]))
  LOOP
    IF p_current_weeks >= v_milestone THEN
      INSERT INTO streak_milestones (user_id, streak_type, milestone_weeks)
      VALUES (p_user_id, p_streak_type, v_milestone)
      ON CONFLICT (user_id, streak_type, milestone_weeks) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Update streak on activity
CREATE OR REPLACE FUNCTION update_streak_on_activity(
  p_user_id UUID,
  p_activity_type TEXT, -- 'workout' or 'nutrition'
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  v_week_start DATE;
  v_streak_type TEXT;
BEGIN
  v_week_start := get_week_start(p_activity_date);
  v_streak_type := p_activity_type;

  -- Initialize streak if doesn't exist
  INSERT INTO streaks (user_id, streak_type)
  VALUES (p_user_id, v_streak_type)
  ON CONFLICT (user_id, streak_type) DO NOTHING;

  -- Initialize weekly consistency if doesn't exist
  INSERT INTO weekly_consistency (user_id, week_start, streak_type, target_days)
  VALUES (p_user_id, v_week_start, v_streak_type, 4)
  ON CONFLICT (user_id, week_start, streak_type) DO NOTHING;

  -- Increment completed days (max once per day)
  UPDATE weekly_consistency
  SET completed_days = LEAST(completed_days + 1, target_days),
      status = calculate_week_status(LEAST(completed_days + 1, target_days), target_days, bonus_days),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND week_start = v_week_start
    AND streak_type = v_streak_type
    -- Prevent double-counting same day (would need daily tracking table in production)
    AND completed_days < target_days;

  -- Update last activity
  UPDATE streaks
  SET last_activity_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND streak_type = v_streak_type;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_streak_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_updated_at();

CREATE TRIGGER update_weekly_consistency_updated_at
  BEFORE UPDATE ON weekly_consistency
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_updated_at();

-- Comments
COMMENT ON TABLE streaks IS 'Track user streak progress with weekly consistency model';
COMMENT ON TABLE weekly_consistency IS 'Track weekly completion status for streaks';
COMMENT ON TABLE streak_repairs IS 'Log of streak repair attempts and methods';
COMMENT ON TABLE streak_milestones IS 'Track achieved streak milestones';

COMMENT ON COLUMN streaks.target_days_per_week IS 'Required days per week to maintain streak (default 4)';
COMMENT ON COLUMN streaks.grace_days_remaining IS 'Monthly grace days remaining (4 per month)';
COMMENT ON COLUMN streaks.repair_available IS 'Whether a repair opportunity is available';
COMMENT ON COLUMN streaks.repair_expires_at IS 'When the repair opportunity expires';

COMMENT ON COLUMN weekly_consistency.bonus_days IS 'Extra days earned from repairs';
COMMENT ON COLUMN weekly_consistency.status IS 'achieved = met target, partial = within 1 day, missed = 2+ days short';
COMMENT ON COLUMN weekly_consistency.repair_method IS 'Method used to repair this week (if any)';
