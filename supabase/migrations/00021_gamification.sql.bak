-- Sprint 26: Advanced Gamification
-- Activity-based leaderboards and weekly challenges (never weight/appearance)

-- User gamification preferences
CREATE TABLE gamification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  leaderboard_opt_in BOOLEAN DEFAULT false,
  display_name_anonymized BOOLEAN DEFAULT false,
  display_name_override TEXT, -- Custom display name for leaderboards
  show_in_global_leaderboards BOOLEAN DEFAULT false,
  show_in_facility_leaderboards BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard types (activity only, never weight/appearance)
CREATE TYPE leaderboard_type AS ENUM (
  'weekly_steps',
  'monthly_steps',
  'weekly_workouts',
  'monthly_workouts',
  'consistency_streak',
  'improvement_rate'
);

-- Leaderboard scope
CREATE TYPE leaderboard_scope AS ENUM (
  'global',           -- All users (opt-in only)
  'facility',         -- Users at same gym (gym_owner_id)
  'trainer_clients'   -- Clients of same trainer
);

-- Leaderboard entries (calculated periodically)
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leaderboard_type leaderboard_type NOT NULL,
  leaderboard_scope leaderboard_scope NOT NULL,
  scope_id UUID, -- gym_owner_id or trainer_id for scoped leaderboards
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_value INTEGER NOT NULL, -- Steps, workout count, streak weeks, etc.
  rank INTEGER,
  percentile DECIMAL(5,2), -- 0-100
  improvement_from_baseline DECIMAL(5,2), -- % improvement for improvement_rate type
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leaderboard_type, leaderboard_scope, scope_id, period_start)
);

-- Weekly challenges
CREATE TABLE weekly_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_name TEXT NOT NULL,
  challenge_description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN (
    'step_goal',        -- Reach X steps
    'workout_count',    -- Complete X workouts
    'active_minutes',   -- Log X active minutes
    'consistency',      -- Hit target Y days
    'improvement'       -- Improve metric by X%
  )),
  target_metric INTEGER NOT NULL, -- Target to achieve
  baseline_metric TEXT, -- Which metric to measure (steps, workouts, etc.)
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID REFERENCES profiles(id), -- NULL = system-created
  scope leaderboard_scope DEFAULT 'global',
  scope_id UUID, -- gym_owner_id or trainer_id
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User challenge participations
CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  current_progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(challenge_id, user_id)
);

-- Activity-based achievements (never weight/appearance)
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT UNIQUE NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  achievement_category TEXT CHECK (achievement_category IN (
    'steps',
    'workouts',
    'consistency',
    'improvement',
    'social',
    'milestones'
  )),
  badge_icon TEXT, -- Icon name from ionicons
  badge_color TEXT, -- Hex color for badge
  threshold_value INTEGER, -- Value needed to unlock
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  celebrated BOOLEAN DEFAULT false,
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_leaderboard_entries_type_scope ON leaderboard_entries(leaderboard_type, leaderboard_scope, period_start);
CREATE INDEX idx_leaderboard_entries_user ON leaderboard_entries(user_id, period_start);
CREATE INDEX idx_leaderboard_entries_rank ON leaderboard_entries(leaderboard_type, leaderboard_scope, rank);
CREATE INDEX idx_weekly_challenges_dates ON weekly_challenges(start_date, end_date);
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- RLS Policies
ALTER TABLE gamification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can manage their own gamification preferences
CREATE POLICY "Users can view their own preferences"
  ON gamification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON gamification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON gamification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Leaderboard entries visible based on scope and opt-in
CREATE POLICY "Users can view opted-in leaderboard entries"
  ON leaderboard_entries FOR SELECT
  USING (
    -- User can see their own entries
    user_id = auth.uid()
    OR
    -- User can see entries from users who opted in
    EXISTS (
      SELECT 1 FROM gamification_preferences gp
      WHERE gp.user_id = leaderboard_entries.user_id
        AND gp.leaderboard_opt_in = true
        AND (
          -- Global leaderboard requires explicit opt-in
          (leaderboard_scope = 'global' AND gp.show_in_global_leaderboards = true)
          OR
          -- Facility leaderboard (same gym)
          (leaderboard_scope = 'facility' AND gp.show_in_facility_leaderboards = true
            AND EXISTS (
              SELECT 1 FROM profiles p
              WHERE p.id = auth.uid()
                AND p.facility_id = leaderboard_entries.scope_id
            ))
          OR
          -- Trainer clients leaderboard
          (leaderboard_scope = 'trainer_clients'
            AND EXISTS (
              SELECT 1 FROM client_profiles cp
              WHERE cp.id = auth.uid()
                AND cp.trainer_id = leaderboard_entries.scope_id
                AND true
            ))
        )
    )
  );

-- Weekly challenges visible based on scope
CREATE POLICY "Users can view challenges in their scope"
  ON weekly_challenges FOR SELECT
  USING (
    scope = 'global'
    OR (scope = 'facility' AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.facility_id = scope_id
    ))
    OR (scope = 'trainer_clients' AND EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = auth.uid() AND cp.trainer_id = scope_id AND true
    ))
  );

-- Trainers/owners can create challenges for their scope
CREATE POLICY "Trainers can create challenges"
  ON weekly_challenges FOR INSERT
  WITH CHECK (
    (scope = 'trainer_clients' AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('trainer', 'gym_owner')
    ))
    OR
    (scope = 'facility' AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'gym_owner' AND p.id = scope_id
    ))
  );

-- Users can manage their challenge participations
CREATE POLICY "Users can view their participations"
  ON challenge_participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participations"
  ON challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Achievements are public
CREATE POLICY "Achievements are publicly viewable"
  ON achievements FOR SELECT
  USING (true);

-- Users can view their own achievements
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Function: Calculate leaderboard entries
CREATE OR REPLACE FUNCTION calculate_leaderboard_entries(
  p_leaderboard_type leaderboard_type,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS void AS $$
BEGIN
  -- This would be called by a cron job
  -- Calculate entries based on type
  CASE p_leaderboard_type
    WHEN 'weekly_steps', 'monthly_steps' THEN
      INSERT INTO leaderboard_entries (
        user_id, leaderboard_type, leaderboard_scope, period_start, period_end, metric_value
      )
      SELECT
        wd.user_id,
        p_leaderboard_type,
        'global'::leaderboard_scope,
        p_period_start,
        p_period_end,
        SUM(wd.steps) as total_steps
      FROM wearable_data wd
      INNER JOIN gamification_preferences gp ON gp.user_id = wd.user_id
      WHERE wd.data_date >= p_period_start
        AND wd.data_date <= p_period_end
        AND gp.leaderboard_opt_in = true
        AND gp.show_in_global_leaderboards = true
      GROUP BY wd.user_id
      ON CONFLICT (user_id, leaderboard_type, leaderboard_scope, scope_id, period_start)
      DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW();

    WHEN 'weekly_workouts', 'monthly_workouts' THEN
      INSERT INTO leaderboard_entries (
        user_id, leaderboard_type, leaderboard_scope, period_start, period_end, metric_value
      )
      SELECT
        w.user_id,
        p_leaderboard_type,
        'global'::leaderboard_scope,
        p_period_start,
        p_period_end,
        COUNT(*) as workout_count
      FROM workouts w
      INNER JOIN gamification_preferences gp ON gp.user_id = w.user_id
      WHERE w.completed_at >= p_period_start
        AND w.completed_at <= p_period_end + INTERVAL '1 day'
        AND w.completed = true
        AND gp.leaderboard_opt_in = true
        AND gp.show_in_global_leaderboards = true
      GROUP BY w.user_id
      ON CONFLICT (user_id, leaderboard_type, leaderboard_scope, scope_id, period_start)
      DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW();

    WHEN 'consistency_streak' THEN
      INSERT INTO leaderboard_entries (
        user_id, leaderboard_type, leaderboard_scope, period_start, period_end, metric_value
      )
      SELECT
        s.user_id,
        'consistency_streak'::leaderboard_type,
        'global'::leaderboard_scope,
        p_period_start,
        p_period_end,
        s.current_weeks as streak_weeks
      FROM streaks s
      INNER JOIN gamification_preferences gp ON gp.user_id = s.user_id
      WHERE s.streak_type = 'workout'
        AND gp.leaderboard_opt_in = true
        AND gp.show_in_global_leaderboards = true
      ON CONFLICT (user_id, leaderboard_type, leaderboard_scope, scope_id, period_start)
      DO UPDATE SET metric_value = EXCLUDED.metric_value, updated_at = NOW();

  ELSE
    -- Other leaderboard types can be added here
    NULL;
  END CASE;

  -- Update ranks
  UPDATE leaderboard_entries le
  SET rank = sub.rank,
      percentile = sub.percentile
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY leaderboard_type, leaderboard_scope ORDER BY metric_value DESC) as rank,
      PERCENT_RANK() OVER (PARTITION BY leaderboard_type, leaderboard_scope ORDER BY metric_value DESC) * 100 as percentile
    FROM leaderboard_entries
    WHERE leaderboard_type = p_leaderboard_type
      AND period_start = p_period_start
  ) sub
  WHERE le.id = sub.id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
DECLARE
  v_challenge weekly_challenges;
  v_current_progress INTEGER;
BEGIN
  -- Get challenge details
  SELECT * INTO v_challenge FROM weekly_challenges WHERE id = p_challenge_id;

  -- Calculate progress based on challenge type
  CASE v_challenge.challenge_type
    WHEN 'step_goal' THEN
      SELECT COALESCE(SUM(wd.steps), 0) INTO v_current_progress
      FROM wearable_data wd
      WHERE wd.user_id = p_user_id
        AND wd.data_date >= v_challenge.start_date
        AND wd.data_date <= v_challenge.end_date;

    WHEN 'workout_count' THEN
      SELECT COUNT(*) INTO v_current_progress
      FROM workouts w
      WHERE w.user_id = p_user_id
        AND w.completed_at >= v_challenge.start_date
        AND w.completed_at <= v_challenge.end_date + INTERVAL '1 day'
        AND w.completed = true;

    WHEN 'active_minutes' THEN
      SELECT COALESCE(SUM(w.duration_minutes), 0) INTO v_current_progress
      FROM workouts w
      WHERE w.user_id = p_user_id
        AND w.completed_at >= v_challenge.start_date
        AND w.completed_at <= v_challenge.end_date + INTERVAL '1 day'
        AND w.completed = true;

  ELSE
    v_current_progress := 0;
  END CASE;

  -- Update participant progress
  UPDATE challenge_participants
  SET current_progress = v_current_progress,
      completed = v_current_progress >= v_challenge.target_metric,
      completed_at = CASE WHEN v_current_progress >= v_challenge.target_metric AND completed = false
                          THEN NOW()
                          ELSE completed_at
                     END
  WHERE challenge_id = p_challenge_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Seed some default achievements
INSERT INTO achievements (achievement_key, achievement_name, achievement_description, achievement_category, badge_icon, badge_color, threshold_value)
VALUES
  ('first_workout', 'First Workout', 'Complete your first workout', 'workouts', 'fitness-outline', '#10B981', 1),
  ('week_warrior', 'Week Warrior', 'Complete 5 workouts in one week', 'workouts', 'barbell-outline', '#3B82F6', 5),
  ('month_champion', 'Month Champion', 'Complete 20 workouts in one month', 'workouts', 'trophy-outline', '#F59E0B', 20),
  ('step_starter', 'Step Starter', 'Walk 10,000 steps in a day', 'steps', 'walk-outline', '#10B981', 10000),
  ('step_master', 'Step Master', 'Walk 100,000 steps in a week', 'steps', 'footsteps-outline', '#8B5CF6', 100000),
  ('consistency_rookie', 'Consistency Rookie', 'Maintain a 4-week streak', 'consistency', 'flame-outline', '#F59E0B', 4),
  ('consistency_pro', 'Consistency Pro', 'Maintain a 13-week streak', 'consistency', 'bonfire-outline', '#DC2626', 13),
  ('consistency_legend', 'Consistency Legend', 'Maintain a 52-week streak', 'consistency', 'infinite-outline', '#7C3AED', 52)
ON CONFLICT (achievement_key) DO NOTHING;

-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gamification_preferences_updated_at
  BEFORE UPDATE ON gamification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

CREATE TRIGGER update_leaderboard_entries_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- Comments
COMMENT ON TABLE gamification_preferences IS 'User opt-in and privacy preferences for leaderboards';
COMMENT ON TABLE leaderboard_entries IS 'Activity-based leaderboard rankings (never weight/appearance)';
COMMENT ON TABLE weekly_challenges IS 'Time-limited activity challenges for users';
COMMENT ON TABLE challenge_participants IS 'User participation and progress in challenges';
COMMENT ON TABLE achievements IS 'Activity-based achievement definitions';
COMMENT ON TABLE user_achievements IS 'Unlocked achievements per user';

COMMENT ON COLUMN gamification_preferences.leaderboard_opt_in IS 'Master opt-in for all leaderboards';
COMMENT ON COLUMN gamification_preferences.display_name_anonymized IS 'Show as "User123" instead of real name';
COMMENT ON COLUMN gamification_preferences.show_in_global_leaderboards IS 'Appear in global (all users) leaderboards';
COMMENT ON COLUMN gamification_preferences.show_in_facility_leaderboards IS 'Appear in gym/facility leaderboards';
COMMENT ON COLUMN leaderboard_entries.improvement_from_baseline IS 'For improvement_rate leaderboard type';
