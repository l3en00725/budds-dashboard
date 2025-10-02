import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get total counts
    const { count: totalJobs } = await supabase
      .from('jobber_jobs')
      .select('*', { count: 'exact', head: true });

    // Get membership jobs count
    const { count: membershipJobs } = await supabase
      .from('jobber_jobs')
      .select('*', { count: 'exact', head: true })
      .or('title.ilike.%membership%,title.ilike.%silver%,title.ilike.%gold%,title.ilike.%platinum%,description.ilike.%membership%');

    // Get sample membership jobs
    const { data: membershipSample } = await supabase
      .from('jobber_jobs')
      .select('title, description, status, revenue')
      .or('title.ilike.%membership%,title.ilike.%silver%,title.ilike.%gold%,title.ilike.%platinum%,description.ilike.%membership%')
      .limit(10);

    // Check if line items table exists
    let lineItemsExists = false;
    let lineItemsCount = 0;
    try {
      const { count } = await supabase
        .from('jobber_line_items')
        .select('*', { count: 'exact', head: true });
      lineItemsExists = true;
      lineItemsCount = count || 0;
    } catch (error) {
      lineItemsExists = false;
    }

    return NextResponse.json({
      totalJobs,
      membershipJobs,
      membershipSample,
      lineItemsExists,
      lineItemsCount,
      debug: {
        usingLineItems: lineItemsExists,
        fallbackMethod: !lineItemsExists ? 'job_titles' : 'line_items'
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug info', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}