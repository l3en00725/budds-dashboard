import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find test payment records
    const { data: testPayments, error } = await supabase
      .from('jobber_payments')
      .select('*')
      .or('customer.like.%Test%,customer.like.%Daily Revenue Client%,customer.like.%Previous Client%')
      .order('payment_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test payments found',
      count: testPayments?.length || 0,
      testPayments: testPayments?.map(p => ({
        id: p.id,
        payment_id: p.payment_id,
        customer: p.customer,
        amount: p.amount,
        payment_date: p.payment_date,
        payment_method: p.payment_method,
        pulled_at: p.pulled_at
      }))
    });

  } catch (error) {
    console.error('Error finding test payments:', error);
    return NextResponse.json({
      error: 'Failed to find test payments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete test payment records
    const { data, error } = await supabase
      .from('jobber_payments')
      .delete()
      .or('customer.like.%Test%,customer.like.%Daily Revenue Client%,customer.like.%Previous Client%');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test payments deleted successfully',
      deletedCount: data?.length || 0
    });

  } catch (error) {
    console.error('Error deleting test payments:', error);
    return NextResponse.json({
      error: 'Failed to delete test payments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';