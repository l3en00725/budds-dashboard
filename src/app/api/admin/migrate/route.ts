import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // First, try to query the table to see if it exists
    const { data: existingData, error: existingError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .limit(1);

    if (!existingError) {
      return NextResponse.json({
        success: true,
        message: 'OAuth tokens table already exists',
        existing_records: existingData?.length || 0
      });
    }

    // If table doesn't exist, create it using raw SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        provider VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type VARCHAR(20) DEFAULT 'Bearer',
        expires_at TIMESTAMP WITH TIME ZONE,
        scope TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(provider)
      );

      CREATE OR REPLACE FUNCTION update_oauth_tokens_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS oauth_tokens_updated_at ON oauth_tokens;
      CREATE TRIGGER oauth_tokens_updated_at
        BEFORE UPDATE ON oauth_tokens
        FOR EACH ROW
        EXECUTE FUNCTION update_oauth_tokens_updated_at();

      ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Service role has full access to oauth_tokens" ON oauth_tokens;
      CREATE POLICY "Service role has full access to oauth_tokens" ON oauth_tokens
        FOR ALL USING (auth.role() = 'service_role');
    `;

    // Execute the SQL using a simple stored procedure approach
    const { error: execError } = await supabase.rpc('exec', {
      sql: createTableSQL
    });

    if (execError) {
      console.error('Failed to execute migration SQL:', execError);

      // Try a different approach - insert the table manually
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        body: JSON.stringify({
          query: createTableSQL
        })
      });

      if (!response.ok) {
        return NextResponse.json({
          error: 'Failed to create oauth_tokens table',
          details: `HTTP ${response.status}: ${await response.text()}`
        }, { status: 500 });
      }
    }

    // Test that we can access the table
    const { data: testData, error: testError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('Failed to test oauth_tokens table:', testError);
      return NextResponse.json({
        error: 'Table created but access test failed',
        details: testError.message,
        hint: 'You may need to run the migration manually in Supabase SQL Editor'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'OAuth tokens table created and tested successfully',
      test_result: testData
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please run the migration SQL manually in Supabase SQL Editor'
    }, { status: 500 });
  }
}