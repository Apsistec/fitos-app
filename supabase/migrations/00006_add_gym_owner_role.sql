-- ============================================================================
-- Migration: Add gym_owner role to user_role enum
-- Description: Adds the gym_owner role to support facility owners
-- ============================================================================

-- Add gym_owner to the user_role enum
-- PostgreSQL requires this approach to add values to an existing enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gym_owner';

-- ============================================================================
-- Note: The gym_owner role uses the facilities table (created in 00005)
-- to manage their gym. They don't need a separate gym_owner_profiles table
-- as their facility information is stored in the facilities table.
-- ============================================================================
