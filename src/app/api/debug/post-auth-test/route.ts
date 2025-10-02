import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];

    // Test all data sources after authentication
    const results = await Promise.all([
      // Check if we have invoice data now
      supabase
        .from('jobber_invoices')
        .select('invoice_id, amount, issue_date, status', { count: 'exact' })
        .limit(5),

      // Check if we have payment data now
      supabase
        .from('jobber_payments')
        .select('payment_id, amount, payment_date', { count: 'exact' })
        .limit(5),

      // Check today's invoices specifically
      supabase
        .from('jobber_invoices')
        .select('invoice_id, amount, issue_date')
        .gte('issue_date', today)
        .lt('issue_date', `${today}T23:59:59`),

      // Check today's payments specifically
      supabase
        .from('jobber_payments')
        .select('payment_id, amount, payment_date')
        .gte('payment_date', today)
        .lt('payment_date', `${today}T23:59:59`),

      // Check outstanding AR
      supabase
        .from('jobber_invoices')
        .select('invoice_id, amount, balance, status')
        .neq('status', 'paid')
        .gt('balance', 0)
        .limit(10)
    ]);

    const [invoicesAll, paymentsAll, invoicesToday, paymentsToday, arOutstanding] = results;

    // Calculate totals
    const todayInvoicesTotal = invoicesToday.data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const todayPaymentsTotal = paymentsToday.data?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;
    const totalAR = arOutstanding.data?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      today,
      expectedVsActual: {
        expected: {
          invoicedToday: 11474.76,
          paidToday: 1827.31,
          arOutstanding: 83700
        },
        actual: {
          invoicedToday: todayInvoicesTotal,
          paidToday: todayPaymentsTotal,
          arOutstanding: totalAR
        },
        match: {
          invoices: Math.abs(todayInvoicesTotal - 11474.76) < 1,
          payments: Math.abs(todayPaymentsTotal - 1827.31) < 1,
          ar: Math.abs(totalAR - 83700) < 100
        }
      },
      counts: {
        totalInvoices: invoicesAll.count || 0,
        totalPayments: paymentsAll.count || 0,
        invoicesToday: invoicesToday.data?.length || 0,
        paymentsToday: paymentsToday.data?.length || 0,
        outstandingInvoices: arOutstanding.data?.length || 0
      },
      samples: {
        invoicesToday: invoicesToday.data?.slice(0, 3),
        paymentsToday: paymentsToday.data?.slice(0, 3),
        arOutstanding: arOutstanding.data?.slice(0, 3)
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}