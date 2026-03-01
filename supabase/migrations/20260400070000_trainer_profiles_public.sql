-- ─────────────────────────────────────────────────────────────────────────────
-- Sprint 67: Trainer Public Profile & SEO Storefront
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Table: trainer_public_profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trainer_public_profiles (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id                  UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username                    TEXT        NOT NULL UNIQUE,
  bio                         TEXT,
  specialty_tags              TEXT[]      DEFAULT '{}',
  hero_photo_url              TEXT,
  years_experience            INT,
  certifications              JSONB       NOT NULL DEFAULT '[]',  -- [{name, issuer, year}]
  is_accepting_clients        BOOLEAN     NOT NULL DEFAULT true,
  intro_session_price_cents   INT,
  booking_url_override        TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_public_profiles_username
  ON public.trainer_public_profiles (lower(username));

-- ── Table: trainer_reviews ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trainer_reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: anon reviews
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  is_public   BOOLEAN     NOT NULL DEFAULT false,
  is_featured BOOLEAN     NOT NULL DEFAULT false,  -- trainer can pin up to 3
  session_id  UUID        REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainer_reviews_trainer ON public.trainer_reviews (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_reviews_public  ON public.trainer_reviews (trainer_id, is_public)
  WHERE is_public = true;

-- Enforce max 3 featured reviews per trainer (application-level guard in service,
-- DB-level check via partial unique index on featured reviews)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trainer_reviews_featured_limit
  ON public.trainer_reviews (trainer_id, is_featured)
  WHERE is_featured = true;
-- Note: this prevents more than 1 featured row per trainer per value — the actual
-- "up to 3" limit is enforced at the application layer via the service.
-- Drop the above and use a trigger if strict DB enforcement is required later.

DROP INDEX IF EXISTS idx_trainer_reviews_featured_limit;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.trainer_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_reviews         ENABLE ROW LEVEL SECURITY;

-- Public profiles: anyone can read (SSR SEO pages, client browsing)
CREATE POLICY "Public profiles are publicly readable"
  ON public.trainer_public_profiles
  FOR SELECT USING (true);

-- Trainers manage their own profile
CREATE POLICY "Trainers manage own profile"
  ON public.trainer_public_profiles
  FOR ALL
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Public reviews readable by all
CREATE POLICY "Public reviews readable by all"
  ON public.trainer_reviews
  FOR SELECT
  USING (is_public = true OR auth.uid() = trainer_id OR auth.uid() = client_id);

-- Clients insert their own reviews
CREATE POLICY "Clients submit reviews"
  ON public.trainer_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Trainers update review visibility/featured on their profile
CREATE POLICY "Trainers update review display"
  ON public.trainer_reviews
  FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_trainer_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trainer_public_profiles_updated_at
  BEFORE UPDATE ON public.trainer_public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_trainer_profile_updated_at();

-- ── RPC: get_trainer_public_profile (SSR-safe, anon key) ────────────────────
-- Returns full profile + public reviews + aggregated rating for a given username.
-- Called by the Angular SSR page on nutrifitos.com/t/[username].
CREATE OR REPLACE FUNCTION public.get_trainer_public_profile(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id  UUID;
  v_profile     JSONB;
  v_reviews     JSONB;
  v_avg_rating  NUMERIC;
  v_count       BIGINT;
BEGIN
  -- Resolve username → trainer_id + base profile JSON
  SELECT
    tpp.trainer_id,
    jsonb_build_object(
      'id',                         tpp.id,
      'trainer_id',                 tpp.trainer_id,
      'username',                   tpp.username,
      'bio',                        tpp.bio,
      'specialty_tags',             tpp.specialty_tags,
      'hero_photo_url',             tpp.hero_photo_url,
      'years_experience',           tpp.years_experience,
      'certifications',             tpp.certifications,
      'is_accepting_clients',       tpp.is_accepting_clients,
      'intro_session_price_cents',  tpp.intro_session_price_cents,
      'booking_url_override',       tpp.booking_url_override,
      'display_name',               p.full_name,
      'avatar_url',                 p.avatar_url,
      'trainer_email',              p.email
    )
  INTO v_trainer_id, v_profile
  FROM trainer_public_profiles tpp
  JOIN profiles p ON p.id = tpp.trainer_id
  WHERE lower(tpp.username) = lower(p_username);

  IF v_trainer_id IS NULL THEN
    RETURN NULL;  -- 404 case
  END IF;

  -- Public reviews (featured first, then newest)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',          r.id,
      'rating',      r.rating,
      'text',        r.text,
      'is_featured', r.is_featured,
      'created_at',  r.created_at,
      'reviewer',    COALESCE(p2.full_name, 'Anonymous')
    ) ORDER BY r.is_featured DESC, r.created_at DESC
  )
  INTO v_reviews
  FROM trainer_reviews r
  LEFT JOIN profiles p2 ON p2.id = r.client_id
  WHERE r.trainer_id = v_trainer_id
    AND r.is_public = true;

  -- Aggregated stats
  SELECT
    ROUND(AVG(rating)::NUMERIC, 1),
    COUNT(*)
  INTO v_avg_rating, v_count
  FROM trainer_reviews
  WHERE trainer_id = v_trainer_id
    AND is_public = true;

  RETURN v_profile || jsonb_build_object(
    'reviews',      COALESCE(v_reviews, '[]'::JSONB),
    'avg_rating',   v_avg_rating,
    'review_count', COALESCE(v_count, 0)
  );
END;
$$;

-- ── RPC: upsert_trainer_public_profile (trainer edits their own) ─────────────
CREATE OR REPLACE FUNCTION public.upsert_trainer_public_profile(
  p_username                  TEXT,
  p_bio                       TEXT              DEFAULT NULL,
  p_specialty_tags            TEXT[]            DEFAULT '{}',
  p_hero_photo_url            TEXT              DEFAULT NULL,
  p_years_experience          INT               DEFAULT NULL,
  p_certifications            JSONB             DEFAULT '[]',
  p_is_accepting_clients      BOOLEAN           DEFAULT true,
  p_intro_session_price_cents INT               DEFAULT NULL,
  p_booking_url_override      TEXT              DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID := auth.uid();
  v_result     JSONB;
BEGIN
  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO trainer_public_profiles (
    trainer_id, username, bio, specialty_tags, hero_photo_url,
    years_experience, certifications, is_accepting_clients,
    intro_session_price_cents, booking_url_override
  ) VALUES (
    v_trainer_id, lower(p_username), p_bio, p_specialty_tags, p_hero_photo_url,
    p_years_experience, p_certifications, p_is_accepting_clients,
    p_intro_session_price_cents, p_booking_url_override
  )
  ON CONFLICT (trainer_id) DO UPDATE SET
    username                  = lower(EXCLUDED.username),
    bio                       = EXCLUDED.bio,
    specialty_tags            = EXCLUDED.specialty_tags,
    hero_photo_url            = EXCLUDED.hero_photo_url,
    years_experience          = EXCLUDED.years_experience,
    certifications            = EXCLUDED.certifications,
    is_accepting_clients      = EXCLUDED.is_accepting_clients,
    intro_session_price_cents = EXCLUDED.intro_session_price_cents,
    booking_url_override      = EXCLUDED.booking_url_override,
    updated_at                = NOW()
  RETURNING to_jsonb(trainer_public_profiles.*) INTO v_result;

  RETURN v_result;
END;
$$;
