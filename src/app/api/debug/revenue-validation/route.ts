import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0]; // 2025-10-01

    // Debug: Check all data sources for revenue calculations

    // 1. Check jobs revenue for today
    const { data: jobsToday } = await supabase
      .from('jobber_jobs')
      .select('job_id, revenue, status, end_date, title')
      .gte('end_date', today)
      .lt('end_date', `${today}T23:59:59`)
      .order('end_date', { ascending: false });

    // 2. Check invoices for today (should show $11,474.76)
    const { data: invoicesToday } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, issue_date, status')
      .gte('issue_date', today)
      .lt('issue_date', `${today}T23:59:59`)
      .order('issue_date', { ascending: false });

    // 3. Check payments for today (should show $1,827.31)
    const { data: paymentsToday } = await supabase
      .from('jobber_payments')
      .select('payment_id, amount, payment_date')
      .gte('payment_date', today)
      .lt('payment_date', `${today}T23:59:59`)
      .order('payment_date', { ascending: false });

    // 4. Check all outstanding invoices for AR (should total $83.7K)
    const { data: outstandingInvoices } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, amount, balance, status, issue_date, due_date')
      .neq('status', 'paid')
      .gt('balance', 0)
      .order('issue_date', { ascending: false })
      .limit(20);

    // Calculate totals
    const jobRevenueToday = jobsToday?.reduce((sum, job) => sum + (job.revenue || 0), 0) || 0;
    const invoicesAmountToday = invoicesToday?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const paymentsAmountToday = paymentsToday?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;
    const totalAR = outstandingInvoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    return NextResponse.json({
      today,
      expectedNumbers: {
        invoicedToday: 11474.76,
        paidToday: 1827.31,
        arOutstanding: 83700
      },
      actualNumbers: {
        jobRevenueToday,
        invoicesAmountToday,
        paymentsAmountToday,
        totalAR
      },
      counts: {
        jobsToday: jobsToday?.length || 0,
        invoicesToday: invoicesToday?.length || 0,
        paymentsToday: paymentsToday?.length || 0,
        outstandingInvoices: outstandingInvoices?.length || 0
      },
      sampleData: {
        jobsToday: jobsToday?.slice(0, 3),
        invoicesToday: invoicesToday?.slice(0, 3),
        paymentsToday: paymentsToday?.slice(0, 3),
        outstandingInvoices: outstandingInvoices?.slice(0, 5)
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}