import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();

    // Check the last sync times for payments
    const { data: lastPaymentSync } = await supabase
      .from('jobber_payments')
      .select('pulled_at')
      .order('pulled_at', { ascending: false })
      .limit(1)
      .single();

    // Check recent payments from the last few days
    const { data: recentPayments } = await supabase
      .from('jobber_payments')
      .select('payment_date, amount, pulled_at')
      .gte('payment_date', '2025-09-30')
      .order('payment_date', { ascending: false });

    // Check if sync endpoints exist and are accessible
    const syncEndpoints = [
      '/api/sync/jobber',
      '/api/sync/jobber-financial'
    ];

    return NextResponse.json({
      lastPaymentSync: lastPaymentSync?.pulled_at || 'No payments found',
      recentPaymentsCount: recentPayments?.length || 0,
      recentPayments: recentPayments?.slice(0, 10) || [], // Show first 10
      availableSyncEndpoints: syncEndpoints,
      recommendation: recentPayments?.length === 0 || !lastPaymentSync?.pulled_at
        ? 'Run payment sync - no recent payment data found'
        : 'Payment data exists but may need updating'
    });
  } catch (error) {
    console.error('Debug sync status error:', error);
    return NextResponse.json({ error: 'Failed to debug sync status', details: error.message }, { status: 500 });
  }
}