import { NextResponse } from 'next/server';

const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID!;
const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI!;

export async function GET() {
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
  authUrl.searchParams.set('state', 'dashboard-reauth');

  return NextResponse.redirect(authUrl.toString());
}