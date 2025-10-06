-- Advanced Data Aggregation Functions and Business Intelligence
-- Migration: 20251006_006_aggregation_functions.sql

-- Function to calculate comprehensive business metrics for any date range
CREATE OR REPLACE FUNCTION calculate_business_metrics(
    start_date DATE,
    end_date DATE DEFAULT NULL,
    include_projections BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    metric_name VARCHAR(50),
    metric_value DECIMAL(12,2),
    metric_unit VARCHAR(20),
    comparison_period VARCHAR(50),
    comparison_value DECIMAL(12,2),
    change_amount DECIMAL(12,2),
    change_percent DECIMAL(5,2),
    target_value DECIMAL(12,2),
    target_achievement_percent DECIMAL(5,2)
) AS $$
DECLARE
    target_end_date DATE;
    period_days INTEGER;
    prev_start_date DATE;
    prev_end_date DATE;
BEGIN
    -- Set default end date
    target_end_date := COALESCE(end_date, start_date);
    period_days := target_end_date - start_date + 1;

    -- Calculate comparison period (same length, preceding the target period)
    prev_end_date := start_date - 1;
    prev_start_date := prev_end_date - period_days + 1;

    -- Revenue Metrics
    RETURN QUERY
    WITH current_period AS (
        SELECT
            SUM(invoiced_amount) as total_invoiced,
            SUM(collected_amount) as total_collected,
            AVG(outstanding_amount) as avg_outstanding,
            COUNT(*) as revenue_days
        FROM daily_revenue_summary
        WHERE revenue_date BETWEEN start_date AND target_end_date
    ),
    previous_period AS (
        SELECT
            SUM(invoiced_amount) as total_invoiced,
            SUM(collected_amount) as total_collected,
            AVG(outstanding_amount) as avg_outstanding
        FROM daily_revenue_summary
        WHERE revenue_date BETWEEN prev_start_date AND prev_end_date
    ),
    targets AS (
        SELECT
            CASE
                WHEN period_days = 1 THEN
                    (SELECT target_value FROM dashboard_targets WHERE target_type = 'daily_revenue' AND year = EXTRACT(YEAR FROM start_date) LIMIT 1)
                WHEN period_days = 7 THEN
                    (SELECT target_value FROM dashboard_targets WHERE target_type = 'weekly_payments' AND year = EXTRACT(YEAR FROM start_date) LIMIT 1)
                WHEN period_days >= 28 AND period_days <= 31 THEN
                    (SELECT target_value FROM dashboard_targets WHERE target_type = 'monthly_revenue' AND year = EXTRACT(YEAR FROM start_date) LIMIT 1)
                ELSE NULL
            END as revenue_target
    )
    SELECT
        'Total Invoiced Revenue'::VARCHAR(50),
        COALESCE(cp.total_invoiced, 0),
        'USD'::VARCHAR(20),
        CASE
            WHEN period_days = 1 THEN 'Previous Day'
            WHEN period_days = 7 THEN 'Previous Week'
            WHEN period_days >= 28 THEN 'Previous Month'
            ELSE 'Previous Period'
        END::VARCHAR(50),
        COALESCE(pp.total_invoiced, 0),
        COALESCE(cp.total_invoiced, 0) - COALESCE(pp.total_invoiced, 0),
        CASE
            WHEN COALESCE(pp.total_invoiced, 0) > 0 THEN
                ROUND(((COALESCE(cp.total_invoiced, 0) - COALESCE(pp.total_invoiced, 0)) / pp.total_invoiced * 100), 2)
            ELSE NULL
        END,
        COALESCE(t.revenue_target, 0),
        CASE
            WHEN COALESCE(t.revenue_target, 0) > 0 THEN
                ROUND((COALESCE(cp.total_invoiced, 0) / t.revenue_target * 100), 2)
            ELSE NULL
        END
    FROM current_period cp
    CROSS JOIN previous_period pp
    CROSS JOIN targets t

    UNION ALL

    SELECT
        'Total Collected Revenue'::VARCHAR(50),
        COALESCE(cp.total_collected, 0),
        'USD'::VARCHAR(20),
        CASE
            WHEN period_days = 1 THEN 'Previous Day'
            WHEN period_days = 7 THEN 'Previous Week'
            WHEN period_days >= 28 THEN 'Previous Month'
            ELSE 'Previous Period'
        END::VARCHAR(50),
        COALESCE(pp.total_collected, 0),
        COALESCE(cp.total_collected, 0) - COALESCE(pp.total_collected, 0),
        CASE
            WHEN COALESCE(pp.total_collected, 0) > 0 THEN
                ROUND(((COALESCE(cp.total_collected, 0) - COALESCE(pp.total_collected, 0)) / pp.total_collected * 100), 2)
            ELSE NULL
        END,
        COALESCE(t.revenue_target, 0),
        CASE
            WHEN COALESCE(t.revenue_target, 0) > 0 THEN
                ROUND((COALESCE(cp.total_collected, 0) / t.revenue_target * 100), 2)
            ELSE NULL
        END
    FROM current_period cp
    CROSS JOIN previous_period pp
    CROSS JOIN targets t

    UNION ALL

    SELECT
        'Collection Rate'::VARCHAR(50),
        CASE
            WHEN COALESCE(cp.total_invoiced, 0) > 0 THEN
                ROUND((COALESCE(cp.total_collected, 0) / cp.total_invoiced * 100), 2)
            ELSE 0
        END,
        'Percent'::VARCHAR(20),
        'Previous Period'::VARCHAR(50),
        CASE
            WHEN COALESCE(pp.total_invoiced, 0) > 0 THEN
                ROUND((COALESCE(pp.total_collected, 0) / pp.total_invoiced * 100), 2)
            ELSE 0
        END,
        CASE
            WHEN COALESCE(cp.total_invoiced, 0) > 0 AND COALESCE(pp.total_invoiced, 0) > 0 THEN
                ROUND((COALESCE(cp.total_collected, 0) / cp.total_invoiced * 100), 2) -
                ROUND((COALESCE(pp.total_collected, 0) / pp.total_invoiced * 100), 2)
            ELSE 0
        END,
        NULL::DECIMAL(5,2),
        NULL::DECIMAL(12,2),
        NULL::DECIMAL(5,2)
    FROM current_period cp
    CROSS JOIN previous_period pp

    UNION ALL

    SELECT
        'Average Outstanding AR'::VARCHAR(50),
        COALESCE(cp.avg_outstanding, 0),
        'USD'::VARCHAR(20),
        'Previous Period'::VARCHAR(50),
        COALESCE(pp.avg_outstanding, 0),
        COALESCE(cp.avg_outstanding, 0) - COALESCE(pp.avg_outstanding, 0),
        CASE
            WHEN COALESCE(pp.avg_outstanding, 0) > 0 THEN
                ROUND(((COALESCE(cp.avg_outstanding, 0) - COALESCE(pp.avg_outstanding, 0)) / pp.avg_outstanding * 100), 2)
            ELSE NULL
        END,
        NULL::DECIMAL(12,2),
        NULL::DECIMAL(5,2)
    FROM current_period cp
    CROSS JOIN previous_period pp;

    -- If projections requested, add projected metrics
    IF include_projections AND period_days >= 7 THEN
        RETURN QUERY
        WITH current_data AS (
            SELECT
                SUM(invoiced_amount) as period_invoiced,
                SUM(collected_amount) as period_collected,
                COUNT(*) as days_elapsed
            FROM daily_revenue_summary
            WHERE revenue_date BETWEEN start_date AND LEAST(target_end_date, CURRENT_DATE)
        ),
        projections AS (
            SELECT
                cd.period_invoiced,
                cd.period_collected,
                cd.days_elapsed,
                period_days,
                CASE
                    WHEN cd.days_elapsed > 0 AND cd.days_elapsed < period_days THEN
                        ROUND(cd.period_invoiced * period_days::DECIMAL / cd.days_elapsed, 2)
                    ELSE cd.period_invoiced
                END as projected_invoiced,
                CASE
                    WHEN cd.days_elapsed > 0 AND cd.days_elapsed < period_days THEN
                        ROUND(cd.period_collected * period_days::DECIMAL / cd.days_elapsed, 2)
                    ELSE cd.period_collected
                END as projected_collected
            FROM current_data cd
        )
        SELECT
            'Projected Period Invoiced'::VARCHAR(50),
            p.projected_invoiced,
            'USD'::VARCHAR(20),
            'Current Pace'::VARCHAR(50),
            p.period_invoiced,
            p.projected_invoiced - p.period_invoiced,
            CASE
                WHEN p.period_invoiced > 0 THEN
                    ROUND(((p.projected_invoiced - p.period_invoiced) / p.period_invoiced * 100), 2)
                ELSE NULL
            END,
            NULL::DECIMAL(12,2),
            NULL::DECIMAL(5,2)
        FROM projections p

        UNION ALL

        SELECT
            'Projected Period Collected'::VARCHAR(50),
            p.projected_collected,
            'USD'::VARCHAR(20),
            'Current Pace'::VARCHAR(50),
            p.period_collected,
            p.projected_collected - p.period_collected,
            CASE
                WHEN p.period_collected > 0 THEN
                    ROUND(((p.projected_collected - p.period_collected) / p.period_collected * 100), 2)
                ELSE NULL
            END,
            NULL::DECIMAL(12,2),
            NULL::DECIMAL(5,2)
        FROM projections p;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate customer profitability analysis
CREATE OR REPLACE FUNCTION analyze_customer_profitability(
    analysis_period_months INTEGER DEFAULT 12,
    minimum_revenue DECIMAL(10,2) DEFAULT 1000
)
RETURNS TABLE(
    client_id VARCHAR(255),
    client_name VARCHAR(255),
    total_revenue DECIMAL(12,2),
    total_invoices INTEGER,
    total_payments INTEGER,
    avg_invoice_amount DECIMAL(10,2),
    avg_payment_amount DECIMAL(10,2),
    collection_rate DECIMAL(5,2),
    avg_days_to_pay DECIMAL(5,1),
    current_ar_balance DECIMAL(10,2),
    payment_reliability_score DECIMAL(3,2),
    revenue_trend_score DECIMAL(3,2),
    customer_tier VARCHAR(20),
    risk_level VARCHAR(20)
) AS $$
DECLARE
    analysis_start_date DATE;
BEGIN
    analysis_start_date := CURRENT_DATE - (analysis_period_months || ' months')::INTERVAL;

    RETURN QUERY
    WITH customer_revenue AS (
        SELECT
            ji.client_id,
            ji.client_name,
            SUM(ji.amount) as total_invoiced,
            COUNT(DISTINCT ji.invoice_id) as invoice_count,
            AVG(ji.amount) as avg_invoice_amount,
            SUM(CASE WHEN ji.status = 'paid' THEN ji.amount ELSE 0 END) as total_paid,
            SUM(CASE WHEN ji.status != 'paid' THEN ji.balance ELSE 0 END) as current_balance
        FROM jobber_invoices ji
        WHERE ji.issue_date >= analysis_start_date
          AND ji.client_id IS NOT NULL
        GROUP BY ji.client_id, ji.client_name
        HAVING SUM(ji.amount) >= minimum_revenue
    ),
    customer_payments AS (
        SELECT
            jp.client_id,
            COUNT(*) as payment_count,
            AVG(jp.amount) as avg_payment_amount,
            AVG(CASE
                WHEN ji.due_date IS NOT NULL THEN
                    jp.payment_date - ji.due_date
                ELSE NULL
            END) as avg_days_to_pay_from_due
        FROM jobber_payments jp
        LEFT JOIN jobber_invoices ji ON jp.invoice_id = ji.invoice_id
        WHERE jp.payment_date >= analysis_start_date
          AND jp.client_id IS NOT NULL
        GROUP BY jp.client_id
    ),
    customer_metrics AS (
        SELECT
            cr.client_id,
            cr.client_name,
            cr.total_invoiced as total_revenue,
            cr.invoice_count as total_invoices,
            COALESCE(cp.payment_count, 0) as total_payments,
            cr.avg_invoice_amount,
            COALESCE(cp.avg_payment_amount, 0) as avg_payment_amount,
            CASE
                WHEN cr.total_invoiced > 0 THEN
                    ROUND((cr.total_paid / cr.total_invoiced * 100), 2)
                ELSE 0
            END as collection_rate,
            COALESCE(cp.avg_days_to_pay_from_due, 0) as avg_days_to_pay,
            cr.current_balance as current_ar_balance,

            -- Payment reliability score (0.0 to 1.0)
            CASE
                WHEN cr.total_invoiced > 0 THEN
                    LEAST(1.0, GREATEST(0.0,
                        (cr.total_paid / cr.total_invoiced) * 0.6 +  -- Collection rate weight
                        CASE
                            WHEN COALESCE(cp.avg_days_to_pay_from_due, 0) <= 0 THEN 0.4
                            WHEN COALESCE(cp.avg_days_to_pay_from_due, 0) <= 30 THEN 0.3
                            WHEN COALESCE(cp.avg_days_to_pay_from_due, 0) <= 60 THEN 0.2
                            ELSE 0.1
                        END  -- Payment timing weight
                    ))
                ELSE 0.0
            END as payment_reliability_score,

            -- Revenue trend score (-1.0 to 1.0)
            CASE
                WHEN cr.invoice_count >= 6 THEN
                    -- Calculate trend from invoice dates (simplified)
                    LEAST(1.0, GREATEST(-1.0,
                        (cr.total_invoiced / analysis_period_months - cr.avg_invoice_amount) / NULLIF(cr.avg_invoice_amount, 0)
                    ))
                ELSE 0.0
            END as revenue_trend_score

        FROM customer_revenue cr
        LEFT JOIN customer_payments cp ON cr.client_id = cp.client_id
    )
    SELECT
        cm.client_id,
        cm.client_name,
        cm.total_revenue,
        cm.total_invoices,
        cm.total_payments,
        ROUND(cm.avg_invoice_amount, 2),
        ROUND(cm.avg_payment_amount, 2),
        cm.collection_rate,
        ROUND(cm.avg_days_to_pay, 1),
        cm.current_ar_balance,
        ROUND(cm.payment_reliability_score, 3),
        ROUND(cm.revenue_trend_score, 3),

        -- Customer tier based on revenue
        CASE
            WHEN cm.total_revenue >= 50000 THEN 'Platinum'
            WHEN cm.total_revenue >= 20000 THEN 'Gold'
            WHEN cm.total_revenue >= 10000 THEN 'Silver'
            WHEN cm.total_revenue >= 5000 THEN 'Bronze'
            ELSE 'Basic'
        END as customer_tier,

        -- Risk level assessment
        CASE
            WHEN cm.payment_reliability_score >= 0.8 AND cm.current_ar_balance <= cm.avg_invoice_amount THEN 'Low'
            WHEN cm.payment_reliability_score >= 0.6 AND cm.current_ar_balance <= cm.avg_invoice_amount * 2 THEN 'Medium'
            WHEN cm.payment_reliability_score >= 0.4 THEN 'High'
            ELSE 'Critical'
        END as risk_level

    FROM customer_metrics cm
    ORDER BY cm.total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate revenue forecasting based on historical trends
CREATE OR REPLACE FUNCTION forecast_revenue(
    forecast_months INTEGER DEFAULT 3,
    confidence_level DECIMAL(3,2) DEFAULT 0.80
)
RETURNS TABLE(
    forecast_month DATE,
    forecasted_invoiced DECIMAL(12,2),
    forecasted_collected DECIMAL(12,2),
    confidence_interval_low DECIMAL(12,2),
    confidence_interval_high DECIMAL(12,2),
    trend_direction VARCHAR(20),
    seasonality_factor DECIMAL(4,3),
    forecast_basis VARCHAR(50)
) AS $$
DECLARE
    historical_months INTEGER := 12; -- Use last 12 months for forecasting
    base_date DATE;
    seasonal_pattern RECORD;
BEGIN
    base_date := DATE_TRUNC('month', CURRENT_DATE);

    RETURN QUERY
    WITH historical_data AS (
        SELECT
            DATE_TRUNC('month', revenue_date) as month_start,
            SUM(invoiced_amount) as monthly_invoiced,
            SUM(collected_amount) as monthly_collected
        FROM daily_revenue_summary
        WHERE revenue_date >= base_date - (historical_months || ' months')::INTERVAL
          AND revenue_date < base_date
        GROUP BY DATE_TRUNC('month', revenue_date)
        ORDER BY month_start
    ),
    trend_analysis AS (
        SELECT
            -- Calculate linear trend
            REGR_SLOPE(monthly_invoiced, EXTRACT(EPOCH FROM month_start)) as invoiced_slope,
            REGR_INTERCEPT(monthly_invoiced, EXTRACT(EPOCH FROM month_start)) as invoiced_intercept,
            REGR_SLOPE(monthly_collected, EXTRACT(EPOCH FROM month_start)) as collected_slope,
            REGR_INTERCEPT(monthly_collected, EXTRACT(EPOCH FROM month_start)) as collected_intercept,

            -- Calculate averages and standard deviations
            AVG(monthly_invoiced) as avg_monthly_invoiced,
            STDDEV(monthly_invoiced) as stddev_invoiced,
            AVG(monthly_collected) as avg_monthly_collected,
            STDDEV(monthly_collected) as stddev_collected,

            COUNT(*) as data_points
        FROM historical_data
    ),
    seasonal_factors AS (
        SELECT
            EXTRACT(MONTH FROM month_start) as month_number,
            AVG(monthly_invoiced) / NULLIF((SELECT AVG(monthly_invoiced) FROM historical_data), 0) as seasonal_factor_invoiced,
            AVG(monthly_collected) / NULLIF((SELECT AVG(monthly_collected) FROM historical_data), 0) as seasonal_factor_collected
        FROM historical_data
        GROUP BY EXTRACT(MONTH FROM month_start)
    ),
    forecast_months_series AS (
        SELECT
            (base_date + (generate_series(1, forecast_months) || ' month')::INTERVAL)::DATE as forecast_month
    ),
    forecasts AS (
        SELECT
            fms.forecast_month,
            EXTRACT(MONTH FROM fms.forecast_month) as forecast_month_num,
            EXTRACT(EPOCH FROM fms.forecast_month) as forecast_epoch,

            -- Base forecast using linear trend
            (ta.invoiced_slope * EXTRACT(EPOCH FROM fms.forecast_month) + ta.invoiced_intercept) as base_invoiced_forecast,
            (ta.collected_slope * EXTRACT(EPOCH FROM fms.forecast_month) + ta.collected_intercept) as base_collected_forecast,

            -- Apply seasonal adjustment
            COALESCE(sf.seasonal_factor_invoiced, 1.0) as seasonal_factor_invoiced,
            COALESCE(sf.seasonal_factor_collected, 1.0) as seasonal_factor_collected,

            ta.stddev_invoiced,
            ta.stddev_collected,
            ta.data_points

        FROM forecast_months_series fms
        CROSS JOIN trend_analysis ta
        LEFT JOIN seasonal_factors sf ON sf.month_number = EXTRACT(MONTH FROM fms.forecast_month)
    )
    SELECT
        f.forecast_month,

        -- Seasonally adjusted forecasts
        GREATEST(0, ROUND(
            f.base_invoiced_forecast * f.seasonal_factor_invoiced, 2
        )) as forecasted_invoiced,

        GREATEST(0, ROUND(
            f.base_collected_forecast * f.seasonal_factor_collected, 2
        )) as forecasted_collected,

        -- Confidence intervals (using normal distribution approximation)
        GREATEST(0, ROUND(
            (f.base_invoiced_forecast * f.seasonal_factor_invoiced) -
            (1.96 * f.stddev_invoiced * SQRT(2.0)), 2  -- 95% confidence interval
        )) as confidence_interval_low,

        ROUND(
            (f.base_invoiced_forecast * f.seasonal_factor_invoiced) +
            (1.96 * f.stddev_invoiced * SQRT(2.0)), 2
        ) as confidence_interval_high,

        -- Trend direction
        CASE
            WHEN f.base_invoiced_forecast > (SELECT avg_monthly_invoiced FROM trend_analysis) THEN 'Increasing'
            WHEN f.base_invoiced_forecast < (SELECT avg_monthly_invoiced FROM trend_analysis) * 0.95 THEN 'Decreasing'
            ELSE 'Stable'
        END as trend_direction,

        ROUND(f.seasonal_factor_invoiced, 3) as seasonality_factor,

        CASE
            WHEN f.data_points >= 6 THEN 'Historical Trend'
            WHEN f.data_points >= 3 THEN 'Limited Data'
            ELSE 'Insufficient Data'
        END as forecast_basis

    FROM forecasts f
    ORDER BY f.forecast_month;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate key performance indicators (KPIs)
CREATE OR REPLACE FUNCTION calculate_kpis(target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
    kpi_data JSONB;
BEGIN
    WITH kpi_calculations AS (
        SELECT
            -- Daily KPIs
            (SELECT COALESCE(invoiced_amount, 0) FROM daily_revenue_summary WHERE revenue_date = target_date) as today_invoiced,
            (SELECT COALESCE(collected_amount, 0) FROM daily_revenue_summary WHERE revenue_date = target_date) as today_collected,

            -- Monthly KPIs
            (SELECT COALESCE(SUM(invoiced_amount), 0) FROM daily_revenue_summary
             WHERE DATE_TRUNC('month', revenue_date) = DATE_TRUNC('month', target_date)) as month_invoiced,
            (SELECT COALESCE(SUM(collected_amount), 0) FROM daily_revenue_summary
             WHERE DATE_TRUNC('month', revenue_date) = DATE_TRUNC('month', target_date)) as month_collected,

            -- YTD KPIs
            (SELECT COALESCE(SUM(invoiced_amount), 0) FROM daily_revenue_summary
             WHERE DATE_TRUNC('year', revenue_date) = DATE_TRUNC('year', target_date)) as ytd_invoiced,
            (SELECT COALESCE(SUM(collected_amount), 0) FROM daily_revenue_summary
             WHERE DATE_TRUNC('year', revenue_date) = DATE_TRUNC('year', target_date)) as ytd_collected,

            -- AR KPIs
            (SELECT COALESCE(total_outstanding, 0) FROM ar_aging_summary WHERE snapshot_date = target_date) as ar_total,
            (SELECT COALESCE(percent_current, 0) FROM ar_aging_summary WHERE snapshot_date = target_date) as ar_current_percent,
            (SELECT COALESCE(average_days_outstanding, 0) FROM ar_aging_summary WHERE snapshot_date = target_date) as ar_avg_days,

            -- Targets
            (SELECT COALESCE(target_value, 0) FROM dashboard_targets WHERE target_type = 'daily_revenue' AND year = EXTRACT(YEAR FROM target_date)) as daily_target,
            (SELECT COALESCE(target_value, 0) FROM dashboard_targets WHERE target_type = 'monthly_revenue' AND year = EXTRACT(YEAR FROM target_date)) as monthly_target
    )
    SELECT jsonb_build_object(
        'date', target_date,
        'daily', jsonb_build_object(
            'invoiced', today_invoiced,
            'collected', today_collected,
            'target', daily_target,
            'target_achievement', CASE WHEN daily_target > 0 THEN ROUND((today_invoiced / daily_target * 100), 1) ELSE 0 END
        ),
        'monthly', jsonb_build_object(
            'invoiced', month_invoiced,
            'collected', month_collected,
            'target', monthly_target,
            'target_achievement', CASE WHEN monthly_target > 0 THEN ROUND((month_invoiced / monthly_target * 100), 1) ELSE 0 END,
            'collection_rate', CASE WHEN month_invoiced > 0 THEN ROUND((month_collected / month_invoiced * 100), 1) ELSE 0 END
        ),
        'ytd', jsonb_build_object(
            'invoiced', ytd_invoiced,
            'collected', ytd_collected,
            'collection_rate', CASE WHEN ytd_invoiced > 0 THEN ROUND((ytd_collected / ytd_invoiced * 100), 1) ELSE 0 END
        ),
        'ar', jsonb_build_object(
            'total_outstanding', ar_total,
            'current_percent', ar_current_percent,
            'average_days_outstanding', ar_avg_days,
            'health_score', CASE
                WHEN ar_current_percent >= 80 AND ar_avg_days <= 30 THEN 'Excellent'
                WHEN ar_current_percent >= 70 AND ar_avg_days <= 45 THEN 'Good'
                WHEN ar_current_percent >= 60 AND ar_avg_days <= 60 THEN 'Fair'
                ELSE 'Poor'
            END
        ),
        'calculated_at', NOW()
    ) INTO kpi_data
    FROM kpi_calculations;

    RETURN kpi_data;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically refresh all revenue analytics
CREATE OR REPLACE FUNCTION refresh_all_revenue_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    result_log TEXT := '';
    start_time TIMESTAMP := NOW();
    records_count INTEGER;
BEGIN
    -- 1. Refresh daily revenue summary
    SELECT refresh_daily_revenue_summary(target_date) INTO records_count;
    result_log := result_log || 'Daily revenue summary: ' || records_count || ' records. ';

    -- 2. Refresh AR aging cache
    SELECT refresh_ar_aging_cache(target_date) INTO records_count;
    result_log := result_log || 'AR aging cache: ' || records_count || ' records. ';

    -- 3. Calculate performance metrics for different periods
    PERFORM calculate_revenue_performance_metrics(target_date, 'daily');
    PERFORM calculate_revenue_performance_metrics(target_date, 'weekly');
    PERFORM calculate_revenue_performance_metrics(target_date, 'monthly');
    result_log := result_log || 'Performance metrics calculated for all periods. ';

    -- 4. Update customer analytics (weekly refresh)
    IF EXTRACT(DOW FROM target_date) = 1 THEN -- Monday
        DELETE FROM customer_revenue_analytics WHERE analysis_date < target_date - INTERVAL '30 days';

        INSERT INTO customer_revenue_analytics (
            analysis_date, client_id, client_name, total_invoiced_ytd, total_collected_ytd,
            total_outstanding, invoice_count_ytd, payment_count_ytd, avg_invoice_amount,
            avg_payment_amount, payment_reliability_score, revenue_trend_score,
            is_high_value, is_payment_risk, first_invoice_date, last_invoice_date,
            last_payment_date, customer_age_days
        )
        SELECT
            target_date,
            ap.client_id,
            ap.client_name,
            ap.total_revenue,
            ap.total_revenue * ap.collection_rate / 100,
            ap.current_ar_balance,
            ap.total_invoices,
            ap.total_payments,
            ap.avg_invoice_amount,
            ap.avg_payment_amount,
            ap.payment_reliability_score,
            ap.revenue_trend_score,
            (ap.customer_tier IN ('Platinum', 'Gold')),
            (ap.risk_level IN ('High', 'Critical')),
            NULL, NULL, NULL, -- These would need additional queries
            0
        FROM analyze_customer_profitability(12, 1000) ap
        ON CONFLICT (analysis_date, client_id) DO UPDATE SET
            total_invoiced_ytd = EXCLUDED.total_invoiced_ytd,
            total_collected_ytd = EXCLUDED.total_collected_ytd,
            total_outstanding = EXCLUDED.total_outstanding,
            invoice_count_ytd = EXCLUDED.invoice_count_ytd,
            payment_count_ytd = EXCLUDED.payment_count_ytd,
            avg_invoice_amount = EXCLUDED.avg_invoice_amount,
            avg_payment_amount = EXCLUDED.avg_payment_amount,
            payment_reliability_score = EXCLUDED.payment_reliability_score,
            revenue_trend_score = EXCLUDED.revenue_trend_score,
            is_high_value = EXCLUDED.is_high_value,
            is_payment_risk = EXCLUDED.is_payment_risk,
            calculated_at = NOW();

        result_log := result_log || 'Customer analytics refreshed (weekly). ';
    END IF;

    -- 5. Cache dashboard data
    PERFORM cache_dashboard_data(5);
    result_log := result_log || 'Dashboard cache refreshed. ';

    -- 6. Clean up old data
    SELECT cleanup_dashboard_cache() INTO records_count;
    result_log := result_log || 'Cleaned ' || records_count || ' expired cache entries. ';

    -- 7. Validate data integrity
    PERFORM fix_data_consistency_issues();
    result_log := result_log || 'Data consistency validated. ';

    result_log := result_log || 'Total execution time: ' ||
                 EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER || ' seconds.';

    -- Log the refresh operation
    INSERT INTO sync_log (
        sync_type, status, records_synced, error_message, started_at, completed_at
    ) VALUES (
        'revenue_analytics_refresh', 'success', 1, result_log, start_time, NOW()
    );

    RETURN result_log;
END;
$$ LANGUAGE plpgsql;

-- Create an index for the sync log to track analytics refreshes
CREATE INDEX IF NOT EXISTS idx_sync_log_analytics_refresh ON sync_log(sync_type, completed_at) WHERE sync_type = 'revenue_analytics_refresh';

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_business_metrics(DATE, DATE, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION analyze_customer_profitability(INTEGER, DECIMAL) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION forecast_revenue(INTEGER, DECIMAL) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_kpis(DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION refresh_all_revenue_analytics(DATE) TO service_role;

-- Final comments with usage examples
COMMENT ON FUNCTION calculate_business_metrics(DATE, DATE, BOOLEAN) IS
'Calculate comprehensive business metrics for any date range.
Examples:
- SELECT * FROM calculate_business_metrics(CURRENT_DATE); -- Today''s metrics
- SELECT * FROM calculate_business_metrics(''2024-01-01'', ''2024-01-31'', true); -- January with projections
- SELECT * FROM calculate_business_metrics(CURRENT_DATE - 7, CURRENT_DATE); -- Last 7 days';

COMMENT ON FUNCTION analyze_customer_profitability(INTEGER, DECIMAL) IS
'Analyze customer profitability and risk.
Examples:
- SELECT * FROM analyze_customer_profitability(); -- Default 12 months, $1000 minimum
- SELECT * FROM analyze_customer_profitability(6, 5000); -- Last 6 months, $5000 minimum
- SELECT * FROM analyze_customer_profitability(24, 0); -- Last 24 months, all customers';

COMMENT ON FUNCTION forecast_revenue(INTEGER, DECIMAL) IS
'Generate revenue forecasts based on historical trends.
Examples:
- SELECT * FROM forecast_revenue(); -- 3 months forecast
- SELECT * FROM forecast_revenue(6, 0.90); -- 6 months with 90% confidence
- SELECT * FROM forecast_revenue(12); -- 12 months forecast';

COMMENT ON FUNCTION calculate_kpis(DATE) IS
'Calculate key performance indicators as JSON.
Examples:
- SELECT calculate_kpis(); -- Today''s KPIs
- SELECT calculate_kpis(''2024-01-31''); -- Specific date KPIs
Usage: SELECT calculate_kpis()->>''daily'' AS daily_metrics;';

COMMENT ON FUNCTION refresh_all_revenue_analytics(DATE) IS
'Comprehensive refresh of all revenue analytics and caches.
Should be run daily, preferably after data sync operations.
Example: SELECT refresh_all_revenue_analytics();';