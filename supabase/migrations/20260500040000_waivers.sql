-- ============================================================================
-- Migration: Legal Waivers System (Sprint 64 — EP-26)
-- ============================================================================
-- Creates:
--   1. waivers          — waiver templates managed by gym owners
--   2. waiver_signatures — client signature records with metadata
--   3. waiver_templates  — system starter templates (seed data)
--   4. RLS policies      — owner manages, clients sign & view own
--   5. is_waiver_signed() RPC — used by onboarding guard
-- ============================================================================

-- ─── 1. waivers ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,

  title           TEXT NOT NULL,

  -- Rich text body (HTML preserved; plain-text fallback in body_text for search)
  body_html       TEXT NOT NULL,
  body_text       TEXT GENERATED ALWAYS AS (
    -- Strip basic HTML tags for full-text search without requiring a function
    regexp_replace(body_html, '<[^>]+>', ' ', 'g')
  ) STORED,

  -- 'checkbox' = "I agree to the terms" checkbox
  -- 'digital'  = finger-draw or typed name canvas
  signature_type  TEXT NOT NULL DEFAULT 'checkbox'
    CHECK (signature_type IN ('checkbox', 'digital')),

  -- If true, clients must sign before accessing training features (US-262)
  is_required     BOOLEAN NOT NULL DEFAULT false,

  -- Version counter — incrementing triggers re-signature requirement (US-266)
  version         INTEGER NOT NULL DEFAULT 1,

  -- Soft-delete pattern: is_active = false means archived
  is_active       BOOLEAN NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;

-- Owner of the facility can manage their waivers
CREATE POLICY "owner_manage_waivers"
  ON waivers
  USING (
    facility_id IN (
      SELECT id FROM facilities WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    facility_id IN (
      SELECT id FROM facilities WHERE owner_id = auth.uid()
    )
  );

-- Trainers in the same facility can read waivers
CREATE POLICY "staff_read_waivers"
  ON waivers FOR SELECT
  USING (
    facility_id IN (
      SELECT facility_id FROM trainer_profiles WHERE user_id = auth.uid()
      UNION
      SELECT facility_id FROM admin_assistants WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Clients can read active, required waivers for their trainer's facility
CREATE POLICY "client_read_required_waivers"
  ON waivers FOR SELECT
  USING (
    is_active = true
    AND is_required = true
    AND facility_id IN (
      SELECT t.facility_id
      FROM client_profiles cp
      JOIN trainer_profiles t ON t.user_id = cp.trainer_id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE TRIGGER touch_waivers_updated_at
  BEFORE UPDATE ON waivers
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_waivers_facility   ON waivers (facility_id);
CREATE INDEX IF NOT EXISTS idx_waivers_active      ON waivers (facility_id, is_active);
CREATE INDEX IF NOT EXISTS idx_waivers_required    ON waivers (facility_id, is_required, is_active);

-- ─── 2. waiver_signatures ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS waiver_signatures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_id         UUID NOT NULL REFERENCES waivers(id) ON DELETE RESTRICT,
  signer_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  waiver_version    INTEGER NOT NULL DEFAULT 1,

  -- For checkbox: NULL; for digital: typed name or base64 canvas PNG
  signature_data    TEXT,

  -- Legal metadata (US-264)
  ip_address        INET,
  user_agent        TEXT,
  app_version       TEXT,
  device_type       TEXT,  -- 'ios', 'android', 'web'

  -- Extra metadata (e.g., geolocation if available)
  metadata          JSONB NOT NULL DEFAULT '{}',

  signed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate signatures for same waiver version
  CONSTRAINT unique_signer_waiver_version UNIQUE (waiver_id, signer_id, waiver_version)
);

ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;

-- Clients can insert their own signatures and read them
CREATE POLICY "client_sign_waiver"
  ON waiver_signatures FOR INSERT
  WITH CHECK (signer_id = auth.uid());

CREATE POLICY "client_read_own_signatures"
  ON waiver_signatures FOR SELECT
  USING (signer_id = auth.uid());

-- Owners can read all signatures for their facility's waivers
CREATE POLICY "owner_read_all_signatures"
  ON waiver_signatures FOR SELECT
  USING (
    waiver_id IN (
      SELECT id FROM waivers
      WHERE facility_id IN (
        SELECT id FROM facilities WHERE owner_id = auth.uid()
      )
    )
  );

-- Staff (trainers / AAs with permission) read access
CREATE POLICY "staff_read_signatures"
  ON waiver_signatures FOR SELECT
  USING (
    waiver_id IN (
      SELECT id FROM waivers
      WHERE facility_id IN (
        SELECT facility_id FROM trainer_profiles WHERE user_id = auth.uid()
        UNION
        SELECT facility_id FROM admin_assistants WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_waiver_sigs_waiver    ON waiver_signatures (waiver_id);
CREATE INDEX IF NOT EXISTS idx_waiver_sigs_signer    ON waiver_signatures (signer_id);
CREATE INDEX IF NOT EXISTS idx_waiver_sigs_signed_at ON waiver_signatures (signed_at);

-- ─── 3. RPC: is_waiver_signed(p_client_id) ───────────────────────────────────
-- Returns true if the client has signed ALL current required waivers
-- for their trainer's facility. Used by the onboarding / access guard.

CREATE OR REPLACE FUNCTION is_waiver_signed(p_client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    -- Unsigned required waivers = required waivers with no matching current signature
    SELECT 1
    FROM waivers w
    WHERE w.is_active   = true
      AND w.is_required = true
      AND w.facility_id IN (
        SELECT t.facility_id
        FROM client_profiles cp
        JOIN trainer_profiles t ON t.user_id = cp.trainer_id
        WHERE cp.user_id = p_client_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM waiver_signatures ws
        WHERE ws.waiver_id      = w.id
          AND ws.signer_id      = p_client_id
          AND ws.waiver_version = w.version
      )
  );
$$;

-- ─── 4. RPC: get_unsigned_waivers(p_client_id) ───────────────────────────────
-- Returns all active required waivers that the client hasn't signed yet.
-- Called by the WaiverGuard and onboarding flow.

CREATE OR REPLACE FUNCTION get_unsigned_waivers(p_client_id UUID)
RETURNS TABLE (
  id             UUID,
  title          TEXT,
  body_html      TEXT,
  signature_type TEXT,
  version        INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    w.id,
    w.title,
    w.body_html,
    w.signature_type,
    w.version
  FROM waivers w
  WHERE w.is_active   = true
    AND w.is_required = true
    AND w.facility_id IN (
      SELECT t.facility_id
      FROM client_profiles cp
      JOIN trainer_profiles t ON t.user_id = cp.trainer_id
      WHERE cp.user_id = p_client_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM waiver_signatures ws
      WHERE ws.waiver_id      = w.id
        AND ws.signer_id      = p_client_id
        AND ws.waiver_version = w.version
    )
  ORDER BY w.created_at;
$$;

-- ─── 5. Seed: system waiver templates ────────────────────────────────────────
-- These are advisory templates only. Owners MUST consult their attorney.
-- Stored in a separate read-only reference table (not in `waivers` which requires facility_id).

CREATE TABLE IF NOT EXISTS waiver_system_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  body_html   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Everyone can read system templates
ALTER TABLE waiver_system_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_system_templates"
  ON waiver_system_templates FOR SELECT
  USING (true);

INSERT INTO waiver_system_templates (title, description, body_html)
VALUES
  (
    'General Liability Release',
    'Releases the facility from liability for accidents and injuries during training.',
    '<h2>RELEASE OF LIABILITY AND WAIVER OF CLAIMS</h2>
<p><strong>⚠️ This is a template only. Consult your attorney before use.</strong></p>
<p>In consideration of being permitted to participate in exercise and fitness activities at [FACILITY NAME] ("Facility"), I, the undersigned, hereby acknowledge, agree, and represent the following:</p>
<p>1. <strong>ASSUMPTION OF RISK:</strong> I understand that participating in exercise and fitness activities involves inherent risks of injury, including but not limited to muscular strains, sprains, fractures, and cardiovascular events. I voluntarily assume all such risks.</p>
<p>2. <strong>RELEASE OF LIABILITY:</strong> I hereby release, waive, discharge, and covenant not to sue the Facility, its owners, officers, employees, and agents from any and all liability, claims, demands, actions, and causes of action arising out of or related to any loss, damage, or injury that may be sustained by me.</p>
<p>3. <strong>INDEMNIFICATION:</strong> I agree to indemnify and hold harmless the Facility and its representatives from any loss, liability, damage, or costs they may incur due to my participation in activities at the Facility.</p>
<p>4. <strong>MEDICAL CLEARANCE:</strong> I confirm that I am physically fit to participate in exercise activities and have consulted with a physician if I have any medical conditions.</p>
<p>By signing below, I acknowledge that I have read, understand, and voluntarily agree to the terms of this Release of Liability.</p>'
  ),
  (
    'Assumption of Risk',
    'Acknowledges client understands and accepts risks inherent in fitness training.',
    '<h2>ASSUMPTION OF RISK AGREEMENT</h2>
<p><strong>⚠️ This is a template only. Consult your attorney before use.</strong></p>
<p>I, the undersigned participant, acknowledge that I am voluntarily participating in physical fitness activities at [FACILITY NAME].</p>
<p>I recognize that these activities carry inherent risks including but not limited to: physical injury, muscle soreness, cardiovascular stress, joint injury, and other health risks. I voluntarily assume all risks associated with participation, whether known or unknown.</p>
<p>I represent that I am in good physical condition, have no known medical conditions that would prevent safe participation, and understand that it is my responsibility to consult with a physician regarding any health concerns before beginning a fitness program.</p>
<p>This agreement shall be binding upon my heirs, executors, administrators, and assigns.</p>'
  ),
  (
    'Photo & Video Consent',
    'Grants permission to use client photos/videos for marketing.',
    '<h2>PHOTO AND VIDEO CONSENT</h2>
<p><strong>⚠️ This is a template only. Consult your attorney before use.</strong></p>
<p>I hereby grant [FACILITY NAME] and its representatives permission to photograph and/or video record me during training sessions and events at the facility.</p>
<p>I grant [FACILITY NAME] a non-exclusive, royalty-free license to use these images/videos for promotional, educational, and marketing purposes, including but not limited to: social media, website, print materials, and advertisements.</p>
<p>I waive any right to inspect or approve the finished photographs or video recordings. I understand that I will not receive compensation for this consent.</p>
<p>This consent is not required to participate in facility services and may be revoked at any time by written notice to [FACILITY NAME].</p>'
  ),
  (
    'Health Disclaimer',
    'Confirms client has disclosed health conditions and accepts medical responsibility.',
    '<h2>HEALTH DISCLAIMER AND MEDICAL CLEARANCE</h2>
<p><strong>⚠️ This is a template only. Consult your attorney before use.</strong></p>
<p>I, the undersigned, confirm that I have disclosed all relevant medical conditions, injuries, and health concerns to my trainer at [FACILITY NAME].</p>
<p>I acknowledge that personal training and fitness coaching are not medical services and that my trainer is not a licensed healthcare provider. Training advice does not constitute medical advice.</p>
<p>I accept full responsibility for consulting with a qualified healthcare provider before beginning any exercise program, particularly if I have or develop any medical conditions including but not limited to: heart disease, diabetes, hypertension, pregnancy, or musculoskeletal injuries.</p>
<p>I agree to notify my trainer immediately of any changes to my health status and to stop exercising if I experience pain, dizziness, shortness of breath, or other concerning symptoms.</p>'
  )
ON CONFLICT (title) DO NOTHING;
