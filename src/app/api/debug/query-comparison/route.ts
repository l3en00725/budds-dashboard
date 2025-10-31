import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { buildCallQuery, postProcessCalls, countByDirection, type CallCategory } from '@/lib/call-query-builder';
import { DashboardService } from '@/lib/dashboard-service';

/**
 * Debug endpoint: Compare summary counts vs detail query results
 * 
 * GET /api/debug/query-comparison?category=booked
 * 
 * Shows side-by-side comparison to diagnose count mismatches
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') || 'booked') as CallCategory;

    const supabase = createServiceRoleClient();

    // ==================================================
    // METHOD 1: Dashboard Summary (how counts are calculated)
    // ==================================================
    const dashboardService = new DashboardService();
    const dashboardMetrics = await dashboardService.getCallAnalytics();
    
    const summaryCount = getSummaryCountForCategory(dashboardMetrics, category);

    // ==================================================
    // METHOD 2: Detail API (what modal shows)
    // ==================================================
    const { query, debugInfo } = buildCallQuery(supabase, {
      category,
      includeAnalysis: false, // Don't join for debugging
    });

    const { data: detailCalls, error: detailError } = await query;

    if (detailError) {
      throw detailError;
    }

    const processedCalls = postProcessCalls(detailCalls || [], category);
    const directionStats = countByDirection(processedCalls);

    // ==================================================
    // METHOD 3: Raw query (no filters, for comparison)
    // ==================================================
    const { query: rawQuery } = buildCallQuery(supabase, {
      category: 'total',
      includeAnalysis: false,
    });

    const { data: rawCalls, error: rawError } = await rawQuery;

    if (rawError) {
      throw rawError;
    }

    const rawStats = countByDirection(rawCalls || []);
    
    // Count how many would match each category
    const categoryBreakdown = {
      booked: rawCalls?.filter(c => 
        c.classified_as_booked === true &&
        (!c.direction || c.direction === 'inbound' || c.direction === 'incoming')
      ).length || 0,
      emergency: rawCalls?.filter(c => 
        c.is_emergency === true || 
        c.transcript?.toLowerCase().includes('emergency') ||
        c.transcript?.toLowerCase().includes('leak') ||
        c.transcript?.toLowerCase().includes('flooding')
      ).length || 0,
      total: rawCalls?.length || 0,
    };

    // ==================================================
    // COMPARISON RESULTS
    // ==================================================
    const mismatch = summaryCount !== processedCalls.length;

    return NextResponse.json({
      comparison: {
        category,
        summaryCount,
        detailCount: processedCalls.length,
        mismatch,
        difference: Math.abs(summaryCount - processedCalls.length),
      },
      summaryMethod: {
        source: 'DashboardService.getCallAnalytics()',
        count: summaryCount,
        metrics: {
          totalCalls: dashboardMetrics.today.totalCalls,
          inbound: dashboardMetrics.today.inboundCalls,
          outbound: dashboardMetrics.today.outboundCalls,
          appointmentsBooked: dashboardMetrics.today.appointmentsBooked,
          emergencies: dashboardMetrics.today.emergencyCallsToday,
        },
      },
      detailMethod: {
        source: '/api/calls/by-category',
        rawCount: detailCalls?.length || 0,
        processedCount: processedCalls.length,
        directionStats,
        filters: debugInfo.filters,
        dateRange: debugInfo.dateRange,
      },
      rawData: {
        totalCallsToday: rawCalls?.length || 0,
        directionStats: rawStats,
        categoryBreakdown,
      },
      diagnosis: {
        issue: mismatch ? 'COUNT MISMATCH DETECTED' : 'Counts match correctly',
        possibleCauses: mismatch ? [
          'Different filtering logic between summary and detail',
          'Date range mismatch (timezone issues)',
          'Test call exclusions not applied consistently',
          'Direction filtering differs between queries',
          'Join with calls_ai_analysis causing issues',
        ] : [],
        recommendation: mismatch 
          ? 'Review the filtering logic in both queries. Check debug info above.'
          : 'Queries are consistent. If UI shows mismatch, check frontend state management.',
      },
      detailCallSample: processedCalls.slice(0, 3).map(call => ({
        call_id: call.call_id,
        direction: call.direction,
        classified_as_booked: call.classified_as_booked,
        is_emergency: call.is_emergency,
        duration: call.duration,
        call_date: call.call_date,
      })),
    });

  } catch (error) {
    console.error('Query comparison error:', error);
    return NextResponse.json(
      {
        error: 'Comparison failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract summary count for specific category
 */
function getSummaryCountForCategory(
  metrics: any,
  category: CallCategory
): number {
  switch (category) {
    case 'booked':
      return metrics.today.appointmentsBooked;
    case 'emergency':
      return metrics.today.emergencyCallsToday;
    case 'followup':
      return metrics.today.followUpsScheduled;
    case 'qualified':
      return metrics.today.qualifiedInboundCalls;
    case 'total':
      return metrics.today.totalCalls;
    default:
      return 0;
  }
}

