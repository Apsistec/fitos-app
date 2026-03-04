-- ============================================================================
-- Migration: Team Messaging (Sprint 62 — EP-07)
-- ============================================================================
-- Extends the existing messages system to support team conversations:
--   - Owner ↔ Trainer (US-070)
--   - Trainer ↔ Trainer (US-071)
--   - Owner ↔ Admin Assistant (US-072)
--   - Admin Assistant ↔ Trainer (US-073)
--   - Tab filter: Clients vs Team (US-074)
--   - Group announcements (US-075)
--
-- Implementation: Adds conversation_type + facility_id to the messages table.
-- This is additive — existing client↔trainer messages default to 'client_coaching'.
-- ============================================================================

-- ── 1. Add conversation_type to messages table ───────────────────────────────

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_type TEXT
    NOT NULL DEFAULT 'client_coaching'
    CHECK (conversation_type IN ('client_coaching', 'team', 'group_announcement'));

-- facility_id scopes team conversations to the correct gym
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS facility_id UUID
    REFERENCES facilities(id) ON DELETE CASCADE;

-- Backfill existing messages as client_coaching (already the default)
UPDATE messages
  SET conversation_type = 'client_coaching'
  WHERE conversation_type IS NULL;

-- ── 2. Index for efficient tab-filtered queries ───────────────────────────────

-- Primary lookup: user's conversations filtered by type
CREATE INDEX IF NOT EXISTS idx_messages_recipient_type
  ON messages(recipient_id, conversation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_type
  ON messages(sender_id, conversation_type, created_at DESC);

-- Facility-scoped team messages
CREATE INDEX IF NOT EXISTS idx_messages_facility_type
  ON messages(facility_id, conversation_type, created_at DESC)
  WHERE facility_id IS NOT NULL;

-- ── 3. Group announcements table ─────────────────────────────────────────────
-- When an owner posts a group announcement, one broadcast_message record is created
-- and fan-out recipients are tracked in broadcast_recipients for read tracking.

CREATE TABLE IF NOT EXISTS broadcast_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  facility_id   UUID REFERENCES facilities(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  -- Counts for display
  recipient_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_creates_broadcasts" ON broadcast_messages
  FOR ALL
  USING (sender_id = auth.uid());

CREATE POLICY "facility_staff_reads_broadcasts" ON broadcast_messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.facility_id = broadcast_messages.facility_id
    )
    OR EXISTS (
      SELECT 1 FROM admin_assistants aa
      WHERE aa.user_id = auth.uid()
        AND aa.facility_id = broadcast_messages.facility_id
    )
  );

-- ── 4. Update messages RLS to allow team conversations ───────────────────────
-- Admin Assistants with canMessageTeam should be able to send/receive team messages.

-- Extended read policy for team messages at same facility
CREATE POLICY "team_messaging_read_policy" ON messages
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR recipient_id = auth.uid()
    OR (
      conversation_type IN ('team', 'group_announcement')
      AND facility_id IS NOT NULL
      AND (
        -- Trainer at same facility
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('trainer', 'gym_owner')
            AND p.facility_id = messages.facility_id
        )
        OR
        -- Admin Assistant at same facility with messaging permission
        EXISTS (
          SELECT 1 FROM admin_assistants aa
          WHERE aa.user_id = auth.uid()
            AND aa.facility_id = messages.facility_id
            AND (aa.permission_overrides->>'canMessageTeam')::boolean = true
        )
      )
    )
  );

-- Extended insert policy for team messages
CREATE POLICY "team_messaging_insert_policy" ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      -- Any user can send client_coaching messages (existing behavior)
      conversation_type = 'client_coaching'
      OR
      -- Team messages require the sender to be facility staff
      (
        conversation_type = 'team'
        AND facility_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('trainer', 'gym_owner')
              AND p.facility_id = messages.facility_id
          )
          OR
          EXISTS (
            SELECT 1 FROM admin_assistants aa
            WHERE aa.user_id = auth.uid()
              AND aa.facility_id = messages.facility_id
              AND (aa.permission_overrides->>'canMessageTeam')::boolean = true
          )
        )
      )
      OR
      -- Group announcements require owner role
      (
        conversation_type = 'group_announcement'
        AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'gym_owner'
        )
      )
    )
  );

-- ── 5. Helper: get_team_contacts() ───────────────────────────────────────────
-- Returns all staff members at the current user's facility who can be messaged.
-- Used to populate the Team tab contact list.
CREATE OR REPLACE FUNCTION get_team_contacts(p_user_id UUID)
RETURNS TABLE (
  user_id     UUID,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_facility_id UUID;
BEGIN
  -- Get the caller's facility
  SELECT p.facility_id INTO v_facility_id
  FROM profiles p
  WHERE p.id = p_user_id;

  IF v_facility_id IS NULL THEN
    -- Check admin_assistants table
    SELECT aa.facility_id INTO v_facility_id
    FROM admin_assistants aa
    WHERE aa.user_id = p_user_id;
  END IF;

  IF v_facility_id IS NULL THEN
    RETURN;  -- No facility — no team contacts
  END IF;

  -- Return all trainers and owners at same facility (excluding self)
  RETURN QUERY
  SELECT p.id, p.full_name, p.avatar_url, p.role
  FROM profiles p
  WHERE p.facility_id = v_facility_id
    AND p.id <> p_user_id
    AND p.role IN ('trainer', 'gym_owner')
  UNION ALL
  -- Also return admin assistants at same facility
  SELECT p.id, p.full_name, p.avatar_url, 'admin_assistant'::text
  FROM admin_assistants aa
  JOIN profiles p ON p.id = aa.user_id
  WHERE aa.facility_id = v_facility_id
    AND aa.user_id <> p_user_id
    AND aa.status = 'active';
END;
$$;
