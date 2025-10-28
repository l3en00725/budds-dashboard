-- Add client contact fields to jobber_jobs table for pipeline matching

ALTER TABLE jobber_jobs
  ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_email VARCHAR(255);

-- Add indexes for phone number matching
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_client_phone
  ON jobber_jobs(client_phone);

CREATE INDEX IF NOT EXISTS idx_jobber_jobs_client_email
  ON jobber_jobs(client_email);

-- Add comments
COMMENT ON COLUMN jobber_jobs.client_phone IS 'Primary phone number from Jobber client record';
COMMENT ON COLUMN jobber_jobs.client_email IS 'Primary email from Jobber client record';
