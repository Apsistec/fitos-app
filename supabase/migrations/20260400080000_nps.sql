-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 68: Client Feedback & NPS Loop
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table: nps_surveys ────────────────────────────────────────────────────────
-- Represents one NPS "campaign" sent by a trainer.
-- Auto-created by the send-nps-survey Edge Function or manually triggered.
CREATE TABLE IF NOT EXISTS public.nps_surveys (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_count  INT         NOT NULL DEFAULT 0,
  promoters       INT         NOT NULL DEFAULT 0,  -- score 9-10
  passives        INT         NOT NULL DEFAULT 0,  -- score 7-8
  detractors      INT         NOT NULL DEFAULT 0,  -- score 0-6
  score           NUMERIC(5,1),                    -- computed NPS: (P-D)/total*100
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nps_surveys_trainer ON public.nps_surveys (trainer_id, sent_at DESC);

-- ── Table: nps_responses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id       UUID        NOT NULL REFERENCES public.nps_surveys(id) ON DELETE CASCADE,
  trainer_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score           SMALLINT    CHECK (score BETWEEN 0 AND 10),  -- NULL until responded
  feedback_text   TEXT,
  responded_at    TIMESTAMPTZ,                                 -- NULL = pending
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (survey_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_nps_responses_client   ON public.nps_responses (client_id, responded_at DESC);
CREATE INDEX IF NOT EXISTS idx_nps_responses_survey   ON public.nps_responses (survey_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_pending  ON public.nps_responses (client_id)
  WHERE responded_at IS NULL;

-- ── Table: testimonial_approval_queue ─────────────────────────────────────────
-- Auto-populated by trigger when trainer_reviews.rating >= 4 AND is_public = false.
-- Trainer reviews queue; approving sets trainer_reviews.is_public = true.
CREATE TABLE IF NOT EXISTS public.testimonial_approval_queue (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID        NOT NULL UNIQUE REFERENCES public.trainer_reviews(id) ON DELETE CASCADE,
  trainer_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonial_queue_trainer ON public.testimonial_approval_queue (trainer_id, status);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.nps_surveys              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonial_approval_queue ENABLE ROW LEVEL SECURITY;

-- nps_surveys: trainer reads own surveys
CREATE POLICY "Trainers read own NPS surveys"
  ON public.nps_surveys FOR SELECT USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers insert own NPS surveys"
  ON public.nps_surveys FOR INSERT WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers update own NPS surveys"
  ON public.nps_surveys FOR UPDATE USING (auth.uid() = trainer_id);

-- nps_responses: clients respond to own; trainers read all for their surveys
CREATE POLICY "Clients read own NPS responses"
  ON public.nps_responses FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Trainers read responses for their surveys"
  ON public.nps_responses FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Clients update own pending NPS"
  ON public.nps_responses FOR UPDATE
  USING (auth.uid() = client_id AND responded_at IS NULL);

-- testimonial_approval_queue: trainers manage their own queue
CREATE POLICY "Trainers manage testimonial queue"
  ON public.testimonial_approval_queue
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);

-- ── Trigger: auto-promote 4+ star reviews to testimonial queue ────────────────
CREATE OR REPLACE FUNCTION public.auto_promote_testimonial()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Auto-queue if rating >= 4 (and not already in queue)
  IF NEW.rating >= 4 THEN
    INSERT INTO public.testimonial_approval_queue (review_id, trainer_id)
    VALUES (NEW.id, NEW.trainer_id)
    ON CONFLICT (review_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_promote_testimonial
  AFTER INSERT ON public.trainer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.auto_promote_testimonial();

-- ── RPC: get_trainer_nps_summary(p_trainer_id) ───────────────────────────────
-- Returns: current NPS score + segment breakdown + 4-quarter trend + response rate
CREATE OR REPLACE FUNCTION public.get_trainer_nps_summary(p_trainer_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID := COALESCE(p_trainer_id, auth.uid());
  v_current    JSONB;
  v_trend      JSONB;
  v_response_rate NUMERIC;
  v_total_sent INT;
  v_total_responded INT;
BEGIN
  -- Current/cumulative NPS (all-time)
  SELECT jsonb_build_object(
    'score',      ROUND(
      CASE WHEN (SUM(CASE WHEN score >= 9 THEN 1 ELSE 0 END) + SUM(CASE WHEN score <= 6 AND score IS NOT NULL THEN 1 ELSE 0 END) + SUM(CASE WHEN score BETWEEN 7 AND 8 THEN 1 ELSE 0 END)) > 0
      THEN (SUM(CASE WHEN score >= 9 THEN 1.0 ELSE 0 END) - SUM(CASE WHEN score <= 6 AND score IS NOT NULL THEN 1.0 ELSE 0 END))
           / NULLIF(COUNT(score), 0) * 100
      ELSE 0 END :: NUMERIC, 1),
    'promoters',  SUM(CASE WHEN score >= 9 THEN 1 ELSE 0 END),
    'passives',   SUM(CASE WHEN score BETWEEN 7 AND 8 THEN 1 ELSE 0 END),
    'detractors', SUM(CASE WHEN score <= 6 AND score IS NOT NULL THEN 1 ELSE 0 END),
    'total',      COUNT(score)
  )
  INTO v_current
  FROM nps_responses
  WHERE trainer_id = v_trainer_id
    AND responded_at IS NOT NULL;

  -- Response rate
  SELECT
    COUNT(*),
    COUNT(responded_at)
  INTO v_total_sent, v_total_responded
  FROM nps_responses
  WHERE trainer_id = v_trainer_id;

  v_response_rate := CASE WHEN v_total_sent > 0
    THEN ROUND(v_total_responded::NUMERIC / v_total_sent * 100, 1)
    ELSE 0 END;

  -- 4-quarter trend (one row per quarter, most recent first)
  SELECT jsonb_agg(
    jsonb_build_object(
      'quarter',    TO_CHAR(sent_at, 'YYYY "Q"Q'),
      'score',      score,
      'response_count', response_count,
      'promoters',  promoters,
      'passives',   passives,
      'detractors', detractors
    ) ORDER BY sent_at DESC
  )
  INTO v_trend
  FROM (
    SELECT DISTINCT ON (DATE_TRUNC('quarter', sent_at))
      sent_at, score, response_count, promoters, passives, detractors
    FROM nps_surveys
    WHERE trainer_id = v_trainer_id
      AND score IS NOT NULL
    ORDER BY DATE_TRUNC('quarter', sent_at) DESC, sent_at DESC
    LIMIT 4
  ) q;

  RETURN jsonb_build_object(
    'current',       COALESCE(v_current, '{"score":null,"promoters":0,"passives":0,"detractors":0,"total":0}'::JSONB),
    'trend',         COALESCE(v_trend, '[]'::JSONB),
    'response_rate', v_response_rate,
    'total_sent',    v_total_sent
  );
END;
$$;

-- ── RPC: get_pending_nps(p_client_id) ────────────────────────────────────────
-- Returns client's oldest pending NPS response (to be completed in the app).
CREATE OR REPLACE FUNCTION public.get_pending_nps(p_client_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID := COALESCE(p_client_id, auth.uid());
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id',         r.id,
      'survey_id',  r.survey_id,
      'trainer_id', r.trainer_id,
      'sent_at',    r.sent_at,
      'trainer_name', p.full_name
    )
    FROM nps_responses r
    JOIN profiles p ON p.id = r.trainer_id
    WHERE r.client_id = v_client_id
      AND r.responded_at IS NULL
    ORDER BY r.sent_at DESC
    LIMIT 1
  );
END;
$$;

-- ── RPC: submit_nps_response ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_nps_response(
  p_response_id   UUID,
  p_score         SMALLINT,
  p_feedback_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_survey_id  UUID;
  v_trainer_id UUID;
  v_segment    TEXT;
BEGIN
  -- Update the response row
  UPDATE nps_responses
  SET
    score         = p_score,
    feedback_text = p_feedback_text,
    responded_at  = NOW()
  WHERE id = p_response_id
    AND client_id = auth.uid()
    AND responded_at IS NULL
  RETURNING survey_id, trainer_id
  INTO v_survey_id, v_trainer_id;

  IF v_survey_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Determine segment
  v_segment := CASE
    WHEN p_score >= 9  THEN 'promoter'
    WHEN p_score >= 7  THEN 'passive'
    ELSE 'detractor'
  END;

  -- Update survey aggregates
  UPDATE nps_surveys
  SET
    response_count = response_count + 1,
    promoters      = promoters  + (v_segment = 'promoter')::INT,
    passives       = passives   + (v_segment = 'passive')::INT,
    detractors     = detractors + (v_segment = 'detractor')::INT
  WHERE id = v_survey_id;

  -- Recompute NPS score on the survey row
  UPDATE nps_surveys SET
    score = CASE WHEN response_count > 0
      THEN ROUND(((promoters - detractors)::NUMERIC / response_count * 100), 1)
      ELSE 0 END
  WHERE id = v_survey_id;

  RETURN TRUE;
END;
$$;
