import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const today = new Date().toISOString().split('T')[0];

    // Get ALL outstanding invoices total
    const { data: allOutstanding } = await supabase
      .from('jobber_invoices')
      .select('balance')
      .gt('balance', 0);

    const totalOutstanding = allOutstanding?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    // Check if we have any jobs data at all
    const { data: allJobs, count: totalJobsCount } = await supabase
      .from('jobber_jobs')
      .select('*', { count: 'exact', head: true });

    // Try to find jobs closed today (but table might be empty)
    const { data: todayClosedJobs } = await supabase
      .from('jobber_jobs')
      .select('id, job_number, status, end_date, updated_at')
      .or(`end_date.gte.${today},updated_at.gte.${today}`)
      .in('status', ['complete', 'archived', 'closed'])
      .limit(50);

    // Get invoice numbers with outstanding balances
    const { data: outstandingInvoices } = await supabase
      .from('jobber_invoices')
      .select('invoice_number, balance, status')
      .gt('balance', 0)
      .order('balance', { ascending: false })
      .limit(20);

    return NextResponse.json({
      totalOutstanding: totalOutstanding,
      totalJobsInDatabase: totalJobsCount,
      jobsClosedToday: todayClosedJobs?.length || 0,
      todayClosedJobNumbers: todayClosedJobs?.map(j => j.job_number) || [],
      topOutstandingInvoices: outstandingInvoices?.map(inv => ({
        invoiceNumber: inv.invoice_number,
        balance: inv.balance,
        status: inv.status
      })) || []
    });

  } catch (error) {
    console.error('Debug today closed error:', error);
    return NextResponse.json({
      error: 'Failed to get today closed data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}