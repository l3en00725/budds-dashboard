-- Add booking validation fields to openphone_calls table
-- Phase 1 KPI Fix: Cross-reference AI booking classification with actual Jobber job creation

ALTER TABLE openphone_calls
  ADD COLUMN IF NOT EXISTS booking_validated BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS jobber_job_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS validation_checked_at TIMESTAMP;

-- Add index for validation queries
CREATE INDEX IF NOT EXISTS idx_openphone_calls_booking_validated
  ON openphone_calls(booking_validated);

CREATE INDEX IF NOT EXISTS idx_openphone_calls_jobber_job_id
  ON openphone_calls(jobber_job_id);

-- Add comments for documentation
COMMENT ON COLUMN openphone_calls.booking_validated IS 'TRUE if Jobber job was created within 48h of call, FALSE if not, NULL if not yet checked';
COMMENT ON COLUMN openphone_calls.jobber_job_id IS 'Reference to jobber_jobs.job_id if booking was confirmed in Jobber';
COMMENT ON COLUMN openphone_calls.validation_checked_at IS 'Timestamp when booking validation was last performed';
