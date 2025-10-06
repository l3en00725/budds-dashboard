-- Performance Indexes, Constraints, and Data Integrity
-- Migration: 20251006_005_performance_constraints.sql

-- Add additional performance indexes to existing tables for revenue analytics

-- Enhanced indexes for jobber_invoices (critical for revenue calculations)
CREATE INDEX IF NOT EXISTS idx_jobber_invoices_issue_date_amount ON jobber_invoices(issue_date, amount) WHERE amount > 0;
CREATE INDEX IF NOT EXISTS idx_jobber_invoices_due_date_balance ON jobber_invoices(due_date, balance) WHERE balance > 0;
CREATE INDEX IF NOT EXISTS idx_jobber_invoices_status_balance ON jobber_invoices(status, balance);
CREATE INDEX IF NOT EXISTS idx_jobber_invoices_client_id_amount ON jobber_invoices(client_id, amount);
CREATE INDEX IF NOT EXISTS idx_jobber_invoices_issue_date_desc ON jobber_invoices(issue_date DESC);

-- Enhanced indexes for jobber_payments (critical for cash flow tracking)
CREATE INDEX IF NOT EXISTS idx_jobber_payments_date_amount ON jobber_payments(payment_date, amount) WHERE amount > 0;
CREATE INDEX IF NOT EXISTS idx_jobber_payments_client_id_date ON jobber_payments(client_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_jobber_payments_invoice_id_amount ON jobber_payments(invoice_id, amount);
CREATE INDEX IF NOT EXISTS idx_jobber_payments_method_date ON jobber_payments(payment_method, payment_date);
CREATE INDEX IF NOT EXISTS idx_jobber_payments_date_desc ON jobber_payments(payment_date DESC);

-- Enhanced indexes for jobber_jobs (for revenue attribution)
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_revenue_status ON jobber_jobs(revenue, status) WHERE revenue > 0;
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_client_revenue ON jobber_jobs(client_id, revenue);
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_start_date_revenue ON jobber_jobs(start_date, revenue);
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_end_date_revenue ON jobber_jobs(end_date, revenue);

-- Composite indexes for complex dashboard queries
CREATE INDEX IF NOT EXISTS idx_daily_revenue_summary_date_amounts ON daily_revenue_summary(revenue_date, invoiced_amount, collected_amount);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_detail_date_source_amount ON daily_revenue_detail(revenue_date, source_type, amount);

-- Add data integrity constraints

-- Revenue amount constraints (prevent negative revenue)
ALTER TABLE daily_revenue_summary
  ADD CONSTRAINT chk_daily_revenue_positive CHECK (
    invoiced_amount >= 0 AND
    collected_amount >= 0 AND
    outstanding_amount >= 0
  );

ALTER TABLE daily_revenue_detail
  ADD CONSTRAINT chk_daily_detail_amount_positive CHECK (amount >= 0);

-- AR aging constraints
ALTER TABLE ar_aging_cache
  ADD CONSTRAINT chk_ar_aging_amounts_positive CHECK (
    invoice_amount >= 0 AND
    balance_due >= 0 AND
    amount_paid >= 0
  );

ALTER TABLE ar_aging_cache
  ADD CONSTRAINT chk_ar_aging_balance_logic CHECK (
    balance_due <= invoice_amount AND
    amount_paid <= invoice_amount AND
    (amount_paid + balance_due) <= invoice_amount + 50 -- Allow small rounding differences
  );

ALTER TABLE ar_aging_summary
  ADD CONSTRAINT chk_ar_summary_amounts_positive CHECK (
    current_amount >= 0 AND
    days_1_30_amount >= 0 AND
    days_31_60_amount >= 0 AND
    days_61_90_amount >= 0 AND
    days_90_plus_amount >= 0 AND
    total_outstanding >= 0
  );

-- Date constraints (prevent future dates where inappropriate)
ALTER TABLE daily_revenue_summary
  ADD CONSTRAINT chk_daily_revenue_date_reasonable CHECK (
    revenue_date >= '2020-01-01' AND
    revenue_date <= CURRENT_DATE + INTERVAL '1 day'
  );

ALTER TABLE ar_aging_cache
  ADD CONSTRAINT chk_ar_aging_dates_logical CHECK (
    snapshot_date >= '2020-01-01' AND
    snapshot_date <= CURRENT_DATE + INTERVAL '1 day' AND
    (due_date IS NULL OR due_date >= '2020-01-01') AND
    (issue_date IS NULL OR issue_date >= '2020-01-01') AND
    (issue_date IS NULL OR due_date IS NULL OR due_date >= issue_date)
  );

-- Performance metrics constraints
ALTER TABLE revenue_performance_metrics
  ADD CONSTRAINT chk_performance_metrics_positive CHECK (
    invoiced_revenue >= 0 AND
    collected_revenue >= 0 AND
    outstanding_revenue >= 0 AND
    revenue_target >= 0
  );

-- Cache constraints
ALTER TABLE dashboard_cache
  ADD CONSTRAINT chk_cache_expires_future CHECK (expires_at > created_at);

-- Create data validation functions

-- Function to validate invoice data integrity
CREATE OR REPLACE FUNCTION validate_invoice_data_integrity()
RETURNS TABLE(
    validation_type VARCHAR(50),
    issue_count INTEGER,
    sample_records TEXT
) AS $$
BEGIN
    -- Check for invoices with balance > amount
    RETURN QUERY
    SELECT
        'balance_exceeds_amount'::VARCHAR(50),
        COUNT(*)::INTEGER,
        STRING_AGG(invoice_id, ', ' ORDER BY invoice_id LIMIT 5)
    FROM jobber_invoices
    WHERE balance > amount;

    -- Check for negative amounts
    RETURN QUERY
    SELECT
        'negative_amounts'::VARCHAR(50),
        COUNT(*)::INTEGER,
        STRING_AGG(invoice_id, ', ' ORDER BY invoice_id LIMIT 5)
    FROM jobber_invoices
    WHERE amount < 0 OR balance < 0;

    -- Check for invoices with future issue dates
    RETURN QUERY
    SELECT
        'future_issue_dates'::VARCHAR(50),
        COUNT(*)::INTEGER,
        STRING_AGG(invoice_id, ', ' ORDER BY issue_date DESC LIMIT 5)
    FROM jobber_invoices
    WHERE issue_date > CURRENT_DATE;

    -- Check for due dates before issue dates
    RETURN QUERY
    SELECT
        'due_before_issue'::VARCHAR(50),
        COUNT(*)::INTEGER,
        STRING_AGG(invoice_id, ', ' ORDER BY issue_date LIMIT 5)
    FROM jobber_invoices
    WHERE due_date < issue_date;
END;
$$ LANGUAGE plpgsql;

-- Function to validate payment data integrity
CREATE OR REPLACE FUNCTION validate_payment_data_integrity()
RETURNS TABLE(
    validation_type VARCHAR(50),
    issue_count INTEGER,
    sample_records TEXT
) AS $$
BEGIN
    -- Check for negative payment amounts
    RETURN QUERY
    SELECT
        'negative_amounts'::VARCHAR(50),
        COUNT(*)::INTEGER,
        STRING_AGG(payment_id, ', ' ORDER BY payment_id LIMIT 5)
    FROM jobber_payments
    WHERE amount < 0;

    -- Check for payments with future dates
    RETURN QUERY
    SELECT
        'future_payment_dates'::VARCHAR(50),
        COUNT(*)::INTEGER,
        STRING_AGG(payment_id, ', ' ORDER BY payment_date DESC LIMIT 5)
    FROM jobber_payments
    WHERE payment_date > CURRENT_DATE;

    -- Check for payments without corresponding invoices
    RETURN QUERY
    SELECT
        'orphaned_payments'::VARCHAR(50),
        COUNT(*)::INTEGER,
        STRING_AGG(p.payment_id, ', ' ORDER BY p.payment_id LIMIT 5)
    FROM jobber_payments p
    LEFT JOIN jobber_invoices i ON p.invoice_id = i.invoice_id
    WHERE p.invoice_id IS NOT NULL
      AND i.invoice_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to validate revenue calculation consistency
CREATE OR REPLACE FUNCTION validate_revenue_calculations(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    calculation_type VARCHAR(50),
    expected_amount DECIMAL(12,2),
    actual_amount DECIMAL(12,2),
    difference DECIMAL(12,2),
    is_valid BOOLEAN
) AS $$
BEGIN
    -- Validate daily invoiced amount
    RETURN QUERY
    SELECT
        'daily_invoiced'::VARCHAR(50),
        source_total.amount,
        summary.invoiced_amount,
        (source_total.amount - summary.invoiced_amount),
        ABS(source_total.amount - summary.invoiced_amount) < 0.01
    FROM (
        SELECT COALESCE(SUM(amount), 0) as amount
        FROM jobber_invoices
        WHERE issue_date = target_date
    ) source_total
    CROSS JOIN (
        SELECT COALESCE(invoiced_amount, 0) as invoiced_amount
        FROM daily_revenue_summary
        WHERE revenue_date = target_date
    ) summary;

    -- Validate daily collected amount
    RETURN QUERY
    SELECT
        'daily_collected'::VARCHAR(50),
        source_total.amount,
        summary.collected_amount,
        (source_total.amount - summary.collected_amount),
        ABS(source_total.amount - summary.collected_amount) < 0.01
    FROM (
        SELECT COALESCE(SUM(amount), 0) as amount
        FROM jobber_payments
        WHERE payment_date = target_date
    ) source_total
    CROSS JOIN (
        SELECT COALESCE(collected_amount, 0) as collected_amount
        FROM daily_revenue_summary
        WHERE revenue_date = target_date
    ) summary;

    -- Validate AR aging totals
    RETURN QUERY
    SELECT
        'ar_aging_total'::VARCHAR(50),
        source_total.amount,
        summary.total_outstanding,
        (source_total.amount - summary.total_outstanding),
        ABS(source_total.amount - summary.total_outstanding) < 0.01
    FROM (
        SELECT COALESCE(SUM(balance), 0) as amount
        FROM jobber_invoices
        WHERE balance > 0 AND status NOT IN ('paid', 'bad_debt')
    ) source_total
    CROSS JOIN (
        SELECT COALESCE(total_outstanding, 0) as total_outstanding
        FROM ar_aging_summary
        WHERE snapshot_date = target_date
    ) summary;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically fix data consistency issues
CREATE OR REPLACE FUNCTION fix_data_consistency_issues()
RETURNS TEXT AS $$
DECLARE
    issues_fixed TEXT := '';
    fix_count INTEGER;
BEGIN
    -- Fix invoices where balance > amount (set balance = amount)
    UPDATE jobber_invoices
    SET balance = amount,
        updated_at = NOW()
    WHERE balance > amount;
    GET DIAGNOSTICS fix_count = ROW_COUNT;

    IF fix_count > 0 THEN
        issues_fixed := issues_fixed || 'Fixed ' || fix_count || ' invoices with balance > amount. ';
    END IF;

    -- Fix negative amounts (set to 0)
    UPDATE jobber_invoices
    SET amount = 0,
        balance = 0,
        updated_at = NOW()
    WHERE amount < 0;
    GET DIAGNOSTICS fix_count = ROW_COUNT;

    IF fix_count > 0 THEN
        issues_fixed := issues_fixed || 'Fixed ' || fix_count || ' invoices with negative amounts. ';
    END IF;

    UPDATE jobber_payments
    SET amount = 0
    WHERE amount < 0;
    GET DIAGNOSTICS fix_count = ROW_COUNT;

    IF fix_count > 0 THEN
        issues_fixed := issues_fixed || 'Fixed ' || fix_count || ' payments with negative amounts. ';
    END IF;

    -- Refresh revenue summaries that might be affected
    PERFORM refresh_daily_revenue_summary(CURRENT_DATE);
    PERFORM refresh_ar_aging_cache(CURRENT_DATE);

    IF issues_fixed = '' THEN
        RETURN 'No data consistency issues found.';
    ELSE
        RETURN issues_fixed || 'Revenue summaries refreshed.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger for critical revenue tables
CREATE OR REPLACE FUNCTION audit_revenue_changes()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    -- Log significant changes to invoices and payments
    IF TG_OP = 'UPDATE' THEN
        -- Check if critical fields changed
        IF (OLD.amount IS DISTINCT FROM NEW.amount) OR
           (OLD.balance IS DISTINCT FROM NEW.balance) OR
           (OLD.status IS DISTINCT FROM NEW.status) THEN

            audit_data := jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'old_values', to_jsonb(OLD),
                'new_values', to_jsonb(NEW),
                'changed_at', NOW(),
                'user_role', current_setting('request.jwt.claims', true)::jsonb->>'role'
            );

            INSERT INTO sync_log (
                sync_type,
                status,
                records_synced,
                error_message,
                started_at,
                completed_at
            ) VALUES (
                'audit_' || TG_TABLE_NAME,
                'success',
                1,
                audit_data::TEXT,
                NOW(),
                NOW()
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        audit_data := jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'deleted_values', to_jsonb(OLD),
            'deleted_at', NOW(),
            'user_role', current_setting('request.jwt.claims', true)::jsonb->>'role'
        );

        INSERT INTO sync_log (
            sync_type,
            status,
            records_synced,
            error_message,
            started_at,
            completed_at
        ) VALUES (
            'audit_' || TG_TABLE_NAME,
            'success',
            1,
            audit_data::TEXT,
            NOW(),
            NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_jobber_invoices_changes
    AFTER UPDATE OR DELETE ON jobber_invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_revenue_changes();

CREATE TRIGGER audit_jobber_payments_changes
    AFTER UPDATE OR DELETE ON jobber_payments
    FOR EACH ROW
    EXECUTE FUNCTION audit_revenue_changes();

-- Create maintenance function to be run periodically
CREATE OR REPLACE FUNCTION perform_revenue_maintenance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    cache_cleaned INTEGER;
BEGIN
    -- Clean up expired cache entries
    SELECT cleanup_dashboard_cache() INTO cache_cleaned;
    result := result || 'Cleaned ' || cache_cleaned || ' expired cache entries. ';

    -- Refresh today's revenue data
    PERFORM refresh_daily_revenue_summary(CURRENT_DATE);
    result := result || 'Refreshed daily revenue summary. ';

    -- Refresh AR aging for today
    PERFORM refresh_ar_aging_cache(CURRENT_DATE);
    result := result || 'Refreshed AR aging cache. ';

    -- Cache dashboard data
    PERFORM cache_dashboard_data(5);
    result := result || 'Refreshed dashboard cache. ';

    -- Check data consistency
    PERFORM fix_data_consistency_issues();
    result := result || 'Checked and fixed data consistency issues. ';

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Indexes for audit and maintenance queries
CREATE INDEX IF NOT EXISTS idx_sync_log_audit ON sync_log(sync_type, created_at) WHERE sync_type LIKE 'audit_%';
CREATE INDEX IF NOT EXISTS idx_sync_log_maintenance ON sync_log(sync_type, created_at) WHERE sync_type IN ('revenue_maintenance', 'data_validation');

-- Create health check view for monitoring
CREATE OR REPLACE VIEW revenue_system_health AS
WITH data_freshness AS (
    SELECT
        'daily_revenue_summary' as table_name,
        MAX(last_calculated_at) as last_updated,
        COUNT(*) as record_count,
        MAX(revenue_date) as latest_date
    FROM daily_revenue_summary
    UNION ALL
    SELECT
        'ar_aging_summary' as table_name,
        MAX(calculated_at) as last_updated,
        COUNT(*) as record_count,
        MAX(snapshot_date) as latest_date
    FROM ar_aging_summary
    UNION ALL
    SELECT
        'dashboard_cache' as table_name,
        MAX(updated_at) as last_updated,
        COUNT(*) as record_count,
        NULL::DATE as latest_date
    FROM dashboard_cache
    WHERE expires_at > NOW()
),
validation_results AS (
    SELECT
        COUNT(*) as total_validation_issues
    FROM (
        SELECT * FROM validate_invoice_data_integrity()
        UNION ALL
        SELECT * FROM validate_payment_data_integrity()
    ) validations
    WHERE issue_count > 0
)
SELECT
    df.table_name,
    df.last_updated,
    df.record_count,
    df.latest_date,
    CASE
        WHEN df.last_updated < NOW() - INTERVAL '1 hour' THEN 'stale'
        WHEN df.last_updated < NOW() - INTERVAL '15 minutes' THEN 'warning'
        ELSE 'healthy'
    END as freshness_status,
    vr.total_validation_issues,
    CASE
        WHEN vr.total_validation_issues > 10 THEN 'critical'
        WHEN vr.total_validation_issues > 0 THEN 'warning'
        ELSE 'healthy'
    END as data_quality_status
FROM data_freshness df
CROSS JOIN validation_results vr
ORDER BY df.table_name;

-- Final comment with usage instructions
COMMENT ON FUNCTION perform_revenue_maintenance() IS
'Run this function periodically (every 15-30 minutes) to maintain revenue data integrity and performance.
Example: SELECT perform_revenue_maintenance();';

COMMENT ON FUNCTION cache_dashboard_data(INTEGER) IS
'Cache dashboard data for the specified duration in minutes.
Example: SELECT cache_dashboard_data(5); -- Cache for 5 minutes';

COMMENT ON VIEW revenue_system_health IS
'Monitor the health and freshness of revenue data systems.
Check this view regularly to ensure data quality and system performance.';

COMMENT ON FUNCTION get_dashboard_data(VARCHAR) IS
'Retrieve cached dashboard data by key. Automatically refreshes cache if expired.
Available keys: top_metrics, daily_trend_30d, ar_aging_current, monthly_comparison_12m';

-- Performance analysis view
CREATE OR REPLACE VIEW revenue_performance_analysis AS
SELECT
    'Current Month' as period,
    mm.current_month_invoiced as invoiced,
    mm.current_month_collected as collected,
    mm.invoiced_monthly_change_percent as invoiced_change_percent,
    mm.collected_monthly_change_percent as collected_change_percent,
    mm.projected_month_end_invoiced as projected_invoiced
FROM dashboard_monthly_metrics mm
UNION ALL
SELECT
    'Current Week' as period,
    wm.current_week_invoiced as invoiced,
    wm.current_week_collected as collected,
    wm.invoiced_weekly_change_percent as invoiced_change_percent,
    wm.collected_weekly_change_percent as collected_change_percent,
    NULL as projected_invoiced
FROM dashboard_weekly_metrics wm
UNION ALL
SELECT
    'Today' as period,
    dm.today_invoiced as invoiced,
    dm.today_collected as collected,
    dm.invoiced_daily_change_percent as invoiced_change_percent,
    dm.collected_daily_change_percent as collected_change_percent,
    NULL as projected_invoiced
FROM dashboard_daily_metrics dm;