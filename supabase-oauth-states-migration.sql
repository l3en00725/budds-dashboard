-- Migration: Create oauth_states table for server-side state storage
-- This table stores OAuth state parameters server-side instead of relying on cookies
-- which can fail across different domains and in production environments

CREATE TABLE IF NOT EXISTS oauth_states (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  state_key varchar(64) NOT NULL UNIQUE,
  provider varchar(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '10 minutes'),
  user_agent text,
  ip_address inet
);

-- Index for efficient lookup by state_key
CREATE INDEX IF NOT EXISTS idx_oauth_states_state_key ON oauth_states(state_key);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- RLS Policy (assuming you want to allow service role access)
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all states
CREATE POLICY "Service role can manage oauth states" ON oauth_states
  FOR ALL USING (auth.role() = 'service_role');

-- Function to cleanup expired states (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM oauth_states WHERE expires_at < now();
$$;

-- Optional: Create a trigger to automatically cleanup expired states
-- Note: This could impact performance, so consider running cleanup_expired_oauth_states() periodically instead
-- CREATE OR REPLACE FUNCTION trigger_cleanup_expired_states()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   DELETE FROM oauth_states WHERE expires_at < now() - interval '1 hour';
--   RETURN NULL;
-- END;
-- $$;
--
-- CREATE TRIGGER cleanup_expired_states_trigger
--   AFTER INSERT ON oauth_states
--   EXECUTE FUNCTION trigger_cleanup_expired_states();