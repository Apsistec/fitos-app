-- Add Workout Tracking Tables
-- Supports assigning workouts to clients and tracking active sessions

-- ============================================================================
-- ASSIGNED WORKOUTS
-- ============================================================================

CREATE TABLE assigned_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    trainer_notes TEXT,
    status workout_status DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assigned_workouts_client_id ON assigned_workouts(client_id);
CREATE INDEX idx_assigned_workouts_template_id ON assigned_workouts(template_id);
CREATE INDEX idx_assigned_workouts_scheduled_date ON assigned_workouts(scheduled_date);
CREATE INDEX idx_assigned_workouts_status ON assigned_workouts(status);

-- ============================================================================
-- WORKOUT SESSIONS
-- ============================================================================

CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_workout_id UUID NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    status workout_status DEFAULT 'in_progress',
    client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 10),
    client_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workout_sessions_assigned_workout_id ON workout_sessions(assigned_workout_id);
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_started_at ON workout_sessions(started_at);
CREATE INDEX idx_workout_sessions_status ON workout_sessions(status);

-- ============================================================================
-- LOGGED SETS
-- ============================================================================

CREATE TABLE logged_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight DECIMAL(6,2),
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_logged_sets_session_id ON logged_sets(session_id);
CREATE INDEX idx_logged_sets_exercise_id ON logged_sets(exercise_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE assigned_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE logged_sets ENABLE ROW LEVEL SECURITY;

-- Assigned Workouts Policies
CREATE POLICY "Clients can view their assigned workouts"
    ON assigned_workouts FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view workouts they assigned"
    ON assigned_workouts FOR SELECT
    USING (auth.uid() = assigned_by);

CREATE POLICY "Trainers can assign workouts to their clients"
    ON assigned_workouts FOR INSERT
    WITH CHECK (
        auth.uid() = assigned_by
        AND EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.id = assigned_workouts.client_id
            AND client_profiles.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Trainers can update workouts they assigned"
    ON assigned_workouts FOR UPDATE
    USING (auth.uid() = assigned_by);

CREATE POLICY "Trainers can delete workouts they assigned"
    ON assigned_workouts FOR DELETE
    USING (auth.uid() = assigned_by);

-- Workout Sessions Policies
CREATE POLICY "Users can view their own workout sessions"
    ON workout_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view their clients' workout sessions"
    ON workout_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM assigned_workouts aw
            JOIN client_profiles cp ON cp.id = aw.client_id
            WHERE aw.id = workout_sessions.assigned_workout_id
            AND cp.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own workout sessions"
    ON workout_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sessions"
    ON workout_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Logged Sets Policies
CREATE POLICY "Users can view their own logged sets"
    ON logged_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = logged_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Trainers can view their clients' logged sets"
    ON logged_sets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions ws
            JOIN assigned_workouts aw ON aw.id = ws.assigned_workout_id
            JOIN client_profiles cp ON cp.id = aw.client_id
            WHERE ws.id = logged_sets.session_id
            AND cp.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own logged sets"
    ON logged_sets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = logged_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own logged sets"
    ON logged_sets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = logged_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own logged sets"
    ON logged_sets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions
            WHERE workout_sessions.id = logged_sets.session_id
            AND workout_sessions.user_id = auth.uid()
        )
    );
