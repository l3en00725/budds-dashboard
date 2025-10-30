import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Check if new columns exist by querying the information_schema
    const { data, error } = await supabase
      .rpc('check_columns_exist', {
        table_name: 'openphone_calls',
        column_names: ['booking_validated', 'jobber_job_id', 'validation_checked_at']
      })
      .single();

    if (error) {
      // If RPC doesn't exist, try a direct query approach
      const { data: sampleRow, error: queryError } = await supabase
        .from('openphone_calls')
        .select('booking_validated, jobber_job_id, validation_checked_at')
        .limit(1)
        .maybeSingle();

      if (queryError) {
        return NextResponse.json({
          migrationApplied: false,
          error: queryError.message,
          message: 'Migration NOT applied - columns do not exist',
          instructions: 'Run the SQL in supabase/migrations/20251027_add_booking_validation_fields.sql in Supabase SQL Editor'
        });
      }

      return NextResponse.json({
        migrationApplied: true,
        message: 'Migration APPLIED - all columns exist',
        columns: {
          booking_validated: typeof sampleRow?.booking_validated,
          jobber_job_id: typeof sampleRow?.jobber_job_id,
          validation_checked_at: typeof sampleRow?.validation_checked_at
        }
      });
    }

    return NextResponse.json({
      migrationApplied: data,
      message: data ? 'Migration APPLIED' : 'Migration NOT applied'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Could not check migration status'
    }, { status: 500 });
  }
}
