import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();

    // Get the 20 most recent payments by pulled_at to see what was just synced
    const { data: recentPayments } = await supabase
      .from('jobber_payments')
      .select('payment_id, amount, payment_date, pulled_at, customer')
      .order('pulled_at', { ascending: false })
      .limit(20);

    // Get payments from the last 7 days to see the pattern
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: lastWeekPayments } = await supabase
      .from('jobber_payments')
      .select('payment_id, amount, payment_date, pulled_at, customer')
      .gte('payment_date', sevenDaysAgoStr)
      .order('payment_date', { ascending: false });

    // Count total payments
    const { count: totalPayments } = await supabase
      .from('jobber_payments')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      totalPaymentsInDB: totalPayments,
      mostRecentlyPulled: recentPayments || [],
      paymentsLastWeek: lastWeekPayments || [],
      lookingForAmount: 8415,
      expectingToday: '2025-10-10'
    });

  } catch (error) {
    console.error('Debug all recent payments error:', error);
    return NextResponse.json({
      error: 'Failed to debug recent payments',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}