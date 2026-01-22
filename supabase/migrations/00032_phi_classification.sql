-- =====================================================
-- Sprint 45: HIPAA Compliance - PHI Classification
-- =====================================================
-- This migration adds PHI classification to existing tables
-- and creates a consent management system for HIPAA compliance.
--
-- PHI (Protected Health Information) includes:
-- - Demographics (name, DOB, email, phone, address)
-- - Health metrics (weight, body comp, HR, BP, sleep)
-- - Photos (progress photos, body composition)
-- - Medical history (injuries, conditions, medications)
-- - Workout and nutrition data
-- =====================================================

-- =====================================================
-- Part 1: PHI Classification for Existing Tables
-- =====================================================

-- Client profiles (demographics = PHI)
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'demographics';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS requires_consent BOOLEAN DEFAULT TRUE;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS hipaa_consent_obtained_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN client_profiles.phi_category IS 'HIPAA PHI category: demographics';
COMMENT ON COLUMN client_profiles.requires_consent IS 'TRUE if HIPAA consent required to access';
COMMENT ON COLUMN client_profiles.hipaa_consent_obtained_at IS 'When HIPAA notice of privacy practices was acknowledged';

-- Profiles table (basic demographics)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'demographics';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_phi BOOLEAN DEFAULT TRUE;

-- Body weight logs (health metrics = PHI)
ALTER TABLE body_weight_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';
ALTER TABLE body_weight_logs ADD COLUMN IF NOT EXISTS is_phi BOOLEAN DEFAULT TRUE;

-- Body composition logs (health metrics = PHI)
ALTER TABLE body_composition_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';
ALTER TABLE body_composition_logs ADD COLUMN IF NOT EXISTS is_phi BOOLEAN DEFAULT TRUE;

-- Nutrition logs (health metrics = PHI)
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS is_phi BOOLEAN DEFAULT TRUE;

-- Workout logs (health metrics = PHI)
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS is_phi BOOLEAN DEFAULT TRUE;

-- Progress photos (high sensitivity PHI - photos)
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'photos';
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS is_phi BOOLEAN DEFAULT TRUE;
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS requires_special_consent BOOLEAN DEFAULT TRUE;
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS hipaa_consent_obtained_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN progress_photos.phi_category IS 'HIPAA PHI category: photos (high sensitivity)';
COMMENT ON COLUMN progress_photos.requires_special_consent IS 'TRUE if additional consent required beyond standard HIPAA';

-- =====================================================
-- Part 2: Client Consents Table
-- =====================================================

CREATE TABLE IF NOT EXISTS client_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Consent details
    consent_type TEXT NOT NULL CHECK (consent_type IN (
        'hipaa_notice',           -- HIPAA Notice of Privacy Practices
        'treatment',              -- Consent for treatment
        'research',               -- Consent for research studies
        'marketing',              -- Consent for marketing communications
        'photo_sharing',          -- Consent for photo usage
        'data_sharing',           -- Consent for third-party data sharing
        'telehealth'              -- Consent for telehealth services
    )),
    consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    consent_expires_at TIMESTAMP WITH TIME ZONE,

    -- Legal documentation
    consent_version TEXT NOT NULL, -- Version of consent form (e.g., "1.0", "2024-01")
    consent_text TEXT NOT NULL,    -- Full text of consent form
    consent_url TEXT,              -- URL to PDF of consent form

    -- Signature
    signature_method TEXT CHECK (signature_method IN ('electronic', 'verbal', 'written', 'click_through')),
    signature_data TEXT,           -- Base64 encoded signature image or typed name
    ip_address INET,
    user_agent TEXT,

    -- Tracking
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    revoked_by UUID REFERENCES profiles(id),

    -- Witness (for verbal consents)
    witness_id UUID REFERENCES profiles(id),
    witness_signature TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique consent type per client per version
    UNIQUE(client_id, consent_type, consent_version)
);

-- Indexes
CREATE INDEX idx_client_consents_client_id ON client_consents(client_id);
CREATE INDEX idx_client_consents_type ON client_consents(consent_type);
CREATE INDEX idx_client_consents_granted ON client_consents(consent_granted) WHERE consent_granted = TRUE;
CREATE INDEX idx_client_consents_expires_at ON client_consents(consent_expires_at) WHERE consent_expires_at IS NOT NULL;
CREATE INDEX idx_client_consents_revoked ON client_consents(revoked_at) WHERE revoked_at IS NULL;

-- RLS policies
ALTER TABLE client_consents ENABLE ROW LEVEL SECURITY;

-- Clients can view their own consents
CREATE POLICY client_consents_select_policy ON client_consents
    FOR SELECT
    USING (
        auth.uid() = client_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'compliance_officer', 'trainer')
        )
    );

-- Clients can insert their own consents
CREATE POLICY client_consents_insert_policy ON client_consents
    FOR INSERT
    WITH CHECK (
        auth.uid() = client_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'compliance_officer')
        )
    );

-- Only clients can update their own consents (to revoke)
CREATE POLICY client_consents_update_policy ON client_consents
    FOR UPDATE
    USING (
        auth.uid() = client_id
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'compliance_officer')
        )
    );

-- No deletes (maintain audit trail)
CREATE POLICY client_consents_delete_policy ON client_consents
    FOR DELETE
    USING (FALSE);

-- =====================================================
-- Part 3: Consent Helper Functions
-- =====================================================

-- Function to check if client has valid consent
CREATE OR REPLACE FUNCTION has_valid_consent(
    p_client_id UUID,
    p_consent_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_consent BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM client_consents
        WHERE client_id = p_client_id
            AND consent_type = p_consent_type
            AND consent_granted = TRUE
            AND revoked_at IS NULL
            AND (consent_expires_at IS NULL OR consent_expires_at > NOW())
    ) INTO v_has_consent;

    RETURN v_has_consent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active consents for a client
CREATE OR REPLACE FUNCTION get_active_consents(p_client_id UUID)
RETURNS TABLE (
    consent_type TEXT,
    consent_granted BOOLEAN,
    consent_date TIMESTAMP WITH TIME ZONE,
    consent_expires_at TIMESTAMP WITH TIME ZONE,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.consent_type,
        cc.consent_granted,
        cc.consent_date,
        cc.consent_expires_at,
        CASE
            WHEN cc.consent_expires_at IS NOT NULL
            THEN EXTRACT(DAY FROM cc.consent_expires_at - NOW())::INTEGER
            ELSE NULL
        END as days_until_expiry
    FROM client_consents cc
    WHERE cc.client_id = p_client_id
        AND cc.revoked_at IS NULL
        AND (cc.consent_expires_at IS NULL OR cc.consent_expires_at > NOW())
    ORDER BY cc.consent_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for expiring consents (for notifications)
CREATE OR REPLACE FUNCTION get_expiring_consents(p_days_threshold INTEGER DEFAULT 30)
RETURNS TABLE (
    client_id UUID,
    client_email TEXT,
    consent_type TEXT,
    consent_expires_at TIMESTAMP WITH TIME ZONE,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.client_id,
        p.email as client_email,
        cc.consent_type,
        cc.consent_expires_at,
        EXTRACT(DAY FROM cc.consent_expires_at - NOW())::INTEGER as days_until_expiry
    FROM client_consents cc
    JOIN profiles p ON p.id = cc.client_id
    WHERE cc.consent_granted = TRUE
        AND cc.revoked_at IS NULL
        AND cc.consent_expires_at IS NOT NULL
        AND cc.consent_expires_at > NOW()
        AND cc.consent_expires_at < (NOW() + (p_days_threshold || ' days')::INTERVAL)
    ORDER BY cc.consent_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke consent
CREATE OR REPLACE FUNCTION revoke_consent(
    p_client_id UUID,
    p_consent_type TEXT,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE client_consents
    SET
        revoked_at = NOW(),
        revocation_reason = p_reason,
        revoked_by = auth.uid(),
        updated_at = NOW()
    WHERE client_id = p_client_id
        AND consent_type = p_consent_type
        AND revoked_at IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Part 4: Consent Audit Trail
-- =====================================================

-- Trigger to log consent changes to audit_logs table
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log consent granted
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            contains_phi,
            phi_categories,
            access_reason,
            after_data
        ) VALUES (
            NEW.client_id,
            'create',
            'client_consent',
            NEW.id,
            TRUE,
            ARRAY['consent_management'],
            'operations',
            jsonb_build_object(
                'consent_type', NEW.consent_type,
                'consent_granted', NEW.consent_granted,
                'consent_version', NEW.consent_version,
                'signature_method', NEW.signature_method
            )
        );
    END IF;

    -- Log consent revoked
    IF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            contains_phi,
            phi_categories,
            access_reason,
            before_data,
            after_data
        ) VALUES (
            NEW.revoked_by,
            'update',
            'client_consent',
            NEW.id,
            TRUE,
            ARRAY['consent_management'],
            'operations',
            jsonb_build_object('revoked_at', OLD.revoked_at),
            jsonb_build_object(
                'revoked_at', NEW.revoked_at,
                'revocation_reason', NEW.revocation_reason
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER consent_audit_trigger
    AFTER INSERT OR UPDATE ON client_consents
    FOR EACH ROW
    EXECUTE FUNCTION log_consent_change();

-- =====================================================
-- Part 5: Minimum Necessary Standard
-- =====================================================

-- View for trainers to see only necessary client PHI
CREATE OR REPLACE VIEW trainer_client_phi_minimal AS
SELECT
    cp.id as client_id,
    cp.trainer_id,
    p.full_name,
    p.email,
    cp.date_of_birth,
    cp.gender,
    -- Only show recent health metrics (last 90 days)
    (
        SELECT jsonb_build_object(
            'recent_weight', (
                SELECT weight_lbs
                FROM body_weight_logs
                WHERE client_id = cp.id
                ORDER BY logged_at DESC
                LIMIT 1
            ),
            'recent_workouts', (
                SELECT COUNT(*)
                FROM workout_logs
                WHERE client_id = cp.id
                AND logged_at > NOW() - INTERVAL '90 days'
            )
        )
    ) as recent_metrics
FROM client_profiles cp
JOIN profiles p ON p.id = cp.id
WHERE has_valid_consent(cp.id, 'treatment') = TRUE;

COMMENT ON VIEW trainer_client_phi_minimal IS 'Minimum necessary PHI for trainers per HIPAA minimum necessary standard';

-- =====================================================
-- Part 6: Comments and Documentation
-- =====================================================

COMMENT ON TABLE client_consents IS 'HIPAA-compliant consent tracking and management';
COMMENT ON COLUMN client_consents.consent_type IS 'Type of consent: hipaa_notice, treatment, research, marketing, photo_sharing, data_sharing, telehealth';
COMMENT ON COLUMN client_consents.consent_version IS 'Version of consent form (e.g., 1.0, 2024-01) - allows tracking of consent updates';
COMMENT ON COLUMN client_consents.signature_method IS 'How consent was obtained: electronic, verbal, written, click_through';
COMMENT ON COLUMN client_consents.revoked_at IS 'When consent was revoked - NULL means still active';

COMMENT ON FUNCTION has_valid_consent IS 'Check if client has valid (active, not expired, not revoked) consent for specified type';
COMMENT ON FUNCTION get_active_consents IS 'Get all active consents for a client with expiration information';
COMMENT ON FUNCTION get_expiring_consents IS 'Get consents expiring within threshold days (for renewal notifications)';
COMMENT ON FUNCTION revoke_consent IS 'Revoke a specific consent type for a client with reason';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION has_valid_consent TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_consents TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_consents TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_consent TO authenticated;

-- Grant view access to trainers
GRANT SELECT ON trainer_client_phi_minimal TO authenticated;
