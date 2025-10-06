import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// OpenPhone uses API key authentication, not OAuth 2.0
// This route serves as a configuration flow for setting up API key authentication
// It redirects to a setup page where users can enter their OpenPhone API key

export async function GET() {
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Check if OpenPhone API key is already configured
  const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

  if (OPENPHONE_API_KEY) {
    // API key is already configured, test it and redirect to dashboard
    try {
      const testResponse = await fetch('https://api.openphone.com/v1/phone-numbers', {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
        },
      });

      if (testResponse.ok) {
        console.log('OpenPhone API key is valid, redirecting to dashboard');
        return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/dashboard`);
      } else {
        console.log('OpenPhone API key is invalid, redirecting to setup page');
      }
    } catch (error) {
      console.error('Error testing OpenPhone API key:', error);
    }
  }

  // Generate a state for CSRF protection
  const state = randomBytes(32).toString('hex');

  // Store state in database for CSRF protection
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { error } = await supabase
      .from('oauth_states')
      .insert({
        state_key: state,
        provider: 'openphone',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      });

    if (error) {
      console.error('Failed to store OAuth state:', error);
      return NextResponse.json(
        { error: 'Failed to initialize OpenPhone setup flow' },
        { status: 500 }
      );
    }

    console.log('OpenPhone setup state stored in database:', state.substring(0, 8) + '...');
  } catch (error) {
    console.error('Database error storing OAuth state:', error);
    return NextResponse.json(
      { error: 'Failed to initialize OpenPhone setup flow' },
      { status: 500 }
    );
  }

  // Redirect to OpenPhone API key setup page with state parameter
  const setupUrl = `${NEXT_PUBLIC_APP_URL}/auth/openphone/setup?state=${state}`;
  console.log('Redirecting to OpenPhone API key setup page');

  return NextResponse.redirect(setupUrl);
}