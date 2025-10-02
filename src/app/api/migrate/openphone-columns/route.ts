import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Check current table structure first
    const { data: currentData, error: selectError } = await supabase
      .from('openphone_calls')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('Table access error:', selectError);
      return NextResponse.json(
        { error: 'Cannot access table', details: selectError.message },
        { status: 500 }
      );
    }

    // For now, let's just remove the problematic fields from the webhook
    // and use a minimal approach that works with existing schema
    return NextResponse.json({
      success: true,
      message: 'Migration check completed - will use compatible field mapping',
      existingFields: currentData && currentData.length > 0 ? Object.keys(currentData[0]) : [],
      recommendation: 'Use field mapping in webhook to match existing schema'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';