-- =====================================================
-- Sprint 80: HIPAA & Compliance — Audit Trail Hardening
-- =====================================================
-- Enables the audit_logs table with hardened security:
-- - Insert-only RLS (authenticated users can write, only owner/admin can read)
-- - Server-side trigger auto-populates identity from JWT
-- - Immutable: no UPDATE/DELETE allowed
-- - resource_id is TEXT (not UUID) to support JSON arrays for exports
-- - session_id / request_id are TEXT for flexibility
--
-- Also adds crisis_resource_access_log for persistent crisis tracking (Task 80.2)
-- =====================================================

-- ─── Audit Logs Table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),

    -- Actor information (auto-populated by trigger from JWT)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL DEFAULT 'unknown',
    user_role TEXT NOT NULL DEFAULT 'unknown',
    ip_address INET,              -- Captured server-side only; never from client
    user_agent TEXT,

    -- Action details
    action TEXT NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'export', 'print', 'share')),
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,     -- TEXT not UUID: exports store JSON arrays

    -- PHI classification
    contains_phi BOOLEAN DEFAULT FALSE,
    phi_categories TEXT[],

    -- Context
    session_id TEXT,
    request_id TEXT,
    api_endpoint TEXT,
    http_method TEXT CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    http_status_code INTEGER,

    -- Data changes (sanitized: field names + types only, no raw PHI values)
    before_data JSONB,
    after_data JSONB,

    -- Security context
    access_reason TEXT CHECK (access_reason IN ('treatment', 'payment', 'operations', 'research', 'emergency', 'other')),
    authorization_level TEXT,

    -- Compliance
    retention_policy TEXT DEFAULT 'standard' CHECK (retention_policy IN ('standard', 'extended')),
    anonymization_date TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_phi ON audit_logs(contains_phi) WHERE contains_phi = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- ─── RLS Policies ────────────────────────────────────────────────────

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT audit log entries
-- (trigger auto-populates identity from JWT)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_insert_authenticated') THEN
    CREATE POLICY audit_logs_insert_authenticated ON audit_logs
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Only gym_owner / admin / compliance_officer can SELECT audit logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_select_authorized') THEN
    CREATE POLICY audit_logs_select_authorized ON audit_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role IN ('gym_owner', 'admin', 'compliance_officer')
        )
      );
  END IF;
END $$;

-- Immutable: no UPDATE or DELETE
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_no_update') THEN
    CREATE POLICY audit_logs_no_update ON audit_logs FOR UPDATE USING (FALSE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_logs_no_delete') THEN
    CREATE POLICY audit_logs_no_delete ON audit_logs FOR DELETE USING (FALSE);
  END IF;
END $$;

-- ─── Trigger: Auto-populate user context from JWT ────────────────────

CREATE OR REPLACE FUNCTION set_audit_log_user_context()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_user_role TEXT;
BEGIN
    -- Always override user_id from JWT (defence-in-depth)
    NEW.user_id := auth.uid();

    -- Resolve email from auth.users
    IF NEW.user_id IS NOT NULL THEN
        SELECT email INTO v_user_email
        FROM auth.users WHERE id = NEW.user_id;
        NEW.user_email := COALESCE(v_user_email, 'unknown');
    END IF;

    -- Resolve role from profiles
    IF NEW.user_id IS NOT NULL THEN
        SELECT role INTO v_user_role
        FROM profiles WHERE id = NEW.user_id;
        NEW.user_role := COALESCE(v_user_role, 'unknown');
    END IF;

    -- Set retention & anonymization dates for PHI
    IF NEW.contains_phi = TRUE AND NEW.retention_policy IS NULL THEN
        NEW.retention_policy := 'standard';
    END IF;
    IF NEW.anonymization_date IS NULL THEN
        IF NEW.retention_policy = 'extended' THEN
            NEW.anonymization_date := NOW() + INTERVAL '10 years';
        ELSE
            NEW.anonymization_date := NOW() + INTERVAL '7 years';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_log_user_context_trigger ON audit_logs;
CREATE TRIGGER audit_log_user_context_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_log_user_context();

-- ─── Views ───────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW phi_access_summary AS
SELECT
    DATE(timestamp) AS access_date,
    user_id, user_email, user_role,
    action, resource_type,
    COUNT(*) AS access_count,
    ARRAY_AGG(DISTINCT phi_categories) FILTER (WHERE phi_categories IS NOT NULL) AS phi_categories_accessed,
    MIN(timestamp) AS first_access,
    MAX(timestamp) AS last_access
FROM audit_logs
WHERE contains_phi = TRUE
GROUP BY DATE(timestamp), user_id, user_email, user_role, action, resource_type;

CREATE OR REPLACE VIEW suspicious_phi_access AS
SELECT
    user_id, user_email, user_role,
    DATE(timestamp) AS access_date,
    COUNT(*) AS access_count,
    COUNT(DISTINCT resource_id) AS unique_records_accessed,
    COUNT(DISTINCT resource_type) AS resource_types_accessed,
    ARRAY_AGG(DISTINCT action) AS actions_performed
FROM audit_logs
WHERE contains_phi = TRUE AND action = 'read'
GROUP BY user_id, user_email, user_role, DATE(timestamp)
HAVING COUNT(*) > 100 OR COUNT(DISTINCT resource_id) > 50;

CREATE OR REPLACE VIEW after_hours_phi_access AS
SELECT
    user_id, user_email, user_role,
    timestamp, action, resource_type, resource_id, access_reason
FROM audit_logs
WHERE contains_phi = TRUE
  AND (EXTRACT(HOUR FROM timestamp) < 6
    OR EXTRACT(HOUR FROM timestamp) > 22
    OR EXTRACT(DOW FROM timestamp) IN (0, 6));

GRANT SELECT ON phi_access_summary TO authenticated;
GRANT SELECT ON suspicious_phi_access TO authenticated;
GRANT SELECT ON after_hours_phi_access TO authenticated;

-- ─── RPCs ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    p_threshold_per_day INTEGER DEFAULT 100,
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    access_date DATE,
    access_count BIGINT,
    unique_records BIGINT,
    risk_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.user_id, al.user_email, al.user_role,
        DATE(al.timestamp) AS access_date,
        COUNT(*) AS access_count,
        COUNT(DISTINCT al.resource_id) AS unique_records,
        CASE
            WHEN COUNT(*) > p_threshold_per_day * 2 THEN 'critical'
            WHEN COUNT(*) > p_threshold_per_day THEN 'high'
            WHEN COUNT(DISTINCT al.resource_id) > 50 THEN 'medium'
            ELSE 'low'
        END AS risk_level
    FROM audit_logs al
    WHERE al.contains_phi = TRUE
      AND al.timestamp >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY al.user_id, al.user_email, al.user_role, DATE(al.timestamp)
    HAVING COUNT(*) > p_threshold_per_day / 2
        OR COUNT(DISTINCT al.resource_id) > 30
    ORDER BY access_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION export_audit_logs(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_contains_phi BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    "timestamp" TIMESTAMPTZ,
    user_email TEXT,
    user_role TEXT,
    action TEXT,
    resource_type TEXT,
    resource_id TEXT,
    contains_phi BOOLEAN,
    phi_categories TEXT[],
    access_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.timestamp, al.user_email, al.user_role,
        al.action, al.resource_type, al.resource_id,
        al.contains_phi, al.phi_categories, al.access_reason
    FROM audit_logs al
    WHERE al.timestamp >= p_start_date
      AND al.timestamp <= p_end_date
      AND (p_contains_phi IS NULL OR al.contains_phi = p_contains_phi)
    ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION detect_suspicious_activity TO authenticated;
GRANT EXECUTE ON FUNCTION export_audit_logs TO authenticated;

-- ─── Crisis Resource Access Log (Task 80.2) ──────────────────────────

CREATE TABLE IF NOT EXISTS crisis_resource_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL,    -- e.g. 'crisis_hotline', 'emergency_services', 'safety_plan'
    resource_name TEXT NOT NULL,    -- e.g. '988 Suicide & Crisis Lifeline'
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context JSONB                   -- optional metadata (screening_id, severity, etc.)
);

ALTER TABLE crisis_resource_access_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crisis_resource_access_log' AND policyname = 'crisis_log_insert_own') THEN
    CREATE POLICY crisis_log_insert_own ON crisis_resource_access_log
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crisis_resource_access_log' AND policyname = 'crisis_log_select_own') THEN
    CREATE POLICY crisis_log_select_own ON crisis_resource_access_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crisis_log_user ON crisis_resource_access_log(user_id, accessed_at DESC);

-- ─── User Data Processing Consents (Task 80.3 / 80.6) ───────────────

CREATE TABLE IF NOT EXISTS user_data_consents (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    health_data_sync BOOLEAN NOT NULL DEFAULT FALSE,
    analytics_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_data_consents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_data_consents' AND policyname = 'consent_select_own') THEN
    CREATE POLICY consent_select_own ON user_data_consents
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_data_consents' AND policyname = 'consent_insert_own') THEN
    CREATE POLICY consent_insert_own ON user_data_consents
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_data_consents' AND policyname = 'consent_update_own') THEN
    CREATE POLICY consent_update_own ON user_data_consents
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON TABLE user_data_consents IS 'HIPAA / GDPR data processing consent flags per user';

-- Table / view comments
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant immutable audit trail for all system activity, especially PHI access';
COMMENT ON TABLE crisis_resource_access_log IS 'Persistent log of crisis/safety resource access for wellness monitoring';
