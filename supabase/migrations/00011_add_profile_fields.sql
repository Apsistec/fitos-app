-- Add address fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Add fitness/nutrition fields to client_profiles table
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS fitness_goals TEXT,
ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[],
ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very-active'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_address ON profiles(city, state);

-- Comment on new columns
COMMENT ON COLUMN profiles.street_address IS 'User street address for billing/subscription';
COMMENT ON COLUMN profiles.city IS 'User city';
COMMENT ON COLUMN profiles.state IS 'User state/province';
COMMENT ON COLUMN profiles.zip_code IS 'User ZIP/postal code';
COMMENT ON COLUMN client_profiles.fitness_goals IS 'Client fitness goals and objectives';
COMMENT ON COLUMN client_profiles.dietary_preferences IS 'Client dietary preferences (e.g., vegetarian, vegan, keto)';
COMMENT ON COLUMN client_profiles.activity_level IS 'Client current activity level';
