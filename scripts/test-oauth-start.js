#!/usr/bin/env node

async function testOAuthStart() {
  try {
    console.log('Testing OAuth initiation...');

    const response = await fetch('http://localhost:3001/api/auth/jobber', {
      redirect: 'manual',
      method: 'GET'
    });

    console.log('Response status:', response.status);
    console.log('Response headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      console.log('\n✅ OAuth redirect successful!');
      console.log('Redirect Location:', location);

      if (location) {
        const url = new URL(location);
        console.log('\nParsed OAuth URL:');
        console.log('  Host:', url.host);
        console.log('  Client ID:', url.searchParams.get('client_id'));
        console.log('  Redirect URI:', url.searchParams.get('redirect_uri'));
        console.log('  Response Type:', url.searchParams.get('response_type'));
        console.log('  State:', url.searchParams.get('state') ? '[PRESENT]' : '[MISSING]');
      }
    } else {
      console.log('❌ Expected 302 redirect, got:', response.status);
      const text = await response.text();
      console.log('Response body:', text);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOAuthStart();