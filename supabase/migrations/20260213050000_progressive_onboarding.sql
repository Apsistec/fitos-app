-- ============================================================
-- Migration: Progressive Onboarding & Auth Enhancement
-- Sprint 53 — Phase 4D Smart Engagement
-- ============================================================

-- ── 1. Extend profiles with onboarding stage tracking ───────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_stage          smallint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_profiling_step        smallint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS life_context               jsonb,
  ADD COLUMN IF NOT EXISTS behavioral_assessment      jsonb,
  ADD COLUMN IF NOT EXISTS imported_health_data       boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at    timestamptz;

COMMENT ON COLUMN profiles.onboarding_stage IS
  '0=not started, 1=goal_anchoring, 2=life_context, 3=health_import, 4=behavioral, 5=social_proof, 6=plan_preview, 7=paywall/complete';

COMMENT ON COLUMN profiles.life_context IS
  'jsonb: {timeline, key_event, motivation_source, target_date}';

COMMENT ON COLUMN profiles.behavioral_assessment IS
  'jsonb: {activity_level, preferred_days, preferred_time, equipment_access, exercise_history}';

-- ── 2. Onboarding analytics ─────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage             smallint         NOT NULL,
  step_name         text             NOT NULL,
  time_spent_seconds integer         NOT NULL DEFAULT 0,
  completed         boolean          NOT NULL DEFAULT false,
  metadata          jsonb,
  created_at        timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_analytics_user_id_idx ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS onboarding_analytics_stage_idx   ON onboarding_analytics(stage);

ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics"
  ON onboarding_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own analytics"
  ON onboarding_analytics FOR SELECT
  USING (auth.uid() = user_id);

-- ── 3. Progressive profiling queue ──────────────────────────
CREATE TABLE IF NOT EXISTS progressive_profiling_queue (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key    text        NOT NULL,
  question_text   text        NOT NULL,
  answer          text,
  asked_at        timestamptz,
  answered_at     timestamptz,
  session_number  integer     NOT NULL DEFAULT 1,
  skipped         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ppq_user_id_idx        ON progressive_profiling_queue(user_id);
CREATE INDEX IF NOT EXISTS ppq_unanswered_idx     ON progressive_profiling_queue(user_id, answered_at)
  WHERE answered_at IS NULL AND skipped = false;

ALTER TABLE progressive_profiling_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profiling queue"
  ON progressive_profiling_queue
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Social proof content ──────────────────────────────────
-- Trainer-curated success stories shown during onboarding
CREATE TABLE IF NOT EXISTS social_proof_stories (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name     text        NOT NULL, -- First name only, privacy
  headline        text        NOT NULL, -- "Lost 18 lbs in 90 days"
  body            text,
  stat_label      text,        -- "Weight Lost"
  stat_value      text,        -- "18 lbs"
  timeframe       text,        -- "90 days"
  goal_category   text,        -- 'weight_loss','strength','endurance','general'
  avatar_url      text,
  is_active       boolean     NOT NULL DEFAULT true,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sps_goal_category_idx  ON social_proof_stories(goal_category) WHERE is_active = true;

ALTER TABLE social_proof_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active stories"
  ON social_proof_stories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Trainers can manage own stories"
  ON social_proof_stories
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- ── 5. Helper: get onboarding completion rate ────────────────
CREATE OR REPLACE FUNCTION get_onboarding_completion_rate(p_trainer_id uuid)
RETURNS TABLE (
  stage            smallint,
  step_name        text,
  started          bigint,
  completed        bigint,
  completion_rate  numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    a.stage,
    a.step_name,
    count(*)                                        AS started,
    count(*) FILTER (WHERE a.completed = true)      AS completed,
    round(
      count(*) FILTER (WHERE a.completed = true)::numeric
      / nullif(count(*), 0) * 100,
      1
    )                                               AS completion_rate
  FROM onboarding_analytics a
  JOIN profiles p ON p.id = a.user_id
  WHERE p.facility_id IN (
    SELECT id FROM facilities WHERE owner_id = p_trainer_id
    UNION
    SELECT facility_id FROM trainer_profiles WHERE id = p_trainer_id
  )
  GROUP BY a.stage, a.step_name
  ORDER BY a.stage;
$$;

-- ── 6. Seed default profiling questions ─────────────────────
-- These are inserted for new users during onboarding
-- The ProgressiveProfilingService will pull from this pattern
-- (runtime insertion handled by the service, not SQL)

-- Ensure onboarding_stage index on profiles for fast lookups
CREATE INDEX IF NOT EXISTS profiles_onboarding_stage_idx ON profiles(onboarding_stage)
  WHERE onboarding_completed_at IS NULL;
