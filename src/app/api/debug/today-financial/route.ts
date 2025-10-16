import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const today = new Date().toISOString().split('T')[0]; // 2025-10-10

    console.log('🔍 DEBUG - Checking financial activity for:', today);

    // Check payments collected today
    const { data: paymentsToday } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date, payment_id')
      .gte('payment_date', today)
      .lt('payment_date', `${today}T23:59:59`);

    const totalPaymentsToday = paymentsToday?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Check invoices issued today
    const { data: invoicesToday } = await supabase
      .from('jobber_invoices')
      .select('amount, issue_date, invoice_id')
      .gte('issue_date', today)
      .lt('issue_date', `${today}T23:59:59`);

    const totalInvoicesToday = invoicesToday?.reduce((sum, invoice) => sum + (invoice.amount || 0), 0) || 0;

    // Get total counts for context
    const { count: totalPayments } = await supabase
      .from('jobber_payments')
      .select('*', { count: 'exact', head: true });

    const { count: totalInvoices } = await supabase
      .from('jobber_invoices')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      date: today,
      paymentsCollectedToday: {
        amount: totalPaymentsToday,
        count: paymentsToday?.length || 0,
        payments: paymentsToday || []
      },
      invoicesIssuedToday: {
        amount: totalInvoicesToday,
        count: invoicesToday?.length || 0,
        invoices: invoicesToday || []
      },
      context: {
        totalPaymentsInDB: totalPayments,
        totalInvoicesInDB: totalInvoices
      }
    });

  } catch (error) {
    console.error('Debug today financial error:', error);
    return NextResponse.json({
      error: 'Failed to debug today financial',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}