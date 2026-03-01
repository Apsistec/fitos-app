-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 69: Referral Program & Growth Mechanics
-- ─────────────────────────────────────────────────────────────────────────────

-- ── referral_programs ─────────────────────────────────────────────────────────
-- Trainer configures reward structure for their referral program
CREATE TABLE IF NOT EXISTS public.referral_programs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type         TEXT NOT NULL CHECK (reward_type IN ('session_credit', 'discount_pct', 'discount_flat')),
  reward_value        NUMERIC(10,2) NOT NULL CHECK (reward_value > 0),
  -- How many successful referral conversions earn one reward
  conversions_required INTEGER NOT NULL DEFAULT 1 CHECK (conversions_required >= 1),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trainer_id)  -- one program per trainer
);

CREATE TRIGGER touch_referral_programs_updated_at
  BEFORE UPDATE ON public.referral_programs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── referral_codes ────────────────────────────────────────────────────────────
-- Each client gets one referral code per trainer
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,             -- 8-char alphanumeric
  clicks      INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  rewards_earned INTEGER NOT NULL DEFAULT 0,   -- lifetime rewards issued
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, trainer_id)               -- one code per client-trainer pair
);

CREATE INDEX idx_referral_codes_code ON public.referral_codes (code);
CREATE INDEX idx_referral_codes_client ON public.referral_codes (client_id);
CREATE INDEX idx_referral_codes_trainer ON public.referral_codes (trainer_id);

-- ── referral_conversions ──────────────────────────────────────────────────────
-- Tracks when a referred person becomes a client
CREATE TABLE IF NOT EXISTS public.referral_conversions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id  UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  new_client_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  converted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Reward bookkeeping
  reward_issued     BOOLEAN NOT NULL DEFAULT FALSE,
  reward_issued_at  TIMESTAMPTZ,
  UNIQUE (referral_code_id, new_client_id)  -- no double-counting
);

CREATE INDEX idx_referral_conversions_code ON public.referral_conversions (referral_code_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.referral_programs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

-- referral_programs: trainer manages own program
CREATE POLICY "trainer_manage_referral_program"
  ON public.referral_programs
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- referral_codes: trainer + owning client can view; anyone can read for click tracking
CREATE POLICY "referral_codes_owner_view"
  ON public.referral_codes
  FOR SELECT
  USING (client_id = auth.uid() OR trainer_id = auth.uid());

CREATE POLICY "referral_codes_insert_by_client"
  ON public.referral_codes
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "referral_codes_update_clicks"
  ON public.referral_codes
  FOR UPDATE
  USING (TRUE);   -- Edge function uses service role for click tracking

-- referral_conversions: trainer + referring client can view
CREATE POLICY "referral_conversions_view"
  ON public.referral_conversions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.referral_codes rc
      WHERE rc.id = referral_code_id
        AND (rc.client_id = auth.uid() OR rc.trainer_id = auth.uid())
    )
  );

-- ── Helper function: generate_unique_referral_code ────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  v_len  INTEGER := 8;
  v_i    INTEGER;
BEGIN
  LOOP
    v_code := '';
    FOR v_i IN 1..v_len LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::INTEGER, 1);
    END LOOP;
    -- Ensure uniqueness
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;

-- ── RPC: get_or_create_referral_code ─────────────────────────────────────────
-- Called by client — returns existing code or creates one
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(p_trainer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID := auth.uid();
  v_code      TEXT;
  v_row       public.referral_codes;
BEGIN
  -- Return existing code if found
  SELECT * INTO v_row
  FROM public.referral_codes
  WHERE client_id = v_client_id
    AND trainer_id = p_trainer_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id',           v_row.id,
      'code',         v_row.code,
      'clicks',       v_row.clicks,
      'conversions',  v_row.conversions,
      'rewards_earned', v_row.rewards_earned,
      'created_at',   v_row.created_at
    );
  END IF;

  -- Create new code
  v_code := public.generate_unique_referral_code();

  INSERT INTO public.referral_codes (client_id, trainer_id, code)
  VALUES (v_client_id, p_trainer_id, v_code)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id',           v_row.id,
    'code',         v_row.code,
    'clicks',       v_row.clicks,
    'conversions',  v_row.conversions,
    'rewards_earned', v_row.rewards_earned,
    'created_at',   v_row.created_at
  );
END;
$$;

-- ── RPC: get_trainer_referral_stats ──────────────────────────────────────────
-- Trainer analytics view of their referral program
CREATE OR REPLACE FUNCTION public.get_trainer_referral_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID := auth.uid();
  v_result     JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_codes',        COUNT(DISTINCT rc.id),
    'total_clicks',       COALESCE(SUM(rc.clicks), 0),
    'total_conversions',  COALESCE(SUM(rc.conversions), 0),
    'total_rewards_issued', COALESCE(SUM(rc.rewards_earned), 0),
    'conversion_rate',    CASE WHEN COALESCE(SUM(rc.clicks), 0) > 0
                            THEN ROUND((COALESCE(SUM(rc.conversions), 0)::NUMERIC / SUM(rc.clicks) * 100), 1)
                            ELSE 0 END,
    'top_referrers',      (
      SELECT jsonb_agg(t ORDER BY t.conversions DESC)
      FROM (
        SELECT
          p.full_name,
          rc2.code,
          rc2.clicks,
          rc2.conversions,
          rc2.rewards_earned
        FROM public.referral_codes rc2
        JOIN public.profiles p ON p.id = rc2.client_id
        WHERE rc2.trainer_id = v_trainer_id
        ORDER BY rc2.conversions DESC
        LIMIT 10
      ) t
    )
  )
  INTO v_result
  FROM public.referral_codes rc
  WHERE rc.trainer_id = v_trainer_id;

  RETURN v_result;
END;
$$;

-- ── RPC: get_growth_analytics ─────────────────────────────────────────────────
-- Trainer growth KPIs computed from existing data
CREATE OR REPLACE FUNCTION public.get_growth_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id  UUID := auth.uid();
  v_now         TIMESTAMPTZ := NOW();
  v_30_days_ago TIMESTAMPTZ := v_now - INTERVAL '30 days';
  v_90_days_ago TIMESTAMPTZ := v_now - INTERVAL '90 days';
  v_mtd_start   TIMESTAMPTZ := date_trunc('month', v_now);
  v_result      JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- New clients this month (first appointment with this trainer)
    'new_clients_mtd', (
      SELECT COUNT(DISTINCT tc.client_id)
      FROM public.trainer_clients tc
      WHERE tc.trainer_id = v_trainer_id
        AND tc.created_at >= v_mtd_start
    ),
    -- Active clients (appointment in last 30 days)
    'active_clients', (
      SELECT COUNT(DISTINCT tc.client_id)
      FROM public.trainer_clients tc
      WHERE tc.trainer_id = v_trainer_id
        AND tc.status = 'active'
    ),
    -- Churned clients (active → no appointment in 90 days)
    'churned_last_90d', (
      SELECT COUNT(DISTINCT tc.client_id)
      FROM public.trainer_clients tc
      WHERE tc.trainer_id = v_trainer_id
        AND tc.status = 'inactive'
        AND tc.updated_at >= v_90_days_ago
    ),
    -- Average sessions per active client (last 90 days)
    'avg_sessions_per_client', (
      SELECT COALESCE(ROUND(
        COUNT(a.id)::NUMERIC / NULLIF(COUNT(DISTINCT a.client_id), 0),
        1
      ), 0)
      FROM public.appointments a
      WHERE a.trainer_id = v_trainer_id
        AND a.status = 'completed'
        AND a.start_time >= v_90_days_ago
    ),
    -- Total clients ever
    'total_clients_ever', (
      SELECT COUNT(*)
      FROM public.trainer_clients tc
      WHERE tc.trainer_id = v_trainer_id
    ),
    -- Monthly cohort retention (last 6 months)
    'cohort_retention', (
      SELECT jsonb_agg(c ORDER BY c.cohort_month)
      FROM (
        WITH cohorts AS (
          SELECT
            client_id,
            date_trunc('month', MIN(start_time)) AS cohort_month,
            COUNT(*) FILTER (WHERE start_time >= v_30_days_ago) AS recent_sessions
          FROM public.appointments
          WHERE trainer_id = v_trainer_id
            AND status = 'completed'
          GROUP BY client_id
        )
        SELECT
          to_char(cohort_month, 'Mon YYYY') AS cohort_month,
          COUNT(*) AS cohort_size,
          COUNT(*) FILTER (WHERE recent_sessions > 0) AS retained,
          CASE WHEN COUNT(*) > 0
            THEN ROUND(COUNT(*) FILTER (WHERE recent_sessions > 0)::NUMERIC / COUNT(*) * 100, 0)
            ELSE 0 END AS retention_pct
        FROM cohorts
        WHERE cohort_month >= date_trunc('month', v_now - INTERVAL '6 months')
        GROUP BY cohort_month
        ORDER BY cohort_month
      ) c
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
