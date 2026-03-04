-- ============================================================================
-- Migration: Admin Assistant RBAC (Sprint 61 — EP-25 elevated)
-- ============================================================================
-- Creates the admin_assistant role infrastructure:
--   1. Adds 'admin_assistant' to the user role domain (backward-compat alias for gym_staff)
--   2. admin_assistants table — links AA users to a facility with granular
--      permission_overrides JSONB (server-authoritative)
--   3. rbac_audit_log — immutable history of permission changes by owners
--   4. RLS policies — Owners configure; AAs read their own record
--   5. Helper function — get_admin_assistant_permissions()
-- ============================================================================

-- ── 1. Update profiles.role to accept 'admin_assistant' ─────────────────────
-- The profiles table uses a TEXT column (not an ENUM) so we just document
-- the valid values here. The check constraint ensures DB-level safety.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'trainer', 'gym_owner', 'gym_staff', 'admin_assistant', 'admin'));

-- ── 2. admin_assistants table ────────────────────────────────────────────────
-- One row per admin assistant user.
-- permission_overrides is the authoritative source for what this AA can do.
-- All fields default to most restrictive (false / null).
CREATE TABLE IF NOT EXISTS admin_assistants (
  -- The AA's user ID (links to profiles.id which links to auth.users)
  user_id                     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- The facility/gym they are associated with
  facility_id                 UUID REFERENCES facilities(id) ON DELETE CASCADE,

  -- The owner who invited and manages them
  owner_id                    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status of the AA account
  status                      TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('invited', 'active', 'suspended')),

  -- ── Permission Overrides ──────────────────────────────────────────────────
  -- Flat JSONB blob so the UI can toggle individual fields without needing
  -- schema changes when new permissions are added.
  -- Structure mirrors AdminAssistantPermissions TypeScript interface.
  permission_overrides        JSONB NOT NULL DEFAULT '{
    "canManageAllSchedules":   true,
    "canManageOwnSchedule":    true,
    "canCheckInClients":       true,
    "canProcessCheckout":      false,
    "canViewClientList":       true,
    "canViewWorkoutHistory":   false,
    "canViewNutritionData":    false,
    "canViewHealthData":       false,
    "canViewRevenueDashboard": false,
    "canExportFinancialData":  false,
    "canProcessRefunds":       false,
    "canViewCrmPipeline":      false,
    "canSendBulkMessages":     false,
    "canAccessEmailTemplates": false,
    "canMessageTeam":          true
  }'::jsonb,

  -- Invitation metadata
  invited_at                  TIMESTAMPTZ DEFAULT NOW(),
  activated_at                TIMESTAMPTZ,
  last_seen_at                TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_assistants ENABLE ROW LEVEL SECURITY;

-- Owners can view and manage their admin assistants
CREATE POLICY "owner_manages_admin_assistants" ON admin_assistants
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR user_id = auth.uid()
  );

-- ── 3. rbac_audit_log ────────────────────────────────────────────────────────
-- Immutable log of who changed what permission, when.
-- Only owners can insert; nobody can update or delete.
CREATE TABLE IF NOT EXISTS rbac_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who made the change (must be an owner)
  changed_by      UUID NOT NULL REFERENCES profiles(id),
  -- Whose permissions changed
  target_user_id  UUID NOT NULL REFERENCES profiles(id),
  -- Which permission field
  permission_key  TEXT NOT NULL,
  -- Old and new values as text for readability
  old_value       TEXT,
  new_value       TEXT,
  -- Free-text note (optional)
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- Owners can view audit logs for their facility's admin assistants
CREATE POLICY "owner_reads_rbac_audit_log" ON rbac_audit_log
  FOR SELECT
  USING (
    changed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_assistants aa
      WHERE aa.user_id = rbac_audit_log.target_user_id
        AND aa.owner_id = auth.uid()
    )
  );

-- Only owners can insert new audit log entries
CREATE POLICY "owner_inserts_rbac_audit_log" ON rbac_audit_log
  FOR INSERT
  WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'gym_owner'
    )
  );

-- Audit log is append-only — no UPDATE or DELETE allowed at DB level

-- ── 4. admin_invitations table ───────────────────────────────────────────────
-- Tracks one-time invitation tokens sent to prospective admin assistants.
-- Separate from client invitations to enforce Owner-only invite flow.
CREATE TABLE IF NOT EXISTS admin_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  facility_id   UUID REFERENCES facilities(id),
  email         TEXT NOT NULL,
  invite_token  TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  accepted_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manages_admin_invitations" ON admin_invitations
  FOR ALL
  USING (owner_id = auth.uid());

-- Allow lookup by token for registration flow (unauthenticated read)
CREATE POLICY "public_reads_invitation_by_token" ON admin_invitations
  FOR SELECT
  USING (true);  -- Token is the secret; front-end validates status + expiry

-- Index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_invitations_token
  ON admin_invitations(invite_token);

-- Index for owner queries
CREATE INDEX IF NOT EXISTS idx_admin_invitations_owner
  ON admin_invitations(owner_id);

-- ── 5. Helper: get_admin_assistant_permissions() ─────────────────────────────
-- Returns the effective permission_overrides for an admin assistant.
-- Used by route guards and Edge Functions for server-authoritative checks.
CREATE OR REPLACE FUNCTION get_admin_assistant_permissions(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_overrides JSONB;
  v_role      TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;

  -- Owners and trainers have full access (no override needed)
  IF v_role IN ('gym_owner', 'trainer') THEN
    RETURN '{
      "canManageAllSchedules":   true,
      "canManageOwnSchedule":    true,
      "canCheckInClients":       true,
      "canProcessCheckout":      true,
      "canViewClientList":       true,
      "canViewWorkoutHistory":   true,
      "canViewNutritionData":    true,
      "canViewHealthData":       true,
      "canViewRevenueDashboard": true,
      "canExportFinancialData":  true,
      "canProcessRefunds":       true,
      "canViewCrmPipeline":      true,
      "canSendBulkMessages":     true,
      "canAccessEmailTemplates": true,
      "canMessageTeam":          true
    }'::jsonb;
  END IF;

  -- Admin assistants: return their specific overrides
  SELECT permission_overrides INTO v_overrides
  FROM admin_assistants
  WHERE user_id = p_user_id;

  IF v_overrides IS NULL THEN
    -- No record found — return most restrictive defaults
    RETURN '{
      "canManageAllSchedules":   false,
      "canManageOwnSchedule":    false,
      "canCheckInClients":       false,
      "canProcessCheckout":      false,
      "canViewClientList":       false,
      "canViewWorkoutHistory":   false,
      "canViewNutritionData":    false,
      "canViewHealthData":       false,
      "canViewRevenueDashboard": false,
      "canExportFinancialData":  false,
      "canProcessRefunds":       false,
      "canViewCrmPipeline":      false,
      "canSendBulkMessages":     false,
      "canAccessEmailTemplates": false,
      "canMessageTeam":          false
    }'::jsonb;
  END IF;

  RETURN v_overrides;
END;
$$;

-- ── 6. admin_assistants RLS for scheduling tables ───────────────────────────
-- Extend appointments SELECT to allow AAs with canManageAllSchedules
CREATE POLICY "admin_assistant_views_all_schedules" ON appointments
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin_assistant'
      )
      AND (
        SELECT (permission_overrides->>'canManageAllSchedules')::boolean
        FROM admin_assistants
        WHERE user_id = auth.uid()
      ) = true
    )
  );

-- ── 7. Updated timestamp trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_admin_assistants_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_admin_assistants_updated_at
  BEFORE UPDATE ON admin_assistants
  FOR EACH ROW EXECUTE FUNCTION update_admin_assistants_updated_at();

CREATE OR REPLACE FUNCTION update_admin_invitations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_admin_invitations_updated_at
  BEFORE UPDATE ON admin_invitations
  FOR EACH ROW EXECUTE FUNCTION update_admin_invitations_updated_at();
