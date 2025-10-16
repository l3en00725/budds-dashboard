import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();

    // Delete all jobs
    const { count } = await supabase
      .from('jobber_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except non-existent ID

    return NextResponse.json({
      success: true,
      deletedRows: count,
      message: `Cleared ${count} jobs from jobber_jobs table`
    });

  } catch (error) {
    console.error('Clear jobs error:', error);
    return NextResponse.json({
      error: 'Failed to clear jobs table',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}