import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Get a sample of jobs to understand what data we have
    const { data: jobs, error } = await supabase
      .from('jobber_jobs')
      .select('*')
      .order('created_at_jobber', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    // Analyze job titles and descriptions for membership patterns
    const membershipPatterns = [
      'membership', 'silver', 'gold', 'platinum', 'budd', 'annual', 'yearly',
      'maintenance', 'service plan', 'contract'
    ];

    const analysisResults = jobs?.map(job => {
      const title = job.title?.toLowerCase() || '';
      const desc = job.description?.toLowerCase() || '';

      const foundPatterns = membershipPatterns.filter(pattern =>
        title.includes(pattern) || desc.includes(pattern)
      );

      return {
        job_id: job.job_id,
        job_number: job.job_number,
        title: job.title,
        description: job.description,
        revenue: job.revenue,
        client_name: job.client_name,
        foundPatterns,
        isMembership: foundPatterns.length > 0
      };
    });

    const membershipJobs = analysisResults?.filter(job => job.isMembership) || [];

    return NextResponse.json({
      totalJobs: jobs?.length || 0,
      membershipJobs: membershipJobs.length,
      membershipPercentage: jobs?.length ? (membershipJobs.length / jobs.length * 100).toFixed(2) : 0,
      sampleJobs: analysisResults,
      membershipJobsFound: membershipJobs,
      summary: {
        totalRevenue: jobs?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0,
        membershipRevenue: membershipJobs.reduce((sum, job) => sum + (job.revenue || 0), 0),
        avgJobValue: jobs?.length ? (jobs.reduce((sum, job) => sum + (job.revenue || 0), 0) / jobs.length).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Jobs sample error:', error);
    return NextResponse.json({
      error: 'Failed to get jobs sample',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}