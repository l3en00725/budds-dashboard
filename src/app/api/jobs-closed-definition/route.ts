import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { BusinessDateUtils } from '@/lib/date-utils';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const today = BusinessDateUtils.getTodayBusinessDate();

    // Get jobs that were closed today (current dashboard logic)
    const { data: jobsClosedToday } = await supabase
      .from('jobber_jobs')
      .select('job_id, job_number, title, client_name, revenue, status, end_date, created_at_jobber')
      .gte('end_date', `${today}T00:00:00`)
      .lt('end_date', `${today}T23:59:59`)
      .eq('status', 'archived')  // This means "closed/completed" in Jobber
      .gt('revenue', 0)
      .order('end_date', { ascending: false });

    // Get jobs scheduled for today but not yet closed
    const { data: jobsScheduledToday } = await supabase
      .from('jobber_jobs')
      .select('job_id, job_number, title, client_name, revenue, status, end_date, created_at_jobber')
      .gte('end_date', `${today}T00:00:00`)
      .lt('end_date', `${today}T23:59:59`)
      .eq('status', 'today')  // This means "scheduled for today" but not closed yet
      .order('end_date', { ascending: false });

    // Get all archived jobs (to understand the status)
    const { data: allArchivedJobs } = await supabase
      .from('jobber_jobs')
      .select('job_id, job_number, status, end_date, revenue')
      .eq('status', 'archived')
      .gt('revenue', 0)
      .order('end_date', { ascending: false })
      .limit(10);

    const totalClosedToday = jobsClosedToday?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;
    const totalScheduledToday = jobsScheduledToday?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;

    return NextResponse.json({
      businessDate: today,
      definition: {
        title: 'Jobs Closed Today - Current Dashboard Definition',
        description: 'Jobs that completed their work today AND are marked as archived/closed',
        criteria: [
          'end_date = today (work completion date)',
          'status = "archived" (closed/completed status in Jobber)',
          'revenue > 0 (excludes $0 jobs)'
        ],
        note: 'This represents actual business value delivered today, not just scheduled work'
      },
      jobsClosedToday: {
        count: jobsClosedToday?.length || 0,
        totalRevenue: totalClosedToday,
        jobs: jobsClosedToday?.map(job => ({
          jobNumber: job.job_number,
          title: job.title,
          client: job.client_name,
          revenue: job.revenue,
          endDate: job.end_date,
          createdAt: job.created_at_jobber
        })) || []
      },
      jobsScheduledTodayButNotClosed: {
        count: jobsScheduledToday?.length || 0,
        potentialRevenue: totalScheduledToday,
        jobs: jobsScheduledToday?.map(job => ({
          jobNumber: job.job_number,
          title: job.title,
          client: job.client_name,
          revenue: job.revenue,
          status: job.status,
          endDate: job.end_date
        })) || []
      },
      context: {
        message: 'The current dashboard correctly shows jobs that were COMPLETED today, not just scheduled',
        currentDashboardRevenue: totalClosedToday,
        potentialAdditionalRevenue: totalScheduledToday,
        recentArchivedJobs: allArchivedJobs?.slice(0, 5).map(job => ({
          jobNumber: job.job_number,
          endDate: job.end_date,
          revenue: job.revenue
        }))
      },
      summary: {
        currentLogicIsCorrect: true,
        reason: 'Dashboard shows actual completed work with revenue, which is the proper business metric',
        alternativeDefinitions: {
          'jobs_scheduled_today': 'Would include status="today" jobs (not yet completed)',
          'jobs_invoiced_today': 'Would require querying invoice issue dates',
          'jobs_created_today': 'Would show new business created today'
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing jobs definition:', error);
    return NextResponse.json({
      error: 'Failed to analyze jobs closed definition',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}