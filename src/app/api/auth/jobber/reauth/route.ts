import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID!;
const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI!;

export async function GET() {
  // Generate a random state for security
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // Store the state in database for validation
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Clean up old expired states first
    await supabase
      .from('oauth_states')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Store new state with 10 minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('oauth_states')
      .insert({
        state_key: state,
        provider: 'jobber',
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to store OAuth state:', error);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    console.log('OAuth state stored successfully:', state);
  } catch (error) {
    console.error('Database error storing OAuth state:', error);
    return NextResponse.json(
      { error: 'Database error initializing OAuth flow' },
      { status: 500 }
    );
  }

  // Force a fresh OAuth flow - this will always prompt for authorization
  const authUrl = new URL('https://api.getjobber.com/api/oauth/authorize');
  authUrl.searchParams.append('client_id', JOBBER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', JOBBER_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', 'read write');
  // Add timestamp to prevent caching
  authUrl.searchParams.append('_t', Date.now().toString());

  return NextResponse.redirect(authUrl.toString());
}