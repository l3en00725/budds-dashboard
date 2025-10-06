import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create oauth_states table
    const { error } = await supabase.rpc('sql', {
      query: `
        CREATE TABLE IF NOT EXISTS oauth_states (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          state_key TEXT NOT NULL UNIQUE,
          provider TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_oauth_states_state_key ON oauth_states(state_key);
        CREATE INDEX IF NOT EXISTS idx_oauth_states_provider_expires ON oauth_states(provider, expires_at);
      `
    });

    if (error) {
      console.error('Error creating oauth_states table:', error);

      // Try alternative approach using direct SQL
      const { error: altError } = await supabase
        .from('oauth_states')
        .select('*')
        .limit(1);

      if (altError && altError.code === '42P01') {
        // Table doesn't exist, but we can't create it via RPC
        return NextResponse.json({
          error: 'oauth_states table does not exist and cannot be created automatically',
          hint: 'Please create the table manually in Supabase Dashboard',
          sql: `
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_states_state_key ON oauth_states(state_key);
CREATE INDEX idx_oauth_states_provider_expires ON oauth_states(provider, expires_at);
          `.trim()
        }, { status: 500 });
      }
    }

    // Test if table exists and is accessible
    const { data, error: testError } = await supabase
      .from('oauth_states')
      .select('*')
      .limit(1);

    if (testError) {
      return NextResponse.json({
        error: 'oauth_states table exists but is not accessible',
        details: testError.message,
        hint: 'Check RLS policies and permissions'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'oauth_states table is ready',
      tableExists: true
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      error: 'Failed to setup oauth_states table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if table exists
    const { data, error } = await supabase
      .from('oauth_states')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({
        tableExists: false,
        error: error.message,
        code: error.code
      });
    }

    return NextResponse.json({
      tableExists: true,
      message: 'oauth_states table is accessible'
    });

  } catch (error) {
    return NextResponse.json({
      tableExists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}