import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  return await handleSync(request);
}

export async function GET(request: NextRequest) {
  return await handleSync(request);
}

async function handleSync(request: NextRequest) {
  try {
    // Check if we have valid tokens
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('jobber_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({
        error: 'No Jobber token available',
        action: 'reauth',
        message: 'Please re-authenticate with Jobber first',
        reauth_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/jobber/reauth`
      }, { status: 401 });
    }

    // If we have a token, trigger the financial sync
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync/jobber-financial`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    const syncResult = await syncResponse.json();

    if (!syncResponse.ok) {
      return NextResponse.json({
        error: 'Sync failed',
        details: syncResult,
        action: 'reauth',
        reauth_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/jobber/reauth`
      }, { status: syncResponse.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      details: syncResult
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    return NextResponse.json({
      error: 'Manual sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}