-- =====================================================================
-- Sprint 42: Local SEO Automation
-- Migration: 00030_local_seo.sql
--
-- Automates local search optimization for trainers including:
-- - Google Business Profile management
-- - Schema.org structured data
-- - Review request automation
-- - Landing page generation
-- - NAP consistency tracking
-- =====================================================================

-- =====================================================================
-- GOOGLE BUSINESS PROFILES
-- =====================================================================

CREATE TABLE google_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id), -- Optional for franchise trainers

  -- Google Business Profile Details
  gbp_id TEXT UNIQUE, -- Google's profile ID
  account_id TEXT, -- Google My Business account ID

  -- Business Information
  business_name TEXT NOT NULL,
  category TEXT NOT NULL, -- "Personal Trainer", "Fitness Center", etc.
  phone TEXT NOT NULL,
  email TEXT,
  website_url TEXT,

  -- Address (NAP - Name, Address, Phone)
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  -- Coordinates for map placement
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Business Hours (JSONB for flexibility)
  -- Example: { "monday": { "open": "06:00", "close": "20:00" }, "tuesday": { "open": "06:00", "close": "20:00" } }
  hours JSONB DEFAULT '{}',

  -- Profile Status
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  profile_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (profile_status IN ('draft', 'published', 'suspended')),

  -- SEO Data
  description TEXT, -- 750 character maximum per Google guidelines
  service_areas TEXT[], -- Array of cities/zip codes served
  attributes JSONB DEFAULT '{}', -- { "wheelchair_accessible": true, "free_wifi": true, "parking_available": true }

  -- Media
  logo_url TEXT,
  cover_photo_url TEXT,
  photos JSONB DEFAULT '[]', -- Array of { "url": "...", "description": "..." }

  -- Statistics (synced from Google)
  total_reviews INT DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.0,
  view_count INT DEFAULT 0,
  search_appearances INT DEFAULT 0,

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  sync_error TEXT,

  -- OAuth tokens (encrypted)
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trainer_id, location_id)
);

COMMENT ON TABLE google_business_profiles IS 'Google Business Profile integration for local SEO';
COMMENT ON COLUMN google_business_profiles.hours IS 'Business hours in JSON format by day of week';
COMMENT ON COLUMN google_business_profiles.service_areas IS 'Cities or zip codes where trainer provides services';

-- =====================================================================
-- REVIEW REQUESTS
-- =====================================================================

CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Trigger that initiated the review request
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'milestone_achieved',  -- Weight loss, strength gain, etc.
    'workout_streak',      -- Consecutive workouts
    'goal_completed',      -- Client achieved their goal
    'manual'               -- Trainer manually requested
  )),
  trigger_details JSONB, -- { "milestone": "Lost 10 lbs", "streak_days": 30 }

  -- Request details
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('sms', 'email', 'push', 'in_app')),
  message_template TEXT NOT NULL,
  message_body TEXT NOT NULL,

  -- Review platform links
  google_review_url TEXT,
  yelp_review_url TEXT,
  facebook_review_url TEXT,

  -- Client response
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_platform TEXT CHECK (review_platform IN ('google', 'yelp', 'facebook', 'other')),
  review_rating INT CHECK (review_rating >= 1 AND review_rating <= 5),
  review_text TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent',      -- Request sent to client
    'clicked',   -- Client clicked review link
    'reviewed',  -- Client left a review
    'expired'    -- Request expired (90 days)
  )),

  -- Expiration (90 days after sent)
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE review_requests IS 'Automated review request tracking';
COMMENT ON COLUMN review_requests.trigger_type IS 'Event that triggered the review request';

-- =====================================================================
-- SEO KEYWORDS
-- =====================================================================

CREATE TABLE seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- Keyword details
  keyword TEXT NOT NULL,
  keyword_type TEXT NOT NULL CHECK (keyword_type IN (
    'primary',     -- Main keyword: "personal trainer austin"
    'secondary',   -- Supporting: "strength training coach"
    'long_tail',   -- Specific: "bodybuilding coach near zilker park"
    'local'        -- Location-based: "austin fitness trainer downtown"
  )),

  -- Search metrics
  search_volume INT, -- Monthly search volume estimate
  competition TEXT CHECK (competition IN ('low', 'medium', 'high')),
  difficulty_score INT CHECK (difficulty_score >= 0 AND difficulty_score <= 100),

  -- Ranking
  current_rank INT, -- Current position in search results (1-100)
  target_rank INT DEFAULT 10,
  best_rank INT, -- Best ranking achieved

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),

  -- Tracking
  last_checked_at TIMESTAMPTZ,
  rank_history JSONB DEFAULT '[]', -- [{ "date": "2026-01-20", "rank": 15, "url": "..." }]

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trainer_id, keyword)
);

COMMENT ON TABLE seo_keywords IS 'SEO keyword tracking and ranking history';
COMMENT ON COLUMN seo_keywords.rank_history IS 'Historical ranking data in JSON format';

-- =====================================================================
-- LANDING PAGES
-- =====================================================================

CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),

  -- Page type and URL
  page_type TEXT NOT NULL CHECK (page_type IN (
    'trainer_profile',  -- /trainers/{slug}
    'location',         -- /locations/{city}/{slug}
    'service',          -- /services/{slug}
    'specialty'         -- /specialties/{slug}
  )),
  slug TEXT NOT NULL, -- URL-friendly slug

  -- SEO metadata
  title TEXT NOT NULL, -- <title> tag (60 chars max recommended)
  meta_description TEXT, -- <meta name="description"> (160 chars max)
  keywords TEXT[], -- Meta keywords (deprecated but some use)
  canonical_url TEXT,
  og_image_url TEXT, -- Open Graph image for social sharing

  -- Hero section
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  hero_cta_text TEXT DEFAULT 'Get Started',
  hero_cta_url TEXT,

  -- Content sections (flexible JSON structure)
  -- Example: [{ "type": "text", "content": "..." }, { "type": "gallery", "images": [...] }]
  content_sections JSONB DEFAULT '[]',

  -- Schema.org structured data (JSON-LD)
  schema_markup JSONB,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Analytics
  page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  avg_time_on_page INT DEFAULT 0, -- seconds
  bounce_rate DECIMAL(5, 2) DEFAULT 0.0,
  conversion_count INT DEFAULT 0, -- Form submissions, sign-ups, etc.

  -- A/B Testing
  variant TEXT DEFAULT 'control' CHECK (variant IN ('control', 'variant_a', 'variant_b')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(slug)
);

COMMENT ON TABLE landing_pages IS 'Auto-generated SEO-optimized landing pages';
COMMENT ON COLUMN landing_pages.schema_markup IS 'JSON-LD structured data for search engines';
COMMENT ON COLUMN landing_pages.content_sections IS 'Flexible content blocks in JSON format';

-- =====================================================================
-- SEO ANALYTICS
-- =====================================================================

CREATE TABLE seo_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  gbp_id UUID REFERENCES google_business_profiles(id) ON DELETE SET NULL,

  -- Date for time-series analysis
  date DATE NOT NULL,

  -- Google Search Console metrics
  google_search_impressions INT DEFAULT 0,
  google_search_clicks INT DEFAULT 0,
  google_search_ctr DECIMAL(5, 2) DEFAULT 0.0, -- Click-through rate
  google_average_position DECIMAL(5, 2),

  -- Google Maps metrics
  google_maps_views INT DEFAULT 0,
  google_maps_actions INT DEFAULT 0, -- Clicks on phone, directions, website

  -- Profile engagement
  profile_views INT DEFAULT 0,
  discovery_searches INT DEFAULT 0, -- "personal trainer near me"
  direct_searches INT DEFAULT 0,    -- Brand name searches

  -- Rankings
  keywords_ranked INT DEFAULT 0,
  keywords_top_10 INT DEFAULT 0,
  keywords_top_3 INT DEFAULT 0,

  -- Reviews
  new_reviews INT DEFAULT 0,
  average_rating DECIMAL(3, 2),
  total_reviews INT DEFAULT 0,
  review_response_rate DECIMAL(5, 2) DEFAULT 0.0,

  -- Landing pages
  landing_page_views INT DEFAULT 0,
  landing_page_visitors INT DEFAULT 0,
  landing_page_conversions INT DEFAULT 0,
  landing_page_conversion_rate DECIMAL(5, 2) DEFAULT 0.0,

  -- Backlinks
  new_backlinks INT DEFAULT 0,
  total_backlinks INT DEFAULT 0,
  referring_domains INT DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trainer_id, date)
);

COMMENT ON TABLE seo_analytics IS 'Daily SEO performance metrics';
COMMENT ON COLUMN seo_analytics.discovery_searches IS 'Searches like "personal trainer near me"';
COMMENT ON COLUMN seo_analytics.direct_searches IS 'Searches for trainer name or brand';

-- =====================================================================
-- NAP CONSISTENCY TRACKING
-- =====================================================================

CREATE TABLE nap_consistency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- Source platform
  platform TEXT NOT NULL CHECK (platform IN (
    'google_business',
    'yelp',
    'facebook',
    'instagram',
    'trainer_profile',
    'landing_page'
  )),

  -- NAP data
  business_name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Consistency check
  is_consistent BOOLEAN DEFAULT true,
  inconsistencies TEXT[], -- Array of fields that don't match

  -- Last check
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nap_consistency IS 'NAP (Name, Address, Phone) consistency tracking across platforms';
COMMENT ON COLUMN nap_consistency.inconsistencies IS 'Fields that do not match the canonical source';

-- =====================================================================
-- INDEXES
-- =====================================================================

-- Google Business Profiles
CREATE INDEX idx_gbp_trainer_id ON google_business_profiles(trainer_id);
CREATE INDEX idx_gbp_location_id ON google_business_profiles(location_id);
CREATE INDEX idx_gbp_verification_status ON google_business_profiles(verification_status);
CREATE INDEX idx_gbp_sync_status ON google_business_profiles(sync_status);

-- Review Requests
CREATE INDEX idx_review_requests_trainer_id ON review_requests(trainer_id);
CREATE INDEX idx_review_requests_client_id ON review_requests(client_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_sent_at ON review_requests(sent_at DESC);
CREATE INDEX idx_review_requests_expires_at ON review_requests(expires_at);

-- SEO Keywords
CREATE INDEX idx_seo_keywords_trainer_id ON seo_keywords(trainer_id);
CREATE INDEX idx_seo_keywords_status ON seo_keywords(status);
CREATE INDEX idx_seo_keywords_current_rank ON seo_keywords(current_rank);

-- Landing Pages
CREATE INDEX idx_landing_pages_trainer_id ON landing_pages(trainer_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);
CREATE INDEX idx_landing_pages_page_type ON landing_pages(page_type);

-- SEO Analytics
CREATE INDEX idx_seo_analytics_trainer_id ON seo_analytics(trainer_id);
CREATE INDEX idx_seo_analytics_date ON seo_analytics(date DESC);
CREATE INDEX idx_seo_analytics_gbp_id ON seo_analytics(gbp_id);

-- NAP Consistency
CREATE INDEX idx_nap_consistency_trainer_id ON nap_consistency(trainer_id);
CREATE INDEX idx_nap_consistency_platform ON nap_consistency(platform);
CREATE INDEX idx_nap_consistency_is_consistent ON nap_consistency(is_consistent);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE google_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE nap_consistency ENABLE ROW LEVEL SECURITY;

-- Google Business Profiles: Trainers can only access their own
CREATE POLICY gbp_trainer_policy ON google_business_profiles
  FOR ALL
  USING (trainer_id = auth.uid());

-- Review Requests: Trainers see their requests, clients see theirs
CREATE POLICY review_requests_trainer_policy ON review_requests
  FOR ALL
  USING (trainer_id = auth.uid() OR client_id = auth.uid());

-- SEO Keywords: Trainers only
CREATE POLICY seo_keywords_trainer_policy ON seo_keywords
  FOR ALL
  USING (trainer_id = auth.uid());

-- Landing Pages: Public read, trainer write
CREATE POLICY landing_pages_public_read ON landing_pages
  FOR SELECT
  USING (status = 'published');

CREATE POLICY landing_pages_trainer_write ON landing_pages
  FOR ALL
  USING (trainer_id = auth.uid());

-- SEO Analytics: Trainers only
CREATE POLICY seo_analytics_trainer_policy ON seo_analytics
  FOR ALL
  USING (trainer_id = auth.uid());

-- NAP Consistency: Trainers only
CREATE POLICY nap_consistency_trainer_policy ON nap_consistency
  FOR ALL
  USING (trainer_id = auth.uid());

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Function to expire old review requests
CREATE OR REPLACE FUNCTION expire_review_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE review_requests
  SET status = 'expired'
  WHERE status IN ('sent', 'clicked')
    AND expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION expire_review_requests IS 'Mark review requests as expired after 90 days';

-- Function to check NAP consistency
CREATE OR REPLACE FUNCTION check_nap_consistency(p_trainer_id UUID)
RETURNS TABLE(
  is_consistent BOOLEAN,
  inconsistencies JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_canonical RECORD;
  v_platforms RECORD;
  v_inconsistencies JSONB := '[]'::JSONB;
BEGIN
  -- Get canonical NAP from trainer profile
  SELECT
    business_name,
    address_line1,
    city,
    state,
    postal_code,
    phone,
    email
  INTO v_canonical
  FROM google_business_profiles
  WHERE trainer_id = p_trainer_id
    AND profile_status = 'published'
  LIMIT 1;

  IF v_canonical IS NULL THEN
    RETURN QUERY SELECT false, '["No canonical profile found"]'::JSONB;
    RETURN;
  END IF;

  -- Compare with other platforms
  FOR v_platforms IN
    SELECT *
    FROM nap_consistency
    WHERE trainer_id = p_trainer_id
  LOOP
    -- Check each field
    IF v_platforms.business_name != v_canonical.business_name THEN
      v_inconsistencies := v_inconsistencies || jsonb_build_object('platform', v_platforms.platform, 'field', 'business_name');
    END IF;
    -- Add more field checks as needed
  END LOOP;

  IF jsonb_array_length(v_inconsistencies) > 0 THEN
    RETURN QUERY SELECT false, v_inconsistencies;
  ELSE
    RETURN QUERY SELECT true, '[]'::JSONB;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_nap_consistency IS 'Validate NAP consistency across all platforms for a trainer';

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_gbp_updated_at
  BEFORE UPDATE ON google_business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_keywords_updated_at
  BEFORE UPDATE ON seo_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nap_consistency_updated_at
  BEFORE UPDATE ON nap_consistency
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
