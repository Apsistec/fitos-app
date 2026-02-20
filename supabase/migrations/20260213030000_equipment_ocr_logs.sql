-- Sprint 51: Equipment OCR + Enhanced Voice Logging
-- Creates equipment_ocr_logs for auditing OCR captures

create table if not exists equipment_ocr_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  equipment_type text not null
                   check (equipment_type in ('treadmill','elliptical','bike','rower','stairclimber','other')),
  recognized_text text,                       -- raw OCR text
  parsed_data    jsonb,                        -- structured extracted metrics
  confidence     numeric check (confidence between 0 and 1),
  photo_url      text,                         -- optional: stored in Supabase Storage
  session_id     uuid references workout_sessions(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists equipment_ocr_logs_user_idx
  on equipment_ocr_logs (user_id, created_at desc);

alter table equipment_ocr_logs enable row level security;

create policy "equipment_ocr_logs_own"
  on equipment_ocr_logs for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Parsed data JSON shape reference (stored in parsed_data jsonb column):
-- {
--   "equipment_type": "treadmill",
--   "distance_km": 3.5,
--   "distance_mi": 2.17,
--   "duration_seconds": 1800,
--   "speed_kmh": 7.0,
--   "speed_mph": 4.35,
--   "incline_pct": 1.0,
--   "calories": 320,
--   "steps": 4200,
--   "watts": 150,
--   "strokes_per_min": 24,
--   "floors": 18,
--   "heart_rate": 145,
--   "raw_matches": { ... }
-- }
