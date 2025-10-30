import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function DELETE() {
  try {
    const supabase = createServiceRoleClient();
    
    // Delete all test calls (those with 555 numbers or test- in call_id)
    const { error: testCallsError } = await supabase
      .from('openphone_calls')
      .delete()
      .or('caller_number.like.+1555%,call_id.like.test-%');

    if (testCallsError) {
      console.error('Error deleting test calls:', testCallsError);
      return NextResponse.json({ 
        success: false, 
        error: testCallsError.message 
      }, { status: 500 });
    }

    // Get count of remaining real calls
    const { count: realCallsCount } = await supabase
      .from('openphone_calls')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Test data cleaned up successfully',
      realCallsRemaining: realCallsCount
    });

  } catch (error) {
    console.error('Clean test data error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'DELETE to clean up test data (555 numbers and test- call_ids)',
    description: 'This will remove all fake test calls and keep only real OpenPhone data'
  });
}
