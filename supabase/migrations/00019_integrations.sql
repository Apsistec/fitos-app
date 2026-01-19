-- =====================================================
-- Sprint 24: Integration Marketplace
-- OAuth and data mapping for third-party apps
-- =====================================================

-- =====================================================
-- INTEGRATIONS TABLE
-- Available third-party integrations
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Integration identity
  integration_key TEXT UNIQUE NOT NULL, -- 'myfitnesspal', 'google_calendar', 'calendly', etc.
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('nutrition', 'calendar', 'wearable', 'communication', 'payment', 'analytics')
  ),

  -- Provider info
  provider_name TEXT NOT NULL,
  provider_url TEXT,

  -- OAuth configuration
  oauth_enabled BOOLEAN DEFAULT false,
  oauth_provider TEXT, -- 'google', 'custom', etc.
  oauth_scopes TEXT[], -- Required OAuth scopes

  -- API configuration
  api_base_url TEXT,
  api_version TEXT,

  -- Feature flags
  is_active BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT false, -- Trainer/owner approval needed
  available_for_roles TEXT[] DEFAULT ARRAY['client', 'trainer', 'gym_owner']::TEXT[],

  -- Metadata
  setup_instructions TEXT,
  support_url TEXT,
  pricing_info TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integrations_category ON integrations(category) WHERE is_active = true;
CREATE INDEX idx_integrations_key ON integrations(integration_key);

-- =====================================================
-- USER_INTEGRATIONS TABLE
-- User-specific integration connections
-- =====================================================
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Connection status
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'error', 'disconnected', 'expired')
  ),

  -- OAuth tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Integration-specific config
  config JSONB DEFAULT '{}'::JSONB, -- Custom settings per integration

  -- Sync settings
  auto_sync BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'hourly' CHECK (
    sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'manual')
  ),
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Error tracking
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, integration_id)
);

-- Indexes
CREATE INDEX idx_user_integrations_user ON user_integrations(user_id, status);
CREATE INDEX idx_user_integrations_sync ON user_integrations(next_sync_at, auto_sync)
  WHERE status = 'active' AND auto_sync = true;
CREATE INDEX idx_user_integrations_errors ON user_integrations(user_id, error_count)
  WHERE error_count > 0;

-- =====================================================
-- INTEGRATION_SYNC_LOG TABLE
-- Track sync history and data flow
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,

  -- Sync info
  sync_type TEXT NOT NULL CHECK (
    sync_type IN ('full', 'incremental', 'manual', 'webhook')
  ),
  direction TEXT NOT NULL CHECK (
    direction IN ('import', 'export', 'bidirectional')
  ),

  -- Results
  status TEXT NOT NULL CHECK (
    status IN ('success', 'partial', 'failed')
  ),
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Performance
  duration_ms INTEGER,

  -- Error details
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  metadata JSONB, -- Integration-specific data

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_sync_log_user_integration ON integration_sync_log(user_integration_id, started_at DESC);
CREATE INDEX idx_sync_log_status ON integration_sync_log(status, started_at DESC);
CREATE INDEX idx_sync_log_failed ON integration_sync_log(user_integration_id)
  WHERE status = 'failed';

-- =====================================================
-- INTEGRATION_DATA_MAPPINGS TABLE
-- Map external IDs to internal records
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_data_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_integration_id UUID NOT NULL REFERENCES user_integrations(id) ON DELETE CASCADE,

  -- External reference
  external_id TEXT NOT NULL,
  external_type TEXT NOT NULL, -- 'food', 'exercise', 'event', etc.

  -- Internal reference
  internal_id UUID NOT NULL,
  internal_type TEXT NOT NULL, -- 'nutrition_log', 'workout', 'calendar_event', etc.

  -- Sync metadata
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  external_updated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_integration_id, external_id, external_type)
);

-- Indexes
CREATE INDEX idx_data_mappings_external ON integration_data_mappings(user_integration_id, external_id, external_type);
CREATE INDEX idx_data_mappings_internal ON integration_data_mappings(internal_id, internal_type);

-- =====================================================
-- INTEGRATION_WEBHOOKS TABLE
-- Webhook endpoints for real-time updates
-- =====================================================
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Webhook config
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT, -- For signature verification
  event_types TEXT[] NOT NULL, -- Events this webhook handles

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhooks_integration ON integration_webhooks(integration_id)
  WHERE is_active = true;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Integrations (public read)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active integrations"
  ON integrations FOR SELECT
  USING (is_active = true);

-- User Integrations
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integrations"
  ON user_integrations FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can view their clients' integrations"
  ON user_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles cp
      WHERE cp.id = user_integrations.user_id
        AND cp.trainer_id = auth.uid()
        AND true
    )
  );

-- Integration Sync Log
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
  ON integration_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_integrations
      WHERE user_integrations.id = integration_sync_log.user_integration_id
        AND user_integrations.user_id = auth.uid()
    )
  );

-- Integration Data Mappings
ALTER TABLE integration_data_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data mappings"
  ON integration_data_mappings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_integrations
      WHERE user_integrations.id = integration_data_mappings.user_integration_id
        AND user_integrations.user_id = auth.uid()
    )
  );

-- Integration Webhooks (admin only - no RLS needed for now)
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_integration_timestamp
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

CREATE TRIGGER trigger_update_user_integration_timestamp
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_updated_at();

-- Check if token needs refresh (within 1 hour of expiry)
CREATE OR REPLACE FUNCTION should_refresh_token(p_user_integration_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT token_expires_at INTO v_expires_at
  FROM user_integrations
  WHERE id = p_user_integration_id;

  IF v_expires_at IS NULL THEN
    RETURN false;
  END IF;

  -- Refresh if expiring within 1 hour
  RETURN v_expires_at <= NOW() + INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Schedule next sync based on frequency
CREATE OR REPLACE FUNCTION schedule_next_sync(
  p_user_integration_id UUID,
  p_frequency TEXT
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_sync TIMESTAMPTZ;
BEGIN
  CASE p_frequency
    WHEN 'realtime' THEN
      v_next_sync := NOW();
    WHEN 'hourly' THEN
      v_next_sync := NOW() + INTERVAL '1 hour';
    WHEN 'daily' THEN
      v_next_sync := NOW() + INTERVAL '1 day';
    WHEN 'weekly' THEN
      v_next_sync := NOW() + INTERVAL '7 days';
    WHEN 'manual' THEN
      v_next_sync := NULL;
    ELSE
      v_next_sync := NOW() + INTERVAL '1 hour';
  END CASE;

  UPDATE user_integrations
  SET next_sync_at = v_next_sync
  WHERE id = p_user_integration_id;

  RETURN v_next_sync;
END;
$$ LANGUAGE plpgsql;

-- Get integration status summary for user
CREATE OR REPLACE FUNCTION get_user_integration_summary(p_user_id UUID)
RETURNS TABLE (
  total_integrations INTEGER,
  active_integrations INTEGER,
  error_integrations INTEGER,
  pending_integrations INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_integrations,
    COUNT(*) FILTER (WHERE status = 'active')::INTEGER AS active_integrations,
    COUNT(*) FILTER (WHERE status = 'error')::INTEGER AS error_integrations,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_integrations
  FROM user_integrations
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DATA: Available Integrations
-- =====================================================

-- MyFitnessPal
INSERT INTO integrations (
  integration_key,
  name,
  description,
  category,
  provider_name,
  provider_url,
  oauth_enabled,
  oauth_provider,
  oauth_scopes,
  api_base_url,
  setup_instructions,
  available_for_roles
) VALUES (
  'myfitnesspal',
  'MyFitnessPal',
  'Sync your food diary and nutrition data automatically.',
  'nutrition',
  'MyFitnessPal',
  'https://www.myfitnesspal.com',
  true,
  'custom',
  ARRAY['diary', 'nutrition']::TEXT[],
  'https://api.myfitnesspal.com/v2',
  'Connect your MyFitnessPal account to automatically sync your food logs.',
  ARRAY['client', 'trainer']::TEXT[]
) ON CONFLICT (integration_key) DO NOTHING;

-- Google Calendar
INSERT INTO integrations (
  integration_key,
  name,
  description,
  category,
  provider_name,
  provider_url,
  oauth_enabled,
  oauth_provider,
  oauth_scopes,
  api_base_url,
  setup_instructions,
  available_for_roles
) VALUES (
  'google_calendar',
  'Google Calendar',
  'Sync workouts and sessions to your calendar.',
  'calendar',
  'Google',
  'https://calendar.google.com',
  true,
  'google',
  ARRAY['https://www.googleapis.com/auth/calendar.events']::TEXT[],
  'https://www.googleapis.com/calendar/v3',
  'Connect your Google Calendar to automatically add workout sessions.',
  ARRAY['client', 'trainer', 'gym_owner']::TEXT[]
) ON CONFLICT (integration_key) DO NOTHING;

-- Calendly
INSERT INTO integrations (
  integration_key,
  name,
  description,
  category,
  provider_name,
  provider_url,
  oauth_enabled,
  oauth_provider,
  oauth_scopes,
  api_base_url,
  setup_instructions,
  available_for_roles
) VALUES (
  'calendly',
  'Calendly',
  'Sync scheduling links and client bookings.',
  'calendar',
  'Calendly',
  'https://calendly.com',
  true,
  'custom',
  ARRAY['read', 'write']::TEXT[],
  'https://api.calendly.com',
  'Connect Calendly to sync your availability and client bookings.',
  ARRAY['trainer', 'gym_owner']::TEXT[]
) ON CONFLICT (integration_key) DO NOTHING;

-- Stripe (already exists, but for reference)
INSERT INTO integrations (
  integration_key,
  name,
  description,
  category,
  provider_name,
  provider_url,
  oauth_enabled,
  oauth_provider,
  oauth_scopes,
  api_base_url,
  setup_instructions,
  available_for_roles
) VALUES (
  'stripe',
  'Stripe',
  'Accept payments and manage subscriptions.',
  'payment',
  'Stripe',
  'https://stripe.com',
  true,
  'stripe',
  ARRAY['read_write']::TEXT[],
  'https://api.stripe.com/v1',
  'Connect your Stripe account to accept payments.',
  ARRAY['trainer', 'gym_owner']::TEXT[]
) ON CONFLICT (integration_key) DO NOTHING;

-- Zoom
INSERT INTO integrations (
  integration_key,
  name,
  description,
  category,
  provider_name,
  provider_url,
  oauth_enabled,
  oauth_provider,
  oauth_scopes,
  api_base_url,
  setup_instructions,
  available_for_roles
) VALUES (
  'zoom',
  'Zoom',
  'Create and manage virtual training sessions.',
  'communication',
  'Zoom',
  'https://zoom.us',
  true,
  'custom',
  ARRAY['meeting:write', 'meeting:read']::TEXT[],
  'https://api.zoom.us/v2',
  'Connect Zoom to automatically create meeting links for virtual sessions.',
  ARRAY['trainer', 'gym_owner']::TEXT[]
) ON CONFLICT (integration_key) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE integrations IS 'Available third-party integrations (marketplace)';
COMMENT ON TABLE user_integrations IS 'User-specific integration connections with OAuth tokens';
COMMENT ON TABLE integration_sync_log IS 'History of sync operations for auditing and debugging';
COMMENT ON TABLE integration_data_mappings IS 'Map external IDs to internal records for deduplication';
COMMENT ON TABLE integration_webhooks IS 'Webhook endpoints for real-time data push';

COMMENT ON COLUMN user_integrations.access_token IS 'OAuth access token (should be encrypted in production using pgcrypto)';
COMMENT ON COLUMN user_integrations.refresh_token IS 'OAuth refresh token (should be encrypted in production using pgcrypto)';
COMMENT ON COLUMN user_integrations.config IS 'Integration-specific settings (e.g., calendar ID, sync preferences)';
COMMENT ON COLUMN integration_sync_log.sync_type IS 'full = sync everything, incremental = only changes, manual = user-triggered, webhook = real-time';
COMMENT ON COLUMN integration_data_mappings.external_id IS 'External system''s ID for this record';
COMMENT ON COLUMN integration_data_mappings.internal_id IS 'FitOS internal UUID for this record';

COMMENT ON FUNCTION should_refresh_token IS 'Check if OAuth token needs refresh (within 1 hour of expiry)';
COMMENT ON FUNCTION schedule_next_sync IS 'Calculate and set next sync time based on frequency setting';
COMMENT ON FUNCTION get_user_integration_summary IS 'Get count of integrations by status for dashboard widget';
