import { NextResponse } from 'next/server';

const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID!;
const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI!;

export async function GET() {
  // Generate a random state for security
  const state = Math.random().toString(36).substring(2, 15);

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