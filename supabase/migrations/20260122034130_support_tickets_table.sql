-- Support Tickets Table Migration
-- Creates the support_tickets table for storing user support requests

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature_request', 'billing', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  device_info JSONB NOT NULL,
  screenshot_url TEXT,
  status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT subject_min_length CHECK (LENGTH(TRIM(subject)) >= 5),
  CONSTRAINT description_min_length CHECK (LENGTH(TRIM(description)) >= 20)
);

-- Create indexes for better query performance
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Create composite index for common queries (user's tickets filtered by status)
CREATE INDEX idx_support_tickets_user_status ON support_tickets(user_id, status, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own tickets
CREATE POLICY "Users can view own support tickets" ON support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own tickets
CREATE POLICY "Users can create support tickets" ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users cannot update tickets (only support staff via service role)
-- Support staff will update via service role bypassing RLS

-- RLS Policy: Users cannot delete tickets
-- Only allow deletion via service role (e.g., for GDPR compliance)

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on any update
CREATE TRIGGER trigger_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_updated_at();

-- Add comment to table for documentation
COMMENT ON TABLE support_tickets IS 'Stores user support requests submitted via the mobile app';
COMMENT ON COLUMN support_tickets.device_info IS 'JSON object containing app_version, platform, os_version, and device_model';
COMMENT ON COLUMN support_tickets.screenshot_url IS 'Optional data URL or storage URL for screenshot attachment';
COMMENT ON COLUMN support_tickets.status IS 'Current status of the support ticket (open, in_progress, resolved, closed)';
