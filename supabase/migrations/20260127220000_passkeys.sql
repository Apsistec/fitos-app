-- Create passkeys table for WebAuthn credentials
-- Stores public keys and metadata for passwordless authentication

CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY, -- Base64URL credential ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key BYTEA NOT NULL, -- Raw public key bytes
  webauthn_user_id TEXT NOT NULL, -- WebAuthn-specific user identifier
  counter BIGINT NOT NULL DEFAULT 0, -- Signature counter for cloning detection
  device_type VARCHAR(32) NOT NULL, -- 'singleDevice' or 'multiDevice'
  backed_up BOOLEAN NOT NULL DEFAULT false, -- Backup status
  transports TEXT[], -- Connection methods (ble, usb, nfc, internal, hybrid)
  name VARCHAR(255), -- User-friendly name for the passkey (e.g., "iPhone 15")
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own passkeys
CREATE POLICY "Users can view own passkeys"
  ON passkeys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own passkeys"
  ON passkeys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own passkeys"
  ON passkeys
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own passkeys"
  ON passkeys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_passkeys_user_id ON passkeys(user_id);

-- Track passkey enrollment in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS passkey_enrolled_at TIMESTAMPTZ;

-- Table to store temporary challenges during registration/authentication
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('registration', 'authentication')),
  options JSONB, -- Full options object for verification
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS on challenges
ALTER TABLE passkey_challenges ENABLE ROW LEVEL SECURITY;

-- Only the service role can access challenges (Edge Functions use service role)
CREATE POLICY "Service role only for challenges"
  ON passkey_challenges
  FOR ALL
  USING (false);

-- Index for faster lookups and cleanup
CREATE INDEX idx_passkey_challenges_user_id ON passkey_challenges(user_id);
CREATE INDEX idx_passkey_challenges_expires_at ON passkey_challenges(expires_at);

-- Function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_passkey_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM passkey_challenges WHERE expires_at < now();
END;
$$;

-- Comments for documentation
COMMENT ON TABLE passkeys IS 'Stores WebAuthn/Passkey credentials for passwordless authentication';
COMMENT ON COLUMN passkeys.id IS 'Base64URL encoded credential ID from authenticator';
COMMENT ON COLUMN passkeys.public_key IS 'Raw public key bytes for signature verification';
COMMENT ON COLUMN passkeys.webauthn_user_id IS 'WebAuthn-specific user ID (different from auth.users.id)';
COMMENT ON COLUMN passkeys.counter IS 'Signature counter to detect credential cloning';
COMMENT ON COLUMN passkeys.device_type IS 'Whether credential is single-device or synced across devices';
COMMENT ON COLUMN passkeys.backed_up IS 'Whether the credential is backed up to cloud (e.g., iCloud Keychain)';
COMMENT ON COLUMN passkeys.transports IS 'Supported transport methods for this credential';
COMMENT ON TABLE passkey_challenges IS 'Temporary storage for WebAuthn challenges during registration/authentication';
