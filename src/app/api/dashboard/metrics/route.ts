import { NextResponse } from 'next/server';
import { DashboardService } from '@/lib/dashboard-service';

export async function GET() {
  try {
    const dashboardService = new DashboardService();
    const metrics = await dashboardService.getDashboardMetrics();

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';