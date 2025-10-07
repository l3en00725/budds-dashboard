import { NextRequest, NextResponse } from 'next/server';
import { storeOAuthToken } from '@/lib/oauth-tokens';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID?.trim();
  const JOBBER_CLIENT_SECRET = process.env.JOBBER_CLIENT_SECRET?.trim();
  const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI?.trim();

  if (!JOBBER_CLIENT_ID || !JOBBER_CLIENT_SECRET || !JOBBER_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Missing required environment variables' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth authorization error:', error);
    const errorDescription = searchParams.get('error_description') || 'Unknown error';
    return NextResponse.json(
      {
        error: `OAuth authorization failed: ${error}`,
        description: errorDescription,
        hint: 'This usually means the user denied access or there was an issue with the authorization request.'
      },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  // Validate state against the stored state in database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let isValidState = false;
  try {
    const { data: stateRecord, error } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state_key', state)
      .eq('provider', 'jobber')
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.error('Failed to validate OAuth state:', error);
    } else if (stateRecord) {
      isValidState = true;
      console.log('OAuth state validated successfully from database');

      // Clean up the used state
      await supabase
        .from('oauth_states')
        .delete()
        .eq('state_key', state);
    }
  } catch (error) {
    console.error('Database error validating OAuth state:', error);
  }

  if (!isValidState) {
    console.error('CSRF state validation failed - state not found or expired in database');
    return NextResponse.json(
      {
        error: 'Invalid state parameter - CSRF protection failed',
        hint: 'The OAuth state has expired or is invalid. Please try the authorization flow again.'
      },
      { status: 401 }
    );
  }

  try {
    // Exchange the code for tokens
    const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: JOBBER_CLIENT_ID,
        client_secret: JOBBER_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: JOBBER_REDIRECT_URI,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Token exchange failed: ${tokenResponse.status}`, errorText);
      return NextResponse.json(
        {
          error: 'Token exchange failed',
          status: tokenResponse.status,
          details: errorText
        },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type
    });

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: 'No access_token in response', response: tokenData },
        { status: 500 }
      );
    }

    // Store tokens securely in Supabase database
    try {
      await storeOAuthToken('jobber', {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      });

      console.log('Jobber tokens stored securely in database');
    } catch (error) {
      console.error('Failed to store tokens in database:', error);
      return NextResponse.json(
        {
          error: 'Failed to store tokens securely',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Store minimal access token in cookie for immediate client access
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);

    response.cookies.set('jobber_access_token', tokenData.access_token, {
      httpOnly: false, // Allow client-side access for sync functionality
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 7200,
    });

    // Store refresh token in secure, HTTP-only cookie
    if (tokenData.refresh_token) {
      response.cookies.set('jobber_refresh_token', tokenData.refresh_token, {
        httpOnly: true, // Secure server-side only access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days for refresh token
      });
    }

    // OAuth state already cleaned up during validation

    console.log('OAuth flow completed successfully, redirecting to dashboard');
    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      {
        error: 'Token exchange failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}