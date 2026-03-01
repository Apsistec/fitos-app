-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 67: pg_cron — trigger-session-review batch poll
-- Runs every 30 minutes; the Edge Function filters to ~2h window internally.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.schedule(
  'trigger-session-review-batch',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_functions_url') || '/trigger-session-review',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type',  'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
