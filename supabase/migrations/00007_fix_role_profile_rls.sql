-- ============================================================================
-- Migration: Fix RLS Policies for trainer_profiles and client_profiles
-- Description: Adds missing RLS policies that were preventing new user registration
-- Issue: "database error saving new user" when registering as client
-- ============================================================================

-- ============================================================================
-- TRAINER PROFILES POLICIES
-- ============================================================================

-- Users can view their own trainer profile
CREATE POLICY "Users can view own trainer profile" ON trainer_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can insert their own trainer profile (needed during registration)
CREATE POLICY "Users can create own trainer profile" ON trainer_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own trainer profile
CREATE POLICY "Users can update own trainer profile" ON trainer_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can delete their own trainer profile
CREATE POLICY "Users can delete own trainer profile" ON trainer_profiles
    FOR DELETE USING (auth.uid() = id);

-- Clients can view their trainer's profile (for displaying trainer info)
CREATE POLICY "Clients can view their trainer profile" ON trainer_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM client_profiles
            WHERE client_profiles.trainer_id = trainer_profiles.id
            AND client_profiles.id = auth.uid()
        )
    );

-- ============================================================================
-- CLIENT PROFILES POLICIES
-- ============================================================================

-- Users can view their own client profile
CREATE POLICY "Users can view own client profile" ON client_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can insert their own client profile (needed during registration)
CREATE POLICY "Users can create own client profile" ON client_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own client profile
CREATE POLICY "Users can update own client profile" ON client_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can delete their own client profile
CREATE POLICY "Users can delete own client profile" ON client_profiles
    FOR DELETE USING (auth.uid() = id);

-- Trainers can view their clients' profiles
CREATE POLICY "Trainers can view their client profiles" ON client_profiles
    FOR SELECT USING (auth.uid() = trainer_id);

-- Trainers can update their clients' profiles (for setting goals, notes, etc.)
CREATE POLICY "Trainers can update their client profiles" ON client_profiles
    FOR UPDATE USING (auth.uid() = trainer_id);

-- ============================================================================
-- PROFILES TABLE - Add missing INSERT policy
-- Note: The trigger creates the initial profile, but we need INSERT policy
-- for edge cases and consistency
-- ============================================================================

-- Users can insert their own profile (backup for edge cases)
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users can create own trainer profile" ON trainer_profiles IS 
    'Required for user registration flow when role is trainer or gym_owner';

COMMENT ON POLICY "Users can create own client profile" ON client_profiles IS 
    'Required for user registration flow when role is client';
