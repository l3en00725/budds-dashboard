import { createServerComponentClient } from './supabase';
import { Database } from './supabase';
import {
  getTodayStringET,
  getTodayStartET,
  getTomorrowStartET,
  getWeekStartET,
  getWeekStartStringET
} from './timezone-utils';

type JobberJob = Database['public']['Tables']['jobber_jobs']['Row'];
type JobberQuote = Database['public']['Tables']['jobber_quotes']['Row'];
type JobberInvoice = Database['public']['Tables']['jobber_invoices']['Row'];
type JobberPayment = Database['public']['Tables']['jobber_payments']['Row'];
type QuickBooksRevenue = Database['public']['Tables']['quickbooks_revenue_ytd']['Row'];
type DashboardTarget = Database['public']['Tables']['dashboard_targets']['Row'];

export interface DashboardMetrics {
  dailyTarget: {
    current: number;
    target: number;
    percentage: number;
    status: 'green' | 'yellow' | 'red';
  };
  gmMetrics: {
    membershipRevenue: {
      monthly: number;
      growth: number;
      silverCount: number;
      goldCount: number;
      platinumCount: number;
      totalCount: number;
    };
    jobPipeline: {
      totalValue: number;
      largeProjects: number;
      serviceTickets: number;
      averageValue: number;
    };
    businessHealth: {
      repeatCustomers: number;
      conversionRate: number;
      profitMargin: number;
      emergencyRatio: number;
    };
  };
  executiveMetrics: {
    efficiency: {
      completionRate30d: {
        percentage: number;
        status: 'green' | 'orange' | 'red';
        completed: number;
        total: number;
      };
      avgJobsPerTechDay7d: {
        average: number;
        status: 'green' | 'orange' | 'red';
        totalJobs: number;
        techDays: number;
      };
    };
    revenue: {
      dailyClosedRevenue: {
        amount: number;
        goal: number;
        percentage: number;
        status: 'green' | 'orange' | 'red';
      };
      revenueIssuedMTD: {
        amount: number;
        previousMonth: number;
        changePercent: number;
      };
      revenueCollectedMTD: {
        amount: number;
        previousMonth: number;
        changePercent: number;
      };
      arOutstanding: {
        amount: number;
        status: 'green' | 'orange' | 'red';
      };
      issuedVsPaidMoM: {
        status: 'green' | 'orange' | 'red';
        issuedChange: number;
        paidChange: number;
      };
      arAging: {
        current: number;
        days1to30: number;
        days31to60: number;
        days61to90: number;
        days90plus: number;
        over60Percent: number;
        status: 'green' | 'orange' | 'red';
      };
    };
  };
  unsentInvoices: {
    count: number;
    amount: number;
    status: 'green' | 'yellow' | 'red';
  };
  openQuotes: {
    count: number;
    amount: number;
    quotes: Array<{
      id: string;
      quote_number: string | null;
      client_name: string | null;
      client_email: string | null;
      client_phone: string | null;
      amount: number | null;
      created_at_jobber: string | null;
    }>;
  };
  bookedCallPercentage: {
    percentage: number;
    booked: number;
    total: number;
    status: 'green' | 'yellow' | 'red';
  };
  callAnalytics: {
    today: {
      totalCalls: number;
      appointmentsBooked: number;
      followUpsScheduled: number;
      notInterested: number;
      positivesentiment: number;
      averageConfidence: number;
      emergencyCallsToday: number;
      pipelineBreakdown: {
        qualified: number;
        followUp: number;
        newLeads: number;
        closedLost: number;
      };
    };
    thisWeek: {
      totalCalls: number;
      appointmentsBooked: number;
      emergencyCallsWeek: number;
      averageConfidence: number;
      trends: {
        callsChange: number;
        bookedChange: number;
        emergencyChange: number;
      };
    };
  };
  weeklyPayments: {
    current: number;
    target: number;
    percentage: number;
    status: 'green' | 'red';
    payments: Array<{
      amount: number | null;
      payment_date: string | null;
      customer: string | null;
    }>;
  };
  ytdRevenue: {
    current: number;
    lastYear: number;
    growth: number;
    direction: 'up' | 'down';
  };
}

export class DashboardService {
  private supabase: any;

  constructor() {
    // Initialize in async method
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await createServerComponentClient();
    }
    return this.supabase;
  }

  private getStatusColor(percentage: number, thresholds: { green: number; yellow: number }): 'green' | 'yellow' | 'red' {
    if (percentage >= thresholds.green) return 'green';
    if (percentage >= thresholds.yellow) return 'yellow';
    return 'red';
  }

  private getWeekStart(): string {
    return getWeekStartStringET();
  }

  private getWeekStartDate(): Date {
    return getWeekStartET();
  }

  private getTodayString(): string {
    return getTodayStringET();
  }

  async getDaillyTargetProgress(): Promise<DashboardMetrics['dailyTarget']> {
    const supabase = await this.getSupabase();
    const today = this.getTodayString();

    // Get jobs completed TODAY only (archived = completed in Jobber)
    const { data: todayJobs } = await supabase
      .from('jobber_jobs')
      .select('revenue, status, end_date')
      .gte('end_date', today)
      .lt('end_date', `${today}T23:59:59`)
      .eq('status', 'archived')
      .gt('revenue', 0);

    // Get daily target
    const { data: targets } = await supabase
      .from('dashboard_targets')
      .select('target_value')
      .eq('target_type', 'daily_revenue')
      .eq('period', 'daily')
      .single();

    const current = todayJobs?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;
    const target = targets?.target_value || 13000;
    const percentage = (current / target) * 100;

    return {
      current,
      target,
      percentage,
      status: this.getStatusColor(percentage, { green: 100, yellow: 75 }),
    };
  }

  async getUnsentInvoices(): Promise<DashboardMetrics['unsentInvoices']> {
    const supabase = await this.getSupabase();

    const { data: invoices } = await supabase
      .from('jobber_invoices')
      .select('amount')
      .eq('status', 'draft'); // Unsent invoices

    const count = invoices?.length || 0;
    const amount = invoices?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

    let status: 'green' | 'yellow' | 'red' = 'green';
    if (count > 10) status = 'red';
    else if (count >= 5) status = 'yellow';

    return { count, amount, status };
  }

  async getOpenQuotes(): Promise<DashboardMetrics['openQuotes']> {
    const supabase = await this.getSupabase();

    const { data: quotes } = await supabase
      .from('jobber_quotes')
      .select('id, quote_number, client_name, client_email, client_phone, amount, created_at_jobber')
      .eq('status', 'open')
      .order('created_at_jobber', { ascending: false });

    const count = quotes?.length || 0;
    const amount = quotes?.reduce((sum, quote) => sum + (quote.amount || 0), 0) || 0;

    return {
      count,
      amount,
      quotes: quotes || [],
    };
  }

  async getBookedCallPercentage(): Promise<DashboardMetrics['bookedCallPercentage']> {
    const supabase = await this.getSupabase();
    const todayStart = getTodayStartET();
    const tomorrowStart = getTomorrowStartET();

    const { data: calls } = await supabase
      .from('openphone_calls')
      .select('classified_as_booked')
      .gte('call_date', todayStart.toISOString())
      .lt('call_date', tomorrowStart.toISOString());

    const total = calls?.length || 0;
    const booked = calls?.filter(call => call.classified_as_booked).length || 0;
    const percentage = total > 0 ? (booked / total) * 100 : 0;

    return {
      percentage,
      booked,
      total,
      status: this.getStatusColor(percentage, { green: 70, yellow: 50 }),
    };
  }

  async getCallAnalytics(): Promise<DashboardMetrics['callAnalytics']> {
    const supabase = await this.getSupabase();
    const todayStart = getTodayStartET();
    const tomorrowStart = getTomorrowStartET();
    const weekStartDate = this.getWeekStartDate();
    const weekStart = weekStartDate.toISOString();
    const lastWeekStart = new Date(weekStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(weekStartDate.getTime() - 1);

    // Get today's calls using existing schema fields (ET timezone)
    const { data: todayCalls } = await supabase
      .from('openphone_calls')
      .select('classified_as_booked, classification_confidence, transcript, duration, caller_number')
      .gte('call_date', todayStart.toISOString())
      .lt('call_date', tomorrowStart.toISOString());

    // Get this week's calls (ET timezone)
    const { data: thisWeekCalls } = await supabase
      .from('openphone_calls')
      .select('classified_as_booked, classification_confidence, transcript, duration, caller_number')
      .gte('call_date', weekStart)
      .lt('call_date', tomorrowStart.toISOString());

    // Get last week's calls for comparison
    const { data: lastWeekCalls } = await supabase
      .from('openphone_calls')
      .select('classified_as_booked, classification_confidence, transcript, duration, caller_number')
      .gte('call_date', lastWeekStart.toISOString())
      .lt('call_date', lastWeekEnd.toISOString());

    // Process today's data
    const todayData = this.processCallData(todayCalls || []);

    // Process this week's data
    const thisWeekData = this.processCallData(thisWeekCalls || []);
    const lastWeekData = this.processCallData(lastWeekCalls || []);

    // Calculate trends
    const callsChange = lastWeekData.totalCalls > 0
      ? Math.round(((thisWeekData.totalCalls - lastWeekData.totalCalls) / lastWeekData.totalCalls) * 100)
      : 0;

    const bookedChange = lastWeekData.appointmentsBooked > 0
      ? Math.round(((thisWeekData.appointmentsBooked - lastWeekData.appointmentsBooked) / lastWeekData.appointmentsBooked) * 100)
      : 0;

    const emergencyChange = lastWeekData.emergencyCallsToday > 0
      ? Math.round(((thisWeekData.emergencyCallsToday - lastWeekData.emergencyCallsToday) / lastWeekData.emergencyCallsToday) * 100)
      : 0;

    return {
      today: todayData,
      thisWeek: {
        totalCalls: thisWeekData.totalCalls,
        appointmentsBooked: thisWeekData.appointmentsBooked,
        emergencyCallsWeek: thisWeekData.emergencyCallsToday,
        averageConfidence: thisWeekData.averageConfidence,
        trends: {
          callsChange,
          bookedChange,
          emergencyChange,
        },
      },
    };
  }

  async getExecutiveMetrics(): Promise<DashboardMetrics['executiveMetrics']> {
    const supabase = await this.getSupabase();
    const now = new Date();
    const today = this.getTodayString();

    // Date calculations
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // For demo purposes, show September vs August comparison
    const startOfMonth = new Date(2025, 8, 1); // September 2025
    const startOfLastMonth = new Date(2025, 7, 1); // August 2025
    const startOfNextMonth = new Date(2025, 9, 1); // October 2025
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all jobs for efficiency calculations (last 30 days)
    const { data: jobs30d } = await supabase
      .from('jobber_jobs')
      .select('job_id, status, start_date, end_date, created_at_jobber')
      .gte('created_at_jobber', thirtyDaysAgo.toISOString());

    // Get jobs for tech productivity (last 7 days)
    const { data: jobs7d } = await supabase
      .from('jobber_jobs')
      .select('job_id, status, start_date, end_date, created_at_jobber')
      .gte('created_at_jobber', sevenDaysAgo.toISOString())
      .eq('status', 'archived');

    // Get invoices for revenue calculations
    const { data: invoicesThisMonthFull } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, balance, issue_date, status')
      .gte('issue_date', startOfMonth.toISOString().split('T')[0]);

    const { data: invoicesLastMonthFull } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, balance, issue_date, status')
      .gte('issue_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('issue_date', startOfMonth.toISOString().split('T')[0]);

    // Get payments for collection calculations
    const { data: paymentsThisMonthFull } = await supabase
      .from('jobber_payments')
      .select('payment_id, amount, payment_date')
      .gte('payment_date', startOfMonth.toISOString().split('T')[0]);

    const { data: paymentsLastMonthFull } = await supabase
      .from('jobber_payments')
      .select('payment_id, amount, payment_date')
      .gte('payment_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('payment_date', startOfMonth.toISOString().split('T')[0]);

    // Get today's invoices for daily revenue
    const { data: dailyInvoices } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, issue_date, status')
      .eq('issue_date', this.getTodayString());

    // Get all outstanding invoices for AR aging
    const { data: outstandingInvoices } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, balance, issue_date, due_date, status')
      .neq('status', 'paid')
      .gt('balance', 0);

    // Calculate efficiency metrics
    const totalJobs30d = jobs30d?.length || 0;
    const completedJobs30d = jobs30d?.filter(job => job.status === 'archived').length || 0;
    const completionRate30d = totalJobs30d > 0 ? (completedJobs30d / totalJobs30d) * 100 : 0;

    // Estimate tech days (assuming 5 techs working 7 days = 35 tech-days)
    const techDays = 35; // You may want to make this dynamic based on actual tech count
    const totalJobs7d = jobs7d?.length || 0;
    const avgJobsPerTechDay = techDays > 0 ? totalJobs7d / techDays : 0;

    // Calculate revenue metrics - use job revenue since invoices/payments may not be synced
    // Get jobs for this month and last month revenue calculations
    const { data: jobsThisMonth } = await supabase
      .from('jobber_jobs')
      .select('revenue, end_date, status')
      .gte('end_date', startOfMonth.toISOString().split('T')[0])
      .eq('status', 'archived')
      .gt('revenue', 0);

    const { data: jobsLastMonth } = await supabase
      .from('jobber_jobs')
      .select('revenue, end_date, status')
      .gte('end_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('end_date', startOfMonth.toISOString().split('T')[0])
      .eq('status', 'archived')
      .gt('revenue', 0);

    // Get invoice data for month-over-month calculations
    const { data: currentMonthInvoices } = await supabase
      .from('jobber_invoices')
      .select('amount, issue_date')
      .gte('issue_date', startOfMonth.toISOString().split('T')[0])
      .lt('issue_date', startOfNextMonth.toISOString().split('T')[0]);

    const { data: lastMonthInvoices } = await supabase
      .from('jobber_invoices')
      .select('amount, issue_date')
      .gte('issue_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('issue_date', startOfMonth.toISOString().split('T')[0]);

    // Get payment data for month-over-month calculations
    const { data: currentMonthPayments } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date')
      .gte('payment_date', startOfMonth.toISOString().split('T')[0])
      .lt('payment_date', startOfNextMonth.toISOString().split('T')[0]);

    const { data: lastMonthPayments } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date')
      .gte('payment_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('payment_date', startOfMonth.toISOString().split('T')[0]);

    const revenueIssuedMTD = currentMonthInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const revenueIssuedLastMonth = lastMonthInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const revenueCollectedMTD = currentMonthPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;
    const revenueCollectedLastMonth = lastMonthPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;

    // CORRECT Daily Closed Revenue = Total value of jobs closed today
    // Since Jobber's API doesn't expose invoice outstanding balances, we use job totals
    // for jobs that were marked as complete/closed today
    const todayString = new Date().toISOString().split('T')[0];

    const { data: closedJobsToday } = await supabase
      .from('jobber_jobs')
      .select('revenue, job_number')
      .in('status', ['complete', 'archived', 'closed'])
      .gte('end_date', todayString);

    const dailyClosedRevenue = closedJobsToday?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;

    console.log('🔍 DEBUG - Daily closed revenue calculation:', {
      jobsClosedToday: closedJobsToday?.length || 0,
      totalRevenue: dailyClosedRevenue,
      jobNumbers: closedJobsToday?.map(j => j.job_number) || []
    });
    const dailyGoal = 13000; // Updated to correct $13K goal

    const arOutstanding = outstandingInvoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    // Calculate AR aging buckets
    const current = outstandingInvoices?.filter(inv => {
      const daysPastDue = Math.floor((now.getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysPastDue <= 0;
    }).reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    const days1to30 = outstandingInvoices?.filter(inv => {
      const daysPastDue = Math.floor((now.getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysPastDue > 0 && daysPastDue <= 30;
    }).reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    const days31to60 = outstandingInvoices?.filter(inv => {
      const daysPastDue = Math.floor((now.getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysPastDue > 30 && daysPastDue <= 60;
    }).reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    const days61to90 = outstandingInvoices?.filter(inv => {
      const daysPastDue = Math.floor((now.getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysPastDue > 60 && daysPastDue <= 90;
    }).reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    const days90plus = outstandingInvoices?.filter(inv => {
      const daysPastDue = Math.floor((now.getTime() - new Date(inv.issue_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysPastDue > 90;
    }).reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    const over60Total = days61to90 + days90plus;
    const over60Percent = arOutstanding > 0 ? (over60Total / arOutstanding) * 100 : 0;

    // Calculate month-over-month changes
    const issuedChange = revenueIssuedLastMonth > 0
      ? ((revenueIssuedMTD - revenueIssuedLastMonth) / revenueIssuedLastMonth) * 100
      : 0;
    const paidChange = revenueCollectedLastMonth > 0
      ? ((revenueCollectedMTD - revenueCollectedLastMonth) / revenueCollectedLastMonth) * 100
      : 0;

    // Status calculations
    const completionStatus = completionRate30d >= 90 ? 'green' : completionRate30d >= 75 ? 'orange' : 'red';
    const jobsPerTechStatus = avgJobsPerTechDay >= 2.0 ? 'green' : avgJobsPerTechDay >= 1.5 ? 'orange' : 'red';
    const dailyRevenueStatus = dailyClosedRevenue >= 12500 ? 'green' : dailyClosedRevenue >= 10000 ? 'orange' : 'red';
    const arStatus = over60Percent <= 15 ? 'green' : over60Percent <= 30 ? 'orange' : 'red';
    const momStatus = issuedChange > 0 && paidChange > 0 ? 'green' :
                     (issuedChange > 0 || paidChange > 0) ? 'orange' : 'red';

    return {
      efficiency: {
        completionRate30d: {
          percentage: Math.round(completionRate30d),
          status: completionStatus,
          completed: completedJobs30d,
          total: totalJobs30d,
        },
        avgJobsPerTechDay7d: {
          average: Math.round(avgJobsPerTechDay * 10) / 10,
          status: jobsPerTechStatus,
          totalJobs: totalJobs7d,
          techDays: techDays,
        },
      },
      revenue: {
        dailyClosedRevenue: {
          amount: dailyClosedRevenue,
          goal: dailyGoal,
          percentage: Math.round((dailyClosedRevenue / dailyGoal) * 100),
          status: dailyRevenueStatus,
        },
        revenueIssuedMTD: {
          amount: revenueIssuedMTD,
          previousMonth: revenueIssuedLastMonth,
          changePercent: Math.round(issuedChange),
        },
        revenueCollectedMTD: {
          amount: revenueCollectedMTD,
          previousMonth: revenueCollectedLastMonth,
          changePercent: Math.round(paidChange),
        },
        arOutstanding: {
          amount: arOutstanding,
          status: arStatus,
        },
        issuedVsPaidMoM: {
          status: momStatus,
          issuedChange: Math.round(issuedChange),
          paidChange: Math.round(paidChange),
        },
        arAging: {
          current,
          days1to30,
          days31to60,
          days61to90,
          days90plus,
          over60Percent: Math.round(over60Percent),
          status: arStatus,
        },
      },
    };
  }

  private processCallData(calls: any[]) {
    const totalCalls = calls?.length || 0;

    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        appointmentsBooked: 0,
        followUpsScheduled: 0,
        notInterested: 0,
        positivesentiment: 0,
        averageConfidence: 0,
        emergencyCallsToday: 0,
        pipelineBreakdown: {
          qualified: 0,
          followUp: 0,
          newLeads: 0,
          closedLost: 0,
        },
      };
    }

    const appointmentsBooked = calls?.filter(call => call.classified_as_booked === true).length || 0;
    const followUpsScheduled = calls?.filter(call =>
      call.transcript?.toLowerCase().includes('call back') ||
      call.transcript?.toLowerCase().includes('follow up')
    ).length || 0;
    const notInterested = calls?.filter(call =>
      call.classified_as_booked === false && call.duration > 30
    ).length || 0;
    const positivesentiment = calls?.filter(call =>
      call.classified_as_booked === true || call.classification_confidence > 0.7
    ).length || 0;

    const emergencyCallsToday = calls?.filter(call =>
      call.transcript?.toLowerCase().includes('emergency') ||
      call.transcript?.toLowerCase().includes('leak') ||
      call.transcript?.toLowerCase().includes('flooding')
    ).length || 0;

    const confidenceScores = calls?.map(call => (call.classification_confidence || 0) * 100).filter(score => score > 0) || [];
    const averageConfidence = confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length)
      : 0;

    const pipelineBreakdown = {
      qualified: calls?.filter(call => call.classified_as_booked === true).length || 0,
      followUp: calls?.filter(call =>
        call.transcript?.toLowerCase().includes('call back') ||
        call.transcript?.toLowerCase().includes('follow')
      ).length || 0,
      newLeads: calls?.filter(call => call.classified_as_booked === false && call.duration < 60).length || 0,
      closedLost: calls?.filter(call => call.classified_as_booked === false && call.duration > 60).length || 0,
    };

    return {
      totalCalls,
      appointmentsBooked,
      followUpsScheduled,
      notInterested,
      positivesentiment,
      averageConfidence,
      emergencyCallsToday,
      pipelineBreakdown,
    };
  }

  async getWeeklyPayments(): Promise<DashboardMetrics['weeklyPayments']> {
    const supabase = await this.getSupabase();
    const weekStart = this.getWeekStart();
    const now = new Date();
    const today = this.getTodayString();

    // Get this week's payments (Monday to today)
    const { data: payments } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date, customer')
      .gte('payment_date', weekStart)
      .lte('payment_date', today)
      .order('payment_date', { ascending: false });

    // Get weekly target
    const { data: targets } = await supabase
      .from('dashboard_targets')
      .select('target_value')
      .eq('target_type', 'weekly_payments')
      .eq('period', 'weekly')
      .single();

    const current = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const target = targets?.target_value || 10000;
    const percentage = (current / target) * 100;

    // Calculate if on pace (based on days elapsed in week)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Sunday = 7, Monday = 1
    const expectedByNow = (target / 5) * Math.min(dayOfWeek, 5); // Only count weekdays
    const onPace = current >= expectedByNow;

    return {
      current,
      target,
      percentage,
      status: onPace ? 'green' : 'red',
      payments: payments || [],
    };
  }

  async getYTDRevenue(): Promise<DashboardMetrics['ytdRevenue']> {
    const supabase = await this.getSupabase();
    const currentYear = new Date().getFullYear();

    try {
      const { data: revenue } = await supabase
        .from('quickbooks_revenue_ytd')
        .select('ttm_revenue, ttm_revenue_last_year')
        .eq('year', currentYear)
        .order('pulled_at', { ascending: false })
        .limit(1)
        .single();

      const current = revenue?.ttm_revenue || 0;
      const lastYear = revenue?.ttm_revenue_last_year || 0;
      const growth = lastYear > 0 ? ((current - lastYear) / lastYear) * 100 : 0;

      return {
        current,
        lastYear,
        growth,
        direction: growth >= 0 ? 'up' : 'down',
      };
    } catch (error) {
      console.error('Error fetching YTD revenue:', error);

      // Return fallback data if QuickBooks data is not available
      return {
        current: 0,
        lastYear: 0,
        growth: 0,
        direction: 'up',
      };
    }
  }

  async getGMMetrics(): Promise<DashboardMetrics['gmMetrics']> {
    const supabase = await this.getSupabase();

    // Get all jobs for analysis - use pagination to get all records
    let allJobs: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: jobs, error } = await supabase
        .from('jobber_jobs')
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching jobs:', error);
        break;
      }

      if (jobs && jobs.length > 0) {
        allJobs = allJobs.concat(jobs);
        from += pageSize;
        hasMore = jobs.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const jobs = allJobs;

    if (!jobs) {
      return {
        membershipRevenue: { monthly: 0, growth: 0, silverCount: 0, platinumCount: 0 },
        jobPipeline: { totalValue: 0, largeProjects: 0, serviceTickets: 0, averageValue: 0 },
        businessHealth: { repeatCustomers: 0, conversionRate: 0, profitMargin: 20, emergencyRatio: 15 }
      };
    }

    // Get line items for accurate membership counting
    let silverMembers = 0;
    let goldMembers = 0;
    let platinumMembers = 0;
    let monthlyMembershipRevenue = 0;

    try {
      // Try to get membership data from line items (preferred approach)
      const { data: membershipLineItems, error: lineItemsError } = await supabase
        .from('jobber_line_items')
        .select('*')
        .or('name.ilike.%membership program%,name.ilike.%silver%,name.ilike.%gold%,name.ilike.%platinum%,name.ilike.%budd%,description.ilike.%membership%,description.ilike.%silver%,description.ilike.%gold%,description.ilike.%platinum%,description.ilike.%budd%');

      console.log('Line items query result:', { count: membershipLineItems?.length || 0, error: lineItemsError });

      if (membershipLineItems && membershipLineItems.length > 0) {
        // Count memberships from line items (more accurate)
        const uniqueJobIds = new Set();
        const membershipCounts = new Map();

        membershipLineItems.forEach(lineItem => {
          const name = lineItem.name?.toLowerCase() || '';
          const desc = lineItem.description?.toLowerCase() || '';
          const jobId = lineItem.job_id;

          // Check for membership types in order of specificity
          if ((name.includes('silver') || desc.includes('silver')) && !membershipCounts.has(jobId)) {
            silverMembers++;
            membershipCounts.set(jobId, 'silver');
          } else if ((name.includes('gold') || desc.includes('gold')) && !membershipCounts.has(jobId)) {
            goldMembers++;
            membershipCounts.set(jobId, 'gold');
          } else if ((name.includes('platinum') || desc.includes('platinum')) && !membershipCounts.has(jobId)) {
            platinumMembers++;
            membershipCounts.set(jobId, 'platinum');
          }

          // Add revenue from jobs with membership line items (only once per job)
          if (lineItem.jobber_jobs && !uniqueJobIds.has(jobId)) {
            monthlyMembershipRevenue += lineItem.jobber_jobs.revenue || 0;
            uniqueJobIds.add(jobId);
          }
        });

        console.log('Line items approach - found:', { silverMembers, goldMembers, platinumMembers });
      } else {
        console.log('No line items found, using job title fallback');
        console.log('Total jobs to analyze (should be 4132):', jobs.length);

        // Fallback to job title approach if no line items available
        const membershipJobs = jobs.filter(job => {
          const title = job.title?.toLowerCase() || '';
          const desc = job.description?.toLowerCase() || '';

          // Look for various membership patterns
          return (
            title.includes('membership') ||
            title.includes('silver') ||
            title.includes('gold') ||
            title.includes('platinum') ||
            title.includes('budd\'s') ||
            title.includes('budd') ||
            desc.includes('membership') ||
            desc.includes('silver') ||
            desc.includes('gold') ||
            desc.includes('platinum') ||
            desc.includes('budd')
          );
        });

        console.log('Found membership jobs:', membershipJobs.length);

        // Count unique customers by client_id to avoid double-counting
        const uniqueCustomers = new Map();

        membershipJobs.forEach(job => {
          const title = job.title?.toLowerCase() || '';
          const desc = job.description?.toLowerCase() || '';
          const clientId = job.client_id;

          if (!clientId) return; // Skip jobs without client ID

          // Determine membership tier (prioritize platinum > gold > silver)
          let tier = 'general';
          if (title.includes('platinum') || desc.includes('platinum')) {
            tier = 'platinum';
          } else if (title.includes('gold') || desc.includes('gold')) {
            tier = 'gold';
          } else if (title.includes('silver') || desc.includes('silver')) {
            tier = 'silver';
          }

          // Keep highest tier for each customer
          const existingTier = uniqueCustomers.get(clientId);
          if (!existingTier ||
              (tier === 'platinum') ||
              (tier === 'gold' && existingTier !== 'platinum') ||
              (tier === 'silver' && existingTier === 'general')) {
            uniqueCustomers.set(clientId, tier);
          }
        });

        // Count by tier
        silverMembers = Array.from(uniqueCustomers.values()).filter(tier => tier === 'silver').length;
        goldMembers = Array.from(uniqueCustomers.values()).filter(tier => tier === 'gold').length;
        platinumMembers = Array.from(uniqueCustomers.values()).filter(tier => tier === 'platinum').length;

        console.log('Job title approach - found:', { silverMembers, goldMembers, platinumMembers, total: silverMembers + goldMembers + platinumMembers });

        monthlyMembershipRevenue = membershipJobs.reduce((sum, job) => sum + (job.revenue || 0), 0);
      }
    } catch (error) {
      console.log('Line items table not available, using job title fallback');
      // Fallback to job title approach
      const membershipJobs = jobs.filter(job =>
        job.title?.toLowerCase().includes('membership') ||
        job.title?.toLowerCase().includes('silver') ||
        job.title?.toLowerCase().includes('gold') ||
        job.title?.toLowerCase().includes('platinum') ||
        job.description?.toLowerCase().includes('membership')
      );

      silverMembers = membershipJobs.filter(job =>
        job.title?.toLowerCase().includes('silver') ||
        job.description?.toLowerCase().includes('silver')
      ).length;

      goldMembers = membershipJobs.filter(job =>
        job.title?.toLowerCase().includes('gold') ||
        job.description?.toLowerCase().includes('gold')
      ).length;

      platinumMembers = membershipJobs.filter(job =>
        job.title?.toLowerCase().includes('platinum') ||
        job.description?.toLowerCase().includes('platinum')
      ).length;

      monthlyMembershipRevenue = membershipJobs.reduce((sum, job) => sum + (job.revenue || 0), 0);
    }

    // Analyze job pipeline
    const largeProjects = jobs.filter(job => (job.revenue || 0) >= 10000).length;
    const serviceTickets = jobs.filter(job =>
      job.title?.toLowerCase().includes('service') ||
      (job.revenue || 0) < 1000
    ).length;

    const totalValue = jobs.reduce((sum, job) => sum + (job.revenue || 0), 0);
    const averageValue = jobs.length > 0 ? totalValue / jobs.length : 0;

    // Business health calculations
    const clientCounts = jobs.reduce((acc, job) => {
      if (job.client_id) {
        acc[job.client_id] = (acc[job.client_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const repeatCustomers = Object.values(clientCounts).filter(count => count > 1).length;
    const totalCustomers = Object.keys(clientCounts).length;
    const repeatCustomerPercentage = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // Emergency work estimation (service calls with "emergency" or same-day scheduling)
    const emergencyJobs = jobs.filter(job =>
      job.title?.toLowerCase().includes('emergency') ||
      job.title?.toLowerCase().includes('urgent') ||
      job.title?.toLowerCase().includes('service call')
    ).length;
    const emergencyRatio = jobs.length > 0 ? (emergencyJobs / jobs.length) * 100 : 0;

    return {
      membershipRevenue: {
        monthly: monthlyMembershipRevenue,
        growth: 5.2, // Placeholder - would calculate from historical data
        silverCount: silverMembers,
        goldCount: goldMembers,
        platinumCount: platinumMembers,
        totalCount: silverMembers + goldMembers + platinumMembers,
      },
      jobPipeline: {
        totalValue,
        largeProjects,
        serviceTickets,
        averageValue,
      },
      businessHealth: {
        repeatCustomers: repeatCustomerPercentage,
        conversionRate: 15.8, // Placeholder - would calculate service to project conversion
        profitMargin: 22.5, // Placeholder - would need cost data
        emergencyRatio,
      },
    };
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [
      dailyTarget,
      gmMetrics,
      executiveMetrics,
      unsentInvoices,
      openQuotes,
      bookedCallPercentage,
      callAnalytics,
      weeklyPayments,
      ytdRevenue,
    ] = await Promise.all([
      this.getDaillyTargetProgress(),
      this.getGMMetrics(),
      this.getExecutiveMetrics(),
      this.getUnsentInvoices(),
      this.getOpenQuotes(),
      this.getBookedCallPercentage(),
      this.getCallAnalytics(),
      this.getWeeklyPayments(),
      this.getYTDRevenue(),
    ]);

    return {
      dailyTarget,
      gmMetrics,
      executiveMetrics,
      unsentInvoices,
      openQuotes,
      bookedCallPercentage,
      callAnalytics,
      weeklyPayments,
      ytdRevenue,
    };
  }

  async updateTarget(targetType: string, value: number): Promise<void> {
    const supabase = await this.getSupabase();
    const currentYear = new Date().getFullYear();

    await supabase
      .from('dashboard_targets')
      .upsert({
        target_type: targetType,
        target_value: value,
        year: currentYear,
        updated_at: new Date().toISOString(),
      })
      .match({ target_type: targetType, year: currentYear });
  }
}