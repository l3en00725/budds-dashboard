import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();

    // Check all invoices regardless of outstanding amount
    const { data: allInvoices, error } = await supabase
      .from('jobber_invoices')
      .select('amount_outstanding, amount, balance, status, invoice_number')
      .limit(10);

    // Check all invoices with outstanding amounts
    const { data: outstandingInvoices, error: outstandingError } = await supabase
      .from('jobber_invoices')
      .select('amount_outstanding, amount, balance, status, invoice_number')
      .gt('amount_outstanding', 0)
      .limit(10);

    // Check total count of all invoices
    const { count: totalInvoices } = await supabase
      .from('jobber_invoices')
      .select('*', { count: 'exact', head: true });

    // Check count with outstanding > 0
    const { count: outstandingCount } = await supabase
      .from('jobber_invoices')
      .select('*', { count: 'exact', head: true })
      .gt('amount_outstanding', 0);

    // Calculate total outstanding
    const totalOutstanding = outstandingInvoices?.reduce((sum, inv) => sum + (inv.amount_outstanding || 0), 0) || 0;

    return NextResponse.json({
      summary: {
        totalInvoices,
        outstandingCount,
        totalOutstandingAmount: totalOutstanding,
      },
      allInvoicesSample: allInvoices,
      sampleOutstandingInvoices: outstandingInvoices,
      errors: { error, outstandingError }
    });

  } catch (error) {
    console.error('Debug outstanding error:', error);
    return NextResponse.json({
      error: 'Failed to debug outstanding invoices',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}