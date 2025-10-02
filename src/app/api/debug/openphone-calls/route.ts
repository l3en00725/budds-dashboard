import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get all openphone calls
    const { data: allCalls, error: allError } = await supabase
      .from('openphone_calls')
      .select('*')
      .order('call_date', { ascending: false })
      .limit(10);

    // Get today's calls (same logic as dashboard)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCalls, error: todayError } = await supabase
      .from('openphone_calls')
      .select('*')
      .gte('call_date', today)
      .lt('call_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({
      totalCalls: allCalls?.length || 0,
      todayCallsCount: todayCalls?.length || 0,
      today: today,
      tomorrow: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      allCalls: allCalls || [],
      todayCalls: todayCalls || [],
      errors: {
        all: allError,
        today: todayError
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}