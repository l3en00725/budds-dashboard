import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based: 9 = October
    const currentDayOfMonth = now.getDate();

    // Current calculations
    const startOfMonth = new Date(currentYear, currentMonth, 1); // October 2025
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1); // September 2025
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1); // November 2025
    const lastMonthSameDayEnd = new Date(currentYear, currentMonth - 1, currentDayOfMonth + 1);

    // Get current month invoices (full month so far)
    const { data: currentMonthInvoices } = await supabase
      .from('jobber_invoices')
      .select('amount, issue_date')
      .gte('issue_date', startOfMonth.toISOString().split('T')[0])
      .lt('issue_date', startOfNextMonth.toISOString().split('T')[0]);

    // Get last month invoices (full month)
    const { data: lastMonthInvoices } = await supabase
      .from('jobber_invoices')
      .select('amount, issue_date')
      .gte('issue_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('issue_date', startOfMonth.toISOString().split('T')[0]);

    // Get same period last month (only 2-3 days)
    const { data: lastMonthSamePeriodInvoices } = await supabase
      .from('jobber_invoices')
      .select('amount, issue_date')
      .gte('issue_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('issue_date', lastMonthSameDayEnd.toISOString().split('T')[0]);

    // Get current month payments (full month so far)
    const { data: currentMonthPayments } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date')
      .gte('payment_date', startOfMonth.toISOString().split('T')[0])
      .lt('payment_date', startOfNextMonth.toISOString().split('T')[0]);

    // Get last month payments (full month)
    const { data: lastMonthPayments } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date')
      .gte('payment_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('payment_date', startOfMonth.toISOString().split('T')[0]);

    // Get same period last month payments (only 2-3 days)
    const { data: lastMonthSamePeriodPayments } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date')
      .gte('payment_date', startOfLastMonth.toISOString().split('T')[0])
      .lt('payment_date', lastMonthSameDayEnd.toISOString().split('T')[0]);

    const debugData = {
      dateRanges: {
        currentMonth: `${startOfMonth.toISOString().split('T')[0]} to ${startOfNextMonth.toISOString().split('T')[0]}`,
        lastMonthFull: `${startOfLastMonth.toISOString().split('T')[0]} to ${startOfMonth.toISOString().split('T')[0]}`,
        lastMonthSamePeriod: `${startOfLastMonth.toISOString().split('T')[0]} to ${lastMonthSameDayEnd.toISOString().split('T')[0]}`,
      },
      invoiceData: {
        currentMonthTotal: currentMonthInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
        currentMonthCount: currentMonthInvoices?.length || 0,
        lastMonthFullTotal: lastMonthInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
        lastMonthFullCount: lastMonthInvoices?.length || 0,
        lastMonthSamePeriodTotal: lastMonthSamePeriodInvoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
        lastMonthSamePeriodCount: lastMonthSamePeriodInvoices?.length || 0,
      },
      paymentData: {
        currentMonthTotal: currentMonthPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0,
        currentMonthCount: currentMonthPayments?.length || 0,
        lastMonthFullTotal: lastMonthPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0,
        lastMonthFullCount: lastMonthPayments?.length || 0,
        lastMonthSamePeriodTotal: lastMonthSamePeriodPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0,
        lastMonthSamePeriodCount: lastMonthSamePeriodPayments?.length || 0,
      }
    };

    return NextResponse.json(debugData);
  } catch (error) {
    console.error('Debug financial data error:', error);
    return NextResponse.json({ error: 'Failed to debug financial data' }, { status: 500 });
  }
}