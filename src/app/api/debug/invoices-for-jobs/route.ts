import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const todayClosedJobNumbers = [4588, 4594, 4600, 4604, 4609, 4612, 4605];

    console.log('🔍 DEBUG - Looking for invoices for jobs closed today:', todayClosedJobNumbers);

    // Get ALL invoices for those specific job numbers (not just outstanding ones)
    const { data: allInvoicesForClosedJobs } = await supabase
      .from('jobber_invoices')
      .select('balance, invoice_number, job_number, amount, status')
      .in('job_number', todayClosedJobNumbers);

    // Get only invoices with outstanding balances
    const { data: outstandingInvoicesForClosedJobs } = await supabase
      .from('jobber_invoices')
      .select('balance, invoice_number, job_number, amount, status')
      .in('job_number', todayClosedJobNumbers)
      .gt('balance', 0);

    const totalOutstanding = outstandingInvoicesForClosedJobs?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    // Also check if these job numbers exist in any format
    const { data: similarJobNumbers } = await supabase
      .from('jobber_invoices')
      .select('job_number, invoice_number, balance')
      .or(`job_number.eq.4588,job_number.eq.4594,job_number.eq.4600,job_number.eq.4604,job_number.eq.4609,job_number.eq.4612,job_number.eq.4605`);

    return NextResponse.json({
      todayClosedJobNumbers,
      allInvoicesForClosedJobs: allInvoicesForClosedJobs || [],
      outstandingInvoicesForClosedJobs: outstandingInvoicesForClosedJobs || [],
      totalOutstanding,
      similarJobNumbers: similarJobNumbers || [],
      counts: {
        allInvoices: allInvoicesForClosedJobs?.length || 0,
        outstandingInvoices: outstandingInvoicesForClosedJobs?.length || 0,
        similarNumbers: similarJobNumbers?.length || 0
      }
    });

  } catch (error) {
    console.error('Debug invoices for jobs error:', error);
    return NextResponse.json({
      error: 'Failed to debug invoices for jobs',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}