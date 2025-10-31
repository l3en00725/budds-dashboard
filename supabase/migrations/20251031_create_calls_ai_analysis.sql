-- Create calls_ai_analysis table for refined AI categorization
-- This separates category, intent, and sentiment for better accuracy

CREATE TABLE IF NOT EXISTS calls_ai_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Core categorization fields
    category VARCHAR(50) NOT NULL, -- Plumbing, HVAC, Drain, Financing, Membership, Other
    intent VARCHAR(50) NOT NULL, -- Booking, Estimate, Emergency, Inquiry, Complaint
    sentiment VARCHAR(20) NOT NULL, -- Positive, Neutral, Negative
    
    -- Detailed service information
    service_detail VARCHAR(200), -- Specific service mentioned (e.g., "Water Heater Repair", "Drain Cleaning")
    customer_need TEXT, -- What the customer specifically needs
    
    -- Quality metrics
    confidence DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
    needs_review BOOLEAN DEFAULT FALSE, -- Flag for manual review if confidence < 0.6
    
    -- Analysis metadata
    analyzed_at TIMESTAMP DEFAULT NOW(),
    analysis_version VARCHAR(10) DEFAULT 'v1.0', -- Track prompt version
    model_used VARCHAR(50), -- e.g., 'claude-3.5-sonnet'
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key to openphone_calls
    CONSTRAINT fk_call_id FOREIGN KEY (call_id) 
        REFERENCES openphone_calls(call_id) 
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_calls_ai_analysis_call_id ON calls_ai_analysis(call_id);
CREATE INDEX idx_calls_ai_analysis_category ON calls_ai_analysis(category);
CREATE INDEX idx_calls_ai_analysis_intent ON calls_ai_analysis(intent);
CREATE INDEX idx_calls_ai_analysis_needs_review ON calls_ai_analysis(needs_review);
CREATE INDEX idx_calls_ai_analysis_confidence ON calls_ai_analysis(confidence);
CREATE INDEX idx_calls_ai_analysis_analyzed_at ON calls_ai_analysis(analyzed_at);

-- Enable RLS
ALTER TABLE calls_ai_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow service role full access
CREATE POLICY "Service role has full access to calls_ai_analysis"
    ON calls_ai_analysis
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read calls_ai_analysis"
    ON calls_ai_analysis
    FOR SELECT
    TO authenticated
    USING (true);

-- Comments for documentation
COMMENT ON TABLE calls_ai_analysis IS 'AI-powered call categorization with category, intent, and sentiment separation';
COMMENT ON COLUMN calls_ai_analysis.category IS 'Primary service category: Plumbing, HVAC, Drain, Financing, Membership, Other';
COMMENT ON COLUMN calls_ai_analysis.intent IS 'Call intent: Booking, Estimate, Emergency, Inquiry, Complaint';
COMMENT ON COLUMN calls_ai_analysis.sentiment IS 'Customer sentiment: Positive, Neutral, Negative';
COMMENT ON COLUMN calls_ai_analysis.service_detail IS 'Specific service mentioned (e.g., Water Heater Repair, AC Installation)';
COMMENT ON COLUMN calls_ai_analysis.needs_review IS 'TRUE if confidence < 0.6, requires manual review';
COMMENT ON COLUMN calls_ai_analysis.analysis_version IS 'Prompt version used for analysis';

