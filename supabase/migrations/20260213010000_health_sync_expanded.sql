-- Sprint 49: Direct Health Sync + Dynamic Island
-- Expands wearable data model and adds health sync logging

-- ──────────────────────────────────────────────────────────
-- 1. Expand wearable_daily_data with body composition +
--    detailed sleep stages + HRV variants + data_source
-- ──────────────────────────────────────────────────────────

ALTER TABLE wearable_daily_data
  ADD COLUMN IF NOT EXISTS body_fat_pct        NUMERIC(5, 2),       -- % e.g. 18.5
  ADD COLUMN IF NOT EXISTS lean_body_mass_kg   NUMERIC(6, 2),       -- kg
  ADD COLUMN IF NOT EXISTS bone_mass_kg        NUMERIC(5, 3),       -- kg
  ADD COLUMN IF NOT EXISTS hrv_rmssd           NUMERIC(7, 2),       -- ms (root mean square of successive differences)
  ADD COLUMN IF NOT EXISTS hrv_sdnn            NUMERIC(7, 2),       -- ms (standard deviation of NN intervals)
  ADD COLUMN IF NOT EXISTS sleep_deep_mins     INTEGER,             -- minutes of deep / slow-wave sleep
  ADD COLUMN IF NOT EXISTS sleep_rem_mins      INTEGER,             -- minutes of REM sleep
  ADD COLUMN IF NOT EXISTS sleep_light_mins    INTEGER,             -- minutes of light sleep
  ADD COLUMN IF NOT EXISTS sleep_awake_mins    INTEGER,             -- minutes awake in bed
  ADD COLUMN IF NOT EXISTS data_source         TEXT DEFAULT 'terra' -- healthkit | health_connect | terra | manual
    CHECK (data_source IN ('healthkit', 'health_connect', 'terra', 'manual'));

-- Constraints: body_fat_pct must be 0-100 when present
ALTER TABLE wearable_daily_data
  ADD CONSTRAINT wearable_body_fat_range
    CHECK (body_fat_pct IS NULL OR (body_fat_pct >= 0 AND body_fat_pct <= 100));

-- ──────────────────────────────────────────────────────────
-- 2. health_sync_log — audit trail for every sync run
-- ──────────────────────────────────────────────────────────

CREATE TABLE health_sync_log (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sync_type          TEXT        NOT NULL CHECK (sync_type IN ('foreground', 'background', 'manual')),
  data_source        TEXT        NOT NULL CHECK (data_source IN ('healthkit', 'health_connect', 'terra')),
  data_types_synced  TEXT[]      NOT NULL DEFAULT '{}',   -- e.g. ['hrv', 'steps', 'sleep']
  records_synced     INTEGER     NOT NULL DEFAULT 0,
  error_message      TEXT,
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms        INTEGER                              -- how long the sync took
);

-- Index for per-user history queries
CREATE INDEX health_sync_log_user_idx
  ON health_sync_log (user_id, synced_at DESC);

-- ──────────────────────────────────────────────────────────
-- 3. health_sync_preferences — per-user sync settings
-- ──────────────────────────────────────────────────────────

CREATE TABLE health_sync_preferences (
  user_id                UUID    PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  direct_sync_enabled    BOOLEAN NOT NULL DEFAULT false,  -- HealthKit / Health Connect direct sync
  direct_sync_source     TEXT             -- 'healthkit' | 'health_connect'
    CHECK (direct_sync_source IN ('healthkit', 'health_connect')),
  background_sync        BOOLEAN NOT NULL DEFAULT true,
  sync_hrv               BOOLEAN NOT NULL DEFAULT true,
  sync_sleep             BOOLEAN NOT NULL DEFAULT true,
  sync_steps             BOOLEAN NOT NULL DEFAULT true,
  sync_body_composition  BOOLEAN NOT NULL DEFAULT false,  -- off by default (smart scale opt-in)
  last_background_sync   TIMESTAMPTZ,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- 4. RLS policies
-- ──────────────────────────────────────────────────────────

ALTER TABLE health_sync_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sync_preferences  ENABLE ROW LEVEL SECURITY;

-- health_sync_log: users read/write their own rows
CREATE POLICY "users_own_sync_log"
  ON health_sync_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- health_sync_preferences: users manage their own prefs
CREATE POLICY "users_own_sync_prefs"
  ON health_sync_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert sync logs (background runner)
CREATE POLICY "service_insert_sync_log"
  ON health_sync_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- 5. Helper function: upsert daily wearable data from HealthKit
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_wearable_day(
  p_user_id         UUID,
  p_date            DATE,
  p_source          TEXT,
  p_hrv_rmssd       NUMERIC DEFAULT NULL,
  p_hrv_sdnn        NUMERIC DEFAULT NULL,
  p_resting_hr      INTEGER DEFAULT NULL,
  p_steps           INTEGER DEFAULT NULL,
  p_sleep_hours     NUMERIC DEFAULT NULL,
  p_sleep_deep      INTEGER DEFAULT NULL,
  p_sleep_rem       INTEGER DEFAULT NULL,
  p_sleep_light     INTEGER DEFAULT NULL,
  p_sleep_awake     INTEGER DEFAULT NULL,
  p_body_fat        NUMERIC DEFAULT NULL,
  p_lean_mass       NUMERIC DEFAULT NULL,
  p_bone_mass       NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO wearable_daily_data (
    user_id, date, data_source,
    hrv_rmssd, hrv_sdnn, resting_heart_rate, steps, sleep_hours,
    sleep_deep_mins, sleep_rem_mins, sleep_light_mins, sleep_awake_mins,
    body_fat_pct, lean_body_mass_kg, bone_mass_kg
  )
  VALUES (
    p_user_id, p_date, p_source,
    p_hrv_rmssd, p_hrv_sdnn, p_resting_hr, p_steps, p_sleep_hours,
    p_sleep_deep, p_sleep_rem, p_sleep_light, p_sleep_awake,
    p_body_fat, p_lean_mass, p_bone_mass
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    data_source         = COALESCE(EXCLUDED.data_source, wearable_daily_data.data_source),
    hrv_rmssd           = COALESCE(EXCLUDED.hrv_rmssd, wearable_daily_data.hrv_rmssd),
    hrv_sdnn            = COALESCE(EXCLUDED.hrv_sdnn, wearable_daily_data.hrv_sdnn),
    resting_heart_rate  = COALESCE(EXCLUDED.resting_heart_rate, wearable_daily_data.resting_heart_rate),
    steps               = COALESCE(EXCLUDED.steps, wearable_daily_data.steps),
    sleep_hours         = COALESCE(EXCLUDED.sleep_hours, wearable_daily_data.sleep_hours),
    sleep_deep_mins     = COALESCE(EXCLUDED.sleep_deep_mins, wearable_daily_data.sleep_deep_mins),
    sleep_rem_mins      = COALESCE(EXCLUDED.sleep_rem_mins, wearable_daily_data.sleep_rem_mins),
    sleep_light_mins    = COALESCE(EXCLUDED.sleep_light_mins, wearable_daily_data.sleep_light_mins),
    sleep_awake_mins    = COALESCE(EXCLUDED.sleep_awake_mins, wearable_daily_data.sleep_awake_mins),
    body_fat_pct        = COALESCE(EXCLUDED.body_fat_pct, wearable_daily_data.body_fat_pct),
    lean_body_mass_kg   = COALESCE(EXCLUDED.lean_body_mass_kg, wearable_daily_data.lean_body_mass_kg),
    bone_mass_kg        = COALESCE(EXCLUDED.bone_mass_kg, wearable_daily_data.bone_mass_kg)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
