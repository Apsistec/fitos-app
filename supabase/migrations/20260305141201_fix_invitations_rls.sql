-- Sprint 62.1: Fix Invitations RLS — remove overly permissive SELECT policy
--
-- Previously "Anyone can view invitation by code" had USING (TRUE), which let
-- any authenticated user enumerate ALL invitations across trainers.
-- Invite-code lookup is now handled by the validate-invite-code Edge Function
-- using the service-role key, so no public SELECT is needed.

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by code" ON invitations;

-- Ensure the correct trainer-scoped policies exist (idempotent re-creation)
DROP POLICY IF EXISTS "Trainers can view own invitations" ON invitations;
CREATE POLICY "Trainers can view own invitations"
    ON invitations FOR SELECT
    USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "Trainers can create invitations" ON invitations;
CREATE POLICY "Trainers can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (trainer_id = auth.uid());

DROP POLICY IF EXISTS "Trainers can update own invitations" ON invitations;
CREATE POLICY "Trainers can update own invitations"
    ON invitations FOR UPDATE
    USING (trainer_id = auth.uid());

DROP POLICY IF EXISTS "Trainers can delete own invitations" ON invitations;
CREATE POLICY "Trainers can delete own invitations"
    ON invitations FOR DELETE
    USING (trainer_id = auth.uid());
