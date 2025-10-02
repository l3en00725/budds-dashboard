-- Add line items table for accurate membership tracking
CREATE TABLE IF NOT EXISTS jobber_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_item_id TEXT NOT NULL UNIQUE,
  job_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  pulled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (job_id) REFERENCES jobber_jobs(job_id)
);

-- Create index for faster membership queries
CREATE INDEX IF NOT EXISTS idx_jobber_line_items_name ON jobber_line_items(name);
CREATE INDEX IF NOT EXISTS idx_jobber_line_items_description ON jobber_line_items(description);
CREATE INDEX IF NOT EXISTS idx_jobber_line_items_job_id ON jobber_line_items(job_id);