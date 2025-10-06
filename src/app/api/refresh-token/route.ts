import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const refreshToken = process.env.JOBBER_REFRESH_TOKEN;
    const clientId = process.env.JOBBER_CLIENT_ID;
    const clientSecret = process.env.JOBBER_CLIENT_SECRET;

    if (!refreshToken || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // POST to Jobber OAuth token endpoint
    const response = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token refresh failed: ${response.status}`, errorText);
      return NextResponse.json(
        {
          error: 'Token refresh failed',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const tokenData = await response.json();

    // If rotation returns a new refresh_token, save it (replace the old one)
    if (tokenData.refresh_token) {
      console.log('New refresh token received - rotation enabled');
      // Note: In production, you'd want to update your stored refresh token
      // For dev with env vars, this would require updating the .env file or using a database
    }

    return NextResponse.json({
      accessToken: tokenData.access_token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}