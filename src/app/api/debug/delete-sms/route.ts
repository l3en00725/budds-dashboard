import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('🗑️  Starting SMS message deletion from openphone_calls table...');

    const supabase = createServiceRoleClient();

    // Get all records with duration = 0 (SMS messages)
    const { data: smsMessages, error: fetchError } = await supabase
      .from('openphone_calls')
      .select('id, call_id, caller_number, duration, call_date')
      .eq('duration', 0);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const smsCount = smsMessages?.length || 0;
    console.log(`Found ${smsCount} SMS messages to delete`);

    if (smsCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No SMS messages found to delete',
        deletedCount: 0
      });
    }

    // Delete all SMS messages (duration = 0)
    const { error: deleteError } = await supabase
      .from('openphone_calls')
      .delete()
      .eq('duration', 0);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(`✅ Successfully deleted ${smsCount} SMS messages`);

    // Verify deletion - count remaining records
    const { count: remainingCount, error: countError } = await supabase
      .from('openphone_calls')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${smsCount} SMS messages from openphone_calls table`,
      deletedCount: smsCount,
      remainingCalls: remainingCount,
      deletedSamples: smsMessages?.slice(0, 5).map(msg => ({
        call_id: msg.call_id,
        caller_number: msg.caller_number,
        call_date: msg.call_date
      }))
    });

  } catch (error) {
    console.error('Error deleting SMS messages:', error);
    return NextResponse.json(
      { error: 'Failed to delete SMS messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to safely preview what would be deleted
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get all records with duration = 0 (SMS messages)
    const { data: smsMessages, error: fetchError } = await supabase
      .from('openphone_calls')
      .select('id, call_id, caller_number, duration, call_date')
      .eq('duration', 0);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const { count: totalCount, error: countError } = await supabase
      .from('openphone_calls')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      preview: true,
      message: 'This is a preview. Use POST to actually delete.',
      totalRecords: totalCount,
      smsMessagesToDelete: smsMessages?.length || 0,
      actualCallsToKeep: (totalCount || 0) - (smsMessages?.length || 0),
      sampleSMSMessages: smsMessages?.slice(0, 10).map(msg => ({
        call_id: msg.call_id,
        caller_number: msg.caller_number,
        call_date: msg.call_date,
        duration: msg.duration
      }))
    });

  } catch (error) {
    console.error('Error previewing SMS deletion:', error);
    return NextResponse.json(
      { error: 'Failed to preview SMS deletion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
