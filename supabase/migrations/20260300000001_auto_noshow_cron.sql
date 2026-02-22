-- Auto No-Show Cron Schedule
-- Sprint 56.1 — Phase 5B: Appointment Lifecycle
--
-- Schedules the auto-noshow-check Edge Function to run every 5 minutes.
-- Key competitive differentiator: Mindbody requires manual no-show marking.
-- FitOS auto-marks within auto_noshow_minutes (default 10) of start_at.
--
-- Requires: pg_cron extension + pg_net extension (both available on Supabase)
-- Enable in Supabase Dashboard → Database → Extensions if not already active.

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto-noshow check every 5 minutes
-- Uses pg_net to call the Edge Function with service-role auth
SELECT cron.schedule(
  'fitos-auto-noshow-check',          -- job name (unique)
  '*/5 * * * *',                      -- every 5 minutes
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/auto-noshow-check',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Unschedule helper (run manually if needed):
-- SELECT cron.unschedule('fitos-auto-noshow-check');
