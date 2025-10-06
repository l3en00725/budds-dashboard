import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { call_id, classified_as_booked, classification_confidence } = await request.json();

    if (!call_id || classified_as_booked === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: call_id and classified_as_booked' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Update the call classification
    const { data, error } = await supabase
      .from('openphone_calls')
      .update({
        classified_as_booked,
        classification_confidence: classification_confidence || 1.0, // Manual override = 100% confidence
        outcome: classified_as_booked ? 'Appointment Discussed' : 'Not Interested',
        pipeline_stage: classified_as_booked ? 'Qualified' : 'Closed-Lost',
        notes: `Manual override applied on ${new Date().toISOString()}. Previous AI classification overridden by user.`
      })
      .eq('call_id', call_id)
      .select();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update classification', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    console.log(`Manual override applied to call ${call_id}: ${classified_as_booked ? 'Booked' : 'Not Booked'}`);

    return NextResponse.json({
      success: true,
      message: 'Classification updated successfully',
      call_id,
      new_classification: classified_as_booked,
      updated_call: data[0]
    });

  } catch (error) {
    console.error('Override classification API error:', error);
    return NextResponse.json(
      { error: 'Failed to override classification', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}