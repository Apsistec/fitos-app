-- Sprint 46: NFC/QR Physical Touchpoints
-- Creates tables for NFC tag management and scan analytics

CREATE TABLE nfc_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  facility_id UUID,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('check_in', 'equipment', 'workout_start')),
  deep_link_uri TEXT NOT NULL,
  label TEXT NOT NULL,
  equipment_id UUID,
  workout_template_id UUID,
  scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE nfc_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES nfc_touchpoints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  platform TEXT CHECK (platform IN ('ios', 'android', 'web'))
);

-- Indexes
CREATE INDEX idx_nfc_touchpoints_trainer ON nfc_touchpoints(trainer_id);
CREATE INDEX idx_nfc_scan_logs_touchpoint ON nfc_scan_logs(touchpoint_id);
CREATE INDEX idx_nfc_scan_logs_user ON nfc_scan_logs(user_id);

-- RLS
ALTER TABLE nfc_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_scan_logs ENABLE ROW LEVEL SECURITY;

-- Trainers manage their own touchpoints
CREATE POLICY "trainer_manages_own_touchpoints" ON nfc_touchpoints
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Any authenticated user can read touchpoints (for scanning)
CREATE POLICY "authenticated_reads_touchpoints" ON nfc_touchpoints
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Any authenticated user can log a scan
CREATE POLICY "authenticated_logs_scan" ON nfc_scan_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Trainers can read scan logs for their touchpoints
CREATE POLICY "trainer_reads_scan_logs" ON nfc_scan_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nfc_touchpoints
      WHERE nfc_touchpoints.id = nfc_scan_logs.touchpoint_id
        AND nfc_touchpoints.trainer_id = auth.uid()
    )
  );

-- Trigger: increment scan_count on nfc_touchpoints after each log
CREATE OR REPLACE FUNCTION increment_nfc_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE nfc_touchpoints
  SET scan_count = scan_count + 1,
      updated_at = NOW()
  WHERE id = NEW.touchpoint_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_nfc_scan_log_insert
  AFTER INSERT ON nfc_scan_logs
  FOR EACH ROW EXECUTE FUNCTION increment_nfc_scan_count();
