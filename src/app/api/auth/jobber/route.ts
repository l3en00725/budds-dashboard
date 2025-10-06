import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID?.trim();
  const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI?.trim();

  if (!JOBBER_CLIENT_ID || !JOBBER_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Missing JOBBER_CLIENT_ID or JOBBER_REDIRECT_URI environment variables' },
      { status: 500 }
    );
  }

  // Generate a random CSRF state using crypto
  const state = randomBytes(32).toString('hex');

  // Store state in database instead of cookies for better cross-domain reliability
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { error } = await supabase
      .from('oauth_states')
      .insert({
        state_key: state,
        provider: 'jobber',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (error) {
      console.error('Failed to store OAuth state:', error);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    console.log('OAuth state stored in database:', state.substring(0, 8) + '...');
  } catch (error) {
    console.error('Database error storing OAuth state:', error);
    return NextResponse.json(
      { error: 'Failed to initialize OAuth flow' },
      { status: 500 }
    );
  }

  // Build the authorize URL
  const authUrl = new URL('https://api.getjobber.com/api/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', JOBBER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', JOBBER_REDIRECT_URI);
  authUrl.searchParams.append('state', state);

  console.log('Generated OAuth URL:', authUrl.toString().replace(state, '[STATE_REDACTED]'));

  // Create response with redirect - no cookie needed now
  const response = NextResponse.redirect(authUrl.toString());

  return response;
}