import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];

    // Create some test calls for today
    const testCalls = [
      {
        call_id: `test-today-1-${Date.now()}`,
        caller_number: '+15551234567',
        direction: 'inbound',
        duration: 180,
        transcript: 'Hi, I need a plumber urgently. My kitchen sink is leaking badly and water is everywhere. Can someone come out today? I can pay emergency rates.',
        classified_as_booked: true,
        classification_confidence: 0.92,
        call_date: `${today}T09:30:00`,
        pulled_at: new Date().toISOString(),
      },
      {
        call_id: `test-today-2-${Date.now()}`,
        caller_number: '+15559876543',
        direction: 'inbound',
        duration: 120,
        transcript: 'Hello, I would like to schedule a routine maintenance for my water heater. When do you have availability this week?',
        classified_as_booked: true,
        classification_confidence: 0.88,
        call_date: `${today}T11:15:00`,
        pulled_at: new Date().toISOString(),
      },
      {
        call_id: `test-today-3-${Date.now()}`,
        caller_number: '+15555551234',
        direction: 'inbound',
        duration: 45,
        transcript: 'Hi, I was calling to ask about your pricing for toilet installation. Just getting quotes.',
        classified_as_booked: false,
        classification_confidence: 0.75,
        call_date: `${today}T14:20:00`,
        pulled_at: new Date().toISOString(),
      },
      {
        call_id: `test-today-4-${Date.now()}`,
        caller_number: '+15558887777',
        direction: 'inbound',
        duration: 300,
        transcript: 'We have a burst pipe in our basement! This is an emergency. How quickly can you get here? Water is everywhere!',
        classified_as_booked: true,
        classification_confidence: 0.95,
        call_date: `${today}T16:45:00`,
        pulled_at: new Date().toISOString(),
      },
      {
        call_id: `test-today-5-${Date.now()}`,
        caller_number: '+15554443333',
        direction: 'inbound',
        duration: 25,
        transcript: 'Wrong number, sorry.',
        classified_as_booked: false,
        classification_confidence: 0.2,
        call_date: `${today}T17:05:00`,
        pulled_at: new Date().toISOString(),
      }
    ];

    // Insert test calls
    const { data, error } = await supabase
      .from('openphone_calls')
      .upsert(testCalls, { onConflict: 'call_id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      callsAdded: testCalls.length,
      date: today,
      message: `Added ${testCalls.length} test calls for today (${today})`
    });

  } catch (error) {
    console.error('Error adding test calls:', error);
    return NextResponse.json(
      { error: 'Failed to add test calls', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}