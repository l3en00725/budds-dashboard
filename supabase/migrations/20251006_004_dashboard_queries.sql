-- Optimized Dashboard Queries and Functions
-- Migration: 20251006_004_dashboard_queries.sql

-- Dashboard Data Cache Table (for extremely fast dashboard loading)
CREATE TABLE dashboard_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key VARCHAR(100) NOT NULL UNIQUE,

    -- Cached data as JSONB for flexibility
    data JSONB NOT NULL,

    -- Cache metadata
    cache_type VARCHAR(50) NOT NULL, -- 'daily_metrics', 'monthly_trend', 'ar_summary', etc.
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Data freshness indicators
    source_data_updated_at TIMESTAMP WITH TIME ZONE,
    calculation_duration_ms INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_dashboard_cache_key (cache_key),
    INDEX idx_dashboard_cache_type_expires (cache_type, expires_at)
);

-- Create optimized views for real-time dashboard queries

-- Daily Dashboard Metrics (optimized for speed)
CREATE OR REPLACE VIEW dashboard_daily_metrics AS
SELECT
    -- Today's performance
    COALESCE(today.invoiced_amount, 0) as today_invoiced,
    COALESCE(today.collected_amount, 0) as today_collected,
    COALESCE(today.outstanding_amount, 0) as today_outstanding,

    -- Yesterday's performance for comparison
    COALESCE(yesterday.invoiced_amount, 0) as yesterday_invoiced,
    COALESCE(yesterday.collected_amount, 0) as yesterday_collected,

    -- Day-over-day changes
    COALESCE(today.invoiced_amount, 0) - COALESCE(yesterday.invoiced_amount, 0) as invoiced_daily_change,
    COALESCE(today.collected_amount, 0) - COALESCE(yesterday.collected_amount, 0) as collected_daily_change,

    -- Day-over-day percentage changes
    CASE
        WHEN COALESCE(yesterday.invoiced_amount, 0) > 0 THEN
            ROUND(((COALESCE(today.invoiced_amount, 0) - COALESCE(yesterday.invoiced_amount, 0)) / yesterday.invoiced_amount * 100), 2)
        ELSE NULL
    END as invoiced_daily_change_percent,

    CASE
        WHEN COALESCE(yesterday.collected_amount, 0) > 0 THEN
            ROUND(((COALESCE(today.collected_amount, 0) - COALESCE(yesterday.collected_amount, 0)) / yesterday.collected_amount * 100), 2)
        ELSE NULL
    END as collected_daily_change_percent,

    -- Target achievement
    dt.target_value as daily_target,
    CASE
        WHEN dt.target_value > 0 THEN
            ROUND((COALESCE(today.invoiced_amount, 0) / dt.target_value * 100), 1)
        ELSE 0
    END as target_achievement_percent,

    -- Data freshness
    today.last_calculated_at as data_updated_at

FROM (
    SELECT * FROM daily_revenue_summary WHERE revenue_date = CURRENT_DATE
) today
FULL OUTER JOIN (
    SELECT * FROM daily_revenue_summary WHERE revenue_date = CURRENT_DATE - INTERVAL '1 day'
) yesterday ON TRUE
LEFT JOIN (
    SELECT target_value
    FROM dashboard_targets
    WHERE target_type = 'daily_revenue'
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    LIMIT 1
) dt ON TRUE;

-- Weekly Dashboard Metrics
CREATE OR REPLACE VIEW dashboard_weekly_metrics AS
WITH week_data AS (
    SELECT
        DATE_TRUNC('week', revenue_date) as week_start,
        SUM(invoiced_amount) as week_invoiced,
        SUM(collected_amount) as week_collected,
        AVG(outstanding_amount) as week_avg_outstanding,
        COUNT(*) as days_in_week
    FROM daily_revenue_summary
    WHERE revenue_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
      AND revenue_date <= CURRENT_DATE
    GROUP BY DATE_TRUNC('week', revenue_date)
),
current_vs_previous AS (
    SELECT
        MAX(CASE WHEN week_start = DATE_TRUNC('week', CURRENT_DATE) THEN week_invoiced END) as current_week_invoiced,
        MAX(CASE WHEN week_start = DATE_TRUNC('week', CURRENT_DATE) THEN week_collected END) as current_week_collected,
        MAX(CASE WHEN week_start = DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week' THEN week_invoiced END) as previous_week_invoiced,
        MAX(CASE WHEN week_start = DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week' THEN week_collected END) as previous_week_collected
    FROM week_data
)
SELECT
    COALESCE(current_week_invoiced, 0) as current_week_invoiced,
    COALESCE(current_week_collected, 0) as current_week_collected,
    COALESCE(previous_week_invoiced, 0) as previous_week_invoiced,
    COALESCE(previous_week_collected, 0) as previous_week_collected,

    -- Week-over-week changes
    COALESCE(current_week_invoiced, 0) - COALESCE(previous_week_invoiced, 0) as invoiced_weekly_change,
    COALESCE(current_week_collected, 0) - COALESCE(previous_week_collected, 0) as collected_weekly_change,

    -- Week-over-week percentage changes
    CASE
        WHEN COALESCE(previous_week_invoiced, 0) > 0 THEN
            ROUND(((COALESCE(current_week_invoiced, 0) - COALESCE(previous_week_invoiced, 0)) / previous_week_invoiced * 100), 2)
        ELSE NULL
    END as invoiced_weekly_change_percent,

    CASE
        WHEN COALESCE(previous_week_collected, 0) > 0 THEN
            ROUND(((COALESCE(current_week_collected, 0) - COALESCE(previous_week_collected, 0)) / previous_week_collected * 100), 2)
        ELSE NULL
    END as collected_weekly_change_percent,

    -- Target achievement
    dt.target_value as weekly_target,
    CASE
        WHEN dt.target_value > 0 THEN
            ROUND((COALESCE(current_week_collected, 0) / dt.target_value * 100), 1)
        ELSE 0
    END as weekly_target_achievement_percent

FROM current_vs_previous
LEFT JOIN (
    SELECT target_value
    FROM dashboard_targets
    WHERE target_type = 'weekly_payments'
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    LIMIT 1
) dt ON TRUE;

-- Monthly Dashboard Metrics
CREATE OR REPLACE VIEW dashboard_monthly_metrics AS
WITH month_data AS (
    SELECT
        DATE_TRUNC('month', revenue_date) as month_start,
        SUM(invoiced_amount) as month_invoiced,
        SUM(collected_amount) as month_collected,
        AVG(outstanding_amount) as month_avg_outstanding,
        COUNT(*) as days_in_month
    FROM daily_revenue_summary
    WHERE revenue_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND revenue_date <= CURRENT_DATE
    GROUP BY DATE_TRUNC('month', revenue_date)
),
current_vs_previous AS (
    SELECT
        MAX(CASE WHEN month_start = DATE_TRUNC('month', CURRENT_DATE) THEN month_invoiced END) as current_month_invoiced,
        MAX(CASE WHEN month_start = DATE_TRUNC('month', CURRENT_DATE) THEN month_collected END) as current_month_collected,
        MAX(CASE WHEN month_start = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' THEN month_invoiced END) as previous_month_invoiced,
        MAX(CASE WHEN month_start = DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month' THEN month_collected END) as previous_month_collected
    FROM month_data
)
SELECT
    COALESCE(current_month_invoiced, 0) as current_month_invoiced,
    COALESCE(current_month_collected, 0) as current_month_collected,
    COALESCE(previous_month_invoiced, 0) as previous_month_invoiced,
    COALESCE(previous_month_collected, 0) as previous_month_collected,

    -- Month-over-month changes
    COALESCE(current_month_invoiced, 0) - COALESCE(previous_month_invoiced, 0) as invoiced_monthly_change,
    COALESCE(current_month_collected, 0) - COALESCE(previous_month_collected, 0) as collected_monthly_change,

    -- Month-over-month percentage changes
    CASE
        WHEN COALESCE(previous_month_invoiced, 0) > 0 THEN
            ROUND(((COALESCE(current_month_invoiced, 0) - COALESCE(previous_month_invoiced, 0)) / previous_month_invoiced * 100), 2)
        ELSE NULL
    END as invoiced_monthly_change_percent,

    CASE
        WHEN COALESCE(previous_month_collected, 0) > 0 THEN
            ROUND(((COALESCE(current_month_collected, 0) - COALESCE(previous_month_collected, 0)) / previous_month_collected * 100), 2)
        ELSE NULL
    END as collected_monthly_change_percent,

    -- Days remaining in month
    EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')) - EXTRACT(DAY FROM CURRENT_DATE) + 1 as days_remaining_in_month,

    -- Projected month-end revenue
    CASE
        WHEN EXTRACT(DAY FROM CURRENT_DATE) > 1 THEN
            ROUND(
                COALESCE(current_month_invoiced, 0) *
                EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')) /
                EXTRACT(DAY FROM CURRENT_DATE), 2
            )
        ELSE COALESCE(current_month_invoiced, 0)
    END as projected_month_end_invoiced

FROM current_vs_previous;

-- AR Dashboard Summary View
CREATE OR REPLACE VIEW dashboard_ar_summary AS
SELECT
    -- Current AR totals
    COALESCE(current_ar.total_outstanding, 0) as total_outstanding,
    COALESCE(current_ar.total_invoices, 0) as total_invoices,
    COALESCE(current_ar.average_days_outstanding, 0) as average_days_outstanding,
    COALESCE(current_ar.percent_current, 0) as percent_current,
    COALESCE(current_ar.percent_overdue, 0) as percent_overdue,

    -- Aging bucket details
    COALESCE(current_ar.current_amount, 0) as current_amount,
    COALESCE(current_ar.days_1_30_amount, 0) as days_1_30_amount,
    COALESCE(current_ar.days_31_60_amount, 0) as days_31_60_amount,
    COALESCE(current_ar.days_61_90_amount, 0) as days_61_90_amount,
    COALESCE(current_ar.days_90_plus_amount, 0) as days_90_plus_amount,

    -- Week-over-week comparison
    COALESCE(current_ar.total_outstanding, 0) - COALESCE(week_ago_ar.total_outstanding, 0) as total_outstanding_wow_change,

    CASE
        WHEN COALESCE(week_ago_ar.total_outstanding, 0) > 0 THEN
            ROUND(((COALESCE(current_ar.total_outstanding, 0) - COALESCE(week_ago_ar.total_outstanding, 0)) / week_ago_ar.total_outstanding * 100), 2)
        ELSE NULL
    END as total_outstanding_wow_change_percent,

    -- Data freshness
    current_ar.calculated_at as data_updated_at

FROM (
    SELECT * FROM ar_aging_summary WHERE snapshot_date = CURRENT_DATE
) current_ar
LEFT JOIN (
    SELECT * FROM ar_aging_summary WHERE snapshot_date = CURRENT_DATE - INTERVAL '7 days'
) week_ago_ar ON TRUE;

-- Top Metrics Summary View (for main dashboard cards)
CREATE OR REPLACE VIEW dashboard_top_metrics AS
SELECT
    -- Daily metrics
    dm.today_invoiced,
    dm.today_collected,
    dm.invoiced_daily_change_percent,
    dm.collected_daily_change_percent,
    dm.target_achievement_percent as daily_target_achievement,

    -- Weekly metrics
    wm.current_week_collected,
    wm.collected_weekly_change_percent,
    wm.weekly_target_achievement_percent,

    -- Monthly metrics
    mm.current_month_invoiced,
    mm.current_month_collected,
    mm.invoiced_monthly_change_percent,
    mm.collected_monthly_change_percent,
    mm.projected_month_end_invoiced,

    -- AR metrics
    ar.total_outstanding,
    ar.percent_current,
    ar.percent_overdue,
    ar.total_outstanding_wow_change_percent,

    -- Data freshness (use the most recent)
    GREATEST(
        COALESCE(dm.data_updated_at, '1970-01-01'::timestamp),
        COALESCE(ar.data_updated_at, '1970-01-01'::timestamp)
    ) as data_updated_at

FROM dashboard_daily_metrics dm
CROSS JOIN dashboard_weekly_metrics wm
CROSS JOIN dashboard_monthly_metrics mm
CROSS JOIN dashboard_ar_summary ar;

-- Function to cache dashboard data for performance
CREATE OR REPLACE FUNCTION cache_dashboard_data(cache_duration_minutes INTEGER DEFAULT 5)
RETURNS VOID AS $$
DECLARE
    cache_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    cache_expiry := NOW() + (cache_duration_minutes || ' minutes')::INTERVAL;

    -- Cache top metrics
    INSERT INTO dashboard_cache (cache_key, data, cache_type, expires_at)
    SELECT
        'top_metrics',
        row_to_json(metrics)::JSONB,
        'dashboard_summary',
        cache_expiry
    FROM (SELECT * FROM dashboard_top_metrics) metrics
    ON CONFLICT (cache_key) DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();

    -- Cache daily trend data (last 30 days)
    INSERT INTO dashboard_cache (cache_key, data, cache_type, expires_at)
    SELECT
        'daily_trend_30d',
        json_agg(
            json_build_object(
                'date', revenue_date,
                'invoiced', invoiced_amount,
                'collected', collected_amount,
                'outstanding', outstanding_amount
            ) ORDER BY revenue_date
        )::JSONB,
        'daily_trend',
        cache_expiry
    FROM daily_revenue_summary
    WHERE revenue_date >= CURRENT_DATE - INTERVAL '30 days'
    ON CONFLICT (cache_key) DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();

    -- Cache AR aging distribution
    INSERT INTO dashboard_cache (cache_key, data, cache_type, expires_at)
    SELECT
        'ar_aging_current',
        json_agg(
            json_build_object(
                'bucket', aging_bucket,
                'amount', total_amount,
                'count', invoice_count,
                'percent', percent_of_total
            ) ORDER BY aging_bucket_order
        )::JSONB,
        'ar_aging',
        cache_expiry
    FROM current_ar_aging
    ON CONFLICT (cache_key) DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();

    -- Cache monthly comparison data
    INSERT INTO dashboard_cache (cache_key, data, cache_type, expires_at)
    SELECT
        'monthly_comparison_12m',
        json_agg(
            json_build_object(
                'month', month_start,
                'year', year,
                'invoiced', monthly_invoiced,
                'collected', monthly_collected,
                'invoiced_change_percent', invoiced_change_percent,
                'collected_change_percent', collected_change_percent
            ) ORDER BY month_start DESC
        )::JSONB,
        'monthly_trend',
        cache_expiry
    FROM monthly_revenue_comparison
    WHERE month_start >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
    ON CONFLICT (cache_key) DO UPDATE SET
        data = EXCLUDED.data,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- Function to get cached dashboard data with fallback
CREATE OR REPLACE FUNCTION get_dashboard_data(cache_key_param VARCHAR(100))
RETURNS JSONB AS $$
DECLARE
    cached_data JSONB;
BEGIN
    -- Try to get from cache first
    SELECT data INTO cached_data
    FROM dashboard_cache
    WHERE cache_key = cache_key_param
      AND expires_at > NOW();

    -- If cache hit, return cached data
    IF cached_data IS NOT NULL THEN
        RETURN cached_data;
    END IF;

    -- Cache miss - refresh cache and return data
    PERFORM cache_dashboard_data();

    SELECT data INTO cached_data
    FROM dashboard_cache
    WHERE cache_key = cache_key_param;

    RETURN COALESCE(cached_data, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_dashboard_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM dashboard_cache WHERE expires_at <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for optimal query performance
CREATE INDEX idx_dashboard_cache_expires_at ON dashboard_cache(expires_at);
CREATE INDEX idx_dashboard_cache_type ON dashboard_cache(cache_type);

-- Auto-update trigger for dashboard_cache
CREATE OR REPLACE FUNCTION update_dashboard_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboard_cache_updated_at
    BEFORE UPDATE ON dashboard_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_cache_timestamp();

-- Grant permissions
ALTER TABLE dashboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to dashboard_cache" ON dashboard_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read dashboard_cache" ON dashboard_cache
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create scheduled function to refresh cache every 5 minutes (requires pg_cron extension)
-- This would typically be set up as a cron job or scheduled task
-- SELECT cron.schedule('refresh-dashboard-cache', '*/5 * * * *', 'SELECT cache_dashboard_data(5);');