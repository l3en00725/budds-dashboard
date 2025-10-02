import { NextRequest, NextResponse } from 'next/server';

const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID!;
const JOBBER_CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET!;
const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: JOBBER_CLIENT_ID,
        client_secret: JOBBER_CLIENT_SECRET,
        code,
        redirect_uri: JOBBER_REDIRECT_URI,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Token exchange failed: ${tokenResponse.status}`, errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange response:', tokenData);

    // Store the access token (you might want to encrypt this)
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);

    // Set secure cookie for the access token (temporarily non-httpOnly for sync functionality)
    response.cookies.set('jobber_access_token', tokenData.access_token, {
      httpOnly: false, // Allow client-side access for sync functionality
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 7200, // Default to 2 hours instead of 1
    });

    if (tokenData.refresh_token) {
      response.cookies.set('jobber_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?error=token_exchange_failed`);
  }
}