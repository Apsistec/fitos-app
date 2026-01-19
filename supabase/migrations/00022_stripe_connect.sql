-- ============================================================================
-- Migration: Stripe Connect Express Accounts
-- Description: Add tables for Stripe Connect marketplace functionality
-- Date: 2026-01-15
-- Sprint: 27 - Stripe Connect Foundation
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Connected Stripe accounts (for gym owners, facility owners, and solo trainers)
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_type TEXT DEFAULT 'express' CHECK (account_type IN ('express', 'standard', 'custom')),
  business_type TEXT CHECK (business_type IN ('individual', 'company')),

  -- Onboarding status
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,

  -- Verification status
  currently_due TEXT[], -- Required fields still needed
  eventually_due TEXT[], -- Fields that will be required eventually
  past_due TEXT[], -- Fields that are past due
  disabled_reason TEXT, -- Reason if account is disabled

  -- Metadata
  country TEXT DEFAULT 'US',
  default_currency TEXT DEFAULT 'usd',

  -- Timestamps
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id) -- One Stripe account per user
);

-- Account settings and fee configuration
CREATE TABLE IF NOT EXISTS public.stripe_connect_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.stripe_connect_accounts(id) ON DELETE CASCADE,

  -- Fee configuration
  application_fee_percent DECIMAL(5,2) DEFAULT 10.00 CHECK (application_fee_percent >= 0 AND application_fee_percent <= 100),

  -- Payout settings
  payout_schedule TEXT DEFAULT 'daily' CHECK (payout_schedule IN ('daily', 'weekly', 'monthly', 'manual')),
  payout_delay_days INTEGER DEFAULT 2 CHECK (payout_delay_days >= 0),

  -- Branding
  statement_descriptor TEXT,
  statement_descriptor_suffix TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(account_id)
);

-- Gym/Facility to trainer commission rates
CREATE TABLE IF NOT EXISTS public.trainer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 80.00 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(trainer_id, facility_id, effective_date)
);

-- Payout records (tracking Stripe payouts)
CREATE TABLE IF NOT EXISTS public.stripe_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.stripe_connect_accounts(id) ON DELETE CASCADE,
  stripe_payout_id TEXT NOT NULL UNIQUE,

  -- Payout details
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')),

  -- Additional info
  arrival_date DATE,
  failure_code TEXT,
  failure_message TEXT,
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer records (gym/facility to trainer splits)
CREATE TABLE IF NOT EXISTS public.stripe_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_transfer_id TEXT NOT NULL UNIQUE,

  -- Accounts
  source_account_id UUID REFERENCES public.stripe_connect_accounts(id) ON DELETE SET NULL,
  destination_account_id UUID NOT NULL REFERENCES public.stripe_connect_accounts(id) ON DELETE CASCADE,

  -- Payment reference
  source_transaction_id TEXT, -- Original charge ID from Stripe
  payment_intent_id TEXT, -- Associated payment intent

  -- Transfer details
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT DEFAULT 'usd',
  description TEXT,

  -- Metadata for tracking
  trainer_id UUID REFERENCES public.profiles(id),
  facility_id UUID REFERENCES public.facilities(id),
  client_id UUID REFERENCES public.profiles(id),
  commission_percent DECIMAL(5,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_user_id ON public.stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_stripe_account_id ON public.stripe_connect_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_settings_account_id ON public.stripe_connect_settings(account_id);
CREATE INDEX IF NOT EXISTS idx_trainer_commissions_trainer_id ON public.trainer_commissions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_commissions_facility_id ON public.trainer_commissions(facility_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payouts_account_id ON public.stripe_payouts(account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payouts_stripe_payout_id ON public.stripe_payouts(stripe_payout_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transfers_destination_account_id ON public.stripe_transfers(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transfers_trainer_id ON public.stripe_transfers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transfers_facility_id ON public.stripe_transfers(facility_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connect_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_transfers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: stripe_connect_accounts
-- ============================================================================

-- Users can view and manage their own Stripe accounts
CREATE POLICY "Users can view their own Stripe account"
ON public.stripe_connect_accounts
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own Stripe account"
ON public.stripe_connect_accounts
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own Stripe account"
ON public.stripe_connect_accounts
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: stripe_connect_settings
-- ============================================================================

-- Users can view and manage settings for their accounts
CREATE POLICY "Users can view their Stripe settings"
ON public.stripe_connect_settings
FOR SELECT
USING (
  account_id IN (
    SELECT id FROM public.stripe_connect_accounts WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their Stripe settings"
ON public.stripe_connect_settings
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT id FROM public.stripe_connect_accounts WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their Stripe settings"
ON public.stripe_connect_settings
FOR UPDATE
USING (
  account_id IN (
    SELECT id FROM public.stripe_connect_accounts WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- RLS POLICIES: trainer_commissions
-- ============================================================================

-- Trainers can view their own commission rates
CREATE POLICY "Trainers can view their commission rates"
ON public.trainer_commissions
FOR SELECT
USING (trainer_id = auth.uid());

-- Facility owners can view and manage commission rates for their trainers
CREATE POLICY "Facility owners can manage trainer commissions"
ON public.trainer_commissions
FOR ALL
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  facility_id IN (
    SELECT id FROM public.facilities WHERE owner_id = auth.uid()
  )
);

-- ============================================================================
-- RLS POLICIES: stripe_payouts
-- ============================================================================

-- Users can view payouts for their own accounts
CREATE POLICY "Users can view their payouts"
ON public.stripe_payouts
FOR SELECT
USING (
  account_id IN (
    SELECT id FROM public.stripe_connect_accounts WHERE user_id = auth.uid()
  )
);

-- Service role can insert/update payouts (via webhooks)
-- No explicit policy needed as service role bypasses RLS

-- ============================================================================
-- RLS POLICIES: stripe_transfers
-- ============================================================================

-- Trainers can view transfers to their account
CREATE POLICY "Trainers can view transfers to their account"
ON public.stripe_transfers
FOR SELECT
USING (
  destination_account_id IN (
    SELECT id FROM public.stripe_connect_accounts WHERE user_id = auth.uid()
  )
);

-- Facility owners can view transfers from their account
CREATE POLICY "Facility owners can view their outgoing transfers"
ON public.stripe_transfers
FOR SELECT
USING (
  source_account_id IN (
    SELECT id FROM public.stripe_connect_accounts WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_stripe_connect_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_stripe_connect_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stripe_connect_updated_at();

CREATE TRIGGER update_stripe_connect_settings_updated_at
  BEFORE UPDATE ON public.stripe_connect_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stripe_connect_updated_at();

CREATE TRIGGER update_trainer_commissions_updated_at
  BEFORE UPDATE ON public.trainer_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stripe_connect_updated_at();

CREATE TRIGGER update_stripe_payouts_updated_at
  BEFORE UPDATE ON public.stripe_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stripe_connect_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Get Current Commission Rate
-- ============================================================================

-- Function to get the current commission rate for a trainer at a facility
CREATE OR REPLACE FUNCTION public.get_trainer_commission(
  p_trainer_id UUID,
  p_facility_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_commission DECIMAL(5,2);
BEGIN
  SELECT commission_percent INTO v_commission
  FROM public.trainer_commissions
  WHERE trainer_id = p_trainer_id
    AND facility_id = p_facility_id
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;

  -- Default to 80% if no commission rate is set
  RETURN COALESCE(v_commission, 80.00);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.stripe_connect_accounts IS 'Stripe Connect Express accounts for marketplace payments';
COMMENT ON TABLE public.stripe_connect_settings IS 'Configuration settings for connected Stripe accounts';
COMMENT ON TABLE public.trainer_commissions IS 'Commission rate agreements between facilities and trainers';
COMMENT ON TABLE public.stripe_payouts IS 'Records of Stripe payouts to connected accounts';
COMMENT ON TABLE public.stripe_transfers IS 'Records of transfers from facilities to trainers';

COMMENT ON COLUMN public.stripe_connect_accounts.charges_enabled IS 'Whether the account can accept charges';
COMMENT ON COLUMN public.stripe_connect_accounts.payouts_enabled IS 'Whether the account can receive payouts';
COMMENT ON COLUMN public.stripe_connect_accounts.details_submitted IS 'Whether all required details have been submitted';
COMMENT ON COLUMN public.stripe_connect_settings.application_fee_percent IS 'Platform fee percentage (default 10%)';
COMMENT ON COLUMN public.trainer_commissions.commission_percent IS 'Percentage of revenue the trainer receives (default 80%)';
COMMENT ON FUNCTION public.get_trainer_commission IS 'Get current commission rate for a trainer at a facility';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
