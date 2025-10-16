import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceRoleClient();

  const { data: calls, error } = await supabase
    .from('openphone_calls')
    .select('call_id, caller_number, duration, call_date')
    .order('call_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    totalCalls: calls?.length || 0,
    calls: calls || []
  });
}
