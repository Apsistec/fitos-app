-- ============================================================================
-- Sprint 58: Pricing Options — Session Packs, Passes, Drop-ins, Contracts
-- ============================================================================
-- Creates:
--   pricing_option_type ENUM
--   pricing_options     — trainer-defined packages
--   client_services     — purchased packages owned by a specific client
--   sale_transactions   — POS checkout records
--   decrement_sessions_remaining() — atomic session deduction RPC
-- ============================================================================

-- ── Pricing Option Types ────────────────────────────────────────────────────

CREATE TYPE pricing_option_type AS ENUM (
  'session_pack',  -- fixed count, e.g. 10 sessions for $800
  'time_pass',     -- unlimited within window, e.g. 30-day pass
  'drop_in',       -- single session at full rate
  'contract'       -- recurring autopay, sessions refresh each cycle
);

-- ── Pricing Options (trainer-defined packages) ──────────────────────────────

CREATE TABLE pricing_options (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,              -- "10-Pack Personal Training"
  option_type           pricing_option_type NOT NULL,
  price                 NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  session_count         INTEGER,                    -- NULL for time_pass unlimited
  expiration_days       INTEGER,                    -- days from purchase; NULL = no expiry
  service_type_ids      UUID[] NOT NULL DEFAULT '{}', -- which service types this covers
  autopay_interval      TEXT CHECK (autopay_interval IN ('weekly','biweekly','monthly')),
  autopay_session_count INTEGER,                    -- sessions refreshed each autopay cycle
  revenue_category      TEXT NOT NULL DEFAULT 'personal_training',
  sell_online           BOOLEAN NOT NULL DEFAULT true,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pricing_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_owns_pricing_options" ON pricing_options
  USING (trainer_id = auth.uid());

-- Clients can view active options for their trainer (for self-booking)
CREATE POLICY "client_views_active_pricing_options" ON pricing_options
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'client'
        AND trainer_id = pricing_options.trainer_id
    )
  );

-- ── Client Services (purchased packages) ────────────────────────────────────

CREATE TABLE client_services (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pricing_option_id     UUID NOT NULL REFERENCES pricing_options(id) ON DELETE RESTRICT,
  stripe_subscription_id TEXT,                     -- for contract/autopay types only
  stripe_payment_intent_id TEXT,                   -- initial purchase payment intent
  sessions_remaining    INTEGER,                   -- NULL for time_pass (unlimited)
  sessions_total        INTEGER,                   -- original session count at purchase
  purchased_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at          TIMESTAMPTZ,               -- NULL = not yet started
  expires_at            TIMESTAMPTZ,               -- computed from expiration_days on purchase/activation
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_views_client_services" ON client_services
  USING (trainer_id = auth.uid());

CREATE POLICY "client_views_own_services" ON client_services
  FOR SELECT
  USING (client_id = auth.uid());

-- ── Sale Transactions (POS checkout records) ────────────────────────────────

CREATE TABLE sale_transactions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id            UUID REFERENCES appointments(id) ON DELETE SET NULL,
  client_service_id         UUID REFERENCES client_services(id) ON DELETE SET NULL,
  stripe_payment_intent_id  TEXT,
  payment_method            TEXT NOT NULL CHECK (
    payment_method IN ('session_pack','card','cash','account_balance','split','comp')
  ),
  subtotal                  NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  tip_amount                NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tip_amount >= 0),
  discount_amount           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total                     NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  status                    TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('pending','completed','refunded','failed')
  ),
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sale_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_owns_sales" ON sale_transactions
  USING (trainer_id = auth.uid());

CREATE POLICY "client_views_own_sales" ON sale_transactions
  FOR SELECT
  USING (client_id = auth.uid());

-- ── Atomic Session Decrement RPC ─────────────────────────────────────────────
-- Called from checkout Edge Function to safely decrement sessions_remaining.
-- Returns the new sessions_remaining value (or NULL for time_pass).
-- Raises exception if client_service is expired, inactive, or has no sessions left.

CREATE OR REPLACE FUNCTION decrement_sessions_remaining(p_client_service_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sessions_remaining INTEGER;
  v_is_active          BOOLEAN;
  v_expires_at         TIMESTAMPTZ;
BEGIN
  -- Lock the row to prevent concurrent decrements
  SELECT sessions_remaining, is_active, expires_at
  INTO   v_sessions_remaining, v_is_active, v_expires_at
  FROM   client_services
  WHERE  id = p_client_service_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'client_service not found: %', p_client_service_id;
  END IF;

  IF NOT v_is_active THEN
    RAISE EXCEPTION 'client_service is inactive: %', p_client_service_id;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RAISE EXCEPTION 'client_service has expired: %', p_client_service_id;
  END IF;

  -- NULL sessions_remaining = time_pass (unlimited) — no decrement needed
  IF v_sessions_remaining IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_sessions_remaining <= 0 THEN
    RAISE EXCEPTION 'No sessions remaining on client_service: %', p_client_service_id;
  END IF;

  UPDATE client_services
  SET    sessions_remaining = sessions_remaining - 1,
         updated_at         = NOW()
  WHERE  id = p_client_service_id;

  RETURN v_sessions_remaining - 1;
END;
$$;

-- ── Updated-at triggers ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- Only create triggers if the function is not already used by earlier migrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'pricing_options_updated_at'
  ) THEN
    CREATE TRIGGER pricing_options_updated_at
      BEFORE UPDATE ON pricing_options
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'client_services_updated_at'
  ) THEN
    CREATE TRIGGER client_services_updated_at
      BEFORE UPDATE ON client_services
      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
  END IF;
END;
$$;
