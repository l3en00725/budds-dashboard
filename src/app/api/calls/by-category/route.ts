import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { buildCallQuery, postProcessCalls, countByDirection, type CallCategory } from '@/lib/call-query-builder';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as CallCategory;
    const date = searchParams.get('date') || 'today';
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true';

    if (!category) {
      return NextResponse.json(
        { error: 'Missing category parameter' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Use shared query builder (ensures consistency with dashboard)
    const { query, debugInfo } = buildCallQuery(supabase, {
      category,
      includeAnalysis,
    });

    console.log('[API] Fetching calls:', {
      category,
      dateRange: debugInfo.dateRange,
      filters: debugInfo.filters,
    });

    const { data: calls, error } = await query;

    if (error) {
      console.error('[API] Error fetching calls:', {
        category,
        error: error.message,
        code: error.code,
      });
      return NextResponse.json(
        { error: 'Failed to fetch calls', details: error.message },
        { status: 500 }
      );
    }

    // Post-process with JavaScript filters if needed
    const processedCalls = postProcessCalls(calls || [], category);
    
    // Calculate direction breakdown
    const directionStats = countByDirection(processedCalls);

    console.log('[API] Query results:', {
      category,
      rawCount: calls?.length || 0,
      processedCount: processedCalls.length,
      directionStats,
    });

    return NextResponse.json({
      success: true,
      category,
      date,
      count: processedCalls.length,
      calls: processedCalls,
      meta: {
        rawCount: calls?.length || 0,
        processedCount: processedCalls.length,
        directionStats,
        debugInfo,
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
