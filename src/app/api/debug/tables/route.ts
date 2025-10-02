import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Check if table exists and get all records
    const { data: allRecords, error } = await supabase
      .from('openphone_calls')
      .select('*')
      .order('pulled_at', { ascending: false })
      .limit(10);

    // Get table info
    const { data: count } = await supabase
      .from('openphone_calls')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      tableExists: error ? false : true,
      error: error?.message || null,
      totalRecords: count || 0,
      recentRecords: allRecords || [],
    });
  } catch (error) {
    console.error('Table debug error:', error);
    return NextResponse.json(
      { error: 'Table debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';