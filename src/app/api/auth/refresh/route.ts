import { NextRequest, NextResponse } from 'next/server';
import { refreshOAuthToken, getOAuthToken } from '@/lib/oauth-tokens';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { provider } = await request.json();

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { error: 'Provider is required and must be a string' },
        { status: 400 }
      );
    }

    if (!['jobber', 'openphone'].includes(provider)) {
      return NextResponse.json(
        { error: 'Unsupported provider. Must be "jobber" or "openphone"' },
        { status: 400 }
      );
    }

    console.log(`Attempting to refresh ${provider} token`);

    const newAccessToken = await refreshOAuthToken(provider);

    if (!newAccessToken) {
      return NextResponse.json(
        {
          error: `Failed to refresh ${provider} token`,
          hint: 'Token may be expired or invalid. Re-authentication may be required.'
        },
        { status: 401 }
      );
    }

    console.log(`Successfully refreshed ${provider} token`);

    return NextResponse.json({
      success: true,
      access_token: newAccessToken,
      message: `${provider} token refreshed successfully`
    });

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider query parameter is required' },
        { status: 400 }
      );
    }

    if (!['jobber', 'openphone'].includes(provider)) {
      return NextResponse.json(
        { error: 'Unsupported provider. Must be "jobber" or "openphone"' },
        { status: 400 }
      );
    }

    console.log(`Getting valid ${provider} token`);

    const accessToken = await getOAuthToken(provider);

    if (!accessToken) {
      return NextResponse.json(
        {
          error: `No valid ${provider} token available`,
          hint: 'Authentication may be required.'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      access_token: accessToken,
      provider
    });

  } catch (error) {
    console.error('Token retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Token retrieval failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}