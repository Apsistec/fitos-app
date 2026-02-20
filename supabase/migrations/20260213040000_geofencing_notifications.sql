-- Sprint 52: Context-Aware Notifications + Geofencing
-- Creates gym_locations, notification_log, notification_preferences,
-- send_time_predictions, and geofence_events tables.

-- ─── gym_locations ────────────────────────────────────────────────────────────
-- Trainer-defined gym locations used for geofencing proximity detection.
create table if not exists gym_locations (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid references facilities(id) on delete cascade,
  trainer_id     uuid references auth.users(id) on delete cascade,
  name           text not null,
  latitude       numeric(10, 7) not null,
  longitude      numeric(10, 7) not null,
  radius_meters  int  not null default 100,
  wifi_ssid      text,                       -- optional Wi-Fi SSID confirmation
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint chk_radius check (radius_meters between 50 and 2000)
);

create index if not exists gym_locations_facility_idx
  on gym_locations (facility_id)
  where is_active = true;

create index if not exists gym_locations_trainer_idx
  on gym_locations (trainer_id)
  where is_active = true;

alter table gym_locations enable row level security;

-- Trainers manage their own locations; clients can read locations from their facility
create policy "gym_locations_trainer_manage"
  on gym_locations for all
  to authenticated
  using  (auth.uid() = trainer_id)
  with check (auth.uid() = trainer_id);

create policy "gym_locations_client_read"
  on gym_locations for select
  to authenticated
  using (
    facility_id in (
      select facility_id from profiles where id = auth.uid()
    )
  );

-- ─── notification_preferences ─────────────────────────────────────────────────
-- Per-user notification settings (supplements the JSONB in profiles).
create table if not exists notification_preferences (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  -- delivery channels
  push_enabled             boolean not null default true,
  email_enabled            boolean not null default true,
  -- notification types
  workout_reminders        boolean not null default true,
  nutrition_reminders      boolean not null default true,
  trainer_updates          boolean not null default true,
  client_milestones        boolean not null default true,
  message_notifications    boolean not null default true,
  payment_notifications    boolean not null default true,
  weekly_progress          boolean not null default true,
  geofence_enabled         boolean not null default true,
  jitai_enabled            boolean not null default true,
  streak_risk_enabled      boolean not null default true,
  -- throttling
  max_daily_notifications  int  not null default 3
                               check (max_daily_notifications between 1 and 10),
  quiet_hours_start        time not null default '22:00',
  quiet_hours_end          time not null default '07:00',
  -- 66-day habit decay: reduce frequency after habit formed
  habit_decay_enabled      boolean not null default true,
  days_since_onboarding    int not null default 0,
  updated_at               timestamptz not null default now()
);

alter table notification_preferences enable row level security;

create policy "notification_preferences_own"
  on notification_preferences for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── notification_log ─────────────────────────────────────────────────────────
-- Audit trail for all notifications delivered / opened.
create type if not exists notification_type_enum as enum (
  'jitai',
  'geofence_arrival',
  'workout_reminder',
  'streak_risk',
  'nutrition_reminder',
  'message',
  'milestone',
  'payment',
  'weekly_progress',
  'trainer_update'
);

create table if not exists notification_log (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  notification_type  notification_type_enum not null,
  title              text not null,
  body               text not null,
  data               jsonb,                     -- deep-link path, context extras
  channel            text default 'push'
                       check (channel in ('push', 'local', 'email')),
  delivered_at       timestamptz not null default now(),
  opened_at          timestamptz,
  action_taken       text,                       -- e.g. 'start_workout', 'log_food', 'dismissed'
  fcm_message_id     text
);

create index if not exists notification_log_user_idx
  on notification_log (user_id, delivered_at desc);

create index if not exists notification_log_type_idx
  on notification_log (notification_type, delivered_at desc);

alter table notification_log enable row level security;

create policy "notification_log_own"
  on notification_log for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── send_time_predictions ────────────────────────────────────────────────────
-- ML-lite: best hour to send notifications per user per day-of-week.
create table if not exists send_time_predictions (
  user_id       uuid not null references auth.users(id) on delete cascade,
  day_of_week   int  not null check (day_of_week between 0 and 6), -- 0=Sunday
  predicted_best_hour int  not null check (predicted_best_hour between 0 and 23),
  confidence    numeric check (confidence between 0 and 1) default 0.5,
  sample_size   int not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (user_id, day_of_week)
);

alter table send_time_predictions enable row level security;

create policy "send_time_predictions_own"
  on send_time_predictions for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── geofence_events ──────────────────────────────────────────────────────────
-- Log of geofence entry/exit events for each user.
create table if not exists geofence_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  gym_location_id  uuid references gym_locations(id) on delete set null,
  event_type       text not null check (event_type in ('enter', 'exit')),
  latitude         numeric(10, 7),
  longitude        numeric(10, 7),
  accuracy_meters  int,
  wifi_ssid        text,
  triggered_notification boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists geofence_events_user_idx
  on geofence_events (user_id, created_at desc);

alter table geofence_events enable row level security;

create policy "geofence_events_own"
  on geofence_events for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Helper: count notifications delivered today ──────────────────────────────
create or replace function get_daily_notification_count(p_user_id uuid)
returns int
language sql
stable
security definer
as $$
  select count(*)::int
  from notification_log
  where user_id = p_user_id
    and delivered_at >= date_trunc('day', now() at time zone 'utc');
$$;

-- ─── Helper: check quiet hours ───────────────────────────────────────────────
create or replace function is_in_quiet_hours(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
as $$
declare
  prefs notification_preferences%rowtype;
  current_time_val time := (now() at time zone 'utc')::time;
begin
  select * into prefs
  from notification_preferences
  where user_id = p_user_id;

  if not found then
    return false;
  end if;

  -- Handle quiet hours that wrap midnight (e.g. 22:00 -> 07:00)
  if prefs.quiet_hours_start > prefs.quiet_hours_end then
    return current_time_val >= prefs.quiet_hours_start
        or current_time_val <= prefs.quiet_hours_end;
  else
    return current_time_val >= prefs.quiet_hours_start
       and current_time_val <= prefs.quiet_hours_end;
  end if;
end;
$$;
