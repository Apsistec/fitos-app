--
-- Chronotype System
-- Sprint 35: Chronotype Optimization
--
-- Features:
-- - User chronotype assessments (MEQ-based)
-- - Chronotype categories and scores
-- - Assessment history tracking
--
-- Research:
-- - Horne & Östberg (1976): MEQ chronotype assessment
-- - Randler (2008): Reduced MEQ validation
-- - Facer-Childs et al. (2018): 8.4% performance variance
--

-- Create chronotype category enum
DO $$ BEGIN
  CREATE TYPE chronotype_category AS ENUM (
    'extreme_morning',
    'moderate_morning',
    'intermediate',
    'moderate_evening',
    'extreme_evening'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User chronotypes table
CREATE TABLE IF NOT EXISTS user_chronotypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category chronotype_category NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 16 AND score <= 86), -- MEQ score range
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  assessment_responses JSONB, -- Stores question_id -> value mapping
  assessed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Chronotype assessment history (optional - for tracking changes over time)
CREATE TABLE IF NOT EXISTS chronotype_assessment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category chronotype_category NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 16 AND score <= 86),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  assessment_responses JSONB,
  assessed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_chronotypes_user_id
  ON user_chronotypes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_chronotypes_category
  ON user_chronotypes(category);

CREATE INDEX IF NOT EXISTS idx_chronotype_history_user_id
  ON chronotype_assessment_history(user_id);

CREATE INDEX IF NOT EXISTS idx_chronotype_history_assessed_at
  ON chronotype_assessment_history(assessed_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_chronotype_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_chronotypes_updated_at
  BEFORE UPDATE ON user_chronotypes
  FOR EACH ROW
  EXECUTE FUNCTION update_chronotype_updated_at();

-- Trigger to archive chronotype changes
CREATE OR REPLACE FUNCTION archive_chronotype_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only archive if category or score changed significantly
  IF (OLD.category IS DISTINCT FROM NEW.category) OR
     (ABS(OLD.score - NEW.score) >= 5) THEN
    INSERT INTO chronotype_assessment_history (
      user_id,
      category,
      score,
      confidence,
      assessment_responses,
      assessed_at,
      created_at
    ) VALUES (
      OLD.user_id,
      OLD.category,
      OLD.score,
      OLD.confidence,
      OLD.assessment_responses,
      OLD.assessed_at,
      OLD.updated_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archive_chronotype_changes
  BEFORE UPDATE ON user_chronotypes
  FOR EACH ROW
  EXECUTE FUNCTION archive_chronotype_on_update();

-- Row Level Security
ALTER TABLE user_chronotypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chronotype_assessment_history ENABLE ROW LEVEL SECURITY;

-- Policies for user_chronotypes
CREATE POLICY "Users can view their own chronotype"
  ON user_chronotypes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chronotype"
  ON user_chronotypes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chronotype"
  ON user_chronotypes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can view client chronotypes"
  ON user_chronotypes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles
      WHERE client_profiles.trainer_id = auth.uid()
        AND client_profiles.id = user_chronotypes.user_id
    )
  );

-- Policies for chronotype_assessment_history
CREATE POLICY "Users can view their own chronotype history"
  ON chronotype_assessment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chronotype history"
  ON chronotype_assessment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE user_chronotypes IS 'User chronotype assessments based on MEQ (Morningness-Eveningness Questionnaire). Determines optimal training times.';
COMMENT ON COLUMN user_chronotypes.score IS 'MEQ score from 16 (extreme evening) to 86 (extreme morning)';
COMMENT ON COLUMN user_chronotypes.confidence IS 'Assessment confidence from 0 to 1, based on response consistency';
COMMENT ON COLUMN user_chronotypes.assessment_responses IS 'JSON object mapping question IDs to selected values';

COMMENT ON TABLE chronotype_assessment_history IS 'Historical record of chronotype assessments for tracking changes over time';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_chronotypes TO authenticated;
GRANT SELECT, INSERT ON chronotype_assessment_history TO authenticated;
