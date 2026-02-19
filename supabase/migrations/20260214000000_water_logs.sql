-- ============================================================================
-- Sprint 47: Water Logs
-- Quick water logging from app shortcuts / home-screen quick actions
-- ============================================================================

create table if not exists public.water_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount_ml     integer not null check (amount_ml > 0 and amount_ml <= 10000),
  log_date      date not null default current_date,
  logged_at     timestamptz not null default now(),
  notes         text,
  created_at    timestamptz not null default now()
);

-- Index for daily totals query (user + date)
create index if not exists water_logs_user_date_idx
  on public.water_logs (user_id, log_date desc);

-- RLS
alter table public.water_logs enable row level security;

-- Users can only see and manage their own water logs
create policy "Users manage own water logs"
  on public.water_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helpful view: daily water totals per user
create or replace view public.water_daily_totals as
  select
    user_id,
    log_date,
    sum(amount_ml) as total_ml,
    count(*)       as log_count
  from public.water_logs
  group by user_id, log_date;

comment on table public.water_logs is
  'Individual water intake entries logged by clients via quick action shortcut or nutrition tab.';
