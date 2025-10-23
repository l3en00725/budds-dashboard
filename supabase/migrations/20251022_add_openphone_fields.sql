-- Add missing fields to openphone_calls table for enhanced webhook processing

ALTER TABLE openphone_calls
  ADD COLUMN IF NOT EXISTS receiver_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS classified_as_outcome VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ai_key_points TEXT;

-- Add comments for documentation
COMMENT ON COLUMN openphone_calls.receiver_number IS 'Phone number that received the call';
COMMENT ON COLUMN openphone_calls.classified_as_outcome IS 'AI-classified outcome (e.g., Appointment Discussed, Not Interested)';
COMMENT ON COLUMN openphone_calls.pipeline_stage IS 'Sales pipeline stage (New, Follow-Up, Qualified, Closed-Lost)';
COMMENT ON COLUMN openphone_calls.sentiment IS 'Call sentiment (Positive, Neutral, Negative)';
COMMENT ON COLUMN openphone_calls.ai_summary IS 'AI-generated call summary from OpenPhone';
COMMENT ON COLUMN openphone_calls.ai_sentiment IS 'AI sentiment from OpenPhone summary';
COMMENT ON COLUMN openphone_calls.ai_key_points IS 'Key points extracted by AI';
