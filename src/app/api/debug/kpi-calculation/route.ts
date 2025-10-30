import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { DashboardService } from '@/lib/dashboard-service';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const dashboardService = new DashboardService();
    
    // Get raw data counts first
    const { data: jobsData } = await supabase
      .from('jobber_jobs')
      .select('revenue, status, end_date')
      .gte('end_date', new Date().toISOString().split('T')[0])
      .lt('end_date', `${new Date().toISOString().split('T')[0]}T23:59:59`);

    const { data: callsData } = await supabase
      .from('openphone_calls')
      .select('classified_as_booked, direction, duration, caller_number, transcript')
      .gte('call_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .lt('call_date', new Date().toISOString());

    const { data: invoicesData } = await supabase
      .from('jobber_invoices')
      .select('amount, issue_date, balance')
      .gte('issue_date', new Date().toISOString().split('T')[0]);

    // Calculate KPIs manually to show the logic
    const today = new Date().toISOString().split('T')[0];
    
    // Daily Revenue Calculation
    const completedJobs = jobsData?.filter(job => 
      job.status === 'archived' && 
      job.end_date?.startsWith(today) &&
      (job.revenue || 0) > 0
    ) || [];
    
    const dailyRevenue = completedJobs.reduce((sum, job) => sum + (job.revenue || 0), 0);

    // Call Analytics Calculation
    const totalCalls = callsData?.length || 0;
    const inboundCalls = callsData?.filter(call => 
      !call.direction || 
      call.direction.toLowerCase() === 'incoming' || 
      call.direction.toLowerCase() === 'inbound'
    ) || [];
    
    const outboundCalls = callsData?.filter(call => 
      call.direction && 
      (call.direction.toLowerCase() === 'outgoing' || 
       call.direction.toLowerCase() === 'outbound')
    ) || [];

    const qualifiedInboundCalls = inboundCalls.filter(call =>
      (call.duration || 0) >= 30 &&
      !call.caller_number?.toLowerCase().includes('spam') &&
      (call.transcript?.length || 0) > 50
    );

    const appointmentsBooked = inboundCalls.filter(call => 
      call.classified_as_booked === true
    ).length;

    const conversionRate = qualifiedInboundCalls.length > 0 
      ? Math.round((appointmentsBooked / qualifiedInboundCalls.length) * 100)
      : 0;

    // Try to get dashboard metrics
    let dashboardMetrics = null;
    let dashboardError = null;
    
    try {
      dashboardMetrics = await dashboardService.getDashboardMetrics();
    } catch (error) {
      dashboardError = error instanceof Error ? error.message : 'Unknown error';
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      rawData: {
        jobs: {
          total: jobsData?.length || 0,
          completed: completedJobs.length,
          revenue: dailyRevenue
        },
        calls: {
          total: totalCalls,
          inbound: inboundCalls.length,
          outbound: outboundCalls.length,
          qualified: qualifiedInboundCalls.length,
          booked: appointmentsBooked
        },
        invoices: {
          total: invoicesData?.length || 0,
          totalAmount: invoicesData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        }
      },
      calculatedKPIs: {
        dailyRevenue: {
          amount: dailyRevenue,
          jobsCompleted: completedJobs.length,
          calculation: `Sum of revenue from ${completedJobs.length} completed jobs today`
        },
        conversionRate: {
          percentage: conversionRate,
          booked: appointmentsBooked,
          qualified: qualifiedInboundCalls.length,
          calculation: `(${appointmentsBooked} booked / ${qualifiedInboundCalls.length} qualified) * 100`
        },
        callBreakdown: {
          total: totalCalls,
          inbound: inboundCalls.length,
          outbound: outboundCalls.length,
          qualified: qualifiedInboundCalls.length
        }
      },
      dashboardService: {
        success: !dashboardError,
        error: dashboardError,
        metrics: dashboardMetrics ? {
          dailyTarget: dashboardMetrics.dailyTarget,
          callAnalytics: dashboardMetrics.callAnalytics
        } : null
      },
      issues: {
        noJobsData: (jobsData?.length || 0) === 0,
        noCallsData: (callsData?.length || 0) === 0,
        noInvoicesData: (invoicesData?.length || 0) === 0,
        dashboardServiceFailing: !!dashboardError
      }
    });

  } catch (error) {
    console.error('KPI calculation debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
