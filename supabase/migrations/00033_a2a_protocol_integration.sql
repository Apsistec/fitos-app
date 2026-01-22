-- =====================================================================
-- A2A (Agent-to-Agent) Protocol Integration
-- =====================================================================
-- Sprint 44: A2A Protocol Compatibility
--
-- This migration adds support for the A2A protocol, enabling FitOS to
-- communicate with external AI agents including wearables, nutrition
-- trackers, calendar systems, and EHR platforms.
--
-- Tables:
-- - a2a_agent_registry: Registered A2A agents
-- - a2a_user_integrations: User-specific integrations
-- - a2a_communication_logs: Communication audit trail
-- - a2a_sync_logs: Sync operation logs
-- =====================================================================

-- =====================================================================
-- A2A AGENT REGISTRY
-- =====================================================================

CREATE TABLE IF NOT EXISTS a2a_agent_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT UNIQUE NOT NULL,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL CHECK (agent_type IN (
        'fitness_platform',
        'wearable',
        'nutrition_tracker',
        'calendar',
        'ehr',
        'other'
    )),
    base_url TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'degraded')),
    capabilities TEXT[] DEFAULT '{}',
    authentication_config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_a2a_agents_type ON a2a_agent_registry(agent_type);
CREATE INDEX idx_a2a_agents_status ON a2a_agent_registry(status);
CREATE INDEX idx_a2a_agents_capabilities ON a2a_agent_registry USING GIN (capabilities);

COMMENT ON TABLE a2a_agent_registry IS 'Registry of A2A-compatible agents that FitOS can communicate with';
COMMENT ON COLUMN a2a_agent_registry.agent_id IS 'Unique agent identifier in A2A ecosystem';
COMMENT ON COLUMN a2a_agent_registry.agent_type IS 'Category of agent (wearable, nutrition tracker, etc.)';
COMMENT ON COLUMN a2a_agent_registry.capabilities IS 'List of capabilities this agent supports';
COMMENT ON COLUMN a2a_agent_registry.authentication_config IS 'OAuth/API key configuration';

-- =====================================================================
-- USER INTEGRATIONS
-- =====================================================================

CREATE TABLE IF NOT EXISTS a2a_user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES a2a_agent_registry(agent_id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_hours INTEGER DEFAULT 24,
    data_types TEXT[] DEFAULT '{}',
    authentication_token TEXT,
    authentication_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_errors INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_a2a_integrations_user ON a2a_user_integrations(user_id);
CREATE INDEX idx_a2a_integrations_agent ON a2a_user_integrations(agent_id);
CREATE INDEX idx_a2a_integrations_enabled ON a2a_user_integrations(enabled);
CREATE INDEX idx_a2a_integrations_last_sync ON a2a_user_integrations(last_sync_at);

COMMENT ON TABLE a2a_user_integrations IS 'User-specific integrations with external A2A agents';
COMMENT ON COLUMN a2a_user_integrations.integration_id IS 'Composite key: user_id:agent_id';
COMMENT ON COLUMN a2a_user_integrations.data_types IS 'Types of data to sync (recovery, nutrition, calendar, etc.)';
COMMENT ON COLUMN a2a_user_integrations.sync_errors IS 'Consecutive sync errors (auto-disable after 5)';

-- =====================================================================
-- COMMUNICATION LOGS
-- =====================================================================

CREATE TABLE IF NOT EXISTS a2a_communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN (
        'capability_request',
        'capability_response',
        'action_request',
        'action_response',
        'event_notification',
        'error'
    )),
    request_payload JSONB,
    response_payload JSONB,
    success BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    execution_time_ms INTEGER
);

CREATE INDEX idx_a2a_comms_timestamp ON a2a_communication_logs(timestamp DESC);
CREATE INDEX idx_a2a_comms_sender ON a2a_communication_logs(sender);
CREATE INDEX idx_a2a_comms_receiver ON a2a_communication_logs(receiver);
CREATE INDEX idx_a2a_comms_user ON a2a_communication_logs(user_id);
CREATE INDEX idx_a2a_comms_success ON a2a_communication_logs(success);

COMMENT ON TABLE a2a_communication_logs IS 'Audit trail of all A2A protocol communications';

-- Partition by month for performance
SELECT create_hypertable('a2a_communication_logs', 'timestamp', if_not_exists => TRUE);

-- =====================================================================
-- SYNC LOGS
-- =====================================================================

CREATE TABLE IF NOT EXISTS a2a_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id TEXT NOT NULL REFERENCES a2a_user_integrations(integration_id) ON DELETE CASCADE,
    sync_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_type TEXT,
    records_synced INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    duration_ms INTEGER
);

CREATE INDEX idx_a2a_sync_integration ON a2a_sync_logs(integration_id);
CREATE INDEX idx_a2a_sync_time ON a2a_sync_logs(sync_time DESC);
CREATE INDEX idx_a2a_sync_success ON a2a_sync_logs(success);

COMMENT ON TABLE a2a_sync_logs IS 'Logs of sync operations with external agents';

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE a2a_agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE a2a_sync_logs ENABLE ROW LEVEL SECURITY;

-- Agent registry (read-only for all authenticated users)
CREATE POLICY "Anyone can view agent registry"
    ON a2a_agent_registry
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Only admins can modify agent registry"
    ON a2a_agent_registry
    FOR ALL
    TO authenticated
    USING (is_admin());

-- User integrations (users can only access their own)
CREATE POLICY "Users can view their own integrations"
    ON a2a_user_integrations
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own integrations"
    ON a2a_user_integrations
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own integrations"
    ON a2a_user_integrations
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own integrations"
    ON a2a_user_integrations
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Communication logs (users can view their own, admins can view all)
CREATE POLICY "Users can view their own communication logs"
    ON a2a_communication_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Service role can insert communication logs"
    ON a2a_communication_logs
    FOR INSERT
    TO service_role
    WITH CHECK (TRUE);

-- Sync logs (users can view their own)
CREATE POLICY "Users can view their own sync logs"
    ON a2a_sync_logs
    FOR SELECT
    TO authenticated
    USING (
        integration_id IN (
            SELECT integration_id
            FROM a2a_user_integrations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage sync logs"
    ON a2a_sync_logs
    FOR ALL
    TO service_role
    USING (TRUE);

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Get user's active integrations
CREATE OR REPLACE FUNCTION get_user_active_integrations(p_user_id UUID)
RETURNS TABLE (
    integration_id TEXT,
    agent_id TEXT,
    agent_name TEXT,
    agent_type TEXT,
    enabled BOOLEAN,
    data_types TEXT[],
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_errors INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ui.integration_id,
        ui.agent_id,
        ar.agent_name,
        ar.agent_type,
        ui.enabled,
        ui.data_types,
        ui.last_sync_at,
        ui.sync_errors
    FROM a2a_user_integrations ui
    JOIN a2a_agent_registry ar ON ui.agent_id = ar.agent_id
    WHERE ui.user_id = p_user_id
    ORDER BY ar.agent_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get sync statistics for an integration
CREATE OR REPLACE FUNCTION get_integration_sync_stats(p_integration_id TEXT)
RETURNS TABLE (
    total_syncs BIGINT,
    successful_syncs BIGINT,
    failed_syncs BIGINT,
    total_records_synced BIGINT,
    last_sync_time TIMESTAMP WITH TIME ZONE,
    last_sync_success BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_syncs,
        COUNT(*) FILTER (WHERE success = TRUE)::BIGINT AS successful_syncs,
        COUNT(*) FILTER (WHERE success = FALSE)::BIGINT AS failed_syncs,
        COALESCE(SUM(records_synced), 0)::BIGINT AS total_records_synced,
        MAX(sync_time) AS last_sync_time,
        (SELECT success FROM a2a_sync_logs WHERE integration_id = p_integration_id ORDER BY sync_time DESC LIMIT 1) AS last_sync_success
    FROM a2a_sync_logs
    WHERE integration_id = p_integration_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-disable integrations with excessive errors
CREATE OR REPLACE FUNCTION auto_disable_failing_integrations()
RETURNS INTEGER AS $$
DECLARE
    disabled_count INTEGER := 0;
BEGIN
    UPDATE a2a_user_integrations
    SET
        enabled = FALSE,
        updated_at = NOW()
    WHERE
        sync_errors >= 5
        AND enabled = TRUE;

    GET DIAGNOSTICS disabled_count = ROW_COUNT;

    RETURN disabled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_a2a_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_a2a_agent_registry_timestamp
    BEFORE UPDATE ON a2a_agent_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_a2a_updated_at();

CREATE TRIGGER update_a2a_user_integrations_timestamp
    BEFORE UPDATE ON a2a_user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_a2a_updated_at();

-- =====================================================================
-- INITIAL DATA: Register FitOS Agent
-- =====================================================================

INSERT INTO a2a_agent_registry (
    agent_id,
    agent_name,
    agent_type,
    base_url,
    version,
    status,
    capabilities,
    authentication_config
) VALUES (
    'fitos-ai-coach',
    'FitOS AI Fitness Coach',
    'fitness_platform',
    'https://api.fitos.com',
    '1.0.0',
    'active',
    ARRAY['receive_recovery_data', 'receive_nutrition_data', 'schedule_session', 'get_workout_program', 'receive_health_record'],
    '{
        "methods": ["oauth2", "api_key"],
        "oauth2_url": "https://api.fitos.com/oauth/authorize",
        "token_url": "https://api.fitos.com/oauth/token",
        "scopes": ["recovery:write", "nutrition:write", "calendar:write", "workouts:read", "health:write"]
    }'::JSONB
) ON CONFLICT (agent_id) DO NOTHING;

-- =====================================================================
-- SAMPLE A2A AGENTS (for development/testing)
-- =====================================================================

-- WHOOP Recovery Platform
INSERT INTO a2a_agent_registry (
    agent_id,
    agent_name,
    agent_type,
    base_url,
    version,
    status,
    capabilities,
    authentication_config
) VALUES (
    'whoop-recovery',
    'WHOOP Recovery Platform',
    'wearable',
    'https://api.whoop.com/a2a',
    '1.0.0',
    'active',
    ARRAY['get_recovery_data', 'get_strain_data', 'get_sleep_data'],
    '{
        "methods": ["oauth2"],
        "oauth2_url": "https://api.whoop.com/oauth/authorize",
        "token_url": "https://api.whoop.com/oauth/token",
        "scopes": ["read:recovery", "read:cycles", "read:sleep"]
    }'::JSONB
) ON CONFLICT (agent_id) DO NOTHING;

-- MyFitnessPal
INSERT INTO a2a_agent_registry (
    agent_id,
    agent_name,
    agent_type,
    base_url,
    version,
    status,
    capabilities,
    authentication_config
) VALUES (
    'myfitnesspal',
    'MyFitnessPal Nutrition Tracker',
    'nutrition_tracker',
    'https://api.myfitnesspal.com/a2a',
    '1.0.0',
    'active',
    ARRAY['get_nutrition_logs', 'get_food_diary'],
    '{
        "methods": ["oauth2"],
        "oauth2_url": "https://www.myfitnesspal.com/oauth2/authorize",
        "token_url": "https://api.myfitnesspal.com/oauth2/token",
        "scopes": ["diary"]
    }'::JSONB
) ON CONFLICT (agent_id) DO NOTHING;

-- Google Calendar
INSERT INTO a2a_agent_registry (
    agent_id,
    agent_name,
    agent_type,
    base_url,
    version,
    status,
    capabilities,
    authentication_config
) VALUES (
    'google-calendar',
    'Google Calendar',
    'calendar',
    'https://www.googleapis.com/calendar/v3/a2a',
    '1.0.0',
    'active',
    ARRAY['create_event', 'update_event', 'get_events'],
    '{
        "methods": ["oauth2"],
        "oauth2_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scopes": ["https://www.googleapis.com/auth/calendar.events"]
    }'::JSONB
) ON CONFLICT (agent_id) DO NOTHING;
