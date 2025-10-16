import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();
    const today = new Date().toISOString().split('T')[0]; // 2025-10-10

    console.log('🔍 PAYMENTS INVESTIGATION - Today is:', today);

    // 1. Check the most recent payments to see date formats
    const { data: recentPayments } = await supabase
      .from('jobber_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Recent payments sample:', recentPayments?.slice(0, 3));

    // 2. Check payments from the last 3 days to see if any exist
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    const { data: lastThreeDays } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date, created_at')
      .gte('payment_date', threeDaysAgoStr)
      .order('payment_date', { ascending: false });

    console.log(`Payments in last 3 days (since ${threeDaysAgoStr}):`, lastThreeDays?.length);

    // 3. Check if payment_date field exists and what values it has
    const { data: paymentDateSample } = await supabase
      .from('jobber_payments')
      .select('payment_date')
      .not('payment_date', 'is', null)
      .limit(5);

    // 4. Try different date filter approaches for today
    const filters = [
      { name: 'exact_date', filter: today },
      { name: 'starts_with', filter: `${today}%` },
      { name: 'gte_today', filter: today }
    ];

    const results = {};
    for (const { name, filter } of filters) {
      const { data, count } = await supabase
        .from('jobber_payments')
        .select('amount, payment_date', { count: 'exact' })
        .gte('payment_date', filter);

      results[name] = {
        count,
        totalAmount: data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
        sample: data?.slice(0, 3) || []
      };
    }

    // 5. Check if there's a different date field being used
    const { data: allColumns } = await supabase
      .from('jobber_payments')
      .select('*')
      .limit(1);

    return NextResponse.json({
      today,
      investigation: {
        recentPaymentsSample: recentPayments?.slice(0, 3) || [],
        lastThreeDaysCount: lastThreeDays?.length || 0,
        lastThreeDaysPayments: lastThreeDays || [],
        paymentDateSamples: paymentDateSample || [],
        filterTests: results,
        samplePaymentStructure: allColumns?.[0] || null
      }
    });

  } catch (error) {
    console.error('Payments investigation error:', error);
    return NextResponse.json({
      error: 'Failed to investigate payments',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}