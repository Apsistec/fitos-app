-- Cancellation Policies & Client Ledger
-- Sprint 57 — Phase 5B: Appointment Logic
--
-- Two tables:
--   1. cancellation_policies — trainer-defined rules for late-cancel/no-show windows and fees
--   2. client_ledger         — double-entry record of debts/credits when fee charging fails or succeeds
--
-- Fee charging itself happens in the `charge-cancellation-fee` Edge Function (Stripe).
-- This migration provides the schema required by that function.

-- ── Cancellation Policies ────────────────────────────────────────────────────

CREATE TABLE cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- NULL = global policy; set = service-type-specific policy
  service_type_id UUID REFERENCES service_types(id) ON DELETE CASCADE,
  late_cancel_window_minutes INTEGER NOT NULL DEFAULT 1440, -- 24 hours
  late_cancel_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  no_show_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- true = deduct session from package even on late-cancel (standard practice)
  forfeit_session BOOLEAN NOT NULL DEFAULT true,
  applies_to_memberships BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Only one global policy and one per service type per trainer
  CONSTRAINT unique_trainer_service_policy UNIQUE (trainer_id, service_type_id)
);

ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_owns_cancellation_policies" ON cancellation_policies
  USING (trainer_id = auth.uid());

-- Allow clients to read their trainer's policies (for deadline display on booking)
CREATE POLICY "client_reads_trainer_policies" ON cancellation_policies
  FOR SELECT USING (
    trainer_id IN (
      SELECT trainer_id FROM client_trainer_relationships WHERE client_id = auth.uid() AND is_active = true
    )
  );

CREATE INDEX idx_cancellation_policies_trainer ON cancellation_policies (trainer_id);
CREATE INDEX idx_cancellation_policies_service ON cancellation_policies (service_type_id) WHERE service_type_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_cancellation_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cancellation_policy_updated_at
  BEFORE UPDATE ON cancellation_policies
  FOR EACH ROW EXECUTE FUNCTION update_cancellation_policy_updated_at();

-- ── Client Ledger ─────────────────────────────────────────────────────────────
-- Tracks monetary obligations between clients and trainers.
-- Debits = client owes trainer (e.g., failed no-show fee charge)
-- Credits = trainer owes client (e.g., overpayment, refund)

CREATE TABLE client_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('credit', 'debit')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL CHECK (reason IN (
    'no_show_fee',
    'late_cancel_fee',
    'overpayment',
    'adjustment',
    'refund',
    'session_credit'
  )),
  -- Optional references for audit trail
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  sale_transaction_id UUID,   -- FK to sale_transactions when charged successfully
  stripe_payment_intent_id TEXT, -- Stripe PI id for reconciliation
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_views_client_ledger" ON client_ledger
  USING (trainer_id = auth.uid());

CREATE POLICY "client_views_own_ledger" ON client_ledger
  FOR SELECT USING (client_id = auth.uid());

CREATE INDEX idx_client_ledger_client ON client_ledger (client_id);
CREATE INDEX idx_client_ledger_trainer ON client_ledger (trainer_id);
CREATE INDEX idx_client_ledger_appointment ON client_ledger (appointment_id) WHERE appointment_id IS NOT NULL;

-- ── Helper: add payment_method_id to profiles ────────────────────────────────
-- Stores the Stripe PaymentMethod ID for off-session charging.
-- Populated by the setup-payment-method Edge Function.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_last4 TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_brand TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_exp_month INTEGER,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_exp_year INTEGER;
