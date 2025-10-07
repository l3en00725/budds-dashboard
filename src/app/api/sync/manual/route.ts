import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOAuthToken } from '@/lib/oauth-tokens';

export async function POST(request: NextRequest) {
  return await handleSync(request);
}

export async function GET(request: NextRequest) {
  return await handleSync(request);
}

async function handleSync(request: NextRequest) {
  try {
    console.log('=== Manual Sync Started ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Request method: ${request.method}`);
    console.log(`User-Agent: ${request.headers.get('user-agent') || 'Unknown'}`);

    // Check if we have valid tokens - try multiple sources
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('jobber_access_token')?.value;
    let tokenSource = 'cookie';

    // If no cookie token, try stored service tokens
    if (!accessToken) {
      console.log('No cookie token found, checking stored service tokens...');
      accessToken = await getOAuthToken('jobber');
      tokenSource = 'database';
    }

    if (!accessToken) {
      console.error('No valid Jobber token available from any source');
      return NextResponse.json({
        error: 'No Jobber token available',
        action: 'reauth',
        message: 'Please re-authenticate with Jobber first',
        reauth_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/jobber/reauth`,
        debug: {
          cookieTokenExists: !!cookieStore.get('jobber_access_token')?.value,
          timestamp: new Date().toISOString()
        }
      }, { status: 401 });
    }

    console.log(`Using ${tokenSource} token for sync operation`);

    // If we have a token, trigger the financial sync
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const syncResponse = await fetch(`${baseUrl}/api/sync/jobber-financial`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    console.log(`Sync request URL: ${baseUrl}/api/sync/jobber-financial`);
    console.log(`Sync response status: ${syncResponse.status}`);

    const syncResult = await syncResponse.json();
    console.log('Sync result:', syncResult);

    if (!syncResponse.ok) {
      console.error(`Sync failed with status ${syncResponse.status}:`, syncResult);

      // Enhanced error response with recovery suggestions
      const errorResponse = {
        error: 'Sync failed',
        status: syncResponse.status,
        details: syncResult,
        timestamp: new Date().toISOString(),
        tokenSource,
        debug: {
          responseStatus: syncResponse.status,
          responseStatusText: syncResponse.statusText,
          syncType: 'financial-only'
        }
      };

      // Provide specific recovery suggestions based on error type
      if (syncResponse.status === 401 || syncResponse.status === 403) {
        errorResponse.action = 'reauth';
        errorResponse.reauth_url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/jobber/reauth`;
        errorResponse.message = 'Authentication failed. Please re-authenticate with Jobber.';
      } else if (syncResponse.status >= 500) {
        errorResponse.action = 'retry';
        errorResponse.message = 'Server error occurred. Please try again in a few minutes.';
      } else {
        errorResponse.action = 'check_logs';
        errorResponse.message = 'Sync failed. Check logs for details.';
      }

      return NextResponse.json(errorResponse, { status: syncResponse.status });
    }

    console.log('=== Manual Sync Completed Successfully ===');
    console.log(`Records synced: ${syncResult.recordsSynced || 'Unknown'}`);
    console.log(`Sync ID: ${syncResult.syncId || 'Unknown'}`);

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      details: syncResult,
      tokenSource,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== Manual Sync Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({
      error: 'Manual sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      action: 'retry',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 });
  }
}