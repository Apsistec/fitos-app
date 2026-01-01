-- Client Invitation System
-- Epic 1.4: Client Invitation System

-- ============================================================================
-- INVITATIONS TABLE
-- ============================================================================

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    status invitation_status DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    personal_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one active invitation per email per trainer
    CONSTRAINT unique_pending_invitation UNIQUE (trainer_id, email, status)
);

-- Index for fast lookups
CREATE INDEX idx_invitations_trainer ON invitations(trainer_id, status);
CREATE INDEX idx_invitations_code ON invitations(invite_code);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at) WHERE status = 'pending';

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Trainers can view their own invitations
CREATE POLICY "Trainers can view own invitations"
    ON invitations FOR SELECT
    USING (trainer_id = auth.uid());

-- Trainers can create invitations
CREATE POLICY "Trainers can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (trainer_id = auth.uid());

-- Trainers can update their own invitations (e.g., cancel)
CREATE POLICY "Trainers can update own invitations"
    ON invitations FOR UPDATE
    USING (trainer_id = auth.uid());

-- Anyone can view invitation by code (for acceptance flow)
CREATE POLICY "Anyone can view invitation by code"
    ON invitations FOR SELECT
    USING (TRUE);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM invitations WHERE invite_code = code) INTO exists;

        EXIT WHEN NOT exists;
    END LOOP;

    RETURN code;
END;
$$;

-- Trigger to auto-generate invite code
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.invite_code IS NULL OR NEW.invite_code = '' THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_invite_code
    BEFORE INSERT ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invite_code();

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE invitations
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at < NOW();
END;
$$;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(
    p_invite_code TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_invitation invitations;
BEGIN
    -- Get invitation
    SELECT * INTO v_invitation
    FROM invitations
    WHERE invite_code = p_invite_code
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update invitation status
    UPDATE invitations
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by = p_user_id,
        updated_at = NOW()
    WHERE id = v_invitation.id;

    -- Associate client with trainer
    UPDATE client_profiles
    SET trainer_id = v_invitation.trainer_id,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER set_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE invitations IS 'Client invitation system for trainers';
COMMENT ON COLUMN invitations.invite_code IS 'Unique 8-character code for sharing';
COMMENT ON COLUMN invitations.personal_message IS 'Optional message from trainer to client';
COMMENT ON FUNCTION accept_invitation IS 'Accepts invitation and associates client with trainer';
COMMENT ON FUNCTION expire_old_invitations IS 'Marks expired invitations - run daily via cron';
