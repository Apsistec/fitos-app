-- Sprint 66.1: Smart Check-In System
-- Trainers build reusable check-in templates; clients respond via push-linked deep link.

-- ─── Check-in Templates ────────────────────────────────────────────────────────
-- Each template defines a recurring questionnaire a trainer sends to clients.
CREATE TABLE IF NOT EXISTS checkin_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  name             TEXT NOT NULL,

  -- JSONB array of question objects:
  -- [{ id: uuid, text: string, type: 'rating' | 'text' | 'yes_no', required: boolean }]
  questions        JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Scheduled delivery (day 0=Sun…6=Sat, time in trainer's local time stored as HH:MM)
  send_day_of_week SMALLINT CHECK (send_day_of_week BETWEEN 0 AND 6),
  send_time        TIME,

  -- Which clients this template is assigned to (NULL = all active clients)
  assigned_client_ids UUID[],

  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE checkin_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_manages_own_templates"
  ON checkin_templates
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE TRIGGER touch_checkin_templates_updated_at
  BEFORE UPDATE ON checkin_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── Check-in Responses ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id   UUID NOT NULL REFERENCES checkin_templates(id) ON DELETE CASCADE,

  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,

  -- Mirrors the template questions array at time of sending (snapshot for historical accuracy)
  questions_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Client's answers: [{ question_id: uuid, value: string | number | boolean }]
  responses     JSONB DEFAULT '[]'::JSONB,

  -- Derived from rating-type answers; 1–5 overall mood (NULL until responded)
  overall_mood  SMALLINT CHECK (overall_mood BETWEEN 1 AND 5)
);

ALTER TABLE checkin_responses ENABLE ROW LEVEL SECURITY;

-- Clients view + update their own responses
CREATE POLICY "client_manages_own_responses"
  ON checkin_responses
  FOR ALL
  USING  (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Trainers view responses from their clients
CREATE POLICY "trainer_views_client_responses"
  ON checkin_responses
  FOR SELECT
  USING (trainer_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_checkin_responses_client_id   ON checkin_responses (client_id);
CREATE INDEX IF NOT EXISTS idx_checkin_responses_trainer_id  ON checkin_responses (trainer_id);
CREATE INDEX IF NOT EXISTS idx_checkin_responses_template_id ON checkin_responses (template_id);
CREATE INDEX IF NOT EXISTS idx_checkin_responses_sent_at     ON checkin_responses (sent_at DESC);

-- ─── RPC: get_client_checkin_summary ─────────────────────────────────────────
-- Returns last 8 weeks of mood data + response rate for the trainer dashboard widget.
CREATE OR REPLACE FUNCTION get_client_checkin_summary(
  p_client_id  UUID,
  p_trainer_id UUID
)
RETURNS TABLE (
  week_start       DATE,
  overall_mood     NUMERIC,
  response_count   BIGINT,
  sent_count       BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('week', cr.sent_at)::DATE            AS week_start,
    ROUND(AVG(cr.overall_mood), 1)                  AS overall_mood,
    COUNT(*) FILTER (WHERE cr.responded_at IS NOT NULL) AS response_count,
    COUNT(*)                                         AS sent_count
  FROM checkin_responses cr
  WHERE cr.client_id  = p_client_id
    AND cr.trainer_id = p_trainer_id
    AND cr.sent_at   >= NOW() - INTERVAL '8 weeks'
  GROUP BY DATE_TRUNC('week', cr.sent_at)
  ORDER BY week_start ASC;
END;
$$;

-- ─── RPC: get_pending_checkins_for_trainer ────────────────────────────────────
-- Finds active templates whose scheduled send time falls within the current minute.
-- Called by Edge Function cron every minute.
CREATE OR REPLACE FUNCTION get_pending_checkins_for_trainer()
RETURNS TABLE (
  template_id   UUID,
  trainer_id    UUID,
  template_name TEXT,
  client_ids    UUID[]
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_day   SMALLINT := EXTRACT(DOW FROM NOW())::SMALLINT;
  v_time  TEXT     := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'HH24:MI');
BEGIN
  RETURN QUERY
  SELECT
    ct.id          AS template_id,
    ct.trainer_id,
    ct.name        AS template_name,
    -- If assigned_client_ids is null, fetch all active clients of the trainer
    COALESCE(
      ct.assigned_client_ids,
      ARRAY(
        SELECT DISTINCT a.client_id
        FROM appointments a
        WHERE a.trainer_id = ct.trainer_id
          AND a.status = 'completed'
      )
    )              AS client_ids
  FROM checkin_templates ct
  WHERE ct.is_active = TRUE
    AND ct.send_day_of_week = v_day
    AND TO_CHAR(ct.send_time, 'HH24:MI') = v_time;
END;
$$;
