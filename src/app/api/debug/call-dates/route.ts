import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get week calculation info
    const now = new Date();
    const weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStartDate.setHours(0, 0, 0, 0);
    const weekStart = weekStartDate.toISOString();

    const today = new Date().toISOString().split('T')[0];

    // Get all calls to see what dates exist
    const { data: allCalls } = await supabase
      .from('openphone_calls')
      .select('call_id, call_date, outcome, pipeline_stage, created_at')
      .order('call_date', { ascending: false })
      .limit(10);

    // Get this week's calls specifically
    const { data: thisWeekCalls } = await supabase
      .from('openphone_calls')
      .select('call_id, call_date, outcome, pipeline_stage')
      .gte('call_date', weekStart)
      .lt('call_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({
      currentTime: now.toISOString(),
      today,
      weekStart,
      weekStartDate: weekStartDate.toISOString(),
      allCalls: allCalls || [],
      thisWeekCalls: thisWeekCalls || [],
      callCount: {
        total: allCalls?.length || 0,
        thisWeek: thisWeekCalls?.length || 0,
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';