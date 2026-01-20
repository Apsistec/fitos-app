-- =====================================================================
-- Sprint 41: Enterprise SSO
-- Migration: 00029_enterprise_sso.sql
--
-- Implements enterprise Single Sign-On (SSO) with SAML 2.0, OIDC,
-- and SCIM 2.0 directory sync support.
-- =====================================================================

-- =====================================================================
-- SSO CONFIGURATIONS
-- =====================================================================

CREATE TABLE sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider details
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
  provider_name TEXT NOT NULL, -- 'azure_ad', 'okta', 'google_workspace', 'onelogin', 'auth0'

  -- SAML Configuration
  saml_entity_id TEXT,
  saml_sso_url TEXT,
  saml_certificate TEXT, -- X.509 certificate from IdP (PEM format)
  saml_logout_url TEXT,
  saml_sign_requests BOOLEAN DEFAULT false,

  -- OIDC Configuration
  oidc_issuer TEXT,
  oidc_client_id TEXT,
  oidc_client_secret TEXT, -- Encrypted
  oidc_authorization_url TEXT,
  oidc_token_url TEXT,
  oidc_userinfo_url TEXT,
  oidc_jwks_url TEXT,

  -- Settings
  enabled BOOLEAN NOT NULL DEFAULT false,
  enforce_sso BOOLEAN NOT NULL DEFAULT false, -- Disable email/password login for this org
  allow_jit_provisioning BOOLEAN NOT NULL DEFAULT true, -- Just-in-time user creation
  default_role TEXT DEFAULT 'client' CHECK (default_role IN ('client', 'trainer', 'gym_owner', 'admin')),

  -- Role mapping (map IdP groups to FitOS roles)
  -- Example: {"Admin Group": "admin", "Trainer Group": "trainer", "Member Group": "client"}
  role_mapping JSONB DEFAULT '{}',

  -- Attribute mapping (map IdP attributes to user fields)
  -- Example: {"email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"}
  attribute_mapping JSONB DEFAULT '{
    "email": "email",
    "firstName": "given_name",
    "lastName": "family_name",
    "displayName": "name"
  }',

  -- Session settings
  session_duration_minutes INT DEFAULT 480, -- 8 hours
  idle_timeout_minutes INT DEFAULT 15,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id),

  -- Ensure required fields based on provider type
  CONSTRAINT saml_required_fields CHECK (
    provider_type != 'saml' OR (
      saml_entity_id IS NOT NULL AND
      saml_sso_url IS NOT NULL AND
      saml_certificate IS NOT NULL
    )
  ),
  CONSTRAINT oidc_required_fields CHECK (
    provider_type != 'oidc' OR (
      oidc_issuer IS NOT NULL AND
      oidc_client_id IS NOT NULL AND
      oidc_client_secret IS NOT NULL AND
      oidc_authorization_url IS NOT NULL AND
      oidc_token_url IS NOT NULL
    )
  )
);

COMMENT ON TABLE sso_configurations IS 'Enterprise SSO configuration per organization';
COMMENT ON COLUMN sso_configurations.enforce_sso IS 'When true, email/password login is disabled for this organization';
COMMENT ON COLUMN sso_configurations.allow_jit_provisioning IS 'Create users automatically on first SSO login';
COMMENT ON COLUMN sso_configurations.role_mapping IS 'JSON mapping of IdP groups to FitOS roles';

-- =====================================================================
-- SSO SESSIONS
-- =====================================================================

CREATE TABLE sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sso_config_id UUID NOT NULL REFERENCES sso_configurations(id) ON DELETE CASCADE,

  -- Session identifiers
  session_index TEXT, -- SAML SessionIndex for Single Logout
  name_id TEXT, -- SAML NameID or OIDC subject

  -- Provider info
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc')),

  -- Tokens (OIDC only)
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  id_token TEXT, -- Encrypted

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Security context
  ip_address INET,
  user_agent TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sso_sessions IS 'Active SSO sessions for enterprise users';
COMMENT ON COLUMN sso_sessions.session_index IS 'SAML SessionIndex for coordinating Single Logout';
COMMENT ON COLUMN sso_sessions.last_activity_at IS 'Last user activity timestamp for idle timeout';

-- =====================================================================
-- SSO AUDIT LOG
-- =====================================================================

CREATE TABLE sso_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sso_config_id UUID REFERENCES sso_configurations(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_initiated',
    'login_success',
    'login_failure',
    'logout',
    'jit_provision',
    'role_mapped',
    'session_expired',
    'session_revoked',
    'config_created',
    'config_updated',
    'config_deleted',
    'assertion_validated',
    'token_exchanged',
    'error'
  )),
  event_status TEXT NOT NULL CHECK (event_status IN ('success', 'failure', 'pending')),
  event_message TEXT,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Error details
  error_code TEXT,
  error_details JSONB,

  -- Additional metadata
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sso_audit_log IS 'Audit trail for all SSO events (compliance requirement)';
COMMENT ON COLUMN sso_audit_log.event_type IS 'Type of SSO event for compliance tracking';

-- =====================================================================
-- DIRECTORY SYNC (SCIM 2.0)
-- =====================================================================

CREATE TABLE directory_sync_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- SCIM Configuration
  scim_enabled BOOLEAN NOT NULL DEFAULT false,
  scim_bearer_token TEXT, -- Encrypted bearer token for SCIM requests
  scim_endpoint TEXT, -- Our SCIM endpoint URL for IdP to call

  -- Sync settings
  auto_provision BOOLEAN NOT NULL DEFAULT true, -- Create users from SCIM
  auto_deprovision BOOLEAN NOT NULL DEFAULT true, -- Deactivate users when removed from IdP
  sync_interval_minutes INT DEFAULT 60,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failure', 'in_progress')),
  last_sync_error TEXT,

  -- Statistics
  total_users_synced INT DEFAULT 0,
  total_groups_synced INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id)
);

COMMENT ON TABLE directory_sync_configs IS 'SCIM 2.0 directory synchronization configuration';
COMMENT ON COLUMN directory_sync_configs.auto_deprovision IS 'Automatically deactivate users when removed from IdP directory';

-- =====================================================================
-- SCIM SYNC EVENTS
-- =====================================================================

CREATE TABLE scim_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_sync_id UUID NOT NULL REFERENCES directory_sync_configs(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'user_created',
    'user_updated',
    'user_deprovisioned',
    'group_created',
    'group_updated',
    'group_deleted',
    'sync_started',
    'sync_completed',
    'sync_failed'
  )),

  -- Target
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  external_id TEXT, -- SCIM externalId

  -- Details
  changes JSONB, -- What changed
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scim_sync_events IS 'History of SCIM synchronization events';

-- =====================================================================
-- INDEXES
-- =====================================================================

-- SSO Configurations
CREATE INDEX idx_sso_configs_org_id ON sso_configurations(organization_id);
CREATE INDEX idx_sso_configs_enabled ON sso_configurations(enabled) WHERE enabled = true;

-- SSO Sessions
CREATE INDEX idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX idx_sso_sessions_org_id ON sso_sessions(organization_id);
CREATE INDEX idx_sso_sessions_expires_at ON sso_sessions(expires_at);
CREATE INDEX idx_sso_sessions_status ON sso_sessions(status);
CREATE INDEX idx_sso_sessions_last_activity ON sso_sessions(last_activity_at);

-- SSO Audit Log
CREATE INDEX idx_sso_audit_org_id ON sso_audit_log(organization_id);
CREATE INDEX idx_sso_audit_user_id ON sso_audit_log(user_id);
CREATE INDEX idx_sso_audit_created_at ON sso_audit_log(created_at DESC);
CREATE INDEX idx_sso_audit_event_type ON sso_audit_log(event_type);

-- Directory Sync
CREATE INDEX idx_directory_sync_org_id ON directory_sync_configs(organization_id);
CREATE INDEX idx_scim_events_directory_id ON scim_sync_events(directory_sync_id);
CREATE INDEX idx_scim_events_created_at ON scim_sync_events(created_at DESC);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scim_sync_events ENABLE ROW LEVEL SECURITY;

-- SSO Configurations: Only org owners can view/manage
CREATE POLICY sso_configs_org_owners ON sso_configurations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM location_staff
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- SSO Sessions: Users can view their own sessions
CREATE POLICY sso_sessions_own ON sso_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Org owners can view all sessions in their org
CREATE POLICY sso_sessions_org_owners ON sso_sessions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM location_staff
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- SSO Audit Log: Org owners can view
CREATE POLICY sso_audit_org_owners ON sso_audit_log
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM location_staff
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Directory Sync: Org owners only
CREATE POLICY directory_sync_org_owners ON directory_sync_configs
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM location_staff
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Function to expire idle SSO sessions
CREATE OR REPLACE FUNCTION expire_idle_sso_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sso_sessions
  SET status = 'expired'
  WHERE status = 'active'
    AND (
      expires_at < NOW() OR
      last_activity_at < NOW() - INTERVAL '15 minutes' -- Idle timeout
    );
END;
$$;

COMMENT ON FUNCTION expire_idle_sso_sessions IS 'Expire SSO sessions based on expiration time or idle timeout';

-- Function to log SSO events
CREATE OR REPLACE FUNCTION log_sso_event(
  p_organization_id UUID,
  p_user_id UUID,
  p_sso_config_id UUID,
  p_event_type TEXT,
  p_event_status TEXT,
  p_event_message TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO sso_audit_log (
    organization_id,
    user_id,
    sso_config_id,
    event_type,
    event_status,
    event_message,
    ip_address,
    error_details
  ) VALUES (
    p_organization_id,
    p_user_id,
    p_sso_config_id,
    p_event_type,
    p_event_status,
    p_event_message,
    p_ip_address,
    p_error_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_sso_event IS 'Centralized function for logging all SSO audit events';

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_sso_configs_updated_at
  BEFORE UPDATE ON sso_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_directory_sync_updated_at
  BEFORE UPDATE ON directory_sync_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- SAMPLE DATA (for development/testing)
-- =====================================================================

-- Note: In production, SSO configs are created by admins via UI
-- This is just for reference

/*
-- Example: Okta SAML Configuration
INSERT INTO sso_configurations (
  organization_id,
  provider_type,
  provider_name,
  saml_entity_id,
  saml_sso_url,
  saml_certificate,
  enabled,
  allow_jit_provisioning,
  default_role
) VALUES (
  'org-uuid-here',
  'saml',
  'okta',
  'http://www.okta.com/exampleapp',
  'https://dev-12345.okta.com/app/dev-12345_fitnessapp_1/exkabcdef/sso/saml',
  '-----BEGIN CERTIFICATE-----\nMIIDp...\n-----END CERTIFICATE-----',
  true,
  true,
  'client'
);

-- Example: Google Workspace OIDC Configuration
INSERT INTO sso_configurations (
  organization_id,
  provider_type,
  provider_name,
  oidc_issuer,
  oidc_client_id,
  oidc_client_secret,
  oidc_authorization_url,
  oidc_token_url,
  oidc_userinfo_url,
  enabled,
  allow_jit_provisioning,
  default_role
) VALUES (
  'org-uuid-here',
  'oidc',
  'google_workspace',
  'https://accounts.google.com',
  '1234567890-abcdefghijklmnop.apps.googleusercontent.com',
  'GOCSPX-encrypted-secret-here',
  'https://accounts.google.com/o/oauth2/v2/auth',
  'https://oauth2.googleapis.com/token',
  'https://openidconnect.googleapis.com/v1/userinfo',
  true,
  true,
  'client'
);
*/
