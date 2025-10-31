import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getTodayStartET, getTomorrowStartET } from '@/lib/timezone-utils';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const todayStart = getTodayStartET();
    const tomorrowStart = getTomorrowStartET();

    // Get all calls marked as booked today
    const { data: calls, error } = await supabase
      .from('openphone_calls')
      .select('call_id, caller_number, call_date, duration, direction, classified_as_booked, ai_summary, ai_confidence, transcript, pipeline_stage, service_type, classified_as_outcome, notes')
      .eq('classified_as_booked', true)
      .gte('call_date', todayStart.toISOString())
      .lt('call_date', tomorrowStart.toISOString())
      .not('call_id', 'like', 'test%')
      .not('call_id', 'like', 'ACtest%')
      .order('call_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Separate by direction
    const inbound = calls?.filter(c => !c.direction || c.direction === 'inbound' || c.direction === 'incoming') || [];
    const outbound = calls?.filter(c => c.direction === 'outbound' || c.direction === 'outgoing') || [];

    // Analyze each call for booking indicators
    const analyzed = calls?.map(call => {
      const transcript = call.transcript || '';
      const transcriptLower = transcript.toLowerCase();
      
      // Check for actual booking indicators
      const hasSchedulingLanguage = 
        /when can you come|what time can you|tomorrow at|monday|tuesday|wednesday|thursday|friday|i'?m available at|send someone out|how soon can you get here/i.test(transcript);
      
      const hasAgreementLanguage = 
        /go ahead|yes please|book it|that works|sounds good|ok.*come out|schedule.*for/i.test(transcript);
      
      const hasServiceFeeDiscussion = 
        /service (charge|fee|call)|diagnostic fee|\$\d+.*fee|fee.*\$\d+/i.test(transcript);
      
      // Check for exclusion patterns (should NOT be booked)
      const isVendorCall = 
        /calling from|i'?m calling from/i.test(transcript.substring(0, 200));
      
      const isInvoiceBilling = 
        /invoice|bill|receipt|payment|charge.*account/i.test(transcript);
      
      const isPartsFollowup = 
        /part arrived|part is here|i have the part|part came in/i.test(transcript);
      
      const isStatusCheck = 
        /checking status|just following up|what'?s the status/i.test(transcript);
      
      const isPermitWait = 
        /waiting.*permit|permit.*waiting|inspection/i.test(transcript);
      
      // Score the call
      let bookingScore = 0;
      const reasons = [];
      
      if (hasSchedulingLanguage) { bookingScore += 3; reasons.push('✓ Has scheduling language'); }
      if (hasAgreementLanguage) { bookingScore += 3; reasons.push('✓ Has agreement language'); }
      if (hasServiceFeeDiscussion) { bookingScore += 2; reasons.push('✓ Service fee discussed'); }
      
      if (isVendorCall) { bookingScore -= 10; reasons.push('✗ Vendor/contractor call'); }
      if (isInvoiceBilling) { bookingScore -= 10; reasons.push('✗ Invoice/billing inquiry'); }
      if (isPartsFollowup) { bookingScore -= 10; reasons.push('✗ Parts follow-up'); }
      if (isStatusCheck) { bookingScore -= 10; reasons.push('✗ Status check'); }
      if (isPermitWait) { bookingScore -= 10; reasons.push('✗ Permit/inspection wait'); }
      
      const assessment = bookingScore >= 5 ? 'LIKELY BOOKED' : 
                        bookingScore >= 0 ? 'MAYBE BOOKED' : 
                        'LIKELY NOT BOOKED';
      
      return {
        ...call,
        bookingScore,
        assessment,
        reasons,
        hasSchedulingLanguage,
        hasAgreementLanguage,
        hasServiceFeeDiscussion,
        isVendorCall,
        isInvoiceBilling,
        isPartsFollowup,
        isStatusCheck,
        isPermitWait,
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 300)
      };
    }) || [];

    // Group by assessment
    const likelyBooked = analyzed.filter(c => c.assessment === 'LIKELY BOOKED');
    const maybeBooked = analyzed.filter(c => c.assessment === 'MAYBE BOOKED');
    const likelyNotBooked = analyzed.filter(c => c.assessment === 'LIKELY NOT BOOKED');

    return NextResponse.json({
      summary: {
        total: calls?.length || 0,
        inbound: inbound.length,
        outbound: outbound.length,
        likelyBooked: likelyBooked.length,
        maybeBooked: maybeBooked.length,
        likelyNotBooked: likelyNotBooked.length,
        accuracy: calls?.length ? `${Math.round((likelyBooked.length / calls.length) * 100)}%` : '0%'
      },
      likelyBooked,
      maybeBooked,
      likelyNotBooked,
      allCalls: analyzed
    });

  } catch (error) {
    console.error('Error reviewing booked calls:', error);
    return NextResponse.json({
      error: 'Failed to review calls',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


