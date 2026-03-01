-- Sprint 65.2: Program Assignment
-- Trainers assign digital_product template_bundles to clients as active programs.
-- Creates a lightweight join record; workout logging uses existing infrastructure.

CREATE TABLE IF NOT EXISTS program_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  trainer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Optional trainer note shown to the client
  note           TEXT,

  -- Assignment lifecycle
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'completed', 'paused')),
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,

  -- Prevent duplicate active assignment of same product to same client
  UNIQUE (product_id, client_id)
);

ALTER TABLE program_assignments ENABLE ROW LEVEL SECURITY;

-- Trainers manage their own assignments
CREATE POLICY "trainer_manages_own_assignments"
  ON program_assignments
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients view their own assignments
CREATE POLICY "client_views_own_assignments"
  ON program_assignments
  FOR SELECT
  USING (client_id = auth.uid());

-- ─── Indices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_program_assignments_client_id
  ON program_assignments (client_id);

CREATE INDEX IF NOT EXISTS idx_program_assignments_trainer_id
  ON program_assignments (trainer_id);

CREATE INDEX IF NOT EXISTS idx_program_assignments_product_id
  ON program_assignments (product_id);

-- ─── RPC: get_client_program_assignments ──────────────────────────────────────
-- Returns a client's active/paused assignments with product details.
CREATE OR REPLACE FUNCTION get_client_program_assignments(p_client_id UUID)
RETURNS TABLE (
  assignment_id  UUID,
  status         TEXT,
  assigned_at    TIMESTAMPTZ,
  note           TEXT,
  trainer_name   TEXT,
  product_id     UUID,
  product_title  TEXT,
  product_type   TEXT,
  thumbnail_url  TEXT,
  file_urls      JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    pa.id           AS assignment_id,
    pa.status,
    pa.assigned_at,
    pa.note,
    p.full_name     AS trainer_name,
    dp.id           AS product_id,
    dp.title        AS product_title,
    dp.type         AS product_type,
    dp.thumbnail_url,
    dp.file_urls
  FROM program_assignments pa
  JOIN digital_products dp ON dp.id = pa.product_id
  JOIN profiles p ON p.id = pa.trainer_id
  WHERE pa.client_id = p_client_id
    AND pa.status IN ('active', 'paused')
  ORDER BY pa.assigned_at DESC;
END;
$$;
