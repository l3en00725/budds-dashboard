-- Daily Revenue Tracking and Analytics Schema
-- Migration: 20251006_001_daily_revenue_tracking.sql

-- Daily Revenue Summary Table (Materialized for Performance)
CREATE TABLE daily_revenue_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    revenue_date DATE NOT NULL,

    -- Invoiced Revenue (from jobber_invoices)
    invoiced_amount DECIMAL(12,2) DEFAULT 0,
    invoiced_count INTEGER DEFAULT 0,

    -- Collected Revenue (from jobber_payments)
    collected_amount DECIMAL(12,2) DEFAULT 0,
    collected_count INTEGER DEFAULT 0,

    -- Outstanding AR
    outstanding_amount DECIMAL(12,2) DEFAULT 0,
    outstanding_count INTEGER DEFAULT 0,

    -- Data sources included
    includes_jobber BOOLEAN DEFAULT TRUE,
    includes_quickbooks BOOLEAN DEFAULT FALSE,

    -- Metadata
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per date
    UNIQUE(revenue_date)
);

-- Revenue Source Detail Table (for drill-down analysis)
CREATE TABLE daily_revenue_detail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    revenue_date DATE NOT NULL,
    source_type VARCHAR(20) NOT NULL, -- 'invoice', 'payment'
    source_system VARCHAR(20) NOT NULL, -- 'jobber', 'quickbooks'

    -- Source record references
    source_record_id VARCHAR(255) NOT NULL,
    client_id VARCHAR(255),
    client_name VARCHAR(255),

    -- Amounts
    amount DECIMAL(10,2) NOT NULL,

    -- Additional context
    payment_method VARCHAR(100), -- for payments
    invoice_status VARCHAR(50), -- for invoices
    job_id VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Index for fast aggregation
    INDEX idx_daily_revenue_detail_date_type (revenue_date, source_type),
    INDEX idx_daily_revenue_detail_source (source_system, source_record_id)
);

-- Month-over-Month Revenue Comparison View
CREATE VIEW monthly_revenue_comparison AS
WITH monthly_totals AS (
    SELECT
        DATE_TRUNC('month', revenue_date) as month_start,
        EXTRACT(YEAR FROM revenue_date) as year,
        EXTRACT(MONTH FROM revenue_date) as month,
        SUM(invoiced_amount) as monthly_invoiced,
        SUM(collected_amount) as monthly_collected,
        SUM(outstanding_amount) as monthly_outstanding_end,
        COUNT(*) as days_with_data
    FROM daily_revenue_summary
    GROUP BY DATE_TRUNC('month', revenue_date)
),
with_previous AS (
    SELECT *,
        LAG(monthly_invoiced, 1) OVER (ORDER BY month_start) as prev_month_invoiced,
        LAG(monthly_collected, 1) OVER (ORDER BY month_start) as prev_month_collected,
        LAG(monthly_outstanding_end, 1) OVER (ORDER BY month_start) as prev_month_outstanding
    FROM monthly_totals
)
SELECT
    month_start,
    year,
    month,
    monthly_invoiced,
    monthly_collected,
    monthly_outstanding_end,
    prev_month_invoiced,
    prev_month_collected,
    prev_month_outstanding,

    -- Calculate percentage changes
    CASE
        WHEN prev_month_invoiced > 0 THEN
            ROUND(((monthly_invoiced - prev_month_invoiced) / prev_month_invoiced * 100), 2)
        ELSE NULL
    END as invoiced_change_percent,

    CASE
        WHEN prev_month_collected > 0 THEN
            ROUND(((monthly_collected - prev_month_collected) / prev_month_collected * 100), 2)
        ELSE NULL
    END as collected_change_percent,

    -- Calculate absolute changes
    (monthly_invoiced - COALESCE(prev_month_invoiced, 0)) as invoiced_change_amount,
    (monthly_collected - COALESCE(prev_month_collected, 0)) as collected_change_amount,

    days_with_data
FROM with_previous
ORDER BY month_start DESC;

-- Year-over-Year Revenue Comparison View
CREATE VIEW yearly_revenue_comparison AS
WITH yearly_totals AS (
    SELECT
        EXTRACT(YEAR FROM revenue_date) as year,
        SUM(invoiced_amount) as yearly_invoiced,
        SUM(collected_amount) as yearly_collected,
        AVG(outstanding_amount) as avg_outstanding,
        COUNT(DISTINCT revenue_date) as days_with_data
    FROM daily_revenue_summary
    GROUP BY EXTRACT(YEAR FROM revenue_date)
),
with_previous AS (
    SELECT *,
        LAG(yearly_invoiced, 1) OVER (ORDER BY year) as prev_year_invoiced,
        LAG(yearly_collected, 1) OVER (ORDER BY year) as prev_year_collected
    FROM yearly_totals
)
SELECT
    year,
    yearly_invoiced,
    yearly_collected,
    avg_outstanding,
    prev_year_invoiced,
    prev_year_collected,

    -- Calculate percentage changes
    CASE
        WHEN prev_year_invoiced > 0 THEN
            ROUND(((yearly_invoiced - prev_year_invoiced) / prev_year_invoiced * 100), 2)
        ELSE NULL
    END as invoiced_yoy_change_percent,

    CASE
        WHEN prev_year_collected > 0 THEN
            ROUND(((yearly_collected - prev_year_collected) / prev_year_collected * 100), 2)
        ELSE NULL
    END as collected_yoy_change_percent,

    -- Calculate absolute changes
    (yearly_invoiced - COALESCE(prev_year_invoiced, 0)) as invoiced_yoy_change_amount,
    (yearly_collected - COALESCE(prev_year_collected, 0)) as collected_yoy_change_amount,

    days_with_data
FROM with_previous
ORDER BY year DESC;

-- Daily Revenue Trending View (Last 90 days with moving averages)
CREATE VIEW daily_revenue_trending AS
WITH daily_data AS (
    SELECT
        revenue_date,
        invoiced_amount,
        collected_amount,
        outstanding_amount,

        -- 7-day moving averages
        AVG(invoiced_amount) OVER (
            ORDER BY revenue_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as invoiced_7day_avg,

        AVG(collected_amount) OVER (
            ORDER BY revenue_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as collected_7day_avg,

        -- 30-day moving averages
        AVG(invoiced_amount) OVER (
            ORDER BY revenue_date
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) as invoiced_30day_avg,

        AVG(collected_amount) OVER (
            ORDER BY revenue_date
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) as collected_30day_avg,

        -- Day-over-day changes
        LAG(invoiced_amount, 1) OVER (ORDER BY revenue_date) as prev_day_invoiced,
        LAG(collected_amount, 1) OVER (ORDER BY revenue_date) as prev_day_collected

    FROM daily_revenue_summary
    WHERE revenue_date >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
    revenue_date,
    invoiced_amount,
    collected_amount,
    outstanding_amount,

    -- Moving averages
    ROUND(invoiced_7day_avg, 2) as invoiced_7day_avg,
    ROUND(collected_7day_avg, 2) as collected_7day_avg,
    ROUND(invoiced_30day_avg, 2) as invoiced_30day_avg,
    ROUND(collected_30day_avg, 2) as collected_30day_avg,

    -- Day-over-day changes
    ROUND((invoiced_amount - COALESCE(prev_day_invoiced, 0)), 2) as invoiced_daily_change,
    ROUND((collected_amount - COALESCE(prev_day_collected, 0)), 2) as collected_daily_change,

    -- Performance vs averages
    CASE
        WHEN invoiced_7day_avg > 0 THEN
            ROUND(((invoiced_amount / invoiced_7day_avg - 1) * 100), 2)
        ELSE NULL
    END as invoiced_vs_7day_percent,

    CASE
        WHEN collected_7day_avg > 0 THEN
            ROUND(((collected_amount / collected_7day_avg - 1) * 100), 2)
        ELSE NULL
    END as collected_vs_7day_percent

FROM daily_data
ORDER BY revenue_date DESC;

-- Performance Indexes for Daily Revenue Tables
CREATE INDEX idx_daily_revenue_summary_date ON daily_revenue_summary(revenue_date);
CREATE INDEX idx_daily_revenue_summary_date_desc ON daily_revenue_summary(revenue_date DESC);
CREATE INDEX idx_daily_revenue_summary_calculated_at ON daily_revenue_summary(last_calculated_at);

CREATE INDEX idx_daily_revenue_detail_date_type ON daily_revenue_detail(revenue_date, source_type);
CREATE INDEX idx_daily_revenue_detail_source ON daily_revenue_detail(source_system, source_record_id);
CREATE INDEX idx_daily_revenue_detail_client ON daily_revenue_detail(client_id);
CREATE INDEX idx_daily_revenue_detail_amount ON daily_revenue_detail(amount);

-- Auto-update trigger for daily_revenue_summary
CREATE OR REPLACE FUNCTION update_daily_revenue_summary_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_revenue_summary_updated_at
    BEFORE UPDATE ON daily_revenue_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_revenue_summary_timestamp();

-- Grant permissions following existing patterns
ALTER TABLE daily_revenue_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_revenue_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to daily_revenue_summary" ON daily_revenue_summary
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to daily_revenue_detail" ON daily_revenue_detail
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read revenue data
CREATE POLICY "Authenticated users can read daily_revenue_summary" ON daily_revenue_summary
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read daily_revenue_detail" ON daily_revenue_detail
    FOR SELECT USING (auth.role() = 'authenticated');