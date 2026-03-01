-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 68: Supporting RPC + pg_cron for auto NPS surveys
-- ─────────────────────────────────────────────────────────────────────────────

-- ── RPC: get_nps_eligible_clients ────────────────────────────────────────────
-- Returns (trainer_id, client_id) pairs eligible for an NPS survey:
--   1. Client's first completed appointment with this trainer >= 90 days ago
--   2. Client has not responded to an NPS from this trainer in the last 90 days
--      (or in the last 30 days if they never responded — non-responder grace period)
CREATE OR REPLACE FUNCTION public.get_nps_eligible_clients(
  p_threshold_date       TIMESTAMPTZ,
  p_non_responder_cutoff TIMESTAMPTZ
)
RETURNS TABLE(trainer_id UUID, client_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH first_sessions AS (
    -- Find client's first completed session per trainer
    SELECT
      trainer_id,
      client_id,
      MIN(start_time) AS first_session_at
    FROM appointments
    WHERE status = 'completed'
    GROUP BY trainer_id, client_id
  ),
  last_nps AS (
    -- Find the last NPS sent to each (trainer, client) pair
    SELECT
      trainer_id,
      client_id,
      MAX(sent_at)        AS last_sent_at,
      MAX(responded_at)   AS last_responded_at
    FROM nps_responses
    GROUP BY trainer_id, client_id
  )
  SELECT
    fs.trainer_id,
    fs.client_id
  FROM first_sessions fs
  -- Only clients 90+ days since first session
  WHERE fs.first_session_at <= p_threshold_date
  -- Client is still active with trainer
  AND EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = fs.trainer_id
      AND tc.client_id  = fs.client_id
      AND tc.status     = 'active'
  )
  -- Not surveyed recently (or never)
  AND (
    -- Never sent NPS to this client from this trainer
    NOT EXISTS (
      SELECT 1 FROM last_nps ln
      WHERE ln.trainer_id = fs.trainer_id
        AND ln.client_id  = fs.client_id
    )
    OR
    -- Was sent NPS but last send was >= 90 days ago
    EXISTS (
      SELECT 1 FROM last_nps ln
      WHERE ln.trainer_id  = fs.trainer_id
        AND ln.client_id   = fs.client_id
        AND ln.last_sent_at <= p_threshold_date
    )
  );
$$;

-- ── pg_cron: weekly NPS batch (every Sunday at 9am UTC) ──────────────────────
SELECT cron.schedule(
  'send-nps-survey-auto',
  '0 9 * * 0',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/send-nps-survey',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type',  'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
