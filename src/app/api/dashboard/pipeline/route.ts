import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * Get sales pipeline breakdown based on actual Jobber data
 *
 * Phase 2 KPI Fix: Replace heuristics with real CRM status
 *
 * Pipeline Stages:
 * - New Lead: First-time caller
 * - Quote Sent: Jobber quote created, status = 'open'
 * - Follow-Up Needed: Quote open >3 days, no job created
 * - Won: Jobber job exists (scheduled/completed/in_progress)
 * - Lost: Jobber quote status = 'rejected'
 * - Inquiry: Everything else (repeat caller, no quote/job)
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Step 1: Get caller history (first call date, total calls)
    const { data: callerHistory, error: historyError } = await supabase
      .from('openphone_calls')
      .select('caller_number')
      .gte('call_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (historyError) {
      throw historyError;
    }

    // Count calls per number
    const callerCounts = new Map<string, number>();
    const callerFirstCall = new Map<string, Date>();

    for (const call of callerHistory || []) {
      const count = callerCounts.get(call.caller_number) || 0;
      callerCounts.set(call.caller_number, count + 1);
    }

    // Step 2: Get all calls from last 7 days with full details
    const { data: calls, error: callsError } = await supabase
      .from('openphone_calls')
      .select('call_id, caller_number, call_date, direction, classified_as_booked')
      .gte('call_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('direction', 'inbound')
      .order('call_date', { ascending: false });

    if (callsError) {
      throw callsError;
    }

    // Step 3: Get Jobber quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('jobber_quotes')
      .select('quote_id, client_name, client_phone, status, created_at_jobber')
      .gte('created_at_jobber', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (quotesError) {
      console.warn('Error fetching quotes:', quotesError);
    }

    // Step 4: Get Jobber jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobber_jobs')
      .select('job_id, client_name, status, created_at_jobber')
      .gte('created_at_jobber', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (jobsError) {
      console.warn('Error fetching jobs:', jobsError);
    }

    // Step 5: Match calls to quotes/jobs and determine stage
    const stageCounts = {
      'New Lead': 0,
      'Quote Sent': 0,
      'Follow-Up Needed': 0,
      'Won': 0,
      'Lost': 0,
      'Inquiry': 0,
    };

    const stageDetails: Record<string, any[]> = {
      'New Lead': [],
      'Quote Sent': [],
      'Follow-Up Needed': [],
      'Won': [],
      'Lost': [],
      'Inquiry': [],
    };

    for (const call of calls || []) {
      const phoneDigits = call.caller_number
        ?.replace(/[\s\-\(\)\+]/g, '')
        .replace(/^1/, '');

      // Determine stage
      let stage = 'Inquiry';

      // Check if new lead (first call)
      const totalCalls = callerCounts.get(call.caller_number) || 0;
      if (totalCalls === 1) {
        stage = 'New Lead';
      } else {
        // Check for matching job (Won)
        const matchingJob = jobs?.find(job =>
          job.client_name?.toLowerCase().includes(phoneDigits?.slice(-4) || '') &&
          job.status &&
          ['scheduled', 'in_progress', 'completed', 'archived'].includes(job.status.toLowerCase()) &&
          new Date(job.created_at_jobber) >= new Date(call.call_date) &&
          new Date(job.created_at_jobber) <= new Date(new Date(call.call_date).getTime() + 48 * 60 * 60 * 1000)
        );

        if (matchingJob) {
          stage = 'Won';
        } else {
          // Check for matching quote
          const matchingQuote = quotes?.find(quote =>
            (quote.client_phone?.includes(phoneDigits || '') ||
             quote.client_name?.toLowerCase().includes(phoneDigits?.slice(-4) || '')) &&
            new Date(quote.created_at_jobber) >= new Date(call.call_date) &&
            new Date(quote.created_at_jobber) <= new Date(new Date(call.call_date).getTime() + 48 * 60 * 60 * 1000)
          );

          if (matchingQuote) {
            if (matchingQuote.status === 'rejected') {
              stage = 'Lost';
            } else if (matchingQuote.status === 'open') {
              const daysSinceQuote = (Date.now() - new Date(matchingQuote.created_at_jobber).getTime()) / (1000 * 60 * 60 * 24);
              if (daysSinceQuote > 3) {
                stage = 'Follow-Up Needed';
              } else {
                stage = 'Quote Sent';
              }
            }
          }
        }
      }

      stageCounts[stage]++;
      stageDetails[stage].push({
        call_id: call.call_id,
        caller_number: call.caller_number,
        call_date: call.call_date,
        stage,
      });
    }

    // Calculate percentages
    const total = calls?.length || 0;
    const pipelineBreakdown = Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

    return NextResponse.json({
      success: true,
      total,
      breakdown: pipelineBreakdown,
      details: stageDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch pipeline data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
