import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get most recent calls (use pulled_at since created_at doesn't exist)
    const { data: calls, error } = await supabase
      .from('openphone_calls')
      .select('*')
      .order('pulled_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: calls?.length || 0,
      mostRecentCall: calls?.[0] || null,
      allCalls: calls,
      message: calls && calls.length > 0
        ? `Found ${calls.length} call(s). Most recent: ${calls[0].call_date}`
        : 'No calls found in database'
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch calls',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
