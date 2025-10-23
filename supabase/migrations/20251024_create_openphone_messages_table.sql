-- Create table for OpenPhone text messages (separate from calls)
-- This ensures message.received and message.delivered events don't pollute the openphone_calls table

CREATE TABLE IF NOT EXISTS openphone_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    direction VARCHAR(20), -- 'incoming', 'outgoing'
    content TEXT,
    media_url TEXT, -- For MMS attachments
    status VARCHAR(50), -- 'received', 'delivered', 'failed'
    created_at TIMESTAMP,
    pulled_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_openphone_messages_created_at ON openphone_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_openphone_messages_from_number ON openphone_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_openphone_messages_direction ON openphone_messages(direction);

-- Add comments for documentation
COMMENT ON TABLE openphone_messages IS 'Text messages from OpenPhone (SMS/MMS), separate from call records';
COMMENT ON COLUMN openphone_messages.message_id IS 'Unique message ID from OpenPhone';
COMMENT ON COLUMN openphone_messages.from_number IS 'Phone number that sent the message';
COMMENT ON COLUMN openphone_messages.to_number IS 'Phone number that received the message';
COMMENT ON COLUMN openphone_messages.direction IS 'Message direction: incoming or outgoing';
COMMENT ON COLUMN openphone_messages.content IS 'Text content of the message';
COMMENT ON COLUMN openphone_messages.media_url IS 'URL to MMS attachment if present';
COMMENT ON COLUMN openphone_messages.status IS 'Message status: received, delivered, failed';
