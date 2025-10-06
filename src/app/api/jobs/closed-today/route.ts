import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const supabase = createServiceRoleClient();

    // Fetch jobs closed today (status = 'archived' and end_date is today)
    const { data: jobs, error } = await supabase
      .from('jobber_jobs')
      .select('*')
      .eq('status', 'archived')
      .gte('end_date', `${date}T00:00:00`)
      .lt('end_date', `${date}T23:59:59`)
      .gt('revenue', 0)
      .order('end_date', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch closed jobs', details: error.message },
        { status: 500 }
      );
    }

    // Calculate total revenue for today
    const totalRevenue = jobs?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;

    // Format jobs for display
    const formattedJobs = jobs?.map(job => ({
      id: job.id,
      job_number: job.job_number,
      title: job.title,
      client_name: job.client_name,
      revenue: job.revenue,
      end_date: job.end_date,
      status: job.status,
      description: job.description,
      start_date: job.start_date
    })) || [];

    return NextResponse.json({
      jobs: formattedJobs,
      totalRevenue,
      count: formattedJobs.length,
      date
    });

  } catch (error) {
    console.error('Closed jobs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch closed jobs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}