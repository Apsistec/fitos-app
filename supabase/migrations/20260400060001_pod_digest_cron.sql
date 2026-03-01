-- Sprint 66.2: Register pg_cron job for weekly pod digest
-- Fires every Monday at 8:00 UTC.

SELECT cron.schedule(
  'send-weekly-pod-digest',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-weekly-pod-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
