import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0]; // 2025-10-06

    console.log('Checking payments for date:', today);

    // Check if payments table exists and has data
    const { data: paymentsToday, error: paymentsError } = await supabase
      .from('jobber_payments')
      .select('amount, payment_date, customer, payment_method')
      .eq('payment_date', today)  // Use exact date match like in dashboard service
      .gt('amount', 0);

    console.log('Payments query result:', { paymentsToday, paymentsError });

    // Also check all payments (limit 10) to see what dates we have - without client_name
    const { data: allPayments, error: allError } = await supabase
      .from('jobber_payments')
      .select('*')
      .order('payment_date', { ascending: false })
      .limit(10);

    console.log('Recent payments sample:', { allPayments, allError });

    return NextResponse.json({
      today,
      paymentsToday: paymentsToday || [],
      paymentsError,
      recentPayments: allPayments || [],
      allError,
      totalPaymentsToday: paymentsToday?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
    });
  } catch (error) {
    console.error('Debug payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments debug info' }, { status: 500 });
  }
}