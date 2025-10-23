-- Add enhanced AI classification fields to openphone_calls

-- Check and add ai_confidence if not exists (0-1 float for confidence score)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'openphone_calls' AND column_name = 'ai_confidence'
  ) THEN
    ALTER TABLE openphone_calls ADD COLUMN ai_confidence DECIMAL(3,2);
  END IF;
END $$;

-- Rename classification_confidence to ai_confidence if it exists and ai_confidence doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'openphone_calls' AND column_name = 'classification_confidence'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'openphone_calls' AND column_name = 'ai_confidence'
  ) THEN
    ALTER TABLE openphone_calls RENAME COLUMN classification_confidence TO ai_confidence;
  END IF;
END $$;

-- Add service_type if not exists
ALTER TABLE openphone_calls
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(50);

-- Add is_emergency if not exists
ALTER TABLE openphone_calls
  ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE;

-- Add notes column for additional context if not exists
ALTER TABLE openphone_calls
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update ai_summary if it doesn't exist (already should exist from previous migration)
-- This is just to ensure consistency

-- Add comments for documentation
COMMENT ON COLUMN openphone_calls.ai_confidence IS 'AI confidence score (0-1 decimal)';
COMMENT ON COLUMN openphone_calls.service_type IS 'Type of service requested (Plumbing, HVAC, Drain, Water Heater, etc.)';
COMMENT ON COLUMN openphone_calls.is_emergency IS 'Whether call was classified as an emergency';
COMMENT ON COLUMN openphone_calls.notes IS 'Additional context or important details from the call';
