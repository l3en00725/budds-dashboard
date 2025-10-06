import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { BusinessDateUtils } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const date = searchParams.get('date') || BusinessDateUtils.getTodayBusinessDate();
    const pipelineStage = searchParams.get('stage');

    const supabase = createServiceRoleClient();

    // Base query for recent calls (today and yesterday for better data visibility)
    const yesterdayStr = BusinessDateUtils.getYesterdayBusinessDate();

    let query = supabase
      .from('openphone_calls')
      .select('*')
      .gte('call_date', `${yesterdayStr}T00:00:00`)  // Include yesterday
      .lt('call_date', `${date}T23:59:59`)  // Up to end of today
      .order('call_date', { ascending: false });

    // Apply filters based on type
    switch (type) {
      case 'total':
        // No additional filters - show all calls
        break;

      case 'appointments':
        query = query.eq('classified_as_booked', true);
        break;

      case 'emergency':
        // Look for emergency-related keywords in transcript
        query = query.or('transcript.ilike.%emergency%,transcript.ilike.%urgent%,transcript.ilike.%burst%');
        break;

      case 'followups':
        // Look for follow-up scheduled keywords in transcript
        query = query.or('transcript.ilike.%follow%,transcript.ilike.%callback%,transcript.ilike.%call back%,transcript.ilike.%schedule%');
        break;

      case 'not_interested':
        query = query.eq('classified_as_booked', false);
        break;

      case 'pipeline':
        // For pipeline filtering, use simpler logic based on what we have
        if (pipelineStage) {
          switch (pipelineStage.toLowerCase()) {
            case 'qualified':
              query = query.eq('classified_as_booked', true);
              break;
            case 'followup':
              query = query.or('transcript.ilike.%follow%,transcript.ilike.%callback%,transcript.ilike.%call back%');
              break;
            case 'newleads':
              query = query.eq('classified_as_booked', false).gte('duration', 30);
              break;
            case 'closedlost':
              query = query.eq('classified_as_booked', false).lt('duration', 30);
              break;
            default:
              // If stage not recognized, show all calls
              break;
          }
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    const { data: calls, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch call details', details: error.message },
        { status: 500 }
      );
    }

    // Transform the data to match the expected interface
    const transformedCalls = calls?.map(call => ({
      call_id: call.call_id,
      caller_number: call.caller_number || 'Unknown',
      direction: call.direction || 'inbound',
      duration: call.duration || 0,
      call_date: call.call_date,
      transcript: call.transcript,
      classified_as_booked: call.classified_as_booked,
      classification_confidence: call.classification_confidence,
      outcome: call.outcome || null,
      pipeline_stage: call.pipeline_stage || null,
      sentiment: call.sentiment || null,
      notes: call.notes || null
    })) || [];

    return NextResponse.json(transformedCalls);

  } catch (error) {
    console.error('Call details API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}