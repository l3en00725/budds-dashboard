import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();

    // Get all October 2025 payments
    const { data: octoberPayments } = await supabase
      .from('jobber_payments')
      .select('*')
      .gte('payment_date', '2025-10-01')
      .lt('payment_date', '2025-11-01')
      .order('payment_date', { ascending: true });

    return NextResponse.json({
      count: octoberPayments?.length || 0,
      totalAmount: octoberPayments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0,
      payments: octoberPayments || []
    });
  } catch (error) {
    console.error('Debug October payments error:', error);
    return NextResponse.json({ error: 'Failed to debug October payments' }, { status: 500 });
  }
}