import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/lib/dashboard-service';

export async function GET(request: NextRequest) {
  try {
    const dashboardService = new DashboardService();
    const metrics = await dashboardService.getExecutiveMetrics();

    return NextResponse.json({
      revenueIssuedMTD: metrics.revenue.revenueIssuedMTD,
      revenueCollectedMTD: metrics.revenue.revenueCollectedMTD,
      currentData: {
        issued: metrics.revenue.revenueIssuedMTD.amount,
        collected: metrics.revenue.revenueCollectedMTD.amount,
        issuedPrevious: metrics.revenue.revenueIssuedMTD.previousMonth,
        collectedPrevious: metrics.revenue.revenueCollectedMTD.previousMonth,
        issuedChange: metrics.revenue.revenueIssuedMTD.changePercent,
        collectedChange: metrics.revenue.revenueCollectedMTD.changePercent,
      }
    });
  } catch (error) {
    console.error('Debug revenue display error:', error);
    return NextResponse.json({ error: 'Failed to debug revenue display' }, { status: 500 });
  }
}