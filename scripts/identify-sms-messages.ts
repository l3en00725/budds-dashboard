import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

import { createServiceRoleClient } from '../src/lib/supabase';

async function identifySMSMessages() {
  console.log('🔍 Identifying SMS messages in openphone_calls table...\n');

  const supabase = createServiceRoleClient();

  // Get all calls from the database
  const { data: allCalls, error } = await supabase
    .from('openphone_calls')
    .select('*')
    .order('call_date', { ascending: false });

  if (error) {
    console.error('Error fetching calls:', error);
    return;
  }

  console.log(`Total records in openphone_calls: ${allCalls?.length || 0}\n`);

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

  console.log(`Found ${likelySMS.length} likely SMS messages:\n`);

  // Group by characteristics
  const zeroDurationCount = likelySMS.filter(c => c.duration === 0).length;
  const noTranscriptCount = likelySMS.filter(c => !c.transcript || c.transcript.trim() === '').length;
  const knownSMSCount = likelySMS.filter(c => c.caller_number?.includes('770-415-8949')).length;

  console.log('Breakdown:');
  console.log(`  - Zero duration: ${zeroDurationCount}`);
  console.log(`  - No transcript: ${noTranscriptCount}`);
  console.log(`  - Known SMS number (770-415-8949): ${knownSMSCount}`);
  console.log();

  // Show sample records
  console.log('Sample SMS messages (first 10):');
  likelySMS.slice(0, 10).forEach((call, idx) => {
    console.log(`\n${idx + 1}. Call ID: ${call.call_id}`);
    console.log(`   Caller: ${call.caller_number}`);
    console.log(`   Duration: ${call.duration}s`);
    console.log(`   Date: ${call.call_date}`);
    console.log(`   Transcript: ${call.transcript?.substring(0, 50) || 'None'}...`);
  });

  console.log('\n\n📊 Summary:');
  console.log(`Total calls in database: ${allCalls?.length || 0}`);
  console.log(`Likely SMS messages: ${likelySMS.length}`);
  console.log(`Actual phone calls: ${(allCalls?.length || 0) - likelySMS.length}`);

  // Export IDs for deletion
  const idsToDelete = likelySMS.map(c => c.id);
  console.log(`\n\n🗑️  IDs to delete (${idsToDelete.length} records):`);
  console.log(JSON.stringify(idsToDelete, null, 2));

  return {
    totalRecords: allCalls?.length || 0,
    smsCount: likelySMS.length,
    actualCallsCount: (allCalls?.length || 0) - likelySMS.length,
    idsToDelete
  };
}

identifySMSMessages().then((result) => {
  console.log('\n✅ Analysis complete!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
