import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const today = new Date().toISOString().split('T')[0];

    // Get all unique job statuses in the database
    const { data: allJobs } = await supabase
      .from('jobber_jobs')
      .select('status, updated_at, end_date, job_number')
      .order('updated_at', { ascending: false })
      .limit(100);

    const uniqueStatuses = [...new Set(allJobs?.map(j => j.status) || [])];

    // Get jobs updated today regardless of status
    const { data: todayUpdatedJobs } = await supabase
      .from('jobber_jobs')
      .select('job_number, status, updated_at, end_date')
      .gte('updated_at', `${today}T00:00:00`)
      .order('updated_at', { ascending: false })
      .limit(20);

    // Get recent jobs by end_date
    const { data: recentEndDateJobs } = await supabase
      .from('jobber_jobs')
      .select('job_number, status, end_date, updated_at')
      .gte('end_date', `${today}T00:00:00`)
      .order('end_date', { ascending: false })
      .limit(20);

    // Count jobs by status
    const statusCounts = {};
    for (const status of uniqueStatuses) {
      const { count } = await supabase
        .from('jobber_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      statusCounts[status] = count;
    }

    return NextResponse.json({
      uniqueStatuses,
      statusCounts,
      todayUpdatedJobs: todayUpdatedJobs || [],
      recentEndDateJobs: recentEndDateJobs || [],
      mostRecentJobs: allJobs?.slice(0, 10).map(j => ({
        jobNumber: j.job_number,
        status: j.status,
        updatedAt: j.updated_at,
        endDate: j.end_date
      })) || []
    });

  } catch (error) {
    console.error('Debug job statuses error:', error);
    return NextResponse.json({
      error: 'Failed to get job status data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}