-- Supabase Database Schema for Plumbing & HVAC Dashboard
-- Tables to store data from Jobber, QuickBooks, and OpenPhone APIs

-- Enable UUID extension (gen_random_uuid is built-in to Supabase)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobber Jobs Table
CREATE TABLE jobber_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    job_number VARCHAR(100),
    title VARCHAR(500),
    description TEXT,
    status VARCHAR(50),
    invoiced BOOLEAN DEFAULT FALSE,
    revenue DECIMAL(10,2),
    client_id VARCHAR(255),
    client_name VARCHAR(255),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at_jobber TIMESTAMP,
    pulled_at TIMESTAMP DEFAULT NOW()
);

-- Jobber Quotes Table
CREATE TABLE jobber_quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id VARCHAR(255) UNIQUE NOT NULL,
    quote_number VARCHAR(100),
    client_id VARCHAR(255),
    client_name VARCHAR(255),
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    status VARCHAR(50),
    amount DECIMAL(10,2),
    created_at_jobber TIMESTAMP,
    expires_at TIMESTAMP,
    pulled_at TIMESTAMP DEFAULT NOW()
);

-- Jobber Invoices Table
CREATE TABLE jobber_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id VARCHAR(255) UNIQUE NOT NULL,
    invoice_number VARCHAR(100),
    client_id VARCHAR(255),
    client_name VARCHAR(255),
    job_id VARCHAR(255),
    status VARCHAR(50), -- 'draft', 'sent', 'viewed', 'approved', 'paid', 'bad_debt'
    amount DECIMAL(10,2),
    balance DECIMAL(10,2),
    issue_date DATE,
    due_date DATE,
    created_at_jobber TIMESTAMP,
    pulled_at TIMESTAMP DEFAULT NOW()
);

-- Jobber Payments Table
CREATE TABLE jobber_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    customer VARCHAR(255),
    client_id VARCHAR(255),
    invoice_id VARCHAR(255),
    amount DECIMAL(10,2),
    payment_date DATE,
    payment_method VARCHAR(100),
    created_at_jobber TIMESTAMP,
    pulled_at TIMESTAMP DEFAULT NOW()
);

-- QuickBooks Tokens Table (for OAuth management)
CREATE TABLE quickbooks_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    realm_id VARCHAR(255) UNIQUE NOT NULL, -- QuickBooks company ID
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- QuickBooks Revenue Table
CREATE TABLE quickbooks_revenue_ytd (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER,
    ytd_revenue DECIMAL(12,2),
    ttm_revenue DECIMAL(12,2), -- Trailing 12 months
    ttm_revenue_last_year DECIMAL(12,2),
    pulled_at TIMESTAMP DEFAULT NOW()
);

-- OpenPhone Calls Table (for future implementation)
CREATE TABLE openphone_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    caller_number VARCHAR(50),
    direction VARCHAR(20), -- 'inbound', 'outbound'
    duration INTEGER, -- in seconds
    transcript TEXT,
    classified_as_booked BOOLEAN,
    classification_confidence DECIMAL(3,2), -- 0.00 to 1.00
    call_date TIMESTAMP,
    pulled_at TIMESTAMP DEFAULT NOW()
);

-- Dashboard Targets Table (for goal tracking)
CREATE TABLE dashboard_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_type VARCHAR(50), -- 'daily_revenue', 'weekly_payments', 'booked_call_percentage'
    target_value DECIMAL(10,2),
    period VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'yearly'
    year INTEGER,
    month INTEGER,
    week INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync Log Table (to track API sync status)
CREATE TABLE sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_type VARCHAR(50), -- 'jobber_jobs', 'jobber_quotes', 'jobber_invoices', 'jobber_payments', 'quickbooks_revenue'
    status VARCHAR(20), -- 'success', 'error', 'running'
    records_synced INTEGER,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobber_jobs_status ON jobber_jobs(status);
CREATE INDEX idx_jobber_jobs_pulled_at ON jobber_jobs(pulled_at);
CREATE INDEX idx_jobber_quotes_status ON jobber_quotes(status);
CREATE INDEX idx_jobber_quotes_pulled_at ON jobber_quotes(pulled_at);
CREATE INDEX idx_jobber_invoices_status ON jobber_invoices(status);
CREATE INDEX idx_jobber_invoices_pulled_at ON jobber_invoices(pulled_at);
CREATE INDEX idx_jobber_payments_payment_date ON jobber_payments(payment_date);
CREATE INDEX idx_jobber_payments_pulled_at ON jobber_payments(pulled_at);
CREATE INDEX idx_openphone_calls_call_date ON openphone_calls(call_date);
CREATE INDEX idx_sync_log_sync_type_created_at ON sync_log(sync_type, created_at);

-- Insert default targets (you can modify these values)
INSERT INTO dashboard_targets (target_type, target_value, period, year) VALUES
('daily_revenue', 2000.00, 'daily', EXTRACT(YEAR FROM NOW())),
('weekly_payments', 10000.00, 'weekly', EXTRACT(YEAR FROM NOW())),
('booked_call_percentage', 70.00, 'daily', EXTRACT(YEAR FROM NOW()));

-- RLS (Row Level Security) policies can be added here if needed
-- ALTER TABLE jobber_jobs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own data" ON jobber_jobs FOR SELECT USING (auth.uid() = user_id);