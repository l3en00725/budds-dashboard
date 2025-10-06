import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID!;
const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI!;

export async function GET() {
  try {
    // Generate a secure random state
    const state = randomBytes(32).toString('hex');

    // Store the state in the database for CSRF protection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

    const { error } = await supabase
      .from('oauth_states')
      .insert({
        state_key: state,
        provider: 'jobber',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to store OAuth state:', error);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    // Build Jobber OAuth URL
    const scopes = [
      'read_clients', 'write_clients',
      'read_requests', 'write_requests',
      'read_quotes', 'write_quotes',
      'read_jobs', 'write_jobs',
      'read_scheduled_items', 'write_scheduled_items',
      'read_invoices', 'write_invoices',
      'read_jobber_payments',
      'read_users', 'write_users'
    ].join(' ');

    const authUrl = new URL('https://api.getjobber.com/api/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', JOBBER_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', JOBBER_REDIRECT_URI);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('OAuth login error:', error);
    return NextResponse.json(
      { error: 'Failed to start OAuth flow' },
      { status: 500 }
    );
  }
}