-- ============================================================================
-- Migration: Fix handle_new_user trigger to properly handle role-specific profiles
-- Description: Updates the trigger to create role-specific profiles (trainer_profiles
--              or client_profiles) during signup, eliminating RLS issues
-- Issue: "database error saving new user" when registering as client
-- ============================================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function
-- This function runs with SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_value user_role;
BEGIN
    -- Extract role from metadata, default to 'client' if not provided
    user_role_value := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'client'::user_role
    );

    -- Insert into profiles table
    INSERT INTO profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        user_role_value
    );

    -- Create role-specific profile based on the user's role
    IF user_role_value = 'trainer' OR user_role_value = 'gym_owner' THEN
        -- Trainers and gym owners use trainer_profiles
        INSERT INTO trainer_profiles (id)
        VALUES (NEW.id);
    ELSE
        -- Clients use client_profiles
        INSERT INTO client_profiles (id)
        VALUES (NEW.id);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists (e.g., from a retry), just return
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth signup
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION handle_new_user() IS 
    'Creates profile and role-specific profile when a new user signs up. '
    'Runs as SECURITY DEFINER to bypass RLS. Extracts role from user metadata.';
