import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID!;
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET!;
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId'); // QuickBooks company ID
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=${error}`);
  }

  if (!code || !realmId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=missing_code_or_realm`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: QUICKBOOKS_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();

    // Store tokens in Supabase for background sync jobs
    const supabase = createServiceRoleClient();
    await supabase
      .from('quickbooks_tokens')
      .upsert({
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Set secure httpOnly cookie for the access token
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);

    response.cookies.set('quickbooks_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
    });

    response.cookies.set('quickbooks_realm_id', realmId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    if (tokenData.refresh_token) {
      response.cookies.set('quickbooks_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('QuickBooks OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=quickbooks_auth_failed`);
  }
}