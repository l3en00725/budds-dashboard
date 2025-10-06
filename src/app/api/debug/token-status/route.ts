import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('jobber_access_token')?.value;
    const refreshToken = cookieStore.get('jobber_refresh_token')?.value;

    // Also check request cookies
    const requestAccessToken = request.cookies.get('jobber_access_token')?.value;
    const requestRefreshToken = request.cookies.get('jobber_refresh_token')?.value;

    return NextResponse.json({
      server_cookies: {
        access_token: accessToken ? `${accessToken.substring(0, 10)}...` : null,
        refresh_token: refreshToken ? `${refreshToken.substring(0, 10)}...` : null,
      },
      request_cookies: {
        access_token: requestAccessToken ? `${requestAccessToken.substring(0, 10)}...` : null,
        refresh_token: requestRefreshToken ? `${requestRefreshToken.substring(0, 10)}...` : null,
      },
      all_cookies: Object.fromEntries(
        Array.from(cookieStore.getAll()).map(cookie => [
          cookie.name,
          cookie.name.includes('token') ? `${cookie.value.substring(0, 10)}...` : cookie.value
        ])
      )
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}