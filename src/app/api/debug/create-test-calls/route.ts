import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Create test calls with realistic data
    const testCalls = [
      {
        call_id: `test-call-booked-${Date.now()}`,
        caller_number: '+15551234567',
        receiver_number: '+16094653759',
        direction: 'inbound',
        duration: 180, // 3 minutes
        call_date: new Date().toISOString(),
        transcript: 'Hi, I need someone to come out and fix my water heater. It\'s not working at all. Can you send someone today? Yes, that sounds good. What time? 2 PM works perfect. Thank you!',
        classified_as_booked: true,
        classified_as_outcome: 'Booked',
        service_type: 'Water Heater',
        pipeline_stage: 'Booked',
        sentiment: 'Positive',
        is_emergency: false,
        ai_confidence: 0.85,
        ai_summary: 'Customer booked water heater repair for 2 PM today',
        notes: 'Water heater not working, customer agreed to 2 PM appointment',
        pulled_at: new Date().toISOString()
      },
      {
        call_id: `test-call-inquiry-${Date.now()}`,
        caller_number: '+15551234568',
        receiver_number: '+16094653759',
        direction: 'inbound',
        duration: 120, // 2 minutes
        call_date: new Date().toISOString(),
        transcript: 'Hello, I\'m calling about getting an estimate for a bathroom renovation. We want to add a new bathroom upstairs. Can you give me a rough idea of the cost? I\'ll need to think about it and call you back.',
        classified_as_booked: false,
        classified_as_outcome: 'Inquiry',
        service_type: 'Plumbing',
        pipeline_stage: 'Quote Needed',
        sentiment: 'Neutral',
        is_emergency: false,
        ai_confidence: 0.75,
        ai_summary: 'Customer inquiring about bathroom renovation estimate',
        notes: 'New bathroom upstairs, needs estimate, will call back',
        pulled_at: new Date().toISOString()
      },
      {
        call_id: `test-call-emergency-${Date.now()}`,
        caller_number: '+15551234569',
        receiver_number: '+16094653759',
        direction: 'inbound',
        duration: 90, // 1.5 minutes
        call_date: new Date().toISOString(),
        transcript: 'This is an emergency! My basement is flooding and water is everywhere! I need someone here immediately! Please help!',
        classified_as_booked: true,
        classified_as_outcome: 'Emergency Booked',
        service_type: 'Plumbing',
        pipeline_stage: 'Emergency',
        sentiment: 'Negative',
        is_emergency: true,
        ai_confidence: 0.95,
        ai_summary: 'EMERGENCY: Basement flooding, customer needs immediate help',
        notes: 'Basement flooding emergency, dispatch immediately',
        pulled_at: new Date().toISOString()
      },
      {
        call_id: `test-call-followup-${Date.now()}`,
        caller_number: '+16094653759',
        receiver_number: '+15551234570',
        direction: 'outbound',
        duration: 60, // 1 minute
        call_date: new Date().toISOString(),
        transcript: 'Hi, this is Budd\'s Plumbing calling to follow up on the water heater repair we did last week. How is everything working? Great to hear! Let us know if you need anything else.',
        classified_as_booked: false,
        classified_as_outcome: 'Follow-up',
        service_type: 'Water Heater',
        pipeline_stage: 'Follow-Up',
        sentiment: 'Positive',
        is_emergency: false,
        ai_confidence: 0.8,
        ai_summary: 'Follow-up call on water heater repair, customer satisfied',
        notes: 'Follow-up on water heater repair, customer satisfied',
        pulled_at: new Date().toISOString()
      }
    ];

    console.log(`Creating ${testCalls.length} test calls...`);

    const { error: insertError } = await supabase
      .from('openphone_calls')
      .insert(testCalls);

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to insert test calls',
        details: insertError.message
      });
    }

    // Calculate expected metrics
    const inboundCalls = testCalls.filter(call => call.direction === 'inbound');
    const qualifiedInboundCalls = inboundCalls.filter(call => 
      call.duration >= 30 && 
      !call.caller_number.includes('spam') && 
      call.transcript.length > 50
    );
    const bookedCalls = inboundCalls.filter(call => call.classified_as_booked);
    const conversionRate = qualifiedInboundCalls.length > 0 ? 
      Math.round((bookedCalls.length / qualifiedInboundCalls.length) * 100) : 0;

    return NextResponse.json({
      success: true,
      message: `Created ${testCalls.length} test calls`,
      testCalls: testCalls.map(call => ({
        call_id: call.call_id,
        direction: call.direction,
        duration: call.duration,
        classified_as_booked: call.classified_as_booked,
        service_type: call.service_type,
        is_emergency: call.is_emergency
      })),
      expectedMetrics: {
        totalCalls: testCalls.length,
        inboundCalls: inboundCalls.length,
        qualifiedInboundCalls: qualifiedInboundCalls.length,
        bookedCalls: bookedCalls.length,
        conversionRate: `${conversionRate}%`
      }
    });

  } catch (error) {
    console.error('Create test calls error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get today's calls
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCalls } = await supabase
      .from('openphone_calls')
      .select('call_id, direction, duration, classified_as_booked, transcript, caller_number')
      .gte('call_date', `${today}T00:00:00`)
      .lt('call_date', `${today}T23:59:59`);

    if (!todayCalls) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch today\'s calls'
      });
    }

    // Calculate metrics
    const inboundCalls = todayCalls.filter(call => call.direction === 'inbound');
    const qualifiedInboundCalls = inboundCalls.filter(call => 
      (call.duration || 0) >= 30 && 
      !call.caller_number?.includes('spam') && 
      (call.transcript?.length || 0) > 50
    );
    const bookedCalls = inboundCalls.filter(call => call.classified_as_booked);
    const conversionRate = qualifiedInboundCalls.length > 0 ? 
      Math.round((bookedCalls.length / qualifiedInboundCalls.length) * 100) : 0;

    return NextResponse.json({
      success: true,
      today,
      calls: {
        total: todayCalls.length,
        inbound: inboundCalls.length,
        qualified: qualifiedInboundCalls.length,
        booked: bookedCalls.length,
        conversionRate: `${conversionRate}%`
      },
      sampleCalls: todayCalls.slice(0, 5).map(call => ({
        call_id: call.call_id,
        direction: call.direction,
        duration: call.duration,
        hasTranscript: !!(call.transcript && call.transcript.length > 0),
        classified_as_booked: call.classified_as_booked
      }))
    });

  } catch (error) {
    console.error('Get today calls error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
