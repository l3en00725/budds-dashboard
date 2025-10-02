import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('jobber_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.JOBBER_CLIENT_ID!,
        client_secret: process.env.JOBBER_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Token refresh failed: ${tokenResponse.status}`, errorText);
      return NextResponse.json(
        { error: 'Token refresh failed', details: errorText },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('Token refresh successful');

    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully'
    });

    // Update the access token cookie
    response.cookies.set('jobber_access_token', tokenData.access_token, {
      httpOnly: false, // Allow client-side access for sync functionality
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 7200, // Default to 2 hours
    });

    // Update the refresh token if a new one was provided
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
    console.error('Token refresh error:', error);
    return NextResponse.json(
      {
        error: 'Token refresh failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}