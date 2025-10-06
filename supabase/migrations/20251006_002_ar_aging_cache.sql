-- AR Aging Cache and Analytics Schema
-- Migration: 20251006_002_ar_aging_cache.sql

-- AR Aging Cache Table for Performance
CREATE TABLE ar_aging_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date DATE NOT NULL,

    -- Invoice details
    invoice_id VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100),
    client_id VARCHAR(255),
    client_name VARCHAR(255),

    -- Amounts
    invoice_amount DECIMAL(10,2) NOT NULL,
    balance_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,

    -- Dates
    issue_date DATE,
    due_date DATE,
    days_outstanding INTEGER,

    -- Aging buckets
    aging_bucket VARCHAR(20) NOT NULL, -- 'current', '1-30', '31-60', '61-90', '90+'
    aging_bucket_order INTEGER NOT NULL, -- 1, 2, 3, 4, 5 for sorting

    -- Status tracking
    invoice_status VARCHAR(50),
    is_overdue BOOLEAN DEFAULT FALSE,

    -- Source system
    source_system VARCHAR(20) DEFAULT 'jobber',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Composite index for efficient queries
    INDEX idx_ar_aging_cache_snapshot_bucket (snapshot_date, aging_bucket),
    INDEX idx_ar_aging_cache_client (client_id, snapshot_date),
    INDEX idx_ar_aging_cache_days (days_outstanding, snapshot_date)
);

-- AR Aging Summary Table (Daily snapshots)
CREATE TABLE ar_aging_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date DATE NOT NULL,

    -- Aging bucket totals
    current_amount DECIMAL(12,2) DEFAULT 0,
    current_count INTEGER DEFAULT 0,

    days_1_30_amount DECIMAL(12,2) DEFAULT 0,
    days_1_30_count INTEGER DEFAULT 0,

    days_31_60_amount DECIMAL(12,2) DEFAULT 0,
    days_31_60_count INTEGER DEFAULT 0,

    days_61_90_amount DECIMAL(12,2) DEFAULT 0,
    days_61_90_count INTEGER DEFAULT 0,

    days_90_plus_amount DECIMAL(12,2) DEFAULT 0,
    days_90_plus_count INTEGER DEFAULT 0,

    -- Totals
    total_outstanding DECIMAL(12,2) DEFAULT 0,
    total_invoices INTEGER DEFAULT 0,

    -- Key metrics
    average_days_outstanding DECIMAL(5,2) DEFAULT 0,
    percent_current DECIMAL(5,2) DEFAULT 0,
    percent_overdue DECIMAL(5,2) DEFAULT 0,

    -- Data quality
    data_source VARCHAR(20) DEFAULT 'jobber',
    calculation_method VARCHAR(50) DEFAULT 'invoice_due_date',

    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One summary per date
    UNIQUE(snapshot_date)
);

-- AR Aging Trend View (for dashboard trending)
CREATE VIEW ar_aging_trend AS
WITH daily_trends AS (
    SELECT
        snapshot_date,
        total_outstanding,
        percent_current,
        percent_overdue,
        average_days_outstanding,

        -- Week-over-week changes
        LAG(total_outstanding, 7) OVER (ORDER BY snapshot_date) as total_outstanding_week_ago,
        LAG(percent_current, 7) OVER (ORDER BY snapshot_date) as percent_current_week_ago,

        -- Month-over-month changes
        LAG(total_outstanding, 30) OVER (ORDER BY snapshot_date) as total_outstanding_month_ago,
        LAG(percent_current, 30) OVER (ORDER BY snapshot_date) as percent_current_month_ago,

        -- 7-day moving averages
        AVG(total_outstanding) OVER (
            ORDER BY snapshot_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as total_outstanding_7day_avg,

        AVG(percent_current) OVER (
            ORDER BY snapshot_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as percent_current_7day_avg

    FROM ar_aging_summary
    WHERE snapshot_date >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT
    snapshot_date,
    total_outstanding,
    percent_current,
    percent_overdue,
    average_days_outstanding,

    -- Moving averages
    ROUND(total_outstanding_7day_avg, 2) as total_outstanding_7day_avg,
    ROUND(percent_current_7day_avg, 2) as percent_current_7day_avg,

    -- Week-over-week changes
    ROUND((total_outstanding - COALESCE(total_outstanding_week_ago, 0)), 2) as total_outstanding_wow_change,
    ROUND((percent_current - COALESCE(percent_current_week_ago, 0)), 2) as percent_current_wow_change,

    -- Month-over-month changes
    ROUND((total_outstanding - COALESCE(total_outstanding_month_ago, 0)), 2) as total_outstanding_mom_change,
    ROUND((percent_current - COALESCE(percent_current_month_ago, 0)), 2) as percent_current_mom_change,

    -- Percentage changes
    CASE
        WHEN total_outstanding_week_ago > 0 THEN
            ROUND(((total_outstanding - total_outstanding_week_ago) / total_outstanding_week_ago * 100), 2)
        ELSE NULL
    END as total_outstanding_wow_percent,

    CASE
        WHEN total_outstanding_month_ago > 0 THEN
            ROUND(((total_outstanding - total_outstanding_month_ago) / total_outstanding_month_ago * 100), 2)
        ELSE NULL
    END as total_outstanding_mom_percent

FROM daily_trends
ORDER BY snapshot_date DESC;

-- Current AR Aging Buckets View (for real-time dashboard)
CREATE VIEW current_ar_aging AS
SELECT
    aging_bucket,
    aging_bucket_order,
    SUM(balance_due) as total_amount,
    COUNT(*) as invoice_count,
    AVG(days_outstanding) as avg_days_outstanding,
    MIN(days_outstanding) as min_days_outstanding,
    MAX(days_outstanding) as max_days_outstanding,

    -- Calculate percentages of total
    ROUND(
        (SUM(balance_due) / NULLIF(
            (SELECT SUM(balance_due) FROM ar_aging_cache WHERE snapshot_date = CURRENT_DATE), 0
        ) * 100), 2
    ) as percent_of_total

FROM ar_aging_cache
WHERE snapshot_date = CURRENT_DATE
GROUP BY aging_bucket, aging_bucket_order
ORDER BY aging_bucket_order;

-- Top Overdue Customers View
CREATE VIEW top_overdue_customers AS
SELECT
    client_id,
    client_name,
    COUNT(*) as overdue_invoice_count,
    SUM(balance_due) as total_overdue_amount,
    AVG(days_outstanding) as avg_days_outstanding,
    MAX(days_outstanding) as max_days_outstanding,
    MIN(issue_date) as oldest_invoice_date,
    MAX(due_date) as latest_due_date

FROM ar_aging_cache
WHERE snapshot_date = CURRENT_DATE
  AND is_overdue = TRUE
  AND balance_due > 0
GROUP BY client_id, client_name
ORDER BY total_overdue_amount DESC;

-- Performance Indexes for AR Tables
CREATE INDEX idx_ar_aging_cache_snapshot_date ON ar_aging_cache(snapshot_date);
CREATE INDEX idx_ar_aging_cache_snapshot_bucket ON ar_aging_cache(snapshot_date, aging_bucket);
CREATE INDEX idx_ar_aging_cache_client_snapshot ON ar_aging_cache(client_id, snapshot_date);
CREATE INDEX idx_ar_aging_cache_days_outstanding ON ar_aging_cache(days_outstanding);
CREATE INDEX idx_ar_aging_cache_balance_due ON ar_aging_cache(balance_due);
CREATE INDEX idx_ar_aging_cache_overdue ON ar_aging_cache(is_overdue, snapshot_date);

CREATE INDEX idx_ar_aging_summary_snapshot_date ON ar_aging_summary(snapshot_date);
CREATE INDEX idx_ar_aging_summary_date_desc ON ar_aging_summary(snapshot_date DESC);

-- Function to calculate aging bucket from days outstanding
CREATE OR REPLACE FUNCTION get_aging_bucket(days_outstanding INTEGER)
RETURNS TABLE(bucket VARCHAR(20), bucket_order INTEGER) AS $$
BEGIN
    IF days_outstanding < 0 THEN
        RETURN QUERY SELECT 'current'::VARCHAR(20), 1::INTEGER;
    ELSIF days_outstanding <= 30 THEN
        RETURN QUERY SELECT '1-30'::VARCHAR(20), 2::INTEGER;
    ELSIF days_outstanding <= 60 THEN
        RETURN QUERY SELECT '31-60'::VARCHAR(20), 3::INTEGER;
    ELSIF days_outstanding <= 90 THEN
        RETURN QUERY SELECT '61-90'::VARCHAR(20), 4::INTEGER;
    ELSE
        RETURN QUERY SELECT '90+'::VARCHAR(20), 5::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to refresh AR aging cache for a specific date
CREATE OR REPLACE FUNCTION refresh_ar_aging_cache(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    records_processed INTEGER := 0;
BEGIN
    -- Clear existing data for the target date
    DELETE FROM ar_aging_cache WHERE snapshot_date = target_date;

    -- Insert fresh AR aging data
    INSERT INTO ar_aging_cache (
        snapshot_date,
        invoice_id,
        invoice_number,
        client_id,
        client_name,
        invoice_amount,
        balance_due,
        amount_paid,
        issue_date,
        due_date,
        days_outstanding,
        aging_bucket,
        aging_bucket_order,
        invoice_status,
        is_overdue,
        source_system
    )
    SELECT
        target_date,
        ji.invoice_id,
        ji.invoice_number,
        ji.client_id,
        ji.client_name,
        ji.amount,
        ji.balance,
        (ji.amount - ji.balance) as amount_paid,
        ji.issue_date,
        ji.due_date,
        (target_date - ji.due_date)::INTEGER as days_outstanding,
        aging.bucket,
        aging.bucket_order,
        ji.status,
        (target_date > ji.due_date AND ji.balance > 0) as is_overdue,
        'jobber'
    FROM jobber_invoices ji
    CROSS JOIN LATERAL get_aging_bucket((target_date - ji.due_date)::INTEGER) as aging
    WHERE ji.balance > 0
      AND ji.status NOT IN ('paid', 'bad_debt');

    GET DIAGNOSTICS records_processed = ROW_COUNT;

    -- Update summary table
    INSERT INTO ar_aging_summary (
        snapshot_date,
        current_amount, current_count,
        days_1_30_amount, days_1_30_count,
        days_31_60_amount, days_31_60_count,
        days_61_90_amount, days_61_90_count,
        days_90_plus_amount, days_90_plus_count,
        total_outstanding, total_invoices,
        average_days_outstanding,
        percent_current, percent_overdue
    )
    SELECT
        target_date,
        COALESCE(SUM(CASE WHEN aging_bucket = 'current' THEN balance_due END), 0),
        COALESCE(COUNT(CASE WHEN aging_bucket = 'current' THEN 1 END), 0),
        COALESCE(SUM(CASE WHEN aging_bucket = '1-30' THEN balance_due END), 0),
        COALESCE(COUNT(CASE WHEN aging_bucket = '1-30' THEN 1 END), 0),
        COALESCE(SUM(CASE WHEN aging_bucket = '31-60' THEN balance_due END), 0),
        COALESCE(COUNT(CASE WHEN aging_bucket = '31-60' THEN 1 END), 0),
        COALESCE(SUM(CASE WHEN aging_bucket = '61-90' THEN balance_due END), 0),
        COALESCE(COUNT(CASE WHEN aging_bucket = '61-90' THEN 1 END), 0),
        COALESCE(SUM(CASE WHEN aging_bucket = '90+' THEN balance_due END), 0),
        COALESCE(COUNT(CASE WHEN aging_bucket = '90+' THEN 1 END), 0),
        SUM(balance_due),
        COUNT(*),
        AVG(days_outstanding),
        ROUND(
            (COALESCE(SUM(CASE WHEN aging_bucket = 'current' THEN balance_due END), 0) /
             NULLIF(SUM(balance_due), 0) * 100), 2
        ),
        ROUND(
            (COALESCE(SUM(CASE WHEN is_overdue THEN balance_due END), 0) /
             NULLIF(SUM(balance_due), 0) * 100), 2
        )
    FROM ar_aging_cache
    WHERE snapshot_date = target_date
    ON CONFLICT (snapshot_date) DO UPDATE SET
        current_amount = EXCLUDED.current_amount,
        current_count = EXCLUDED.current_count,
        days_1_30_amount = EXCLUDED.days_1_30_amount,
        days_1_30_count = EXCLUDED.days_1_30_count,
        days_31_60_amount = EXCLUDED.days_31_60_amount,
        days_31_60_count = EXCLUDED.days_31_60_count,
        days_61_90_amount = EXCLUDED.days_61_90_amount,
        days_61_90_count = EXCLUDED.days_61_90_count,
        days_90_plus_amount = EXCLUDED.days_90_plus_amount,
        days_90_plus_count = EXCLUDED.days_90_plus_count,
        total_outstanding = EXCLUDED.total_outstanding,
        total_invoices = EXCLUDED.total_invoices,
        average_days_outstanding = EXCLUDED.average_days_outstanding,
        percent_current = EXCLUDED.percent_current,
        percent_overdue = EXCLUDED.percent_overdue,
        calculated_at = NOW();

    RETURN records_processed;
END;
$$ LANGUAGE plpgsql;

-- Auto-update trigger for ar_aging_cache
CREATE OR REPLACE FUNCTION update_ar_aging_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ar_aging_cache_updated_at
    BEFORE UPDATE ON ar_aging_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_ar_aging_cache_timestamp();

-- Grant permissions following existing patterns
ALTER TABLE ar_aging_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ar_aging_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to ar_aging_cache" ON ar_aging_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ar_aging_summary" ON ar_aging_summary
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read ar_aging_cache" ON ar_aging_cache
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read ar_aging_summary" ON ar_aging_summary
    FOR SELECT USING (auth.role() = 'authenticated');