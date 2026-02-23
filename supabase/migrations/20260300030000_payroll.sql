-- =============================================================================
-- Sprint 60: Payroll Calculation & Reports
-- =============================================================================
-- Tables:
--   trainer_pay_rates   — per-trainer, per-service-type pay configuration
--   trainer_pay_policies — how to pay when client no-shows / cancels
--
-- The visits table (from Sprint 54 migration) already has:
--   trainer_pay_amount NUMERIC(10,2)
--   payroll_processed  BOOLEAN DEFAULT false
-- This migration adds the rate config + a helper function.
-- =============================================================================

-- ── Pay rate type enum ────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE pay_rate_type AS ENUM (
    'flat_per_session',
    'percentage_of_revenue',
    'hourly',
    'commission_on_sale'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Trainer pay rates ─────────────────────────────────────────────────────────
-- One row per trainer per service type (NULL service_type_id = catch-all default)

CREATE TABLE IF NOT EXISTS trainer_pay_rates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type_id  UUID        REFERENCES service_types(id) ON DELETE CASCADE,
  pay_rate_type    pay_rate_type NOT NULL DEFAULT 'flat_per_session',
  flat_amount      NUMERIC(10,2) CHECK (flat_amount >= 0),
  percentage       NUMERIC(5,2)  CHECK (percentage >= 0 AND percentage <= 100),
  hourly_rate      NUMERIC(10,2) CHECK (hourly_rate >= 0),
  commission_percentage NUMERIC(5,2) CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One rate per trainer per service type (NULL = default for all service types)
  UNIQUE NULLS NOT DISTINCT (trainer_id, service_type_id)
);

CREATE INDEX IF NOT EXISTS pay_rates_trainer_idx ON trainer_pay_rates(trainer_id);

-- ── Trainer pay policies ──────────────────────────────────────────────────────
-- One row per trainer defining no-show / cancellation pay treatment

CREATE TABLE IF NOT EXISTS trainer_pay_policies (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id                  UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  pay_for_no_show             BOOLEAN     NOT NULL DEFAULT false,
  no_show_pay_percentage      NUMERIC(5,2) NOT NULL DEFAULT 0
                              CHECK (no_show_pay_percentage >= 0 AND no_show_pay_percentage <= 100),
  pay_for_late_cancel         BOOLEAN     NOT NULL DEFAULT false,
  late_cancel_pay_percentage  NUMERIC(5,2) NOT NULL DEFAULT 0
                              CHECK (late_cancel_pay_percentage >= 0 AND late_cancel_pay_percentage <= 100),
  pay_for_early_cancel        BOOLEAN     NOT NULL DEFAULT false,
  early_cancel_pay_percentage NUMERIC(5,2) NOT NULL DEFAULT 0
                              CHECK (early_cancel_pay_percentage >= 0 AND early_cancel_pay_percentage <= 100),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at triggers ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_payroll_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pay_rates_updated_at ON trainer_pay_rates;
CREATE TRIGGER trg_pay_rates_updated_at
  BEFORE UPDATE ON trainer_pay_rates
  FOR EACH ROW EXECUTE FUNCTION touch_payroll_updated_at();

DROP TRIGGER IF EXISTS trg_pay_policies_updated_at ON trainer_pay_policies;
CREATE TRIGGER trg_pay_policies_updated_at
  BEFORE UPDATE ON trainer_pay_policies
  FOR EACH ROW EXECUTE FUNCTION touch_payroll_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE trainer_pay_rates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_pay_policies ENABLE ROW LEVEL SECURITY;

-- Trainers manage their own rates
CREATE POLICY "trainer_manages_own_pay_rates"
  ON trainer_pay_rates
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Trainers manage their own policy
CREATE POLICY "trainer_manages_own_pay_policy"
  ON trainer_pay_policies
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Owners can read all rates (for payroll reports across trainers they manage)
CREATE POLICY "owner_reads_all_pay_rates"
  ON trainer_pay_rates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE  id   = auth.uid()
      AND    role IN ('owner', 'admin')
    )
  );

CREATE POLICY "owner_reads_all_pay_policies"
  ON trainer_pay_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE  id   = auth.uid()
      AND    role IN ('owner', 'admin')
    )
  );

-- ── calculate_trainer_pay() ───────────────────────────────────────────────────
-- Returns the pay amount for a visit given the trainer's rate + policy.
-- Called by process-checkout Edge Function to populate visits.trainer_pay_amount.

CREATE OR REPLACE FUNCTION calculate_trainer_pay(
  p_trainer_id     UUID,
  p_service_type_id UUID,
  p_service_price  NUMERIC,
  p_duration_minutes INTEGER,
  p_appointment_status TEXT   -- 'completed' | 'no_show' | 'late_cancel' | 'early_cancel'
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate       trainer_pay_rates%ROWTYPE;
  v_policy     trainer_pay_policies%ROWTYPE;
  v_base_pay   NUMERIC := 0;
  v_multiplier NUMERIC := 1.0;
BEGIN
  -- Find rate: exact service type match first, then default (NULL service_type_id)
  SELECT * INTO v_rate
  FROM   trainer_pay_rates
  WHERE  trainer_id = p_trainer_id
  AND    (service_type_id = p_service_type_id OR service_type_id IS NULL)
  ORDER BY service_type_id NULLS LAST
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate base pay by rate type
  CASE v_rate.pay_rate_type
    WHEN 'flat_per_session' THEN
      v_base_pay := COALESCE(v_rate.flat_amount, 0);

    WHEN 'percentage_of_revenue' THEN
      v_base_pay := COALESCE(p_service_price * v_rate.percentage / 100, 0);

    WHEN 'hourly' THEN
      v_base_pay := COALESCE(v_rate.hourly_rate * p_duration_minutes / 60.0, 0);

    WHEN 'commission_on_sale' THEN
      v_base_pay := COALESCE(p_service_price * v_rate.commission_percentage / 100, 0);

    ELSE
      v_base_pay := 0;
  END CASE;

  -- Apply no-show / cancellation multiplier from policy
  SELECT * INTO v_policy
  FROM   trainer_pay_policies
  WHERE  trainer_id = p_trainer_id;

  IF FOUND THEN
    CASE p_appointment_status
      WHEN 'no_show' THEN
        IF NOT v_policy.pay_for_no_show THEN
          RETURN 0;
        END IF;
        v_multiplier := v_policy.no_show_pay_percentage / 100.0;

      WHEN 'late_cancel' THEN
        IF NOT v_policy.pay_for_late_cancel THEN
          RETURN 0;
        END IF;
        v_multiplier := v_policy.late_cancel_pay_percentage / 100.0;

      WHEN 'early_cancel' THEN
        IF NOT v_policy.pay_for_early_cancel THEN
          RETURN 0;
        END IF;
        v_multiplier := v_policy.early_cancel_pay_percentage / 100.0;

      ELSE
        v_multiplier := 1.0; -- 'completed' pays full rate
    END CASE;
  END IF;

  RETURN ROUND(v_base_pay * v_multiplier, 2);
END;
$$;

-- ── get_payroll_report() ──────────────────────────────────────────────────────
-- Aggregate payroll report for a trainer over a date range.
-- Returns one row per visit with all fields needed for the report page + CSV.

CREATE OR REPLACE FUNCTION get_payroll_report(
  p_trainer_id UUID,
  p_date_from  TIMESTAMPTZ,
  p_date_to    TIMESTAMPTZ
)
RETURNS TABLE (
  visit_id           UUID,
  visit_date         TIMESTAMPTZ,
  client_name        TEXT,
  service_name       TEXT,
  appointment_status TEXT,
  service_price      NUMERIC,
  trainer_pay_amount NUMERIC,
  tip_amount         NUMERIC,
  commission_amount  NUMERIC,
  payroll_processed  BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    v.id                                         AS visit_id,
    v.created_at                                 AS visit_date,
    COALESCE(cp.full_name, cp.email, 'Unknown')  AS client_name,
    COALESCE(st.name, 'Session')                 AS service_name,
    a.status::TEXT                               AS appointment_status,
    COALESCE(st.base_price, 0)                   AS service_price,
    COALESCE(v.trainer_pay_amount, 0)            AS trainer_pay_amount,
    COALESCE(t.tip_amount, 0)                    AS tip_amount,
    0::NUMERIC                                   AS commission_amount,
    v.payroll_processed
  FROM   visits v
  JOIN   appointments a  ON a.id  = v.appointment_id
  JOIN   profiles     cp ON cp.id = v.client_id
  LEFT JOIN service_types st ON st.id = a.service_type_id
  LEFT JOIN sale_transactions t
         ON t.appointment_id = a.id AND t.status = 'completed'
  WHERE  v.trainer_id   = p_trainer_id
  AND    v.created_at  >= p_date_from
  AND    v.created_at  <= p_date_to
  ORDER  BY v.created_at DESC;
$$;

-- ── mark_payroll_processed() ──────────────────────────────────────────────────
-- Bulk-marks a set of visits as processed; prevents double-counting.

CREATE OR REPLACE FUNCTION mark_payroll_processed(p_visit_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE visits
  SET    payroll_processed = true
  WHERE  id = ANY(p_visit_ids)
  AND    payroll_processed = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
