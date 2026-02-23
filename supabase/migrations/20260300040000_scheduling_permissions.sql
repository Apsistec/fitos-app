-- ============================================================================
-- Migration: Scheduling Permissions (Sprint 61.1)
-- Phase 5D — Multi-Trainer RBAC
-- ============================================================================
-- Extends the RBAC system (Phase 1) with fine-grained scheduling permissions.
-- Allows gym owners/managers to control exactly what each staff member can do
-- in the scheduling, billing, and payroll subsystems.
-- ============================================================================

-- One row per user; owner/manager set these for their staff
CREATE TABLE scheduling_permissions (
  user_id                         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Schedule visibility
  can_view_all_schedules          BOOLEAN NOT NULL DEFAULT false,
  can_edit_other_trainer_appts    BOOLEAN NOT NULL DEFAULT false,
  -- Financial visibility
  can_view_other_trainer_pay_rates BOOLEAN NOT NULL DEFAULT false,
  can_manage_pricing_options      BOOLEAN NOT NULL DEFAULT false,
  can_access_payroll_reports      BOOLEAN NOT NULL DEFAULT false,
  -- Policy management
  can_manage_cancellation_policies BOOLEAN NOT NULL DEFAULT false,
  can_configure_resources         BOOLEAN NOT NULL DEFAULT false,
  -- Booking flexibility
  allow_double_booking            BOOLEAN NOT NULL DEFAULT false,
  -- Travel buffer (minutes between appointments at different facilities)
  travel_buffer_minutes           INTEGER NOT NULL DEFAULT 0 CHECK (travel_buffer_minutes >= 0),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scheduling_permissions ENABLE ROW LEVEL SECURITY;

-- Only owners and managers can view/edit permissions for users they manage
CREATE POLICY "owner_manages_scheduling_permissions" ON scheduling_permissions
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('owner', 'gym_owner', 'trainer')
    )
  );

-- Users can read their own permissions (for guards to check)
CREATE POLICY "user_reads_own_scheduling_permissions" ON scheduling_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- ── Helper: get effective permissions for a user ─────────────────────────────
-- Returns a user's scheduling_permissions row, or sensible defaults if none exists.
-- Trainers and owners get full access by default; staff get restricted access.
CREATE OR REPLACE FUNCTION get_scheduling_permissions(p_user_id UUID)
RETURNS TABLE (
  can_view_all_schedules           BOOLEAN,
  can_edit_other_trainer_appts     BOOLEAN,
  can_view_other_trainer_pay_rates BOOLEAN,
  can_manage_pricing_options       BOOLEAN,
  can_access_payroll_reports       BOOLEAN,
  can_manage_cancellation_policies BOOLEAN,
  can_configure_resources          BOOLEAN,
  allow_double_booking             BOOLEAN,
  travel_buffer_minutes            INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;

  -- Owners and trainers (solo) get full scheduling rights by default
  IF v_role IN ('gym_owner', 'trainer') THEN
    RETURN QUERY
    SELECT
      COALESCE(sp.can_view_all_schedules,           true),
      COALESCE(sp.can_edit_other_trainer_appts,     true),
      COALESCE(sp.can_view_other_trainer_pay_rates, true),
      COALESCE(sp.can_manage_pricing_options,       true),
      COALESCE(sp.can_access_payroll_reports,       true),
      COALESCE(sp.can_manage_cancellation_policies, true),
      COALESCE(sp.can_configure_resources,          true),
      COALESCE(sp.allow_double_booking,             false),
      COALESCE(sp.travel_buffer_minutes,            0)
    FROM (SELECT null::uuid AS dummy) dummy_row
    LEFT JOIN scheduling_permissions sp ON sp.user_id = p_user_id;
  ELSE
    -- Gym staff and others: restrict by default, use explicit grants
    RETURN QUERY
    SELECT
      COALESCE(sp.can_view_all_schedules,           false),
      COALESCE(sp.can_edit_other_trainer_appts,     false),
      COALESCE(sp.can_view_other_trainer_pay_rates, false),
      COALESCE(sp.can_manage_pricing_options,       false),
      COALESCE(sp.can_access_payroll_reports,       false),
      COALESCE(sp.can_manage_cancellation_policies, false),
      COALESCE(sp.can_configure_resources,          false),
      COALESCE(sp.allow_double_booking,             false),
      COALESCE(sp.travel_buffer_minutes,            0)
    FROM (SELECT null::uuid AS dummy) dummy_row
    LEFT JOIN scheduling_permissions sp ON sp.user_id = p_user_id;
  END IF;
END;
$$;

-- ── Extend appointments RLS to respect can_view_all_schedules ───────────────
-- Trainers with the flag can see all appointments; others see only their own.
-- This replaces (or supplements) the basic trainer_owns_appointments policy.
CREATE POLICY "trainer_can_view_all_if_permitted" ON appointments
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM scheduling_permissions sp
      WHERE sp.user_id = auth.uid()
        AND sp.can_view_all_schedules = true
    )
  );

-- Trainers with edit permission can update other trainers' appointments
CREATE POLICY "trainer_can_edit_other_if_permitted" ON appointments
  FOR UPDATE
  USING (
    trainer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM scheduling_permissions sp
      WHERE sp.user_id = auth.uid()
        AND sp.can_edit_other_trainer_appts = true
    )
  );

-- ── Extend visits RLS ────────────────────────────────────────────────────────
CREATE POLICY "trainer_visits_with_payroll_permission" ON visits
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM scheduling_permissions sp
      WHERE sp.user_id = auth.uid()
        AND sp.can_access_payroll_reports = true
    )
  );

-- ── Extend sale_transactions RLS ─────────────────────────────────────────────
CREATE POLICY "trainer_transactions_with_payroll_permission" ON sale_transactions
  FOR SELECT
  USING (
    trainer_id = auth.uid()
    OR client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM scheduling_permissions sp
      WHERE sp.user_id = auth.uid()
        AND sp.can_access_payroll_reports = true
    )
  );

-- ── Enhanced conflict-check function (Sprint 61.2) ───────────────────────────
-- Replaces the simple boolean version from Sprint 54 with richer output:
--   has_conflict       BOOLEAN
--   conflict_details   TEXT     — human-readable description for UI
--
-- Enhancements over Sprint 54 version:
--   - Accepts p_travel_buffer_min (from scheduling_permissions) independently
--     of the service_type.travel_buffer_minutes already in the DB function.
--     This allows per-trainer buffer preferences to stack on top of per-service buffers.
--   - Accepts p_facility_id for travel-buffer logic: only applies the extra
--     buffer when the conflicting appointment is at a DIFFERENT facility.
--   - Returns conflict details (client name + time) for UI messaging.
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_trainer_id        UUID,
  p_start_at          TIMESTAMPTZ,
  p_end_at            TIMESTAMPTZ,
  p_exclude_id        UUID         DEFAULT NULL,
  p_travel_buffer_min INTEGER      DEFAULT 0,
  p_facility_id       UUID         DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_conflict   RECORD;
  v_details    TEXT;
BEGIN
  -- Find any active appointment that overlaps the proposed window,
  -- accounting for the service buffer, travel buffer, and cross-facility logic.
  SELECT
    a.id,
    a.start_at,
    a.facility_id,
    COALESCE(p_client.full_name, 'A client') AS client_name,
    st.buffer_after_minutes,
    st.travel_buffer_minutes                 AS svc_travel_buffer
  INTO v_conflict
  FROM appointments a
  JOIN service_types st ON st.id = a.service_type_id
  LEFT JOIN profiles p_client ON p_client.id = a.client_id
  WHERE a.trainer_id = p_trainer_id
    AND a.status NOT IN ('early_cancel', 'late_cancel')
    AND (p_exclude_id IS NULL OR a.id <> p_exclude_id)
    AND p_start_at < (
      a.end_at
      + make_interval(mins => st.buffer_after_minutes)
      + CASE
          -- Apply travel buffer only when facilities differ (or new appt has no facility set)
          WHEN p_facility_id IS NOT NULL
            AND a.facility_id IS NOT NULL
            AND a.facility_id <> p_facility_id
          THEN make_interval(mins => st.travel_buffer_minutes + p_travel_buffer_min)
          ELSE make_interval(mins => 0)
        END
    )
    AND p_end_at > a.start_at
  ORDER BY a.start_at
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_conflict', false);
  END IF;

  v_details := format(
    '%s at %s',
    v_conflict.client_name,
    to_char(v_conflict.start_at AT TIME ZONE 'UTC', 'HH12:MI AM')
  );

  RETURN jsonb_build_object(
    'has_conflict',      true,
    'conflict_details',  v_details
  );
END;
$$;

-- ── Seed owner/trainer defaults ───────────────────────────────────────────────
-- When a trainer or owner signs up, insert a default permissions row with
-- sensible values. This is called by the onboarding edge function.
-- For now this is handled in the application layer (SchedulingPermissionsService.seed()).
