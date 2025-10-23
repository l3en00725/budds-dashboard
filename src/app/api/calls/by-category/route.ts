import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const date = searchParams.get('date') || 'today';

    const supabase = createServiceRoleClient();

    // Get today's date range in EST timezone
    const getTodayEST = () => {
      const now = new Date();

      // Convert to EST (America/New_York timezone)
      const estFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });

      const parts = estFormatter.formatToParts(now);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;

      const todayEST = `${year}-${month}-${day}`;

      // Start of day in EST (midnight EST)
      const startEST = new Date(`${todayEST}T00:00:00-05:00`).toISOString();

      // End of day in EST (11:59:59 PM EST)
      const endEST = new Date(`${todayEST}T23:59:59-05:00`).toISOString();

      return { start: startEST, end: endEST };
    };

    const { start: todayStart, end: todayEnd } = getTodayEST();

    let query = supabase
      .from('openphone_calls')
      .select('*')
      .gte('call_date', todayStart)
      .lte('call_date', todayEnd)
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
