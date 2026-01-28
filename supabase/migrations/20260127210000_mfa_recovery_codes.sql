-- Create MFA recovery codes table
-- These are backup codes users can use if they lose access to their authenticator app

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codes TEXT[] NOT NULL, -- Array of hashed recovery codes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can only access their own recovery codes
CREATE POLICY "Users can view own recovery codes"
  ON mfa_recovery_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery codes"
  ON mfa_recovery_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery codes"
  ON mfa_recovery_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recovery codes"
  ON mfa_recovery_codes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_mfa_recovery_codes_updated_at
  BEFORE UPDATE ON mfa_recovery_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE mfa_recovery_codes IS 'Stores hashed MFA recovery codes for users who have enabled TOTP authentication';
COMMENT ON COLUMN mfa_recovery_codes.codes IS 'Array of hashed recovery codes - each code can only be used once';
