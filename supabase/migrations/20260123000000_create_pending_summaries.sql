-- Migration: Create pending_summaries table for async summary generation
-- This ensures interview transcripts are NEVER lost, even if summary generation fails

CREATE TABLE IF NOT EXISTS pending_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript JSONB NOT NULL,
  patient_name TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  session_duration INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  summary TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE pending_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can view own summaries" ON pending_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries" ON pending_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries" ON pending_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for efficient polling of pending items
CREATE INDEX IF NOT EXISTS idx_pending_summaries_status
  ON pending_summaries(status)
  WHERE status = 'pending';

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_pending_summaries_user_id
  ON pending_summaries(user_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pending_summaries_updated_at
  BEFORE UPDATE ON pending_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_summaries_updated_at();

-- Comment for documentation
COMMENT ON TABLE pending_summaries IS 'Queue for async summary generation. Transcripts are saved here FIRST before AI processing to ensure no data loss.';
