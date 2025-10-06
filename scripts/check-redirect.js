#!/usr/bin/env node

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

function buildAuthorizeURL() {
  const JOBBER_CLIENT_ID = process.env.JOBBER_CLIENT_ID;
  const JOBBER_REDIRECT_URI = process.env.JOBBER_REDIRECT_URI;

  console.log('Environment variables loaded:');
  console.log('JOBBER_CLIENT_ID:', JOBBER_CLIENT_ID);
  console.log('JOBBER_REDIRECT_URI:', JOBBER_REDIRECT_URI);
  console.log('');

  if (!JOBBER_CLIENT_ID || !JOBBER_REDIRECT_URI) {
    console.error('❌ Missing required environment variables');
    return;
  }

  // Generate dummy state for testing
  const state = 'test_state_12345';

  // Build the authorize URL using same logic as /api/auth/jobber
  const authUrl = new URL('https://api.getjobber.com/api/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', JOBBER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', encodeURIComponent(JOBBER_REDIRECT_URI));
  authUrl.searchParams.append('state', state);

  console.log('Generated authorize URL:');
  console.log(authUrl.toString());
  console.log('');

  // Parse and display components
  console.log('URL Components:');
  console.log('  Host:', authUrl.host);
  console.log('  Client ID:', authUrl.searchParams.get('client_id'));
  console.log('  Redirect URI (raw):', JOBBER_REDIRECT_URI);
  console.log('  Redirect URI (encoded):', authUrl.searchParams.get('redirect_uri'));
  console.log('  Response Type:', authUrl.searchParams.get('response_type'));
  console.log('  State:', authUrl.searchParams.get('state'));

  // Check for port in both raw and encoded
  const redirectUri = authUrl.searchParams.get('redirect_uri');
  const rawRedirectUri = JOBBER_REDIRECT_URI;

  if (rawRedirectUri.includes(':3000') || redirectUri.includes('3000')) {
    console.log('⚠️  WARNING: Found port 3000 in redirect URI');
  } else if (rawRedirectUri.includes(':3001') || redirectUri.includes('3001')) {
    console.log('✅ Correct: Using port 3001 in redirect URI');
  } else {
    console.log('⚠️  No port found in redirect URI');
  }
}

buildAuthorizeURL();