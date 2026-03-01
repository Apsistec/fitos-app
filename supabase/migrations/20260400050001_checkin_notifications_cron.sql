-- Sprint 66.1: Register pg_cron job for check-in notifications
-- Fires every minute; Edge Function checks if any template's send_time matches NOW().

SELECT cron.schedule(
  'send-checkin-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-checkin-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
