import { NextRequest, NextResponse } from 'next/server';
import { storeOAuthToken } from '@/lib/oauth-tokens';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// OpenPhone callback route for API key setup completion
// This route handles the API key validation and storage after user setup

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, state } = body;

    if (!apiKey || !state) {
      return NextResponse.json(
        { error: 'Missing API key or state parameter' },
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
        .eq('provider', 'openphone')
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error) {
        console.error('Failed to validate OpenPhone setup state:', error);
      } else if (stateRecord) {
        isValidState = true;
        console.log('OpenPhone setup state validated successfully from database');

        // Clean up the used state
        await supabase
          .from('oauth_states')
          .delete()
          .eq('state_key', state);
      }
    } catch (error) {
      console.error('Database error validating OpenPhone setup state:', error);
    }

    if (!isValidState) {
      console.error('CSRF state validation failed - state not found or expired in database');
      return NextResponse.json(
        {
          error: 'Invalid state parameter - CSRF protection failed',
          hint: 'The setup session has expired or is invalid. Please try the setup flow again.'
        },
        { status: 401 }
      );
    }

    // Validate the API key by testing it against OpenPhone API
    try {
      const testResponse = await fetch('https://api.openphone.com/v1/phone-numbers', {
        headers: {
          'Authorization': apiKey,
        },
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error(`OpenPhone API key validation failed: ${testResponse.status}`, errorText);
        return NextResponse.json(
          {
            error: 'Invalid OpenPhone API key',
            status: testResponse.status,
            details: errorText,
            hint: 'Please check that your API key is correct and has the necessary permissions.'
          },
          { status: 400 }
        );
      }

      console.log('OpenPhone API key validated successfully');
    } catch (error) {
      console.error('Error validating OpenPhone API key:', error);
      return NextResponse.json(
        {
          error: 'Failed to validate OpenPhone API key',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Store API key securely in Supabase database as a "token"
    try {
      await storeOAuthToken('openphone', {
        access_token: apiKey,
        token_type: 'api_key',
        // API keys don't expire, but we set a far future date for consistency
        expires_in: 365 * 24 * 60 * 60, // 1 year
        scope: 'api_access'
      });

      console.log('OpenPhone API key stored securely in database');
    } catch (error) {
      console.error('Failed to store OpenPhone API key in database:', error);
      return NextResponse.json(
        {
          error: 'Failed to store OpenPhone API key securely',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Return success response for the frontend to handle redirect
    return NextResponse.json({
      success: true,
      message: 'OpenPhone API key configured successfully',
      redirectUrl: '/dashboard'
    });

  } catch (error) {
    console.error('OpenPhone setup callback error:', error);
    return NextResponse.json(
      {
        error: 'OpenPhone setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Keep GET route for compatibility but redirect to setup
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log('OpenPhone callback accessed via GET, redirecting to setup');
  return NextResponse.redirect(`${baseUrl}/auth/openphone/setup`);
}