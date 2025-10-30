-- Phase 2 Pipeline Query Test
-- Replace heuristics with actual Jobber status

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
    oc.call_id,
    oc.caller_number,
    oc.call_date,
    ch.total_calls,
    jq.status AS quote_status,
    jq.created_at_jobber AS quote_created,
    jj.status AS job_status,
    jj.created_at_jobber AS job_created,
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
  -- Fix: Use correct column names from schema
  LEFT JOIN jobber_quotes jq
    ON oc.caller_number ILIKE '%' || COALESCE(jq.client_phone, jq.client_name) || '%'
  LEFT JOIN jobber_jobs jj
    ON oc.caller_number ILIKE '%' || jj.client_name || '%'
  WHERE oc.call_date >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT
  stage,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM pipeline_stages
GROUP BY stage
ORDER BY count DESC;

-- Also show sample records per stage
SELECT
  stage,
  caller_number,
  call_date,
  total_calls,
  quote_status,
  job_status
FROM pipeline_stages
ORDER BY stage, call_date DESC
LIMIT 50;
