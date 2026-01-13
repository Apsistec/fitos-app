-- Migration: Coach Brain - Trainer Methodology Learning System
-- Sprint 17, Epic 17.1
-- Description: Store trainer methodology, philosophy, and voice for AI personalization

-- Enable pgvector extension for embeddings (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Trainer Methodology Table
-- Stores the trainer's coaching philosophy, communication style, and preferred language
CREATE TABLE IF NOT EXISTS trainer_methodology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Philosophy & Approach
  training_philosophy TEXT,
  nutrition_approach TEXT,
  communication_style TEXT,

  -- Language Patterns
  key_phrases TEXT[] DEFAULT '{}',
  avoid_phrases TEXT[] DEFAULT '{}',

  -- Response Templates (approved by trainer)
  response_examples JSONB DEFAULT '{}',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one methodology per trainer
  UNIQUE(trainer_id)
);

-- Methodology Training Data Table
-- Stores historical trainer content for RAG retrieval
CREATE TABLE IF NOT EXISTS methodology_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  input_type TEXT NOT NULL CHECK (input_type IN ('message', 'program', 'feedback', 'note', 'workout_description')),
  content TEXT NOT NULL,

  -- Vector embedding for RAG retrieval
  embedding vector(1536),

  -- Metadata
  source_id UUID, -- Reference to the source record (message_id, workout_id, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for similarity search
  CONSTRAINT methodology_training_data_content_not_empty CHECK (char_length(content) > 0)
);

-- Methodology Response Logs
-- Track AI responses for quality and trainer approval
CREATE TABLE IF NOT EXISTS methodology_response_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Request & Response
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  context_used JSONB, -- Retrieved methodology snippets

  -- Trainer Feedback
  trainer_rating INTEGER CHECK (trainer_rating BETWEEN 1 AND 5),
  trainer_approved BOOLEAN,
  trainer_feedback TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_trainer_methodology_trainer_id ON trainer_methodology(trainer_id);
CREATE INDEX idx_methodology_training_data_trainer_id ON methodology_training_data(trainer_id);
CREATE INDEX idx_methodology_training_data_input_type ON methodology_training_data(input_type);
CREATE INDEX idx_methodology_response_logs_trainer_id ON methodology_response_logs(trainer_id);
CREATE INDEX idx_methodology_response_logs_reviewed ON methodology_response_logs(trainer_approved, reviewed_at);

-- Vector similarity search index (using HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_methodology_training_data_embedding
  ON methodology_training_data
  USING hnsw (embedding vector_cosine_ops);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_methodology_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
CREATE TRIGGER trigger_update_trainer_methodology_timestamp
  BEFORE UPDATE ON trainer_methodology
  FOR EACH ROW
  EXECUTE FUNCTION update_methodology_updated_at();

-- Row Level Security (RLS) Policies

-- trainer_methodology: Trainers can only access their own methodology
ALTER TABLE trainer_methodology ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own methodology"
  ON trainer_methodology FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert their own methodology"
  ON trainer_methodology FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can update their own methodology"
  ON trainer_methodology FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own methodology"
  ON trainer_methodology FOR DELETE
  USING (auth.uid() = trainer_id);

-- methodology_training_data: Trainers can manage their training data
ALTER TABLE methodology_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own training data"
  ON methodology_training_data FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert their own training data"
  ON methodology_training_data FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete their own training data"
  ON methodology_training_data FOR DELETE
  USING (auth.uid() = trainer_id);

-- methodology_response_logs: Trainers can view/manage their response logs
ALTER TABLE methodology_response_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their own response logs"
  ON methodology_response_logs FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "System can insert response logs"
  ON methodology_response_logs FOR INSERT
  WITH CHECK (true); -- Allow AI backend to insert logs

CREATE POLICY "Trainers can update their own response logs"
  ON methodology_response_logs FOR UPDATE
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON trainer_methodology TO authenticated;
GRANT ALL ON methodology_training_data TO authenticated;
GRANT ALL ON methodology_response_logs TO authenticated;

-- Function for RAG similarity search
CREATE OR REPLACE FUNCTION match_methodology_training_data(
  query_trainer_id UUID,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  input_type TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    methodology_training_data.id,
    methodology_training_data.content,
    methodology_training_data.input_type,
    1 - (methodology_training_data.embedding <=> query_embedding) as similarity
  FROM methodology_training_data
  WHERE methodology_training_data.trainer_id = query_trainer_id
    AND methodology_training_data.embedding IS NOT NULL
    AND 1 - (methodology_training_data.embedding <=> query_embedding) > match_threshold
  ORDER BY methodology_training_data.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE trainer_methodology IS 'Stores trainer coaching philosophy and communication preferences for AI personalization';
COMMENT ON TABLE methodology_training_data IS 'Historical trainer content with embeddings for RAG retrieval';
COMMENT ON TABLE methodology_response_logs IS 'AI response quality tracking and trainer approval workflow';
COMMENT ON COLUMN methodology_training_data.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions) for semantic search';
COMMENT ON FUNCTION match_methodology_training_data IS 'RAG similarity search for relevant trainer methodology examples';
