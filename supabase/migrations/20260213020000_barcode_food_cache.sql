-- Sprint 50: Barcode Scanning & Food Database Pipeline
-- Creates barcode food cache and scan history tables

-- ─── Barcode Food Cache ──────────────────────────────────────────────────────
-- Shared, cross-user cache. Populated by the barcode-lookup Edge Function.
create table if not exists barcode_food_cache (
  barcode         text primary key,                 -- UPC/EAN/QR code string
  food_name       text not null,
  brand           text,
  serving_size    numeric,
  serving_unit    text,
  calories        numeric not null default 0,
  protein         numeric not null default 0,
  carbs           numeric not null default 0,
  fat             numeric not null default 0,
  fiber           numeric,
  sugar           numeric,
  sodium          numeric,
  source          text not null
                    check (source in ('openfoodfacts','usda','fatsecret','manual')),
  verified        boolean not null default false,
  last_fetched_at timestamptz not null default now()
);

-- Allow stale-cache refresh: update last_fetched_at when re-inserted
create unique index if not exists barcode_food_cache_barcode_idx
  on barcode_food_cache (barcode);

-- All authenticated users can read the shared cache (no user-specific data here)
alter table barcode_food_cache enable row level security;

create policy "barcode_food_cache_read"
  on barcode_food_cache for select
  to authenticated
  using (true);

-- Only edge functions (service role) can write
create policy "barcode_food_cache_insert"
  on barcode_food_cache for insert
  to service_role
  with check (true);

create policy "barcode_food_cache_update"
  on barcode_food_cache for update
  to service_role
  using (true);

-- ─── Barcode Scan History ────────────────────────────────────────────────────
-- Per-user scan history for quick re-logging of previously scanned items.
create table if not exists barcode_scan_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  barcode     text not null,
  food_name   text not null,
  brand       text,
  calories    numeric,
  scanned_at  timestamptz not null default now()
);

create index if not exists barcode_scan_history_user_idx
  on barcode_scan_history (user_id, scanned_at desc);

alter table barcode_scan_history enable row level security;

create policy "barcode_scan_history_own"
  on barcode_scan_history for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Helper: log_barcode_scan ─────────────────────────────────────────────────
-- Upsert-style helper that keeps only the most recent entry per barcode per user.
-- Called from the mobile app after a successful barcode lookup + log.
create or replace function log_barcode_scan(
  p_user_id   uuid,
  p_barcode   text,
  p_food_name text,
  p_brand     text default null,
  p_calories  numeric default null
) returns void
language plpgsql security definer
as $$
begin
  -- Remove old entry for this user+barcode so the new one floats to top
  delete from barcode_scan_history
  where user_id = p_user_id and barcode = p_barcode;

  insert into barcode_scan_history (user_id, barcode, food_name, brand, calories)
  values (p_user_id, p_barcode, p_food_name, p_brand, p_calories);
end;
$$;
