import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Check multiple token sources
    const authHeader = request.headers.get('authorization');
    const requestToken = request.cookies.get('jobber_access_token')?.value;
    const cookieStore = await cookies();
    const serverToken = cookieStore.get('jobber_access_token')?.value;

    // Check database for line items status
    const { count: lineItemsCount, error: lineItemsError } = await supabase
      .from('jobber_line_items')
      .select('*', { count: 'exact', head: true });

    const { count: jobsCount, error: jobsError } = await supabase
      .from('jobber_jobs')
      .select('*', { count: 'exact', head: true });

    // Check for recent sync logs
    const { data: syncLogs } = await supabase
      .from('sync_log')
      .select('*')
      .eq('sync_type', 'jobber_full_sync')
      .order('started_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      authentication: {
        hasAuthHeader: !!authHeader,
        authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : null,
        hasRequestToken: !!requestToken,
        requestTokenPreview: requestToken ? requestToken.substring(0, 20) + '...' : null,
        hasServerToken: !!serverToken,
        serverTokenPreview: serverToken ? serverToken.substring(0, 20) + '...' : null,
        anyTokenAvailable: !!(authHeader || requestToken || serverToken)
      },
      database: {
        lineItemsCount: lineItemsCount || 0,
        lineItemsError: lineItemsError?.message,
        jobsCount: jobsCount || 0,
        jobsError: jobsError?.message
      },
      recentSyncs: syncLogs?.map(log => ({
        id: log.id,
        status: log.status,
        started_at: log.started_at,
        completed_at: log.completed_at,
        records_synced: log.records_synced,
        error_message: log.error_message
      })) || []
    });
  } catch (error) {
    console.error('Debug auth status error:', error);
    return NextResponse.json({
      error: 'Failed to get auth status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}