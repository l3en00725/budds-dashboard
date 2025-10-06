import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { BusinessDateUtils } from '@/lib/date-utils';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Use the exact same query as dashboard service
    const actualToday = BusinessDateUtils.getTodayBusinessDate();

    console.log('Business date today:', actualToday);

    const { data: todayClosedJobs } = await supabase
      .from('jobber_jobs')
      .select('revenue, status, end_date, job_number, title, client_name')
      .gte('end_date', `${actualToday}T00:00:00`)
      .lt('end_date', `${actualToday}T23:59:59`)
      .eq('status', 'archived')
      .gt('revenue', 0);

    // Also try a simpler query for comparison
    const today = new Date().toISOString().split('T')[0];

    const { data: simpleTodayJobs } = await supabase
      .from('jobber_jobs')
      .select('revenue, status, end_date, job_number, title, client_name')
      .gte('end_date', today)
      .lt('end_date', `${today}T23:59:59`)
      .eq('status', 'archived')
      .gt('revenue', 0);

    const businessTotal = todayClosedJobs?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;
    const simpleTotal = simpleTodayJobs?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;

    return NextResponse.json({
      businessDate: actualToday,
      simpleDate: today,
      businessDateQuery: {
        count: todayClosedJobs?.length || 0,
        total: businessTotal,
        jobs: todayClosedJobs || []
      },
      simpleDateQuery: {
        count: simpleTodayJobs?.length || 0,
        total: simpleTotal,
        jobs: simpleTodayJobs || []
      },
      dateComparison: {
        businessDateToday: actualToday,
        simpleDateToday: today,
        areEqual: actualToday === today
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}