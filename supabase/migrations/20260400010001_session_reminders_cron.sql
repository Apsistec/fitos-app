-- Sprint 63.3: Session reminder cron + helper RPC
-- Called by the send-session-reminders Edge Function every minute.

-- ─── Helper RPC ──────────────────────────────────────────────────────────────
-- Returns upcoming booked/confirmed appointments whose clients opted-in
-- to the specified reminder type and have a push token on file.

CREATE OR REPLACE FUNCTION get_reminder_appointments(
  p_window_from TIMESTAMPTZ,
  p_window_to   TIMESTAMPTZ,
  p_pref_column TEXT          -- 'session_reminder_60min' | 'session_reminder_15min'
)
RETURNS TABLE (
  appointment_id  UUID,
  client_id       UUID,
  push_token      TEXT,
  client_name     TEXT,
  trainer_name    TEXT,
  service_name    TEXT,
  start_at        TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Validate column name to prevent SQL injection
  IF p_pref_column NOT IN ('session_reminder_60min', 'session_reminder_15min') THEN
    RAISE EXCEPTION 'Invalid preference column: %', p_pref_column;
  END IF;

  RETURN QUERY EXECUTE format(
    $sql$
    SELECT
      a.id           AS appointment_id,
      a.client_id,
      cp.push_token,
      cl.full_name   AS client_name,
      tr.full_name   AS trainer_name,
      st.name        AS service_name,
      a.start_at
    FROM appointments a
    JOIN profiles cl ON cl.id = a.client_id
    JOIN profiles tr ON tr.id = a.trainer_id
    JOIN service_types st ON st.id = a.service_type_id
    -- Capacitor push token stored on profiles (populated at registration)
    LEFT JOIN profiles cp_profile ON cp_profile.id = a.client_id
    LEFT JOIN LATERAL (
      SELECT p.push_token
      FROM profiles p
      WHERE p.id = a.client_id
        AND p.push_token IS NOT NULL
    ) cp ON true
    JOIN client_notification_preferences cnp ON cnp.user_id = a.client_id
    WHERE a.status IN ('booked', 'confirmed')
      AND a.start_at >= %L
      AND a.start_at <  %L
      AND cnp.%I = true
    $sql$,
    p_window_from,
    p_window_to,
    p_pref_column
  );
END;
$$;

-- ─── Cron schedule ────────────────────────────────────────────────────────────
-- Runs every minute; the Edge Function itself implements the ±2-min window logic.

SELECT cron.schedule(
  'fitos-session-reminders',
  '* * * * *',   -- every minute
  $$
    SELECT net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/send-session-reminders',
      body   := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    );
  $$
);
