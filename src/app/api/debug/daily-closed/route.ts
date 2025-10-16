import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const actualToday = new Date().toISOString().split('T')[0];

    console.log('🔍 DEBUG - Checking daily closed revenue for:', actualToday);

    // 1. Check all jobs with various status filters
    const { data: allJobs } = await supabase
      .from('jobber_jobs')
      .select('id, job_number, status, end_date, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    console.log('All recent jobs:', allJobs?.slice(0, 10));

    // 2. Try different status combinations
    const statusOptions = [
      ['archived'],
      ['complete'],
      ['closed'],
      ['archived', 'complete'],
      ['archived', 'complete', 'closed']
    ];

    const results = {};
    for (const statuses of statusOptions) {
      const { data: jobs } = await supabase
        .from('jobber_jobs')
        .select('id, job_number, status, end_date')
        .in('status', statuses)
        .gte('end_date', actualToday);

      results[statuses.join('|')] = {
        count: jobs?.length || 0,
        jobs: jobs?.map(j => ({
          job: j.job_number,
          status: j.status,
          endDate: j.end_date
        })) || []
      };
    }

    // 3. Check if invoices exist
    const { data: allInvoices, count: invoiceCount } = await supabase
      .from('jobber_invoices')
      .select('invoice_number, job_id, balance', { count: 'exact', head: true });

    // 4. Check specific job numbers from sync
    const syncJobNumbers = [4588, 4594, 4600, 4604, 4609, 4612, 4605];
    const { data: syncJobs } = await supabase
      .from('jobber_jobs')
      .select('id, job_number, status, end_date')
      .in('job_number', syncJobNumbers);

    return NextResponse.json({
      today: actualToday,
      totalJobsInDB: allJobs?.length || 0,
      totalInvoicesInDB: invoiceCount,
      recentJobs: allJobs?.slice(0, 5).map(j => ({
        job: j.job_number,
        status: j.status,
        endDate: j.end_date,
        updated: j.updated_at
      })) || [],
      statusFilters: results,
      syncJobsFromYesterday: {
        expected: syncJobNumbers,
        found: syncJobs?.map(j => ({
          job: j.job_number,
          status: j.status,
          endDate: j.end_date
        })) || []
      }
    });

  } catch (error) {
    console.error('Debug daily closed error:', error);
    return NextResponse.json({
      error: 'Failed to debug daily closed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}