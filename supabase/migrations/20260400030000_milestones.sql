-- Sprint 64.2: Milestone & Achievement Cards
-- Tracks client achievements (PRs, session counts, streaks, custom badges).
-- `MilestoneService` awards milestones; `MilestoneCardComponent` renders the share card.

-- ─── milestone_badges (trainer-defined custom badge types) ─────────────────
CREATE TABLE IF NOT EXISTS milestone_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'trophy-outline',   -- ionicons icon name
  color       TEXT NOT NULL DEFAULT '#10B981',           -- hex colour for card bg
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE milestone_badges ENABLE ROW LEVEL SECURITY;

-- Trainers manage their own badge definitions
CREATE POLICY "trainer_manages_own_badges"
  ON milestone_badges
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Clients can read badge definitions for milestones awarded to them
CREATE POLICY "client_reads_badges_for_own_milestones"
  ON milestone_badges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM milestones m
      WHERE m.client_id = auth.uid()
        AND m.badge_id = milestone_badges.id
    )
  );

CREATE INDEX IF NOT EXISTS idx_milestone_badges_trainer_id
  ON milestone_badges (trainer_id);

-- ─── milestones ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Milestone type
  type           TEXT NOT NULL
                   CHECK (type IN ('pr_set', 'sessions_completed', 'streak', 'custom')),

  -- Display content
  title          TEXT NOT NULL,
  description    TEXT,

  -- Numeric context (e.g. 225 lbs, 10 sessions, 30-day streak)
  value          NUMERIC,
  unit           TEXT,

  -- Custom badge (optional — only for type = 'custom')
  badge_id       UUID REFERENCES milestone_badges(id) ON DELETE SET NULL,

  -- Lifecycle flags
  achieved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  card_generated BOOLEAN NOT NULL DEFAULT false,  -- true after share card rendered

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Clients read their own milestones
CREATE POLICY "client_reads_own_milestones"
  ON milestones
  FOR SELECT
  USING (client_id = auth.uid());

-- Trainers manage milestones for their clients (award + update)
CREATE POLICY "trainer_manages_client_milestones"
  ON milestones
  FOR ALL
  USING  (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- System INSERT: allow service-role to auto-award PR milestones
-- (service role bypasses RLS, so no additional policy needed)

-- ─── Indices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_milestones_client_id
  ON milestones (client_id, achieved_at DESC);

CREATE INDEX IF NOT EXISTS idx_milestones_trainer_id
  ON milestones (trainer_id)
  WHERE trainer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_type
  ON milestones (type);

-- ─── Helper: auto-award session-count milestones ──────────────────────────
-- Called from application code (MilestoneService); replicated here as a
-- DB function for potential future trigger use.

CREATE OR REPLACE FUNCTION check_session_milestones(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_session_count INT;
  v_milestone     INT;
  v_milestones    INT[] := ARRAY[10, 25, 50, 100, 200, 500];
  v_existing      INT;
BEGIN
  -- Count completed sessions for this client
  SELECT COUNT(*) INTO v_session_count
  FROM appointments
  WHERE client_id = p_client_id
    AND status = 'completed';

  -- Check each milestone threshold
  FOREACH v_milestone IN ARRAY v_milestones LOOP
    IF v_session_count >= v_milestone THEN
      -- Check if already awarded
      SELECT COUNT(*) INTO v_existing
      FROM milestones
      WHERE client_id = p_client_id
        AND type = 'sessions_completed'
        AND value = v_milestone;

      IF v_existing = 0 THEN
        INSERT INTO milestones (client_id, type, title, description, value, unit)
        VALUES (
          p_client_id,
          'sessions_completed',
          v_milestone || ' Sessions Completed!',
          'You''ve completed ' || v_milestone || ' training sessions. Keep crushing it!',
          v_milestone,
          'sessions'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
