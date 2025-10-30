import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Test scenarios for plumbing/HVAC business
    const testCalls = [
      {
        // Scenario 1: Booked Water Heater Repair
        call_id: 'test-water-heater-booked-001',
        caller_number: '+15551234567',
        receiver_number: '+15559876543',
        direction: 'inbound',
        duration: 180,
        call_date: new Date().toISOString(),
        transcript: `Hi, I need someone to look at my water heater. It's not producing hot water anymore. I think the pilot light might be out. Can you send someone out today? What time can you be here? I'm available after 2 PM. The service call fee is $89? That's fine, go ahead and book it. My address is 123 Main Street.`,
        classified_as_booked: true,
        service_type: 'Water Heater',
        is_emergency: false,
        sentiment: 'Positive',
        ai_confidence: 0.95
      },
      {
        // Scenario 2: Emergency Burst Pipe
        call_id: 'test-emergency-pipe-002',
        caller_number: '+15551234568',
        receiver_number: '+15559876543',
        direction: 'inbound',
        duration: 120,
        call_date: new Date().toISOString(),
        transcript: `EMERGENCY! I have a burst pipe in my basement and water is everywhere! I need someone here immediately! The water is flooding my basement! Can you get someone here as soon as possible? This is urgent!`,
        classified_as_booked: true,
        service_type: 'Plumbing',
        is_emergency: true,
        sentiment: 'Negative',
        ai_confidence: 0.98
      },
      {
        // Scenario 3: HVAC Maintenance Inquiry
        call_id: 'test-hvac-inquiry-003',
        caller_number: '+15551234569',
        receiver_number: '+15559876543',
        direction: 'inbound',
        duration: 90,
        call_date: new Date().toISOString(),
        transcript: `Hi, I'm calling about my furnace. It's been making strange noises lately and I'm wondering if it needs maintenance. What would that cost? I'm not sure if I want to book anything yet, just looking for information.`,
        classified_as_booked: false,
        service_type: 'HVAC',
        is_emergency: false,
        sentiment: 'Neutral',
        ai_confidence: 0.85
      },
      {
        // Scenario 4: Drain Cleaning - Booked
        call_id: 'test-drain-booked-004',
        caller_number: '+15551234570',
        receiver_number: '+15559876543',
        direction: 'inbound',
        duration: 150,
        call_date: new Date().toISOString(),
        transcript: `My kitchen sink is completely backed up and I can't use it. I need drain cleaning service. How much does that cost? $150? That sounds reasonable. When can you come? I'm available tomorrow morning. Yes, book it for tomorrow.`,
        classified_as_booked: true,
        service_type: 'Drain',
        is_emergency: false,
        sentiment: 'Positive',
        ai_confidence: 0.92
      },
      {
        // Scenario 5: Price Shopping - Not Booked
        call_id: 'test-price-shopping-005',
        caller_number: '+15551234571',
        receiver_number: '+15559876543',
        direction: 'inbound',
        duration: 60,
        call_date: new Date().toISOString(),
        transcript: `I need a plumber to fix my toilet. How much do you charge? $120? That's more than I expected. Let me think about it and call you back. I'm getting quotes from a few different companies.`,
        classified_as_booked: false,
        service_type: 'Plumbing',
        is_emergency: false,
        sentiment: 'Neutral',
        ai_confidence: 0.80
      },
      {
        // Scenario 6: Follow-up Call (Outbound)
        call_id: 'test-follow-up-006',
        caller_number: '+15559876543',
        receiver_number: '+15551234572',
        direction: 'outbound',
        duration: 45,
        call_date: new Date().toISOString(),
        transcript: `Hi, this is John from ABC Plumbing. I'm calling to follow up on the water heater repair we did last week. How is everything working? Are you satisfied with the service?`,
        classified_as_booked: false,
        service_type: null,
        is_emergency: false,
        sentiment: 'Positive',
        ai_confidence: 0.90
      },
      {
        // Scenario 7: No Heat Emergency (Winter)
        call_id: 'test-no-heat-emergency-007',
        caller_number: '+15551234573',
        receiver_number: '+15559876543',
        direction: 'inbound',
        duration: 200,
        call_date: new Date().toISOString(),
        transcript: `My furnace stopped working and I have no heat! It's freezing in here and I have small children. This is an emergency! I need someone here immediately! I don't care about the cost, just get someone here now!`,
        classified_as_booked: true,
        service_type: 'HVAC',
        is_emergency: true,
        sentiment: 'Negative',
        ai_confidence: 0.97
      },
      {
        // Scenario 8: AC Not Working (Summer)
        call_id: 'test-ac-emergency-008',
        caller_number: '+15551234574',
        receiver_number: '+15559876543',
        direction: 'inbound',
        duration: 100,
        call_date: new Date().toISOString(),
        transcript: `My air conditioning stopped working and it's 95 degrees outside! I need someone to come fix it today. This is urgent! Can you get someone here as soon as possible?`,
        classified_as_booked: true,
        service_type: 'HVAC',
        is_emergency: true,
        sentiment: 'Negative',
        ai_confidence: 0.95
      }
    ];

    // Insert test calls
    const { data, error } = await supabase
      .from('openphone_calls')
      .upsert(testCalls, { onConflict: 'call_id' });

    if (error) {
      console.error('Error inserting test calls:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${testCalls.length} test calls for plumbing/HVAC scenarios`,
      testCalls: testCalls.map(call => ({
        call_id: call.call_id,
        service_type: call.service_type,
        classified_as_booked: call.classified_as_booked,
        is_emergency: call.is_emergency,
        sentiment: call.sentiment,
        ai_confidence: call.ai_confidence
      }))
    });

  } catch (error) {
    console.error('Test calls creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to create test plumbing/HVAC call scenarios',
    scenarios: [
      'Booked Water Heater Repair',
      'Emergency Burst Pipe', 
      'HVAC Maintenance Inquiry',
      'Drain Cleaning - Booked',
      'Price Shopping - Not Booked',
      'Follow-up Call (Outbound)',
      'No Heat Emergency (Winter)',
      'AC Not Working (Summer)'
    ]
  });
}
