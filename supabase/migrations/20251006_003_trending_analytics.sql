-- Advanced Trending Analytics and Data Aggregation Functions
-- Migration: 20251006_003_trending_analytics.sql

-- Revenue Performance Metrics Table (for KPI tracking)
CREATE TABLE revenue_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'

    -- Core revenue metrics
    invoiced_revenue DECIMAL(12,2) DEFAULT 0,
    collected_revenue DECIMAL(12,2) DEFAULT 0,
    outstanding_revenue DECIMAL(12,2) DEFAULT 0,

    -- Performance ratios
    collection_rate DECIMAL(5,2) DEFAULT 0, -- collected / invoiced
    outstanding_ratio DECIMAL(5,2) DEFAULT 0, -- outstanding / invoiced

    -- Growth metrics (vs previous period)
    invoiced_growth_amount DECIMAL(12,2) DEFAULT 0,
    invoiced_growth_percent DECIMAL(5,2) DEFAULT 0,
    collected_growth_amount DECIMAL(12,2) DEFAULT 0,
    collected_growth_percent DECIMAL(5,2) DEFAULT 0,

    -- Target comparison
    revenue_target DECIMAL(12,2) DEFAULT 0,
    target_achievement_percent DECIMAL(5,2) DEFAULT 0,

    -- Additional metrics
    invoice_count INTEGER DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    average_invoice_amount DECIMAL(10,2) DEFAULT 0,
    average_payment_amount DECIMAL(10,2) DEFAULT 0,

    -- Data quality indicators
    data_completeness_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    source_systems TEXT[], -- Array of source systems included

    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint per period
    UNIQUE(metric_date, period_type)
);

-- Weekly Revenue Summary (for trending analysis)
CREATE TABLE weekly_revenue_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL, -- Monday of the week
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL, -- 1-53

    -- Revenue totals for the week
    weekly_invoiced DECIMAL(12,2) DEFAULT 0,
    weekly_collected DECIMAL(12,2) DEFAULT 0,
    weekly_outstanding DECIMAL(12,2) DEFAULT 0,

    -- Daily averages
    avg_daily_invoiced DECIMAL(10,2) DEFAULT 0,
    avg_daily_collected DECIMAL(10,2) DEFAULT 0,

    -- Week-over-week comparisons
    prev_week_invoiced DECIMAL(12,2) DEFAULT 0,
    prev_week_collected DECIMAL(12,2) DEFAULT 0,
    wow_invoiced_change DECIMAL(12,2) DEFAULT 0,
    wow_collected_change DECIMAL(12,2) DEFAULT 0,
    wow_invoiced_percent DECIMAL(5,2) DEFAULT 0,
    wow_collected_percent DECIMAL(5,2) DEFAULT 0,

    -- Business days in week (excluding weekends)
    business_days_count INTEGER DEFAULT 5,
    actual_revenue_days INTEGER DEFAULT 0, -- Days with actual revenue

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(week_start_date)
);

-- Customer Revenue Analytics (for customer insights)
CREATE TABLE customer_revenue_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_date DATE NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    client_name VARCHAR(255),

    -- Revenue metrics
    total_invoiced_ytd DECIMAL(12,2) DEFAULT 0,
    total_collected_ytd DECIMAL(12,2) DEFAULT 0,
    total_outstanding DECIMAL(12,2) DEFAULT 0,

    -- Transaction counts
    invoice_count_ytd INTEGER DEFAULT 0,
    payment_count_ytd INTEGER DEFAULT 0,

    -- Averages
    avg_invoice_amount DECIMAL(10,2) DEFAULT 0,
    avg_payment_amount DECIMAL(10,2) DEFAULT 0,
    avg_days_to_pay DECIMAL(5,1) DEFAULT 0,

    -- Customer scoring
    payment_reliability_score DECIMAL(3,2) DEFAULT 0, -- 0.0 to 1.0
    revenue_trend_score DECIMAL(3,2) DEFAULT 0, -- -1.0 to 1.0
    customer_lifetime_value DECIMAL(12,2) DEFAULT 0,

    -- Risk indicators
    is_high_value BOOLEAN DEFAULT FALSE,
    is_payment_risk BOOLEAN DEFAULT FALSE,
    is_growth_opportunity BOOLEAN DEFAULT FALSE,

    -- Time-based metrics
    first_invoice_date DATE,
    last_invoice_date DATE,
    last_payment_date DATE,
    customer_age_days INTEGER DEFAULT 0,

    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(analysis_date, client_id)
);

-- Seasonal Revenue Patterns View
CREATE VIEW seasonal_revenue_patterns AS
WITH monthly_patterns AS (
    SELECT
        EXTRACT(MONTH FROM revenue_date) as month_number,
        TO_CHAR(revenue_date, 'Month') as month_name,
        EXTRACT(YEAR FROM revenue_date) as year,
        AVG(invoiced_amount) as avg_monthly_invoiced,
        AVG(collected_amount) as avg_monthly_collected,
        COUNT(*) as data_points,
        STDDEV(invoiced_amount) as invoiced_volatility,
        STDDEV(collected_amount) as collected_volatility
    FROM daily_revenue_summary
    WHERE revenue_date >= CURRENT_DATE - INTERVAL '2 years'
    GROUP BY EXTRACT(MONTH FROM revenue_date), TO_CHAR(revenue_date, 'Month'), EXTRACT(YEAR FROM revenue_date)
),
seasonal_averages AS (
    SELECT
        month_number,
        month_name,
        AVG(avg_monthly_invoiced) as seasonal_avg_invoiced,
        AVG(avg_monthly_collected) as seasonal_avg_collected,
        COUNT(DISTINCT year) as years_of_data,
        AVG(invoiced_volatility) as avg_invoiced_volatility,
        AVG(collected_volatility) as avg_collected_volatility
    FROM monthly_patterns
    GROUP BY month_number, month_name
)
SELECT
    month_number,
    month_name,
    ROUND(seasonal_avg_invoiced, 2) as seasonal_avg_invoiced,
    ROUND(seasonal_avg_collected, 2) as seasonal_avg_collected,
    ROUND(avg_invoiced_volatility, 2) as avg_invoiced_volatility,
    ROUND(avg_collected_volatility, 2) as avg_collected_volatility,
    years_of_data,

    -- Calculate seasonal index (vs annual average)
    ROUND(
        (seasonal_avg_invoiced / NULLIF(
            (SELECT AVG(seasonal_avg_invoiced) FROM seasonal_averages), 0
        )), 3
    ) as seasonal_index_invoiced,

    ROUND(
        (seasonal_avg_collected / NULLIF(
            (SELECT AVG(seasonal_avg_collected) FROM seasonal_averages), 0
        )), 3
    ) as seasonal_index_collected

FROM seasonal_averages
ORDER BY month_number;

-- Business Performance Dashboard View
CREATE VIEW business_performance_dashboard AS
WITH current_metrics AS (
    SELECT
        SUM(CASE WHEN revenue_date = CURRENT_DATE THEN invoiced_amount ELSE 0 END) as today_invoiced,
        SUM(CASE WHEN revenue_date = CURRENT_DATE THEN collected_amount ELSE 0 END) as today_collected,
        SUM(CASE WHEN revenue_date >= DATE_TRUNC('week', CURRENT_DATE) THEN invoiced_amount ELSE 0 END) as week_invoiced,
        SUM(CASE WHEN revenue_date >= DATE_TRUNC('week', CURRENT_DATE) THEN collected_amount ELSE 0 END) as week_collected,
        SUM(CASE WHEN revenue_date >= DATE_TRUNC('month', CURRENT_DATE) THEN invoiced_amount ELSE 0 END) as month_invoiced,
        SUM(CASE WHEN revenue_date >= DATE_TRUNC('month', CURRENT_DATE) THEN collected_amount ELSE 0 END) as month_collected,
        SUM(CASE WHEN revenue_date >= DATE_TRUNC('year', CURRENT_DATE) THEN invoiced_amount ELSE 0 END) as year_invoiced,
        SUM(CASE WHEN revenue_date >= DATE_TRUNC('year', CURRENT_DATE) THEN collected_amount ELSE 0 END) as year_collected
    FROM daily_revenue_summary
    WHERE revenue_date >= CURRENT_DATE - INTERVAL '1 year'
),
targets AS (
    SELECT
        COALESCE(SUM(CASE WHEN target_type = 'daily_revenue' THEN target_value END), 2000) as daily_target,
        COALESCE(SUM(CASE WHEN target_type = 'weekly_payments' THEN target_value END), 10000) as weekly_target,
        COALESCE(SUM(CASE WHEN target_type = 'monthly_revenue' THEN target_value END), 100000) as monthly_target
    FROM dashboard_targets
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
),
ar_metrics AS (
    SELECT
        total_outstanding,
        percent_current,
        percent_overdue,
        average_days_outstanding
    FROM ar_aging_summary
    WHERE snapshot_date = CURRENT_DATE
    LIMIT 1
)
SELECT
    -- Current performance
    ROUND(cm.today_invoiced, 2) as today_invoiced,
    ROUND(cm.today_collected, 2) as today_collected,
    ROUND(cm.week_invoiced, 2) as week_invoiced,
    ROUND(cm.week_collected, 2) as week_collected,
    ROUND(cm.month_invoiced, 2) as month_invoiced,
    ROUND(cm.month_collected, 2) as month_collected,
    ROUND(cm.year_invoiced, 2) as year_invoiced,
    ROUND(cm.year_collected, 2) as year_collected,

    -- Target achievement
    ROUND((cm.today_invoiced / NULLIF(t.daily_target, 0) * 100), 1) as today_target_achievement,
    ROUND((cm.week_collected / NULLIF(t.weekly_target, 0) * 100), 1) as week_target_achievement,
    ROUND((cm.month_invoiced / NULLIF(t.monthly_target, 0) * 100), 1) as month_target_achievement,

    -- AR metrics
    COALESCE(ROUND(ar.total_outstanding, 2), 0) as total_ar_outstanding,
    COALESCE(ROUND(ar.percent_current, 1), 0) as ar_percent_current,
    COALESCE(ROUND(ar.percent_overdue, 1), 0) as ar_percent_overdue,
    COALESCE(ROUND(ar.average_days_outstanding, 1), 0) as ar_avg_days_outstanding,

    -- Collection efficiency
    CASE
        WHEN cm.year_invoiced > 0 THEN
            ROUND((cm.year_collected / cm.year_invoiced * 100), 1)
        ELSE 0
    END as ytd_collection_rate,

    -- Targets
    t.daily_target,
    t.weekly_target,
    t.monthly_target

FROM current_metrics cm
CROSS JOIN targets t
LEFT JOIN ar_metrics ar ON TRUE;

-- Function to calculate revenue performance metrics
CREATE OR REPLACE FUNCTION calculate_revenue_performance_metrics(
    target_date DATE DEFAULT CURRENT_DATE,
    period_type VARCHAR(20) DEFAULT 'daily'
)
RETURNS VOID AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    prev_start_date DATE;
    prev_end_date DATE;
    current_invoiced DECIMAL(12,2);
    current_collected DECIMAL(12,2);
    current_outstanding DECIMAL(12,2);
    prev_invoiced DECIMAL(12,2);
    prev_collected DECIMAL(12,2);
    target_revenue DECIMAL(12,2);
BEGIN
    -- Calculate date ranges based on period type
    CASE period_type
        WHEN 'daily' THEN
            start_date := target_date;
            end_date := target_date;
            prev_start_date := target_date - INTERVAL '1 day';
            prev_end_date := target_date - INTERVAL '1 day';

        WHEN 'weekly' THEN
            start_date := DATE_TRUNC('week', target_date);
            end_date := start_date + INTERVAL '6 days';
            prev_start_date := start_date - INTERVAL '1 week';
            prev_end_date := prev_start_date + INTERVAL '6 days';

        WHEN 'monthly' THEN
            start_date := DATE_TRUNC('month', target_date);
            end_date := (DATE_TRUNC('month', target_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
            prev_start_date := DATE_TRUNC('month', target_date) - INTERVAL '1 month';
            prev_end_date := (prev_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

        WHEN 'yearly' THEN
            start_date := DATE_TRUNC('year', target_date);
            end_date := (DATE_TRUNC('year', target_date) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
            prev_start_date := DATE_TRUNC('year', target_date) - INTERVAL '1 year';
            prev_end_date := (prev_start_date + INTERVAL '1 year' - INTERVAL '1 day')::DATE;

        ELSE
            RAISE EXCEPTION 'Invalid period_type: %', period_type;
    END CASE;

    -- Calculate current period metrics
    SELECT
        COALESCE(SUM(invoiced_amount), 0),
        COALESCE(SUM(collected_amount), 0),
        COALESCE(AVG(outstanding_amount), 0)
    INTO current_invoiced, current_collected, current_outstanding
    FROM daily_revenue_summary
    WHERE revenue_date BETWEEN start_date AND end_date;

    -- Calculate previous period metrics
    SELECT
        COALESCE(SUM(invoiced_amount), 0),
        COALESCE(SUM(collected_amount), 0)
    INTO prev_invoiced, prev_collected
    FROM daily_revenue_summary
    WHERE revenue_date BETWEEN prev_start_date AND prev_end_date;

    -- Get target revenue
    SELECT COALESCE(target_value, 0)
    INTO target_revenue
    FROM dashboard_targets
    WHERE target_type = CASE
        WHEN period_type = 'daily' THEN 'daily_revenue'
        WHEN period_type = 'weekly' THEN 'weekly_payments'
        WHEN period_type = 'monthly' THEN 'monthly_revenue'
        ELSE 'yearly_revenue'
    END
    AND year = EXTRACT(YEAR FROM target_date)
    LIMIT 1;

    -- Insert or update metrics
    INSERT INTO revenue_performance_metrics (
        metric_date,
        period_type,
        invoiced_revenue,
        collected_revenue,
        outstanding_revenue,
        collection_rate,
        outstanding_ratio,
        invoiced_growth_amount,
        invoiced_growth_percent,
        collected_growth_amount,
        collected_growth_percent,
        revenue_target,
        target_achievement_percent,
        invoice_count,
        payment_count,
        average_invoice_amount,
        average_payment_amount
    )
    SELECT
        target_date,
        period_type,
        current_invoiced,
        current_collected,
        current_outstanding,
        CASE WHEN current_invoiced > 0 THEN ROUND((current_collected / current_invoiced * 100), 2) ELSE 0 END,
        CASE WHEN current_invoiced > 0 THEN ROUND((current_outstanding / current_invoiced * 100), 2) ELSE 0 END,
        (current_invoiced - prev_invoiced),
        CASE WHEN prev_invoiced > 0 THEN ROUND(((current_invoiced - prev_invoiced) / prev_invoiced * 100), 2) ELSE 0 END,
        (current_collected - prev_collected),
        CASE WHEN prev_collected > 0 THEN ROUND(((current_collected - prev_collected) / prev_collected * 100), 2) ELSE 0 END,
        target_revenue,
        CASE WHEN target_revenue > 0 THEN ROUND((current_invoiced / target_revenue * 100), 2) ELSE 0 END,
        -- Additional metrics would require counting from detail tables
        0, 0, 0, 0
    ON CONFLICT (metric_date, period_type) DO UPDATE SET
        invoiced_revenue = EXCLUDED.invoiced_revenue,
        collected_revenue = EXCLUDED.collected_revenue,
        outstanding_revenue = EXCLUDED.outstanding_revenue,
        collection_rate = EXCLUDED.collection_rate,
        outstanding_ratio = EXCLUDED.outstanding_ratio,
        invoiced_growth_amount = EXCLUDED.invoiced_growth_amount,
        invoiced_growth_percent = EXCLUDED.invoiced_growth_percent,
        collected_growth_amount = EXCLUDED.collected_growth_amount,
        collected_growth_percent = EXCLUDED.collected_growth_percent,
        revenue_target = EXCLUDED.revenue_target,
        target_achievement_percent = EXCLUDED.target_achievement_percent,
        calculated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- Function to refresh daily revenue summary from source data
CREATE OR REPLACE FUNCTION refresh_daily_revenue_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    records_processed INTEGER := 0;
BEGIN
    -- Clear existing summary for target date
    DELETE FROM daily_revenue_summary WHERE revenue_date = target_date;

    -- Insert fresh daily summary
    INSERT INTO daily_revenue_summary (
        revenue_date,
        invoiced_amount,
        invoiced_count,
        collected_amount,
        collected_count,
        outstanding_amount,
        outstanding_count
    )
    SELECT
        target_date,
        COALESCE(invoiced.amount, 0),
        COALESCE(invoiced.count, 0),
        COALESCE(collected.amount, 0),
        COALESCE(collected.count, 0),
        COALESCE(outstanding.amount, 0),
        COALESCE(outstanding.count, 0)
    FROM (
        SELECT
            SUM(amount) as amount,
            COUNT(*) as count
        FROM jobber_invoices
        WHERE issue_date = target_date
    ) invoiced
    CROSS JOIN (
        SELECT
            SUM(amount) as amount,
            COUNT(*) as count
        FROM jobber_payments
        WHERE payment_date = target_date
    ) collected
    CROSS JOIN (
        SELECT
            SUM(balance) as amount,
            COUNT(*) as count
        FROM jobber_invoices
        WHERE balance > 0
          AND status NOT IN ('paid', 'bad_debt')
    ) outstanding;

    GET DIAGNOSTICS records_processed = ROW_COUNT;

    -- Refresh detail records
    DELETE FROM daily_revenue_detail WHERE revenue_date = target_date;

    -- Insert invoice details
    INSERT INTO daily_revenue_detail (
        revenue_date, source_type, source_system, source_record_id,
        client_id, client_name, amount, invoice_status, job_id
    )
    SELECT
        target_date, 'invoice', 'jobber', invoice_id,
        client_id, client_name, amount, status, job_id
    FROM jobber_invoices
    WHERE issue_date = target_date;

    -- Insert payment details
    INSERT INTO daily_revenue_detail (
        revenue_date, source_type, source_system, source_record_id,
        client_id, client_name, amount, payment_method
    )
    SELECT
        target_date, 'payment', 'jobber', payment_id,
        client_id, customer, amount, payment_method
    FROM jobber_payments
    WHERE payment_date = target_date;

    RETURN records_processed;
END;
$$ LANGUAGE plpgsql;

-- Performance indexes for new tables
CREATE INDEX idx_revenue_performance_metrics_date_period ON revenue_performance_metrics(metric_date, period_type);
CREATE INDEX idx_revenue_performance_metrics_date_desc ON revenue_performance_metrics(metric_date DESC);

CREATE INDEX idx_weekly_revenue_summary_week_start ON weekly_revenue_summary(week_start_date);
CREATE INDEX idx_weekly_revenue_summary_year_week ON weekly_revenue_summary(year, week_number);

CREATE INDEX idx_customer_revenue_analytics_date_client ON customer_revenue_analytics(analysis_date, client_id);
CREATE INDEX idx_customer_revenue_analytics_high_value ON customer_revenue_analytics(is_high_value, analysis_date);
CREATE INDEX idx_customer_revenue_analytics_payment_risk ON customer_revenue_analytics(is_payment_risk, analysis_date);

-- Grant permissions
ALTER TABLE revenue_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_revenue_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_revenue_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to revenue_performance_metrics" ON revenue_performance_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to weekly_revenue_summary" ON weekly_revenue_summary
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to customer_revenue_analytics" ON customer_revenue_analytics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read revenue_performance_metrics" ON revenue_performance_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read weekly_revenue_summary" ON weekly_revenue_summary
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read customer_revenue_analytics" ON customer_revenue_analytics
    FOR SELECT USING (auth.role() = 'authenticated');