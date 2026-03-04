-- ============================================================================
-- Migration: Notification Templates + Snooze (Sprint 63 — EP-23)
-- ============================================================================
-- Adds:
--   1. notification_templates — reusable title/body templates per type
--   2. snooze_until column on notification_preferences — US-242
--
-- The NotificationService reads templates at runtime; Edge Functions use them
-- for server-side push (session reminders, no-show alerts, churn risk, etc.)
-- ============================================================================

-- ─── 1. notification_templates ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifies which notification_type this template belongs to
  -- Matches NotificationType in notification.service.ts
  notification_type TEXT NOT NULL,

  -- Human-readable label for the settings UI
  label             TEXT NOT NULL,

  -- Handlebars-style template strings.
  -- Variables: {{client_name}}, {{trainer_name}}, {{workout_name}},
  --            {{streak_days}}, {{gym_name}}, {{amount}}, {{time}}, etc.
  title_template    TEXT NOT NULL,
  body_template     TEXT NOT NULL,

  -- JSON array of required variable names (for validation)
  variables         JSONB NOT NULL DEFAULT '[]',

  -- Which roles this template applies to
  -- NULL means all roles
  target_roles      TEXT[] DEFAULT NULL,

  -- Whether this is the system default (trainers cannot delete these)
  is_default        BOOLEAN NOT NULL DEFAULT true,

  -- Trainer-specific overrides reference the trainer's profile
  trainer_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_type_trainer UNIQUE (notification_type, trainer_id)
);

-- RLS: trainers can manage their own overrides; system defaults are read-only
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_notification_templates"
  ON notification_templates FOR SELECT
  USING (
    is_default = true
    OR trainer_id = auth.uid()
  );

CREATE POLICY "trainer_manage_own_templates"
  ON notification_templates FOR ALL
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid() AND is_default = false);

CREATE INDEX IF NOT EXISTS idx_notif_templates_type
  ON notification_templates (notification_type);

CREATE INDEX IF NOT EXISTS idx_notif_templates_trainer
  ON notification_templates (trainer_id);

-- Updated-at trigger
CREATE TRIGGER touch_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- ─── 2. Seed system default templates ────────────────────────────────────────

INSERT INTO notification_templates
  (notification_type, label, title_template, body_template, variables, target_roles, is_default)
VALUES
  -- US-230: workout reminder
  ('workout_reminder', 'Workout Reminder',
   'Time to train 💪',
   'Your {{workout_name}} session starts {{time}}. Ready to go?',
   '["workout_name","time"]', ARRAY['client'], true),

  -- US-231: hydration reminder
  ('nutrition_reminder', 'Hydration Reminder',
   'Stay hydrated 💧',
   'You''ve logged {{logged_oz}}oz today. Keep drinking!',
   '["logged_oz"]', ARRAY['client'], true),

  -- US-232: nutrition logging
  ('nutrition_reminder', 'Meal Logging Reminder',
   'Time to log your {{meal}} 🍽️',
   'Tap to log what you ate — it only takes 30 seconds.',
   '["meal"]', ARRAY['client'], true),

  -- US-233: milestone celebration
  ('milestone', 'Milestone Achievement 🏆',
   'You hit a new {{milestone_type}}!',
   '{{milestone_description}} Keep crushing it!',
   '["milestone_type","milestone_description"]', ARRAY['client'], true),

  -- US-234: new message
  ('message', 'New Message',
   '{{sender_name}} sent you a message',
   '"{{message_preview}}" — tap to reply.',
   '["sender_name","message_preview"]', NULL, true),

  -- US-235: trainer session reminder
  ('workout_reminder', 'Upcoming Session',
   'Session with {{client_name}} in {{lead_minutes}} min',
   '{{service_type}} at {{location}}. Tap to view.',
   '["client_name","lead_minutes","service_type","location"]', ARRAY['trainer','gym_owner'], true),

  -- US-236: no-show alert
  ('jitai', 'Client No-Show',
   '{{client_name}} may be a no-show',
   'Their session started {{minutes_ago}} min ago with no check-in. Tap to mark no-show or message them.',
   '["client_name","minutes_ago"]', ARRAY['trainer','gym_owner'], true),

  -- US-238: trainer client milestone
  ('milestone', 'Client Milestone Alert 🎉',
   '{{client_name}} hit a new milestone!',
   '{{milestone_description}} — tap to send congratulations.',
   '["client_name","milestone_description"]', ARRAY['trainer','gym_owner'], true),

  -- US-239: owner churn risk
  ('streak_risk', 'Churn Risk Alert',
   '{{client_name}} may be losing momentum',
   'No workout logged in {{days_inactive}} days. Consider reaching out.',
   '["client_name","days_inactive"]', ARRAY['gym_owner'], true),

  -- US-240: payment failure
  ('payment', 'Payment Failed',
   'Payment failed: {{client_name}}',
   '{{amount}} charge failed — {{reason}}. Tap to view payment history.',
   '["client_name","amount","reason"]', ARRAY['gym_owner','trainer'], true),

  -- US-241: AA schedule change
  ('trainer_update', 'Schedule Change',
   'Appointment {{change_type}} by {{trainer_name}}',
   '{{client_name}}''s session on {{new_time}} has been {{change_type}}.',
   '["trainer_name","client_name","change_type","new_time"]', ARRAY['admin_assistant'], true),

  -- US-242: snooze confirmation (in-app only, no push)
  ('jitai', 'Notifications Paused',
   'Notifications paused',
   'All alerts paused until {{snooze_until}}. Resume any time in Settings.',
   '["snooze_until"]', NULL, true)

ON CONFLICT (notification_type, trainer_id) DO NOTHING;

-- ─── 3. snooze_until on notification_preferences (US-242) ────────────────────

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN notification_preferences.snooze_until IS
  'US-242: If set and in the future, all notifications are suppressed until this time.';

-- ─── 4. notification_preferences index ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_id
  ON notification_preferences (user_id);
