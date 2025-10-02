import { NextResponse } from 'next/server';

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

export async function GET() {
  try {
    if (!OPENPHONE_API_KEY) {
      return NextResponse.json({ error: 'OpenPhone API key not configured' }, { status: 500 });
    }

    console.log('Testing different activity endpoint patterns...');

    const results = {
      apiKeyConfigured: true,
      tests: []
    };

    // Get a conversation ID to test with
    const conversationsResponse = await fetch('https://api.openphone.com/v1/conversations?limit=1', {
      headers: {
        'Authorization': OPENPHONE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    let conversationId = null;
    if (conversationsResponse.ok) {
      const conversationsData = await conversationsResponse.json();
      if (conversationsData.data && conversationsData.data.length > 0) {
        conversationId = conversationsData.data[0].id;
      }
    }

    // Test different activity endpoint patterns
    const activityEndpoints = [
      'activities',
      'messages',
      'calls',
      'events',
      'history'
    ];

    if (conversationId) {
      console.log(`Testing activity endpoints for conversation ${conversationId}...`);

      for (const endpoint of activityEndpoints) {
        try {
          const url = `https://api.openphone.com/v1/conversations/${conversationId}/${endpoint}`;

          const response = await fetch(url, {
            headers: {
              'Authorization': OPENPHONE_API_KEY,
              'Content-Type': 'application/json',
            },
          });

          const data = response.ok ? await response.json() : await response.text();

          results.tests.push({
            testName: `Conversation ${endpoint}`,
            url,
            status: response.status,
            success: response.ok,
            data: response.ok ? data : data
          });

        } catch (error) {
          results.tests.push({
            testName: `Conversation ${endpoint}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Test direct activity endpoints with phone number filters
    console.log('Testing direct activity endpoints...');
    const mainPhoneId = "PN7r9F5MtW";

    const directEndpoints = [
      {
        name: 'Direct Activities',
        url: `https://api.openphone.com/v1/activities?phoneNumberId=${mainPhoneId}&limit=10`
      },
      {
        name: 'Direct Events',
        url: `https://api.openphone.com/v1/events?phoneNumberId=${mainPhoneId}&limit=10`
      },
      {
        name: 'Direct History',
        url: `https://api.openphone.com/v1/history?phoneNumberId=${mainPhoneId}&limit=10`
      },
      {
        name: 'Direct Log',
        url: `https://api.openphone.com/v1/log?phoneNumberId=${mainPhoneId}&limit=10`
      },
      {
        name: 'Call Log',
        url: `https://api.openphone.com/v1/call-log?phoneNumberId=${mainPhoneId}&limit=10`
      },
      {
        name: 'Phone Records',
        url: `https://api.openphone.com/v1/phone-records?phoneNumberId=${mainPhoneId}&limit=10`
      },
      {
        name: 'Call Records',
        url: `https://api.openphone.com/v1/call-records?phoneNumberId=${mainPhoneId}&limit=10`
      }
    ];

    for (const endpoint of directEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const data = response.ok ? await response.json() : await response.text();

        results.tests.push({
          testName: endpoint.name,
          url: endpoint.url,
          status: response.status,
          success: response.ok,
          data: response.ok ? data : data
        });

      } catch (error) {
        results.tests.push({
          testName: endpoint.name,
          url: endpoint.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Try calls endpoint with specific participant phone numbers from conversations
    console.log('Testing calls endpoint with real participant numbers...');

    // Get some participant numbers from the conversations we found
    const participantNumbers = ["+18023917863", "+16098688709", "+16096750949"];

    for (const participant of participantNumbers) {
      try {
        const url = `https://api.openphone.com/v1/calls?phoneNumberId=${mainPhoneId}&participants[]=${participant}&limit=10`;

        const response = await fetch(url, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const data = response.ok ? await response.json() : await response.text();
        const callCount = response.ok && data.data ? data.data.length : 0;

        results.tests.push({
          testName: `Calls with participant ${participant}`,
          url,
          status: response.status,
          success: response.ok,
          callCount,
          data: response.ok ? {
            totalCalls: callCount,
            calls: data.data || []
          } : data
        });

        if (callCount > 0) {
          console.log(`Found ${callCount} calls with participant ${participant}`);
        }

      } catch (error) {
        results.tests.push({
          testName: `Calls with participant ${participant}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Try messages endpoint with real participant numbers
    console.log('Testing messages endpoint with real participant numbers...');

    for (const participant of participantNumbers.slice(0, 2)) { // Test first 2
      try {
        const url = `https://api.openphone.com/v1/messages?phoneNumberId=${mainPhoneId}&participants[]=${participant}&limit=10`;

        const response = await fetch(url, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const data = response.ok ? await response.json() : await response.text();
        const messageCount = response.ok && data.data ? data.data.length : 0;

        results.tests.push({
          testName: `Messages with participant ${participant}`,
          url,
          status: response.status,
          success: response.ok,
          messageCount,
          data: response.ok ? {
            totalMessages: messageCount,
            messages: data.data || []
          } : data
        });

        if (messageCount > 0) {
          console.log(`Found ${messageCount} messages with participant ${participant}`);
        }

      } catch (error) {
        results.tests.push({
          testName: `Messages with participant ${participant}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary
    const successfulTests = results.tests.filter(t => t.success);
    const testsWithData = results.tests.filter(t => (t.callCount || 0) > 0 || (t.messageCount || 0) > 0);

    const summary = {
      totalTests: results.tests.length,
      successfulTests: successfulTests.length,
      testsWithData: testsWithData.length,
      conversationIdTested: conversationId,
      workingEndpoints: successfulTests.map(t => ({ name: t.testName, url: t.url })),
      endpointsWithData: testsWithData.map(t => ({
        name: t.testName,
        url: t.url,
        callCount: t.callCount || 0,
        messageCount: t.messageCount || 0
      }))
    };

    console.log('Activity endpoints test completed:', summary);

    return NextResponse.json({
      ...results,
      summary
    });

  } catch (error) {
    console.error('Activity endpoints test failed:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!OPENPHONE_API_KEY,
    }, { status: 500 });
  }
}