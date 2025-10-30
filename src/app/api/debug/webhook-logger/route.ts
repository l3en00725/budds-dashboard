import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const timestamp = new Date().toISOString();
    
    // Extract key info for logging
    const eventType = payload.object?.type || payload.event || payload.type || 'unknown';
    const callId = payload.object?.data?.object?.id || 
                   payload.data?.object?.id || 
                   payload.data?.id || 
                   'unknown';
    
    // Log to console for immediate debugging
    console.log('🔍 WEBHOOK LOGGER - Raw Payload:');
    console.log('Timestamp:', timestamp);
    console.log('Event Type:', eventType);
    console.log('Call ID:', callId);
    console.log('Full Payload:', JSON.stringify(payload, null, 2));
    
    // Store in database for analysis
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('webhook_logs')
      .insert({
        timestamp,
        event_type: eventType,
        call_id: callId,
        payload: payload,
        processed: false
      });
    
    if (error) {
      console.error('Failed to log webhook to database:', error);
      // Continue anyway - we still have console logs
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook logged successfully',
      eventType,
      callId,
      timestamp
    });
    
  } catch (error) {
    console.error('Webhook logger error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get recent webhook logs
    const { data: logs, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      logs: logs || [],
      count: logs?.length || 0
    });
    
  } catch (error) {
    console.error('Get webhook logs error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
