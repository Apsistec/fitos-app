-- Sprint 64.1: Before/After Progress Photo Tracking
-- Client progress photos stored privately in Supabase Storage.
-- Trainers can see photos shared by client; clients own all their data.

-- ─── Storage bucket ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,              -- private bucket
  10485760,           -- 10 MB max per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: clients upload/manage their own folder (userId/filename)
CREATE POLICY "clients_upload_own_progress_photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "clients_view_own_progress_photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "clients_delete_own_progress_photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── progress_photos table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Storage URLs
  photo_url     TEXT NOT NULL,        -- full-size (1200px max)
  thumbnail_url TEXT NOT NULL,        -- compressed preview (300px)

  -- Metadata
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  pair_id       UUID,                 -- links two photos for before/after comparison

  -- Privacy control
  visibility    TEXT NOT NULL DEFAULT 'shared_with_trainer'
                  CHECK (visibility IN ('private', 'shared_with_trainer')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Clients manage all their own photos (full CRUD)
CREATE POLICY "client_manages_own_progress_photos"
  ON progress_photos
  FOR ALL
  USING  (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Trainers can VIEW photos shared with them (must have at least one appointment with client)
CREATE POLICY "trainer_views_shared_progress_photos"
  ON progress_photos
  FOR SELECT
  USING (
    visibility = 'shared_with_trainer'
    AND trainer_id = auth.uid()
  );

-- ─── Trigger ──────────────────────────────────────────────────────────────────
CREATE TRIGGER touch_progress_photos_updated_at
  BEFORE UPDATE ON progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- ─── Indices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_progress_photos_client_id
  ON progress_photos (client_id, taken_at DESC);

CREATE INDEX IF NOT EXISTS idx_progress_photos_pair_id
  ON progress_photos (pair_id)
  WHERE pair_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_progress_photos_trainer_id
  ON progress_photos (trainer_id)
  WHERE trainer_id IS NOT NULL;
