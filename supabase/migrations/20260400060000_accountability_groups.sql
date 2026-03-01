-- Sprint 66.2: Accountability Groups (Peer Support Pods)
-- Trainers create pods of 3-6 clients; clients see pod members' workout completions.
-- No personal data (weight, nutrition) is ever shared — only workout completion counts.

-- ─── Accountability Groups ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accountability_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  emoji       TEXT DEFAULT '💪',      -- Visual identifier shown in pod feed
  max_members SMALLINT NOT NULL DEFAULT 6 CHECK (max_members BETWEEN 2 AND 10),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE accountability_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_manages_own_groups"
  ON accountability_groups
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE TRIGGER touch_accountability_groups_updated_at
  BEFORE UPDATE ON accountability_groups
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── Group Members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accountability_group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES accountability_groups(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (group_id, client_id)
);

ALTER TABLE accountability_group_members ENABLE ROW LEVEL SECURITY;

-- Trainers manage membership for their groups
CREATE POLICY "trainer_manages_group_members"
  ON accountability_group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM accountability_groups ag
      WHERE ag.id = group_id AND ag.trainer_id = auth.uid()
    )
  );

-- Clients can see members of groups they belong to
CREATE POLICY "client_views_own_group_members"
  ON accountability_group_members
  FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM accountability_group_members m2
      WHERE m2.group_id = group_id AND m2.client_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_agm_group_id  ON accountability_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_agm_client_id ON accountability_group_members (client_id);

-- ─── RPC: get_pod_activity_feed ───────────────────────────────────────────────
-- Returns pod members' workout completions for this week.
-- PRIVACY: only returns workout counts — no exercise names, weights, or nutrition.
CREATE OR REPLACE FUNCTION get_pod_activity_feed(p_client_id UUID)
RETURNS TABLE (
  group_id      UUID,
  group_name    TEXT,
  group_emoji   TEXT,
  member_id     UUID,
  display_name  TEXT,   -- First name + last initial only (privacy)
  workouts_this_week BIGINT,
  sessions_this_week BIGINT,
  last_active   TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_week_start TIMESTAMPTZ := DATE_TRUNC('week', NOW());
BEGIN
  RETURN QUERY
  SELECT
    ag.id                                              AS group_id,
    ag.name                                            AS group_name,
    ag.emoji                                           AS group_emoji,
    m.client_id                                        AS member_id,
    -- Privacy: "Alex C." format
    SPLIT_PART(p.full_name, ' ', 1) || ' ' ||
      COALESCE(LEFT(SPLIT_PART(p.full_name, ' ', 2), 1) || '.', '') AS display_name,
    -- Workout session completions this week
    COUNT(DISTINCT ws.id) FILTER (
      WHERE ws.completed_at >= v_week_start
    )                                                  AS workouts_this_week,
    -- Appointment completions this week
    COUNT(DISTINCT a.id) FILTER (
      WHERE a.status = 'completed' AND a.start_at >= v_week_start
    )                                                  AS sessions_this_week,
    -- Last activity (workout or session)
    GREATEST(
      MAX(ws.completed_at),
      MAX(a.start_at) FILTER (WHERE a.status = 'completed')
    )                                                  AS last_active
  FROM accountability_group_members m
  JOIN accountability_groups ag ON ag.id = m.group_id AND ag.is_active = TRUE
  JOIN profiles p ON p.id = m.client_id
  LEFT JOIN workout_sessions ws ON ws.client_id = m.client_id
  LEFT JOIN appointments a ON a.client_id = m.client_id
  WHERE ag.id IN (
    -- Only groups the requesting client belongs to
    SELECT agm.group_id FROM accountability_group_members agm
    WHERE agm.client_id = p_client_id
  )
  GROUP BY ag.id, ag.name, ag.emoji, m.client_id, p.full_name
  ORDER BY ag.name, workouts_this_week DESC;
END;
$$;

-- ─── RPC: get_pod_weekly_stats ─────────────────────────────────────────────────
-- Aggregate pod stats for weekly digest email/notification.
CREATE OR REPLACE FUNCTION get_pod_weekly_stats(p_group_id UUID)
RETURNS TABLE (
  total_workouts   BIGINT,
  total_sessions   BIGINT,
  most_active_name TEXT,
  member_count     BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_week_start TIMESTAMPTZ := DATE_TRUNC('week', NOW() - INTERVAL '1 week');
  v_week_end   TIMESTAMPTZ := DATE_TRUNC('week', NOW());
BEGIN
  RETURN QUERY
  WITH member_activity AS (
    SELECT
      m.client_id,
      p.full_name,
      COUNT(DISTINCT ws.id) AS workout_count
    FROM accountability_group_members m
    JOIN profiles p ON p.id = m.client_id
    LEFT JOIN workout_sessions ws ON ws.client_id = m.client_id
      AND ws.completed_at BETWEEN v_week_start AND v_week_end
    WHERE m.group_id = p_group_id
    GROUP BY m.client_id, p.full_name
  )
  SELECT
    SUM(ma.workout_count)                                         AS total_workouts,
    0::BIGINT                                                      AS total_sessions,
    (SELECT ma2.full_name FROM member_activity ma2
     ORDER BY ma2.workout_count DESC LIMIT 1)                     AS most_active_name,
    COUNT(*)                                                       AS member_count
  FROM member_activity ma;
END;
$$;
