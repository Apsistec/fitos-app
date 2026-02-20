-- ============================================================
-- Migration: Scheduling Foundation — Phase 5A
-- Sprint 54 — Appointment Data Model & Database Foundation
-- ============================================================

-- ── 1. Appointment status enum (8-state FSM) ─────────────────
CREATE TYPE appointment_status AS ENUM (
  'requested',
  'booked',
  'confirmed',
  'arrived',
  'completed',
  'no_show',
  'early_cancel',
  'late_cancel'
);

COMMENT ON TYPE appointment_status IS
  'FSM: requested→booked→confirmed→arrived→completed|no_show|early_cancel|late_cancel';

-- ── 2. Service types ──────────────────────────────────────────
-- Defines the types of sessions a trainer offers (60-min PT, group class, etc.)
CREATE TABLE IF NOT EXISTS service_types (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  facility_id            UUID        REFERENCES facilities(id) ON DELETE SET NULL,
  name                   TEXT        NOT NULL,          -- "60-min Personal Training"
  description            TEXT,
  duration_minutes       INTEGER     NOT NULL DEFAULT 60,
  base_price             NUMERIC(10,2) NOT NULL DEFAULT 0,
  cancel_window_minutes  INTEGER     NOT NULL DEFAULT 1440, -- 24 hours
  num_sessions_deducted  INTEGER     NOT NULL DEFAULT 1,
  buffer_after_minutes   INTEGER     NOT NULL DEFAULT 0,
  travel_buffer_minutes  INTEGER     NOT NULL DEFAULT 0,
  sell_online            BOOLEAN     NOT NULL DEFAULT true,
  color                  TEXT        NOT NULL DEFAULT '#10B981', -- hex for calendar display
  is_active              BOOLEAN     NOT NULL DEFAULT true,
  sort_order             INTEGER     NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_types_trainer_idx ON service_types(trainer_id) WHERE is_active = true;

ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_owns_service_types"
  ON service_types
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "clients_read_active_service_types"
  ON service_types FOR SELECT
  USING (is_active = true);

-- ── 3. Appointment resources (rooms / equipment) ──────────────
CREATE TABLE IF NOT EXISTS appointment_resources (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id   UUID        REFERENCES facilities(id) ON DELETE CASCADE,
  trainer_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,     -- "Studio A", "Power Rack 3"
  resource_type TEXT        NOT NULL DEFAULT 'room' CHECK (resource_type IN ('room','equipment','other')),
  capacity      INTEGER     NOT NULL DEFAULT 1,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE appointment_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_manages_resources"
  ON appointment_resources
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- ── 4. Staff availability windows (weekly template) ──────────
CREATE TABLE IF NOT EXISTS staff_availability (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week      SMALLINT    NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time       TIME        NOT NULL,
  end_time         TIME        NOT NULL,
  facility_id      UUID        REFERENCES facilities(id) ON DELETE SET NULL,
  effective_from   DATE,
  effective_until  DATE,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_time_order CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS staff_availability_trainer_dow_idx
  ON staff_availability(trainer_id, day_of_week)
  WHERE is_active = true;

ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_manages_own_availability"
  ON staff_availability
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- ── 5. Per-staff pricing overrides ───────────────────────────
CREATE TABLE IF NOT EXISTS staff_service_rates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type_id  UUID        NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  price_override   NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, service_type_id)
);

ALTER TABLE staff_service_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_manages_own_rates"
  ON staff_service_rates
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- ── 6. Core appointments table ────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id            UUID               NOT NULL REFERENCES profiles(id),
  client_id             UUID               NOT NULL REFERENCES profiles(id),
  service_type_id       UUID               NOT NULL REFERENCES service_types(id),
  facility_id           UUID               REFERENCES facilities(id) ON DELETE SET NULL,
  resource_id           UUID               REFERENCES appointment_resources(id) ON DELETE SET NULL,
  status                appointment_status NOT NULL DEFAULT 'booked',
  start_at              TIMESTAMPTZ        NOT NULL,
  end_at                TIMESTAMPTZ        NOT NULL,
  duration_minutes      INTEGER            NOT NULL,
  notes                 TEXT,
  client_service_id     UUID,              -- FK to client_services (added in Sprint 58)
  is_first_appointment  BOOLEAN            NOT NULL DEFAULT false,
  staff_requested       BOOLEAN            NOT NULL DEFAULT false,
  gender_preference     TEXT               CHECK (gender_preference IN ('none','female','male')) DEFAULT 'none',
  is_recurring          BOOLEAN            NOT NULL DEFAULT false,
  recurring_group_id    UUID,              -- groups recurring appointment series
  auto_noshow_minutes   INTEGER,           -- NULL = use trainer profile default
  created_at            TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ        NOT NULL DEFAULT now(),
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  arrived_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  CONSTRAINT appointment_time_order CHECK (start_at < end_at),
  CONSTRAINT appointment_duration_positive CHECK (duration_minutes > 0)
);

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS appointments_trainer_date_idx   ON appointments(trainer_id, start_at);
CREATE INDEX IF NOT EXISTS appointments_client_date_idx    ON appointments(client_id, start_at);
CREATE INDEX IF NOT EXISTS appointments_status_idx         ON appointments(status) WHERE status NOT IN ('completed','early_cancel','late_cancel');
CREATE INDEX IF NOT EXISTS appointments_recurring_group_idx ON appointments(recurring_group_id) WHERE recurring_group_id IS NOT NULL;

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_manages_own_appointments"
  ON appointments
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "client_reads_own_appointments"
  ON appointments FOR SELECT
  USING (client_id = auth.uid());

-- ── 7. Visits table (billing / payroll source of truth) ───────
-- A visit record is created for every terminal appointment outcome.
-- This is the immutable record that drives payroll calculation and
-- package deduction — mirroring Mindbody's visit model.
CREATE TABLE IF NOT EXISTS visits (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id    UUID               NOT NULL REFERENCES appointments(id),
  client_id         UUID               NOT NULL REFERENCES profiles(id),
  trainer_id        UUID               NOT NULL REFERENCES profiles(id),
  service_type_id   UUID               NOT NULL REFERENCES service_types(id),
  visit_status      appointment_status NOT NULL, -- terminal state snapshot
  sessions_deducted INTEGER            NOT NULL DEFAULT 0,
  service_price     NUMERIC(10,2)      NOT NULL,
  trainer_pay_amount NUMERIC(10,2),
  client_service_id UUID,
  payroll_processed BOOLEAN            NOT NULL DEFAULT false,
  payroll_period_id UUID,              -- FK added in Sprint 60
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visits_trainer_date_idx    ON visits(trainer_id, created_at);
CREATE INDEX IF NOT EXISTS visits_client_idx          ON visits(client_id);
CREATE INDEX IF NOT EXISTS visits_payroll_pending_idx ON visits(trainer_id) WHERE payroll_processed = false;

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_reads_own_visits"
  ON visits FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "client_reads_own_visits"
  ON visits FOR SELECT
  USING (client_id = auth.uid());

-- Service role can insert visits (via Edge Functions / auto no-show)
CREATE POLICY "service_inserts_visits"
  ON visits FOR INSERT
  WITH CHECK (true); -- restricted by service_role key in Edge Functions

-- ── 8. Extend profiles with scheduling settings ───────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auto_noshow_minutes    INTEGER  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS default_cancel_window  INTEGER  NOT NULL DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS scheduling_enabled     BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_lead_time_hours INTEGER NOT NULL DEFAULT 1,   -- how far in advance client must book
  ADD COLUMN IF NOT EXISTS booking_horizon_days   INTEGER  NOT NULL DEFAULT 60;  -- how far ahead client can book

COMMENT ON COLUMN profiles.auto_noshow_minutes IS
  'Minutes after appointment start before auto-marking no-show (5-60)';
COMMENT ON COLUMN profiles.scheduling_enabled IS
  'Whether this trainer has activated the scheduling module';

-- ── 9. Helper: get appointment count by status for a trainer ──
CREATE OR REPLACE FUNCTION get_appointment_counts(p_trainer_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  status       appointment_status,
  count        bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    a.status,
    count(*)
  FROM appointments a
  WHERE a.trainer_id = p_trainer_id
    AND a.start_at::date = p_date
  GROUP BY a.status;
$$;

-- ── 10. Helper: conflict check (used by availability engine) ──
-- Returns TRUE if the given time window conflicts with any active appointment
-- for the trainer, accounting for buffer and travel time.
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_trainer_id      UUID,
  p_start_at        TIMESTAMPTZ,
  p_end_at          TIMESTAMPTZ,
  p_exclude_id      UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN service_types st ON st.id = a.service_type_id
    WHERE a.trainer_id = p_trainer_id
      AND a.status NOT IN ('early_cancel', 'late_cancel')
      AND (p_exclude_id IS NULL OR a.id <> p_exclude_id)
      -- Block: proposed window overlaps [appointment_start, appointment_end + buffer + travel]
      AND p_start_at < (a.end_at + make_interval(mins => st.buffer_after_minutes + st.travel_buffer_minutes))
      AND p_end_at > a.start_at
  );
$$;

-- Index to support the conflict check efficiently
CREATE INDEX IF NOT EXISTS appointments_trainer_active_time_idx
  ON appointments(trainer_id, start_at, end_at)
  WHERE status NOT IN ('early_cancel', 'late_cancel');
