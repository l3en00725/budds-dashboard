import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  const supabase = createServiceRoleClient();

  // First, identify all test records
  const { data: testRecords, error: selectError } = await supabase
    .from('openphone_calls')
    .select('call_id, caller_number, call_date')
    .or('call_id.ilike.%test%,caller_number.like.+1555%');

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  // Delete all test records
  const { error: deleteError, count } = await supabase
    .from('openphone_calls')
    .delete()
    .or('call_id.ilike.%test%,caller_number.like.+1555%');

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Get remaining count
  const { count: remainingCount } = await supabase
    .from('openphone_calls')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    success: true,
    message: `Deleted ${count} test records`,
    deletedCount: count,
    remainingCalls: remainingCount,
    deletedSamples: testRecords?.slice(0, 5)
  });
}
