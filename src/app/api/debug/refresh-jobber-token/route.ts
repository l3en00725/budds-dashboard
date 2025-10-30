import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();
    
    // Get current token data
    const { data: tokenData } = await supabase
      .from('jobber_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('id', 1)
      .single();

    if (!tokenData?.refresh_token) {
      return NextResponse.json({
        success: false,
        error: 'No refresh token found in database',
        needsAuth: true
      });
    }

    console.log('Attempting to refresh Jobber token...');
    console.log('Current token expires at:', tokenData.expires_at);

    // Attempt token refresh
    const response = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.JOBBER_CLIENT_ID!,
        client_secret: process.env.JOBBER_CLIENT_SECRET!,
        refresh_token: tokenData.refresh_token,
      }).toString(),
    });

    console.log('Token refresh response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `Token refresh failed with status ${response.status}`,
        details: errorText,
        needsAuth: true
      });
    }

    const newTokenData = await response.json();
    console.log('Token refresh successful, new expires_in:', newTokenData.expires_in);

    // Update database with new tokens
    const expiresInSeconds = newTokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000));

    const { error: updateError } = await supabase
      .from('jobber_tokens')
      .upsert({
        id: 1,
        access_token: newTokenData.access_token,
        refresh_token: newTokenData.refresh_token || tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save refreshed token to database',
        details: updateError.message
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      tokenInfo: {
        expiresAt: expiresAt.toISOString(),
        expiresIn: expiresInSeconds,
        isExpired: false
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data: tokenData } = await supabase
      .from('jobber_tokens')
      .select('*')
      .eq('id', 1)
      .single();

    if (!tokenData) {
      return NextResponse.json({
        success: false,
        error: 'No token data found',
        needsAuth: true
      });
    }

    const isExpired = tokenData.expires_at ? new Date(tokenData.expires_at) < new Date() : true;
    const expiresIn = tokenData.expires_at ? 
      Math.max(0, Math.floor((new Date(tokenData.expires_at).getTime() - Date.now()) / 1000)) : 0;

    return NextResponse.json({
      success: true,
      tokenStatus: {
        hasToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        isExpired,
        expiresAt: tokenData.expires_at,
        expiresInSeconds: expiresIn,
        lastUpdated: tokenData.updated_at
      }
    });

  } catch (error) {
    console.error('Token status check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
