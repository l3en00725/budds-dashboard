import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Identifying SMS messages in openphone_calls table...');

    const supabase = createServiceRoleClient();

    // Get all calls from the database
    const { data: allCalls, error } = await supabase
      .from('openphone_calls')
      .select('*')
      .order('call_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Total records in openphone_calls: ${allCalls?.length || 0}`);

    // Identify likely SMS messages based on characteristics:
    // 1. duration = 0 (SMS don't have call duration)
    // 2. No transcript or very short transcript
    // 3. Specific phone numbers that are SMS-only (like 770-415-8949)

    const likelySMS = allCalls?.filter(call => {
      // Duration = 0 is a strong indicator
      const zeroDuration = call.duration === 0;

      // No transcript or empty transcript
      const noTranscript = !call.transcript || call.transcript.trim() === '' ||
                           call.transcript === 'Test webhook - no transcript';

      // Known SMS numbers (from the user's description)
      const knownSMSNumber = call.caller_number?.includes('770-415-8949');

      return zeroDuration || knownSMSNumber;
    }) || [];

    console.log(`Found ${likelySMS.length} likely SMS messages`);

    // Group by characteristics
    const zeroDurationCount = likelySMS.filter(c => c.duration === 0).length;
    const noTranscriptCount = likelySMS.filter(c => !c.transcript || c.transcript.trim() === '').length;
    const knownSMSCount = likelySMS.filter(c => c.caller_number?.includes('770-415-8949')).length;

    // Sample records
    const sampleRecords = likelySMS.slice(0, 10).map(call => ({
      id: call.id,
      call_id: call.call_id,
      caller_number: call.caller_number,
      duration: call.duration,
      call_date: call.call_date,
      transcript_preview: call.transcript?.substring(0, 50) || 'None'
    }));

    // Export IDs for deletion
    const idsToDelete = likelySMS.map(c => c.id);

    return NextResponse.json({
      summary: {
        totalRecords: allCalls?.length || 0,
        likelySMSCount: likelySMS.length,
        actualCallsCount: (allCalls?.length || 0) - likelySMS.length,
      },
      breakdown: {
        zeroDuration: zeroDurationCount,
        noTranscript: noTranscriptCount,
        knownSMSNumber: knownSMSCount,
      },
      sampleRecords,
      idsToDelete: {
        count: idsToDelete.length,
        ids: idsToDelete
      }
    });

  } catch (error) {
    console.error('Error identifying SMS messages:', error);
    return NextResponse.json(
      { error: 'Failed to identify SMS messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
