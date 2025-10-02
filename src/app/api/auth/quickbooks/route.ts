import { NextRequest, NextResponse } from 'next/server';

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID!;
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI!;
const QUICKBOOKS_SCOPE = process.env.QUICKBOOKS_SCOPE!;

export async function GET(request: NextRequest) {
  // Generate a random state for security
  const state = Math.random().toString(36).substring(2, 15);

  // QuickBooks OAuth 2.0 authorization URL
  const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
  authUrl.searchParams.append('client_id', QUICKBOOKS_CLIENT_ID);
  authUrl.searchParams.append('scope', QUICKBOOKS_SCOPE);
  authUrl.searchParams.append('redirect_uri', QUICKBOOKS_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}