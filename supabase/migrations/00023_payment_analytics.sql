-- =====================================================
-- Sprint 29: Payment Analytics & Recovery
-- =====================================================

-- Table for tracking failed payments and Smart Retry attempts
CREATE TABLE payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  failure_code TEXT,
  failure_message TEXT,
  next_payment_attempt TIMESTAMPTZ,
  smart_retry_enabled BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'retrying' CHECK (status IN ('retrying', 'recovered', 'failed', 'abandoned')),
  recovered_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for payment analytics (MRR, churn, etc.)
CREATE TABLE payment_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  trainer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- MRR Metrics
  mrr_cents INTEGER DEFAULT 0,
  mrr_growth_cents INTEGER DEFAULT 0,
  mrr_growth_percent DECIMAL(5,2) DEFAULT 0,
  new_mrr_cents INTEGER DEFAULT 0,
  expansion_mrr_cents INTEGER DEFAULT 0,
  contraction_mrr_cents INTEGER DEFAULT 0,
  churned_mrr_cents INTEGER DEFAULT 0,

  -- Customer Metrics
  total_active_subscriptions INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  canceled_subscriptions INTEGER DEFAULT 0,

  -- Churn Metrics
  churn_rate_percent DECIMAL(5,2) DEFAULT 0,
  involuntary_churn_percent DECIMAL(5,2) DEFAULT 0, -- Failed payments
  voluntary_churn_percent DECIMAL(5,2) DEFAULT 0, -- Cancellations

  -- Recovery Metrics
  failed_payments_count INTEGER DEFAULT 0,
  recovered_payments_count INTEGER DEFAULT 0,
  recovery_rate_percent DECIMAL(5,2) DEFAULT 0,

  -- Revenue Metrics
  total_revenue_cents INTEGER DEFAULT 0,
  average_revenue_per_user_cents INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(metric_date, trainer_id)
);

-- Indexes for performance
CREATE INDEX idx_payment_failures_subscription ON payment_failures(subscription_id);
CREATE INDEX idx_payment_failures_client ON payment_failures(client_id);
CREATE INDEX idx_payment_failures_trainer ON payment_failures(trainer_id);
CREATE INDEX idx_payment_failures_status ON payment_failures(status);
CREATE INDEX idx_payment_failures_created ON payment_failures(created_at DESC);

CREATE INDEX idx_payment_analytics_date ON payment_analytics(metric_date DESC);
CREATE INDEX idx_payment_analytics_trainer ON payment_analytics(trainer_id);
CREATE INDEX idx_payment_analytics_trainer_date ON payment_analytics(trainer_id, metric_date DESC);

-- RLS Policies
ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_analytics ENABLE ROW LEVEL SECURITY;

-- Trainers can view their own payment failures
CREATE POLICY "Trainers can view own payment failures"
  ON payment_failures FOR SELECT
  USING (auth.uid() = trainer_id);

-- Trainers can view their own analytics
CREATE POLICY "Trainers can view own analytics"
  ON payment_analytics FOR SELECT
  USING (auth.uid() = trainer_id OR trainer_id IS NULL);

-- Function to calculate MRR for a trainer
CREATE OR REPLACE FUNCTION calculate_mrr(p_trainer_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_mrr INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN interval = 'month' THEN amount_cents
      WHEN interval = 'year' THEN amount_cents / 12
      WHEN interval = 'week' THEN amount_cents * 4
      WHEN interval = 'day' THEN amount_cents * 30
      ELSE 0
    END
  ), 0)
  INTO total_mrr
  FROM subscriptions
  WHERE trainer_id = p_trainer_id
    AND status IN ('active', 'trialing')
    AND canceled_at IS NULL;

  RETURN total_mrr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate churn rate for a trainer
CREATE OR REPLACE FUNCTION calculate_churn_rate(
  p_trainer_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
  start_count INTEGER;
  churned_count INTEGER;
  churn_rate DECIMAL;
BEGIN
  -- Count active subscriptions at start of period
  SELECT COUNT(*)
  INTO start_count
  FROM subscriptions
  WHERE trainer_id = p_trainer_id
    AND created_at < p_start_date
    AND (canceled_at IS NULL OR canceled_at >= p_start_date)
    AND status IN ('active', 'trialing', 'past_due');

  -- Count subscriptions canceled during period
  SELECT COUNT(*)
  INTO churned_count
  FROM subscriptions
  WHERE trainer_id = p_trainer_id
    AND canceled_at >= p_start_date
    AND canceled_at < p_end_date;

  -- Calculate churn rate
  IF start_count > 0 THEN
    churn_rate := (churned_count::DECIMAL / start_count) * 100;
  ELSE
    churn_rate := 0;
  END IF;

  RETURN ROUND(churn_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update payment analytics daily (called by cron job)
CREATE OR REPLACE FUNCTION update_daily_payment_analytics()
RETURNS void AS $$
DECLARE
  v_trainer RECORD;
  v_date DATE := CURRENT_DATE;
  v_previous_date DATE := v_date - INTERVAL '1 day';
  v_mrr INTEGER;
  v_previous_mrr INTEGER;
  v_churn_rate DECIMAL;
BEGIN
  -- Loop through all trainers with active subscriptions
  FOR v_trainer IN
    SELECT DISTINCT trainer_id
    FROM subscriptions
    WHERE status IN ('active', 'trialing', 'past_due', 'canceled')
  LOOP
    -- Calculate current MRR
    v_mrr := calculate_mrr(v_trainer.trainer_id);

    -- Get previous day MRR
    SELECT mrr_cents INTO v_previous_mrr
    FROM payment_analytics
    WHERE trainer_id = v_trainer.trainer_id
      AND metric_date = v_previous_date
    ORDER BY metric_date DESC
    LIMIT 1;

    v_previous_mrr := COALESCE(v_previous_mrr, 0);

    -- Calculate churn for past 30 days
    v_churn_rate := calculate_churn_rate(
      v_trainer.trainer_id,
      v_date - INTERVAL '30 days',
      v_date
    );

    -- Insert/update analytics
    INSERT INTO payment_analytics (
      metric_date,
      trainer_id,
      mrr_cents,
      mrr_growth_cents,
      mrr_growth_percent,
      churn_rate_percent,
      total_active_subscriptions,
      total_revenue_cents
    )
    SELECT
      v_date,
      v_trainer.trainer_id,
      v_mrr,
      v_mrr - v_previous_mrr,
      CASE WHEN v_previous_mrr > 0
        THEN ROUND(((v_mrr - v_previous_mrr)::DECIMAL / v_previous_mrr) * 100, 2)
        ELSE 0
      END,
      v_churn_rate,
      COUNT(*) FILTER (WHERE status IN ('active', 'trialing')),
      COALESCE(SUM(amount_cents), 0)
    FROM subscriptions
    WHERE trainer_id = v_trainer.trainer_id
      AND status IN ('active', 'trialing', 'past_due')
    ON CONFLICT (metric_date, trainer_id)
    DO UPDATE SET
      mrr_cents = EXCLUDED.mrr_cents,
      mrr_growth_cents = EXCLUDED.mrr_growth_cents,
      mrr_growth_percent = EXCLUDED.mrr_growth_percent,
      churn_rate_percent = EXCLUDED.churn_rate_percent,
      total_active_subscriptions = EXCLUDED.total_active_subscriptions,
      total_revenue_cents = EXCLUDED.total_revenue_cents,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE payment_failures IS 'Tracks failed payment attempts and Smart Retry recovery';
COMMENT ON TABLE payment_analytics IS 'Daily payment metrics: MRR, churn, recovery rates';

COMMENT ON COLUMN payment_failures.smart_retry_enabled IS 'Stripe Smart Retries uses ML to optimize retry timing (+57% avg recovery)';
COMMENT ON COLUMN payment_failures.status IS 'retrying = active retries, recovered = payment succeeded, failed = retries exhausted, abandoned = subscription canceled';

COMMENT ON COLUMN payment_analytics.involuntary_churn_percent IS 'Churn due to failed payments (recoverable)';
COMMENT ON COLUMN payment_analytics.voluntary_churn_percent IS 'Churn due to cancellations (product/service issue)';
COMMENT ON COLUMN payment_analytics.recovery_rate_percent IS 'Percentage of failed payments recovered via Smart Retries';
