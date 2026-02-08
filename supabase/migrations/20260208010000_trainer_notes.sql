-- Trainer Notes Table
-- Sprint 7: CRM & Client Management
-- Trainers can add private notes about clients

CREATE TABLE IF NOT EXISTS trainer_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'training', 'nutrition', 'injury', 'goal', 'behavior')),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_trainer_notes_trainer ON trainer_notes(trainer_id);
CREATE INDEX idx_trainer_notes_client ON trainer_notes(trainer_id, client_id);
CREATE INDEX idx_trainer_notes_pinned ON trainer_notes(trainer_id, client_id, is_pinned) WHERE is_pinned = TRUE;

-- RLS
ALTER TABLE trainer_notes ENABLE ROW LEVEL SECURITY;

-- Trainers can manage their own notes
CREATE POLICY "Trainers can view own notes"
  ON trainer_notes FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can create notes"
  ON trainer_notes FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update own notes"
  ON trainer_notes FOR UPDATE
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete own notes"
  ON trainer_notes FOR DELETE
  USING (auth.uid() = trainer_id);
