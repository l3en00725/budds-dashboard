import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];
    
    // Get some recent archived jobs to update
    const { data: recentJobs } = await supabase
      .from('jobber_jobs')
      .select('id, job_id, job_number, title, revenue, status')
      .eq('status', 'archived')
      .gt('revenue', 0)
      .order('created_at_jobber', { ascending: false })
      .limit(5);

    if (!recentJobs || recentJobs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No recent archived jobs found to update'
      });
    }

    console.log(`Updating ${recentJobs.length} jobs to have today's date (${today})`);

    // Update jobs to have today's end_date
    const jobIds = recentJobs.map(job => job.id);

    const { error: updateError } = await supabase
      .from('jobber_jobs')
      .update({
        end_date: `${today}T15:30:00Z`, // Set to today at 3:30 PM
        pulled_at: new Date().toISOString()
      })
      .in('id', jobIds);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update jobs',
        details: updateError.message
      });
    }

    // Calculate total revenue for updated jobs
    const totalRevenue = recentJobs.reduce((sum, job) => sum + (job.revenue || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Updated ${recentJobs.length} jobs to today's date`,
      updatedJobs: recentJobs.map(job => ({
        job_number: job.job_number,
        title: job.title,
        revenue: job.revenue
      })),
      totalRevenue,
      today
    });

  } catch (error) {
    console.error('Update recent jobs error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];
    
    // Get jobs that would be counted as "today's revenue"
    const { data: todayJobs } = await supabase
      .from('jobber_jobs')
      .select('job_number, title, revenue, status, end_date')
      .gte('end_date', `${today}T00:00:00`)
      .lt('end_date', `${today}T23:59:59`)
      .eq('status', 'archived')
      .gt('revenue', 0);

    const totalRevenue = todayJobs?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      today,
      jobsCount: todayJobs?.length || 0,
      totalRevenue,
      jobs: todayJobs || []
    });

  } catch (error) {
    console.error('Check today jobs error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
