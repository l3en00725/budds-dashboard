import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Execute the pipeline query
    const { data, error } = await supabase.rpc('get_pipeline_stages');

    if (error) {
      // If RPC doesn't exist, run the raw SQL query
      console.log('RPC not found, trying raw query...');

      // Note: Supabase JS client doesn't support complex CTEs directly
      // We need to create this as a database function or run simpler queries

      return NextResponse.json({
        error: 'Pipeline query requires database function',
        message: 'Run the SQL query directly in Supabase SQL Editor to see results',
        sql: `
WITH caller_history AS (
  SELECT
    caller_number,
    MIN(call_date) AS first_call,
    COUNT(*) AS total_calls
  FROM openphone_calls
  GROUP BY caller_number
),
pipeline_stages AS (
  SELECT
    oc.caller_number,
    jq.status AS quote_status,
    jj.status AS job_status,
    CASE
      WHEN ch.total_calls = 1 THEN 'New Lead'
      WHEN jj.status IN ('scheduled', 'in_progress', 'completed', 'archived') THEN 'Won'
      WHEN jq.status = 'rejected' THEN 'Lost'
      WHEN jq.status = 'open' AND jq.created_at_jobber < NOW() - INTERVAL '3 days' THEN 'Follow-Up Needed'
      WHEN jq.status = 'open' THEN 'Quote Sent'
      ELSE 'Inquiry'
    END AS stage
  FROM openphone_calls oc
  LEFT JOIN caller_history ch ON oc.caller_number = ch.caller_number
  LEFT JOIN jobber_quotes jq ON oc.caller_number ILIKE '%' || jq.client_phone || '%'
  LEFT JOIN jobber_jobs jj ON oc.caller_number ILIKE '%' || jj.client_name || '%'
  WHERE oc.call_date >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT stage, COUNT(*) AS count
FROM pipeline_stages
GROUP BY stage;
        `
      });
    }

    return NextResponse.json({
      success: true,
      pipeline: data
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
