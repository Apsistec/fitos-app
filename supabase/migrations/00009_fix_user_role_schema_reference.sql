-- ============================================================================
-- Migration: Fix user_role schema reference in handle_new_user function
-- Description: Updates function to explicitly reference public.user_role type
-- Issue: "type user_role does not exist" when trigger runs from auth schema
-- ============================================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function with explicit schema reference
-- This function runs with SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_value public.user_role;
BEGIN
    -- Extract role from metadata, default to 'client' if not provided
    user_role_value := COALESCE(
        (NEW.raw_user_meta_data->>'role')::public.user_role,
        'client'::public.user_role
    );

    -- Insert into profiles table
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        user_role_value
    );

    -- Create role-specific profile based on the user's role
    IF user_role_value = 'trainer'::public.user_role OR user_role_value = 'gym_owner'::public.user_role THEN
        -- Trainers and gym owners use trainer_profiles
        INSERT INTO public.trainer_profiles (id)
        VALUES (NEW.id);
    ELSE
        -- Clients use client_profiles
        INSERT INTO public.client_profiles (id)
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
    'Runs as SECURITY DEFINER to bypass RLS. Extracts role from user metadata. '
    'Uses explicit public schema references to work from auth schema context.';
