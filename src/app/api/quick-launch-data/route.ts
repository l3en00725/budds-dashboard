import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Today's date for test calls
    const today = new Date().toISOString().split('T')[0];

    const testCalls = [
      {
        call_id: 'today-call-1',
        caller_number: '+15551234567',
        direction: 'inbound',
        duration: 180,
        call_date: `${today}T09:30:00`,
        transcript: 'Customer called about a drain clog. Very urgent - kitchen sink backing up. Scheduled appointment for tomorrow morning at 9 AM.',
        classified_as_booked: true,
        classification_confidence: 95,
        outcome: 'appointment_scheduled',
        sentiment: 'positive'
      },
      {
        call_id: 'today-call-2',
        caller_number: '+15559876543',
        direction: 'inbound',
        duration: 45,
        call_date: `${today}T11:15:00`,
        transcript: 'Just calling to ask about pricing for water heater installation. Not ready to book yet.',
        classified_as_booked: false,
        classification_confidence: 88,
        outcome: 'information_request',
        sentiment: 'neutral'
      },
      {
        call_id: 'today-call-3',
        caller_number: '+15551112222',
        direction: 'inbound',
        duration: 320,
        call_date: `${today}T14:20:00`,
        transcript: 'EMERGENCY - burst pipe in basement! Water everywhere! Please come ASAP!',
        classified_as_booked: true,
        classification_confidence: 98,
        outcome: 'emergency_scheduled',
        sentiment: 'urgent'
      },
      {
        call_id: 'today-call-4',
        caller_number: '+15553334444',
        direction: 'outbound',
        duration: 95,
        call_date: `${today}T16:45:00`,
        transcript: 'Follow-up call to customer about estimate provided last week. Customer wants to think about it more.',
        classified_as_booked: false,
        classification_confidence: 75,
        outcome: 'follow_up_needed',
        sentiment: 'positive'
      },
      {
        call_id: 'today-call-5',
        caller_number: '+15555556666',
        direction: 'inbound',
        duration: 240,
        call_date: `${today}T10:30:00`,
        transcript: 'Toilet repair needed. Customer available this week for appointment.',
        classified_as_booked: true,
        classification_confidence: 92,
        outcome: 'appointment_scheduled',
        sentiment: 'positive'
      }
    ];

    const { error } = await supabase
      .from('openphone_calls')
      .upsert(testCalls, { onConflict: 'call_id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Launch-ready call data inserted successfully',
      callsInserted: testCalls.length,
      summary: {
        totalCalls: testCalls.length,
        appointmentsBooked: testCalls.filter(c => c.classified_as_booked).length,
        emergencyCalls: testCalls.filter(c => c.transcript.includes('EMERGENCY')).length
      }
    });

  } catch (error) {
    console.error('Quick launch data error:', error);
    return NextResponse.json(
      { error: 'Failed to insert launch data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}