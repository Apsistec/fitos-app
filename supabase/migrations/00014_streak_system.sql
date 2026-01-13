-- =====================================================
-- Sprint 19: Adaptive Streak Healing System
-- Weekly-based streaks with forgiveness mechanisms
-- =====================================================

-- =====================================================
-- STREAKS TABLE
-- Tracks current and longest streaks for users
-- =====================================================
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('workout', 'nutrition', 'combined')),

  -- Weekly tracking
  current_weeks INTEGER DEFAULT 0 CHECK (current_weeks >= 0),
  longest_weeks INTEGER DEFAULT 0 CHECK (longest_weeks >= 0),
  target_days_per_week INTEGER DEFAULT 4 CHECK (target_days_per_week BETWEEN 1 AND 7),

  -- Forgiveness mechanisms
  grace_days_remaining INTEGER DEFAULT 4 CHECK (grace_days_remaining >= 0),
  last_grace_reset TIMESTAMPTZ DEFAULT NOW(),

  -- Repair system
  repair_available BOOLEAN DEFAULT false,
  repair_expires_at TIMESTAMPTZ,

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can have one streak per type
  UNIQUE(user_id, streak_type)
);

-- Index for efficient lookups
CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_repair ON streaks(user_id, repair_available) WHERE repair_available = true;

-- =====================================================
-- WEEKLY_CONSISTENCY TABLE
-- Tracks week-by-week consistency
-- =====================================================
CREATE TABLE IF NOT EXISTS weekly_consistency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('workout', 'nutrition', 'combined')),

  -- Target and progress
  target_days INTEGER NOT NULL CHECK (target_days BETWEEN 1 AND 7),
  completed_days INTEGER DEFAULT 0 CHECK (completed_days >= 0 AND completed_days <= 7),

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'partial', 'missed')),

  -- Repair tracking
  repair_used BOOLEAN DEFAULT false,
  repair_method TEXT CHECK (repair_method IN ('bonus_workout', 'extended_session', 'grace_day')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per user per week per type
  UNIQUE(user_id, week_start, streak_type)
);

-- Indexes for efficient queries
CREATE INDEX idx_weekly_consistency_user ON weekly_consistency(user_id);
CREATE INDEX idx_weekly_consistency_week ON weekly_consistency(week_start);
CREATE INDEX idx_weekly_consistency_status ON weekly_consistency(user_id, status);

-- =====================================================
-- STREAK_MILESTONES TABLE
-- Achievement milestones (7, 30, 100, 365 days)
-- =====================================================
CREATE TABLE IF NOT EXISTS streak_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL CHECK (streak_type IN ('workout', 'nutrition', 'combined')),

  -- Milestone details
  milestone_days INTEGER NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),

  -- Celebration tracking
  celebrated BOOLEAN DEFAULT false,

  UNIQUE(user_id, streak_type, milestone_days)
);

CREATE INDEX idx_streak_milestones_user ON streak_milestones(user_id);

-- =====================================================
-- ACTIVITY_LOG TABLE (for streak calculation)
-- Logs daily activities for streak tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('workout', 'nutrition')),

  -- Activity details
  completed BOOLEAN DEFAULT true,
  duration_minutes INTEGER,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, activity_date, activity_type)
);

-- Indexes for efficient streak calculation
CREATE INDEX idx_activity_log_user_date ON activity_log(user_id, activity_date DESC);
CREATE INDEX idx_activity_log_type ON activity_log(user_id, activity_type, activity_date DESC);

-- =====================================================
-- TRIGGER: Update streak updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_streak_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER streak_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_timestamp();

CREATE TRIGGER weekly_consistency_updated_at
  BEFORE UPDATE ON weekly_consistency
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_timestamp();

-- =====================================================
-- TRIGGER: Auto-reset grace days monthly
-- =====================================================
CREATE OR REPLACE FUNCTION reset_grace_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset grace days to 4 if a month has passed
  IF (NEW.last_grace_reset IS NULL OR
      EXTRACT(MONTH FROM NOW()) != EXTRACT(MONTH FROM NEW.last_grace_reset) OR
      EXTRACT(YEAR FROM NOW()) != EXTRACT(YEAR FROM NEW.last_grace_reset)) THEN
    NEW.grace_days_remaining = 4;
    NEW.last_grace_reset = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_reset_grace_days
  BEFORE INSERT OR UPDATE ON streaks
  FOR EACH ROW
  EXECUTE FUNCTION reset_grace_days();

-- =====================================================
-- FUNCTION: Calculate weekly streak
-- Returns current streak based on weekly consistency
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_weekly_streak(
  p_user_id UUID,
  p_streak_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_week_record RECORD;
  v_previous_week DATE;
BEGIN
  -- Get user's target days per week
  DECLARE
    v_target_days INTEGER;
  BEGIN
    SELECT target_days_per_week INTO v_target_days
    FROM streaks
    WHERE user_id = p_user_id AND streak_type = p_streak_type;

    IF v_target_days IS NULL THEN
      v_target_days := 4; -- Default
    END IF;
  END;

  -- Start from current week and count backwards
  v_previous_week := DATE_TRUNC('week', CURRENT_DATE)::DATE;

  -- Loop through weeks in reverse chronological order
  FOR v_week_record IN (
    SELECT week_start, completed_days, status, repair_used
    FROM weekly_consistency
    WHERE user_id = p_user_id
      AND streak_type = p_streak_type
      AND week_start <= v_previous_week
    ORDER BY week_start DESC
  ) LOOP
    -- Check if week meets consistency criteria
    IF v_week_record.status = 'achieved' OR
       v_week_record.status = 'partial' OR
       v_week_record.repair_used = true THEN
      v_current_streak := v_current_streak + 1;
    ELSE
      -- Streak broken
      EXIT;
    END IF;

    v_previous_week := v_week_record.week_start - INTERVAL '1 week';
  END LOOP;

  RETURN v_current_streak;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Check if repair is available
-- Returns true if user missed enough days to trigger repair
-- =====================================================
CREATE OR REPLACE FUNCTION check_repair_availability(
  p_user_id UUID,
  p_streak_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_week DATE;
  v_target_days INTEGER;
  v_completed_days INTEGER;
  v_days_into_week INTEGER;
BEGIN
  v_current_week := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_days_into_week := EXTRACT(DOW FROM CURRENT_DATE)::INTEGER; -- 0=Sunday, 6=Saturday

  -- Get target and completed days
  SELECT s.target_days_per_week, COALESCE(wc.completed_days, 0)
  INTO v_target_days, v_completed_days
  FROM streaks s
  LEFT JOIN weekly_consistency wc ON
    wc.user_id = s.user_id AND
    wc.streak_type = s.streak_type AND
    wc.week_start = v_current_week
  WHERE s.user_id = p_user_id AND s.streak_type = p_streak_type;

  IF v_target_days IS NULL THEN
    RETURN false;
  END IF;

  -- Repair available if:
  -- 1. More than 3 days missed (target - completed > 3)
  -- 2. Not enough days left to recover
  IF (v_target_days - v_completed_days) > 3 AND
     (7 - v_days_into_week) < (v_target_days - v_completed_days) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_consistency ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Streaks policies
CREATE POLICY "Users can view their own streaks"
  ON streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
  ON streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
  ON streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trainers can view their clients' streaks
CREATE POLICY "Trainers can view client streaks"
  ON streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_trainer_relationships ctr
      WHERE ctr.client_id = user_id
        AND ctr.trainer_id = auth.uid()
        AND ctr.status = 'active'
    )
  );

-- Weekly consistency policies
CREATE POLICY "Users can view their own consistency"
  ON weekly_consistency FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consistency"
  ON weekly_consistency FOR ALL
  USING (auth.uid() = user_id);

-- Activity log policies
CREATE POLICY "Users can view their own activities"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can log their own activities"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Milestone policies
CREATE POLICY "Users can view their own milestones"
  ON streak_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert milestones"
  ON streak_milestones FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE streaks IS 'User streak tracking with weekly-based system';
COMMENT ON TABLE weekly_consistency IS 'Week-by-week consistency tracking';
COMMENT ON TABLE streak_milestones IS 'Achievement milestones (7, 30, 100, 365 days)';
COMMENT ON TABLE activity_log IS 'Daily activity logging for streak calculation';

COMMENT ON COLUMN streaks.target_days_per_week IS 'Target days per week for consistency (default 4)';
COMMENT ON COLUMN streaks.grace_days_remaining IS 'Grace days available this month (resets monthly to 4)';
COMMENT ON COLUMN streaks.repair_available IS 'Whether repair mechanism is currently available';
COMMENT ON COLUMN streaks.repair_expires_at IS 'When the repair opportunity expires';

COMMENT ON COLUMN weekly_consistency.status IS 'achieved = met target, partial = missed 1-2 days, missed = missed 3+ days';
COMMENT ON COLUMN weekly_consistency.repair_method IS 'How the week was repaired: bonus_workout, extended_session, or grace_day';
