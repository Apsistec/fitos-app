-- ============================================================================
-- Migration: Gym Owner Support
-- Description: Add facilities and multi-trainer support for gym owners
-- ============================================================================

-- Create facilities table
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  max_trainers INTEGER DEFAULT 5,
  max_members INTEGER DEFAULT 100,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create facility_trainers junction table
CREATE TABLE IF NOT EXISTS public.facility_trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'trainer' CHECK (role IN ('trainer', 'manager', 'admin')),
  is_active BOOLEAN DEFAULT true,
  hired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, trainer_id)
);

-- Add facility_id to profiles table (optional - for trainers/clients affiliated with a facility)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

-- Add facility_id to client_profiles table (for facility-managed clients)
ALTER TABLE public.client_profiles
ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

-- Add facility_id to trainer_profiles table (for facility-employed trainers)
ALTER TABLE public.trainer_profiles
ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on facilities table
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Facility owners can read/write their own facilities
CREATE POLICY "Owners can manage their facilities"
ON public.facilities
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Facility trainers can read their facility info
CREATE POLICY "Trainers can view their facility"
ON public.facilities
FOR SELECT
USING (
  id IN (
    SELECT facility_id
    FROM public.facility_trainers
    WHERE trainer_id = auth.uid() AND is_active = true
  )
);

-- Enable RLS on facility_trainers table
ALTER TABLE public.facility_trainers ENABLE ROW LEVEL SECURITY;

-- Facility owners can manage their facility's trainers
CREATE POLICY "Owners can manage facility trainers"
ON public.facility_trainers
FOR ALL
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  facility_id IN (
    SELECT id FROM public.facilities WHERE owner_id = auth.uid()
  )
);

-- Trainers can view their own facility relationships
CREATE POLICY "Trainers can view their facility relationships"
ON public.facility_trainers
FOR SELECT
USING (trainer_id = auth.uid());

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_facilities_owner_id ON public.facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_facility_trainers_facility_id ON public.facility_trainers(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_trainers_trainer_id ON public.facility_trainers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_facility_id ON public.profiles(facility_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_facility_id ON public.client_profiles(facility_id);
CREATE INDEX IF NOT EXISTS idx_trainer_profiles_facility_id ON public.trainer_profiles(facility_id);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_facility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for facilities table
DROP TRIGGER IF EXISTS update_facilities_updated_at ON public.facilities;
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_facility_updated_at();

-- Trigger for facility_trainers table
DROP TRIGGER IF EXISTS update_facility_trainers_updated_at ON public.facility_trainers;
CREATE TRIGGER update_facility_trainers_updated_at
  BEFORE UPDATE ON public.facility_trainers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_facility_updated_at();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.facilities IS 'Gym facilities owned by gym_owner role users';
COMMENT ON TABLE public.facility_trainers IS 'Junction table connecting trainers to facilities';
COMMENT ON COLUMN public.facilities.max_trainers IS 'Maximum number of trainers allowed based on subscription tier';
COMMENT ON COLUMN public.facilities.max_members IS 'Maximum number of members allowed based on subscription tier';
COMMENT ON COLUMN public.facility_trainers.role IS 'Trainer role within the facility (trainer, manager, admin)';
