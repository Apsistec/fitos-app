-- AI Conversations & Escalation Tables
-- Sprint 6: AI Coaching Features
-- Stores conversation history and trainer escalation records

-- AI Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- Auto-generated from first message
  is_active BOOLEAN DEFAULT TRUE,
  last_agent TEXT, -- Last active agent (workout, nutrition, etc.)
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Conversation Messages table
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agent TEXT, -- Which AI agent responded (workout, nutrition, recovery, motivation, general)
  confidence REAL, -- AI confidence score 0-1
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Escalations table
-- Records when AI decides to escalate to a human trainer
CREATE TABLE IF NOT EXISTS ai_escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  message_content TEXT, -- The message that triggered escalation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_active ON ai_conversations(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_ai_conversation_messages_conversation ON ai_conversation_messages(conversation_id);
CREATE INDEX idx_ai_conversation_messages_created ON ai_conversation_messages(conversation_id, created_at);
CREATE INDEX idx_ai_escalations_trainer ON ai_escalations(trainer_id, status);
CREATE INDEX idx_ai_escalations_client ON ai_escalations(client_id);

-- RLS Policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_escalations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own conversations
CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can manage messages in their conversations
CREATE POLICY "Users can view own conversation messages"
  ON ai_conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON ai_conversation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Escalation policies
CREATE POLICY "Users can view own escalations"
  ON ai_escalations FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = trainer_id);

CREATE POLICY "System can create escalations"
  ON ai_escalations FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Trainers can update escalation status"
  ON ai_escalations FOR UPDATE
  USING (auth.uid() = trainer_id);

-- Trigger to update conversation's updated_at and message_count
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET
    updated_at = now(),
    message_count = message_count + 1,
    last_agent = COALESCE(NEW.agent, last_agent)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ai_message_insert
  AFTER INSERT ON ai_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Auto-generate conversation title from first user message
CREATE OR REPLACE FUNCTION auto_title_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE ai_conversations
    SET title = LEFT(NEW.content, 100)
    WHERE id = NEW.conversation_id
    AND title IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_first_message_set_title
  AFTER INSERT ON ai_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_title_conversation();
