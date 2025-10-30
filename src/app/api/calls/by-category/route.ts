import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getTodayStartET, getTomorrowStartET } from '@/lib/timezone-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const date = searchParams.get('date') || 'today';

    const supabase = createServiceRoleClient();

    // Get today's date range in Eastern Time using utility functions
    const todayStart = getTodayStartET();
    const tomorrowStart = getTomorrowStartET();

    let query = supabase
      .from('openphone_calls')
      .select('*')
      .gte('call_date', todayStart.toISOString())
      .lt('call_date', tomorrowStart.toISOString())
      .not('call_id', 'like', 'test%')         // Exclude test calls
      .not('call_id', 'like', 'ACtest%')       // Exclude test calls
      .order('call_date', { ascending: false });

    // Filter by category
    switch (category) {
      case 'booked':
        query = query.eq('classified_as_booked', true);
        break;
      case 'emergency':
        // Use is_emergency field if available, otherwise fallback to transcript search
        query = query.or('is_emergency.eq.true,transcript.ilike.%emergency%,transcript.ilike.%leak%,transcript.ilike.%flooding%');
        break;
      case 'followup':
        query = query.or('transcript.ilike.%call back%,transcript.ilike.%follow up%');
        break;
      case 'total':
        // No filter - get all calls
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        );
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Error fetching calls:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calls', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
      date,
      count: calls?.length || 0,
      calls: calls || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
