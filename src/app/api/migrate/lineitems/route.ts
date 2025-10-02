import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Create line items table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add line items table for accurate membership tracking
        CREATE TABLE IF NOT EXISTS jobber_line_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          line_item_id TEXT NOT NULL UNIQUE,
          job_id TEXT NOT NULL,
          name TEXT,
          description TEXT,
          quantity INTEGER DEFAULT 0,
          unit_cost DECIMAL(10,2) DEFAULT 0,
          total_cost DECIMAL(10,2) DEFAULT 0,
          pulled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for faster membership queries
        CREATE INDEX IF NOT EXISTS idx_jobber_line_items_name ON jobber_line_items(name);
        CREATE INDEX IF NOT EXISTS idx_jobber_line_items_description ON jobber_line_items(description);
        CREATE INDEX IF NOT EXISTS idx_jobber_line_items_job_id ON jobber_line_items(job_id);
      `
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Line items table created successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}