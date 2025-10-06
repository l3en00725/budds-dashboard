import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Get today and yesterday dates
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString();
    const yesterdayStr = yesterday.toISOString();

    // Create test call data for today and yesterday
    const testCalls = [
      // Today's calls
      {
        call_id: 'test-call-today-1',
        caller_number: '+15551234567',
        direction: 'inbound',
        duration: 180,
        call_date: todayStr,
        transcript: 'Customer called about a drain clog. Very urgent - kitchen sink backing up. Scheduled appointment for tomorrow morning at 9 AM.',
        classified_as_booked: true,
        classification_confidence: 95,
        outcome: 'appointment_scheduled',
        sentiment: 'positive'
      },
      {
        call_id: 'test-call-today-2',
        caller_number: '+15559876543',
        direction: 'inbound',
        duration: 45,
        call_date: todayStr,
        transcript: 'Just calling to ask about pricing for water heater installation. Not ready to book yet.',
        classified_as_booked: false,
        classification_confidence: 88,
        outcome: 'information_request',
        sentiment: 'neutral'
      },
      {
        call_id: 'test-call-today-3',
        caller_number: '+15551112222',
        direction: 'inbound',
        duration: 320,
        call_date: todayStr,
        transcript: 'EMERGENCY - burst pipe in basement! Water everywhere! Please come ASAP!',
        classified_as_booked: true,
        classification_confidence: 98,
        outcome: 'emergency_scheduled',
        sentiment: 'urgent'
      },
      {
        call_id: 'test-call-today-4',
        caller_number: '+15553334444',
        direction: 'outbound',
        duration: 95,
        call_date: todayStr,
        transcript: 'Follow-up call to customer about estimate provided last week. Customer wants to think about it more.',
        classified_as_booked: false,
        classification_confidence: 75,
        outcome: 'follow_up_needed',
        sentiment: 'positive'
      },
      // Yesterday's calls
      {
        call_id: 'test-call-yesterday-1',
        caller_number: '+15555556666',
        direction: 'inbound',
        duration: 240,
        call_date: yesterdayStr,
        transcript: 'Toilet repair needed. Customer available this week for appointment.',
        classified_as_booked: true,
        classification_confidence: 92,
        outcome: 'appointment_scheduled',
        sentiment: 'positive'
      }
    ];

    // Insert test calls
    const { data, error } = await supabase
      .from('openphone_calls')
      .insert(testCalls);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Test call data inserted successfully',
      callsInserted: testCalls.length
    });

  } catch (error) {
    console.error('Test call data error:', error);
    return NextResponse.json(
      { error: 'Failed to insert test call data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}