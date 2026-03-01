-- Sprint 63.3: Client notification preferences
-- Stores per-client push notification settings in the DB (not device) so they persist
-- across reinstalls and platform switches.

CREATE TABLE IF NOT EXISTS client_notification_preferences (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Session reminders
  session_reminder_60min      BOOLEAN NOT NULL DEFAULT true,
  session_reminder_15min      BOOLEAN NOT NULL DEFAULT true,

  -- Workout reminders
  workout_reminder_enabled    BOOLEAN NOT NULL DEFAULT true,
  workout_reminder_time       TIME NOT NULL DEFAULT '08:00:00',

  -- Nutrition check-in
  nutrition_checkin_enabled   BOOLEAN NOT NULL DEFAULT false,
  nutrition_checkin_time      TIME NOT NULL DEFAULT '12:00:00',

  -- Celebration & summary
  pr_celebrations             BOOLEAN NOT NULL DEFAULT true,
  weekly_summary              BOOLEAN NOT NULL DEFAULT true,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-level security: each user owns their own preferences
ALTER TABLE client_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_notification_prefs"
  ON client_notification_preferences
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated-at trigger
CREATE TRIGGER touch_client_notification_prefs_updated_at
  BEFORE UPDATE ON client_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_client_notif_prefs_user_id
  ON client_notification_preferences (user_id);
