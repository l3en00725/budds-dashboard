-- Create oauth_states table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_key TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state_key ON oauth_states(state_key);
CREATE INDEX IF NOT EXISTS idx_oauth_states_provider_expires ON oauth_states(provider, expires_at);

-- Clean up expired states automatically
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired states (if you have pg_cron extension)
-- SELECT cron.schedule('cleanup-oauth-states', '*/10 * * * *', 'SELECT cleanup_expired_oauth_states();');