-- =====================================================
-- Sprint 22: Video Feedback System
-- Client form check videos with trainer annotations
-- =====================================================

-- =====================================================
-- VIDEO_SUBMISSIONS TABLE
-- Client-uploaded form check videos
-- =====================================================
CREATE TABLE IF NOT EXISTS video_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Exercise context
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name TEXT, -- Denormalized for display if exercise deleted

  -- Video storage
  storage_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_path TEXT, -- Generated thumbnail
  duration_seconds INTEGER,
  file_size_bytes BIGINT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'reviewed', 'archived')
  ),

  -- Metadata
  client_notes TEXT, -- What client wants feedback on
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_video_submissions_client ON video_submissions(client_id, submitted_at DESC);
CREATE INDEX idx_video_submissions_trainer_pending ON video_submissions(trainer_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_video_submissions_exercise ON video_submissions(exercise_id)
  WHERE exercise_id IS NOT NULL;

-- =====================================================
-- VIDEO_ANNOTATIONS TABLE
-- Trainer feedback on videos (markers, drawings, comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS video_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES video_submissions(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamp in video
  timestamp_seconds DECIMAL(10,2) NOT NULL,

  -- Annotation type
  annotation_type TEXT NOT NULL CHECK (
    annotation_type IN ('marker', 'drawing', 'comment', 'correction')
  ),

  -- Visual annotation data (for drawings)
  drawing_data JSONB, -- {type: 'arrow|circle|line', points: [...], color: '#ff0000'}

  -- Text feedback
  text_comment TEXT,

  -- Preset corrections
  correction_type TEXT CHECK (
    correction_type IN (
      'knee_valgus', 'hip_hinge', 'bar_path', 'depth', 'tempo',
      'foot_position', 'grip_width', 'elbow_flare', 'lower_back_arch',
      'head_position', 'breathing', 'bracing', 'other'
    )
  ),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_video_annotations_video ON video_annotations(video_id, timestamp_seconds);
CREATE INDEX idx_video_annotations_trainer ON video_annotations(trainer_id);
CREATE INDEX idx_video_annotations_type ON video_annotations(annotation_type);

-- =====================================================
-- CORRECTION_TEMPLATES TABLE
-- Reusable correction templates for common issues
-- =====================================================
CREATE TABLE IF NOT EXISTS correction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Template details
  correction_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Visual template (optional pre-drawn annotation)
  drawing_template JSONB,

  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_correction_templates_trainer ON correction_templates(trainer_id);
CREATE INDEX idx_correction_templates_type ON correction_templates(correction_type);
CREATE INDEX idx_correction_templates_popular ON correction_templates(trainer_id, use_count DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Video Submissions
ALTER TABLE video_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own video submissions"
  ON video_submissions FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can insert their own video submissions"
  ON video_submissions FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Trainers can view their clients' video submissions"
  ON video_submissions FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainers can update their clients' video submissions"
  ON video_submissions FOR UPDATE
  USING (trainer_id = auth.uid());

-- Video Annotations
ALTER TABLE video_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view annotations on their videos"
  ON video_annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM video_submissions
      WHERE video_submissions.id = video_annotations.video_id
        AND video_submissions.client_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can manage annotations on their clients' videos"
  ON video_annotations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM video_submissions
      WHERE video_submissions.id = video_annotations.video_id
        AND video_submissions.trainer_id = auth.uid()
    )
  );

-- Correction Templates
ALTER TABLE correction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their own correction templates"
  ON correction_templates FOR ALL
  USING (trainer_id = auth.uid());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_submission_timestamp
  BEFORE UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_video_submission_updated_at();

-- Auto-mark as reviewed when first annotation added
CREATE OR REPLACE FUNCTION mark_video_as_reviewed()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE video_submissions
  SET
    status = 'reviewed',
    reviewed_at = NOW()
  WHERE id = NEW.video_id
    AND status = 'pending';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_video_reviewed
  AFTER INSERT ON video_annotations
  FOR EACH ROW
  EXECUTE FUNCTION mark_video_as_reviewed();

-- Increment template use count
CREATE OR REPLACE FUNCTION increment_template_use_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.correction_type IS NOT NULL THEN
    UPDATE correction_templates
    SET
      use_count = use_count + 1,
      last_used_at = NOW()
    WHERE trainer_id = NEW.trainer_id
      AND correction_type = NEW.correction_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_template_use
  AFTER INSERT ON video_annotations
  FOR EACH ROW
  WHEN (NEW.correction_type IS NOT NULL)
  EXECUTE FUNCTION increment_template_use_count();

-- =====================================================
-- STORAGE BUCKETS (via Supabase Dashboard or API)
-- =====================================================

-- Create storage bucket for videos:
-- Bucket name: 'form-check-videos'
-- Public: false (requires auth)
-- File size limit: 100MB
-- Allowed mime types: video/mp4, video/quicktime, video/x-msvideo

-- Create storage bucket for thumbnails:
-- Bucket name: 'video-thumbnails'
-- Public: true (for fast loading)
-- File size limit: 5MB
-- Allowed mime types: image/jpeg, image/png

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE video_submissions IS 'Client-uploaded form check videos awaiting trainer feedback';
COMMENT ON TABLE video_annotations IS 'Trainer annotations on videos: markers, drawings, and text comments';
COMMENT ON TABLE correction_templates IS 'Reusable correction templates for common form issues';

COMMENT ON COLUMN video_annotations.drawing_data IS 'JSONB containing drawing primitives: arrows, circles, lines with coordinates and styling';
COMMENT ON COLUMN video_annotations.correction_type IS 'Preset correction category for common form issues';
COMMENT ON COLUMN video_submissions.storage_path IS 'Supabase Storage path to video file in form-check-videos bucket';

COMMENT ON FUNCTION mark_video_as_reviewed IS 'Automatically marks video as reviewed when first annotation is added';
COMMENT ON FUNCTION increment_template_use_count IS 'Tracks usage of correction templates for smart suggestions';
