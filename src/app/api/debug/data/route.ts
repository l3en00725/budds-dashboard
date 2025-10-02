import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get sample of each data type
    const { data: jobs } = await supabase
      .from('jobber_jobs')
      .select('*')
      .limit(5);

    const { data: quotes } = await supabase
      .from('jobber_quotes')
      .select('*')
      .limit(5);

    const { data: invoices } = await supabase
      .from('jobber_invoices')
      .select('*')
      .limit(5);

    const { data: payments } = await supabase
      .from('jobber_payments')
      .select('*')
      .limit(5);

    const { data: syncLogs } = await supabase
      .from('sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    return NextResponse.json({
      jobs: {
        count: jobs?.length || 0,
        sample: jobs
      },
      quotes: {
        count: quotes?.length || 0,
        sample: quotes
      },
      invoices: {
        count: invoices?.length || 0,
        sample: invoices
      },
      payments: {
        count: payments?.length || 0,
        sample: payments
      },
      syncLogs: syncLogs
    });
  } catch (error) {
    console.error('Debug data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}