import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get total job count
    const { count } = await supabase
      .from('jobber_jobs')
      .select('*', { count: 'exact', head: true });

    // Get sample jobs with details
    const { data: jobs } = await supabase
      .from('jobber_jobs')
      .select('job_id, title, status, revenue, start_date, end_date, created_at_jobber')
      .order('created_at_jobber', { ascending: false })
      .limit(10);

    // Get jobs with revenue
    const { data: jobsWithRevenue } = await supabase
      .from('jobber_jobs')
      .select('job_id, title, status, revenue, start_date, end_date')
      .gt('revenue', 0)
      .order('revenue', { ascending: false })
      .limit(5);

    // Get completed jobs
    const { data: completedJobs } = await supabase
      .from('jobber_jobs')
      .select('job_id, title, status, revenue, end_date')
      .eq('status', 'complete')
      .limit(5);

    return NextResponse.json({
      totalJobs: count,
      recentJobs: jobs,
      topRevenueJobs: jobsWithRevenue,
      completedJobs: completedJobs,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}