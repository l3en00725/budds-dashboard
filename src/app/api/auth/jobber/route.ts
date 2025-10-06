import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

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

  // Build the authorize URL
  const authUrl = new URL('https://api.getjobber.com/api/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', JOBBER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', JOBBER_REDIRECT_URI);
  authUrl.searchParams.append('state', state);

  console.log('Generated OAuth URL:', authUrl.toString().replace(state, '[STATE_REDACTED]'));

  // Set httpOnly cookie with CSRF state using next/headers
  const cookieStore = await cookies();
  cookieStore.set('jobber_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Create response with redirect
  return NextResponse.redirect(authUrl.toString());
}