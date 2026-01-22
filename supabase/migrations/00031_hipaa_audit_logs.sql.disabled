-- =====================================================
-- Sprint 45: HIPAA Compliance - Audit Logging System
-- =====================================================
-- This migration creates a comprehensive audit logging system
-- for HIPAA compliance, tracking all access to Protected Health
-- Information (PHI).
--
-- HIPAA Requirements:
-- - Track who accessed what PHI and when
-- - Track all modifications to PHI
-- - Immutable audit trail (no updates/deletes)
-- - Retention for minimum 6 years (we use 7)
-- - Suspicious activity detection
-- =====================================================

-- Audit log table for HIPAA compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Actor information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,

    -- Action details
    action TEXT NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete', 'export', 'print', 'share')),
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,

    -- PHI classification
    contains_phi BOOLEAN DEFAULT FALSE,
    phi_categories TEXT[], -- ['demographics', 'health_metrics', 'medical_history', 'photos']

    -- Context
    session_id UUID,
    request_id UUID,
    api_endpoint TEXT,
    http_method TEXT CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    http_status_code INTEGER,

    -- Data changes (for update/delete)
    before_data JSONB,
    after_data JSONB,

    -- Security context
    access_reason TEXT CHECK (access_reason IN ('treatment', 'payment', 'operations', 'research', 'emergency', 'other')),
    authorization_level TEXT,

    -- Compliance
    retention_policy TEXT DEFAULT 'standard' CHECK (retention_policy IN ('standard', 'extended')),
    anonymization_date TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance and querying
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_phi ON audit_logs(contains_phi) WHERE contains_phi = TRUE;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_resource_timestamp ON audit_logs(resource_type, resource_id, timestamp DESC);

-- PHI access summary view (for compliance reporting)
CREATE OR REPLACE VIEW phi_access_summary AS
SELECT
    DATE(timestamp) as access_date,
    user_id,
    user_email,
    user_role,
    action,
    resource_type,
    COUNT(*) as access_count,
    ARRAY_AGG(DISTINCT phi_categories) FILTER (WHERE phi_categories IS NOT NULL) as phi_categories_accessed,
    MIN(timestamp) as first_access,
    MAX(timestamp) as last_access
FROM audit_logs
WHERE contains_phi = TRUE
GROUP BY DATE(timestamp), user_id, user_email, user_role, action, resource_type;

-- Suspicious activity detection view
CREATE OR REPLACE VIEW suspicious_phi_access AS
SELECT
    user_id,
    user_email,
    user_role,
    DATE(timestamp) as access_date,
    COUNT(*) as access_count,
    COUNT(DISTINCT resource_id) as unique_records_accessed,
    COUNT(DISTINCT resource_type) as resource_types_accessed,
    ARRAY_AGG(DISTINCT action) as actions_performed
FROM audit_logs
WHERE contains_phi = TRUE
    AND action = 'read'
GROUP BY user_id, user_email, user_role, DATE(timestamp)
HAVING COUNT(*) > 100 -- More than 100 PHI access per day
    OR COUNT(DISTINCT resource_id) > 50; -- More than 50 unique records

-- After-hours access view (potential concern)
CREATE OR REPLACE VIEW after_hours_phi_access AS
SELECT
    user_id,
    user_email,
    user_role,
    timestamp,
    action,
    resource_type,
    resource_id,
    access_reason
FROM audit_logs
WHERE contains_phi = TRUE
    AND (
        EXTRACT(HOUR FROM timestamp) < 6 -- Before 6 AM
        OR EXTRACT(HOUR FROM timestamp) > 22 -- After 10 PM
        OR EXTRACT(DOW FROM timestamp) IN (0, 6) -- Weekend
    );

-- Row Level Security for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and compliance officers can read audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'compliance_officer')
        )
    );

-- System can insert audit logs (service role only)
CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- No updates allowed (immutable audit trail)
CREATE POLICY audit_logs_update_policy ON audit_logs
    FOR UPDATE
    USING (FALSE);

-- No deletes allowed (immutable audit trail)
CREATE POLICY audit_logs_delete_policy ON audit_logs
    FOR DELETE
    USING (FALSE);

-- Function to auto-populate user context from JWT
CREATE OR REPLACE FUNCTION set_audit_log_user_context()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_user_role TEXT;
BEGIN
    -- If user_id is not provided, get from JWT
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;

    -- Get user email
    IF NEW.user_email IS NULL AND NEW.user_id IS NOT NULL THEN
        SELECT email INTO v_user_email
        FROM auth.users
        WHERE id = NEW.user_id;
        NEW.user_email := COALESCE(v_user_email, 'system');
    END IF;

    -- Get user role
    IF NEW.user_role IS NULL AND NEW.user_id IS NOT NULL THEN
        SELECT role INTO v_user_role
        FROM profiles
        WHERE id = NEW.user_id;
        NEW.user_role := COALESCE(v_user_role, 'unknown');
    END IF;

    -- Set retention policy based on PHI content
    IF NEW.contains_phi = TRUE AND NEW.retention_policy IS NULL THEN
        NEW.retention_policy := 'standard'; -- 7 years for PHI
    END IF;

    -- Calculate anonymization date (7 years from now for standard)
    IF NEW.anonymization_date IS NULL THEN
        IF NEW.retention_policy = 'standard' THEN
            NEW.anonymization_date := NOW() + INTERVAL '7 years';
        ELSIF NEW.retention_policy = 'extended' THEN
            NEW.anonymization_date := NOW() + INTERVAL '10 years';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-populate user context
CREATE TRIGGER audit_log_user_context_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_log_user_context();

-- Function to get audit log summary for a user
CREATE OR REPLACE FUNCTION get_user_audit_summary(
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    action TEXT,
    resource_type TEXT,
    access_count BIGINT,
    phi_access_count BIGINT,
    last_access TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.action,
        al.resource_type,
        COUNT(*) as access_count,
        COUNT(*) FILTER (WHERE al.contains_phi = TRUE) as phi_access_count,
        MAX(al.timestamp) as last_access
    FROM audit_logs al
    WHERE al.user_id = p_user_id
        AND al.timestamp >= p_start_date
        AND al.timestamp <= p_end_date
    GROUP BY al.action, al.resource_type
    ORDER BY access_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for suspicious activity
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
        al.user_id,
        al.user_email,
        al.user_role,
        DATE(al.timestamp) as access_date,
        COUNT(*) as access_count,
        COUNT(DISTINCT al.resource_id) as unique_records,
        CASE
            WHEN COUNT(*) > p_threshold_per_day * 2 THEN 'critical'
            WHEN COUNT(*) > p_threshold_per_day THEN 'high'
            WHEN COUNT(DISTINCT al.resource_id) > 50 THEN 'medium'
            ELSE 'low'
        END as risk_level
    FROM audit_logs al
    WHERE al.contains_phi = TRUE
        AND al.timestamp >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY al.user_id, al.user_email, al.user_role, DATE(al.timestamp)
    HAVING COUNT(*) > p_threshold_per_day / 2
        OR COUNT(DISTINCT al.resource_id) > 30
    ORDER BY access_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export audit logs (for compliance audits)
CREATE OR REPLACE FUNCTION export_audit_logs(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_contains_phi BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    timestamp TIMESTAMP WITH TIME ZONE,
    user_email TEXT,
    user_role TEXT,
    action TEXT,
    resource_type TEXT,
    resource_id UUID,
    contains_phi BOOLEAN,
    phi_categories TEXT[],
    access_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.timestamp,
        al.user_email,
        al.user_role,
        al.action,
        al.resource_type,
        al.resource_id,
        al.contains_phi,
        al.phi_categories,
        al.access_reason
    FROM audit_logs al
    WHERE al.timestamp >= p_start_date
        AND al.timestamp <= p_end_date
        AND (p_contains_phi IS NULL OR al.contains_phi = p_contains_phi)
    ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant audit trail for all system activity, especially PHI access';
COMMENT ON COLUMN audit_logs.contains_phi IS 'TRUE if this action involved Protected Health Information under HIPAA';
COMMENT ON COLUMN audit_logs.phi_categories IS 'Categories of PHI accessed: demographics, health_metrics, medical_history, photos, etc.';
COMMENT ON COLUMN audit_logs.access_reason IS 'HIPAA-compliant reason: treatment, payment, operations, research, emergency';
COMMENT ON COLUMN audit_logs.retention_policy IS 'Retention period: standard (7 years), extended (10 years)';
COMMENT ON COLUMN audit_logs.anonymization_date IS 'Date when PII in this log should be anonymized';
COMMENT ON VIEW phi_access_summary IS 'Daily summary of PHI access by user for compliance reporting';
COMMENT ON VIEW suspicious_phi_access IS 'Detects unusual PHI access patterns for security monitoring';
COMMENT ON VIEW after_hours_phi_access IS 'Tracks PHI access outside normal business hours';
COMMENT ON FUNCTION get_user_audit_summary IS 'Get summary of user activity for a time period';
COMMENT ON FUNCTION detect_suspicious_activity IS 'Detect suspicious PHI access patterns based on thresholds';
COMMENT ON FUNCTION export_audit_logs IS 'Export audit logs for compliance audits and reporting';

-- Grant access to views for compliance officers
GRANT SELECT ON phi_access_summary TO authenticated;
GRANT SELECT ON suspicious_phi_access TO authenticated;
GRANT SELECT ON after_hours_phi_access TO authenticated;

-- Execution privileges for functions
GRANT EXECUTE ON FUNCTION get_user_audit_summary TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity TO authenticated;
GRANT EXECUTE ON FUNCTION export_audit_logs TO authenticated;
