import { NextResponse } from 'next/server';

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

interface PhoneNumber {
  id: string;
  name: string;
  number: string;
}

const PHONE_NUMBERS: PhoneNumber[] = [
  { id: "PNEzC91mdD", name: "Ed", number: "856-626-9384" },
  { id: "PNTZfjFlZA", name: "Elyse", number: "717-366-9689" },
  { id: "PNZ3YDUn03", name: "Mike Budd", number: "856-683-0140" },
  { id: "PN7r9F5MtW", name: "Main line", number: "609-465-3759" },
  { id: "PNqA40JID6", name: "Ben", number: "908-493-6843" },
  { id: "PNBc1dNKJ8", name: "Shawn", number: "484-563-1617" }
];

export async function GET() {
  try {
    if (!OPENPHONE_API_KEY) {
      return NextResponse.json({ error: 'OpenPhone API key not configured' }, { status: 500 });
    }

    console.log('Starting comprehensive OpenPhone test...');

    const results = {
      apiKeyConfigured: true,
      apiKeyPreview: `${OPENPHONE_API_KEY.substring(0, 8)}...`,
      phoneNumbers: PHONE_NUMBERS,
      tests: []
    };

    // Test 1: Verify API connectivity with phone numbers endpoint
    console.log('Testing phone numbers endpoint...');
    try {
      const phoneResponse = await fetch('https://api.openphone.com/v1/phone-numbers', {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const phoneData = phoneResponse.ok ? await phoneResponse.json() : await phoneResponse.text();
      results.tests.push({
        testName: 'Phone Numbers Endpoint',
        url: 'https://api.openphone.com/v1/phone-numbers',
        status: phoneResponse.status,
        success: phoneResponse.ok,
        data: phoneData,
        count: phoneResponse.ok && phoneData.data ? phoneData.data.length : 0
      });
    } catch (error) {
      results.tests.push({
        testName: 'Phone Numbers Endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Test all 6 phone numbers for calls (today, yesterday, last week)
    const dateRanges = [
      {
        name: 'Today',
        gte: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
        lt: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
      },
      {
        name: 'Yesterday',
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z',
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:59Z'
      },
      {
        name: 'Last 7 days',
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z',
        lt: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
      },
      {
        name: 'Last 30 days',
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z',
        lt: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
      }
    ];

    for (const phone of PHONE_NUMBERS) {
      console.log(`Testing phone ${phone.name} (${phone.number})...`);

      for (const dateRange of dateRanges) {
        try {
          // Test with participants parameter (required per previous attempts)
          const url = `https://api.openphone.com/v1/calls?phoneNumberId=${phone.id}&participants[]=any&createdAt[gte]=${dateRange.gte}&createdAt[lt]=${dateRange.lt}&limit=50`;

          const response = await fetch(url, {
            headers: {
              'Authorization': OPENPHONE_API_KEY,
              'Content-Type': 'application/json',
            },
          });

          const data = response.ok ? await response.json() : await response.text();
          const callCount = response.ok && data.data ? data.data.length : 0;

          results.tests.push({
            testName: `Calls - ${phone.name} (${phone.number}) - ${dateRange.name}`,
            phoneId: phone.id,
            dateRange: dateRange.name,
            url,
            status: response.status,
            success: response.ok,
            callCount,
            data: response.ok ? {
              totalCalls: callCount,
              calls: data.data?.slice(0, 3) || [], // Show first 3 calls for brevity
              hasMore: callCount > 3
            } : data
          });

          if (callCount > 0) {
            console.log(`Found ${callCount} calls for ${phone.name} in ${dateRange.name}`);
          }

        } catch (error) {
          results.tests.push({
            testName: `Calls - ${phone.name} (${phone.number}) - ${dateRange.name}`,
            phoneId: phone.id,
            dateRange: dateRange.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Test 3: Try generic calls endpoint without phone number filter
    console.log('Testing generic calls endpoint...');
    for (const dateRange of dateRanges.slice(0, 2)) { // Only test today and yesterday for generic
      try {
        const url = `https://api.openphone.com/v1/calls?createdAt[gte]=${dateRange.gte}&createdAt[lt]=${dateRange.lt}&limit=50`;

        const response = await fetch(url, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const data = response.ok ? await response.json() : await response.text();
        const callCount = response.ok && data.data ? data.data.length : 0;

        results.tests.push({
          testName: `Generic Calls - ${dateRange.name}`,
          dateRange: dateRange.name,
          url,
          status: response.status,
          success: response.ok,
          callCount,
          data: response.ok ? {
            totalCalls: callCount,
            calls: data.data?.slice(0, 3) || [],
            hasMore: callCount > 3
          } : data
        });

      } catch (error) {
        results.tests.push({
          testName: `Generic Calls - ${dateRange.name}`,
          dateRange: dateRange.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 4: Messages endpoint to see if there's any activity there
    console.log('Testing messages endpoint...');
    try {
      const messagesUrl = 'https://api.openphone.com/v1/messages?limit=10';

      const messagesResponse = await fetch(messagesUrl, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const messagesData = messagesResponse.ok ? await messagesResponse.json() : await messagesResponse.text();
      const messageCount = messagesResponse.ok && messagesData.data ? messagesData.data.length : 0;

      results.tests.push({
        testName: 'Messages Endpoint',
        url: messagesUrl,
        status: messagesResponse.status,
        success: messagesResponse.ok,
        messageCount,
        data: messagesResponse.ok ? {
          totalMessages: messageCount,
          messages: messagesData.data?.slice(0, 3) || [],
          hasMore: messageCount > 3
        } : messagesData
      });

    } catch (error) {
      results.tests.push({
        testName: 'Messages Endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 5: Try different call status filters
    console.log('Testing call status filters...');
    const statuses = ['completed', 'missed', 'voicemail', 'busy'];
    for (const status of statuses) {
      try {
        const url = `https://api.openphone.com/v1/calls?status=${status}&limit=10`;

        const response = await fetch(url, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const data = response.ok ? await response.json() : await response.text();
        const callCount = response.ok && data.data ? data.data.length : 0;

        results.tests.push({
          testName: `Calls by Status - ${status}`,
          url,
          status: response.status,
          success: response.ok,
          callCount,
          data: response.ok ? {
            totalCalls: callCount,
            calls: data.data?.slice(0, 2) || [],
            hasMore: callCount > 2
          } : data
        });

      } catch (error) {
        results.tests.push({
          testName: `Calls by Status - ${status}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary
    const successfulTests = results.tests.filter(t => t.success).length;
    const totalCalls = results.tests.reduce((sum, t) => sum + (t.callCount || 0), 0);
    const totalMessages = results.tests.reduce((sum, t) => sum + (t.messageCount || 0), 0);

    const summary = {
      totalTests: results.tests.length,
      successfulTests,
      failedTests: results.tests.length - successfulTests,
      totalCallsFound: totalCalls,
      totalMessagesFound: totalMessages,
      testsWithCalls: results.tests.filter(t => (t.callCount || 0) > 0),
      testsWithMessages: results.tests.filter(t => (t.messageCount || 0) > 0)
    };

    console.log('Test completed:', summary);

    return NextResponse.json({
      ...results,
      summary
    });

  } catch (error) {
    console.error('Comprehensive test failed:', error);
    return NextResponse.json({
      error: 'Comprehensive test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!OPENPHONE_API_KEY,
    }, { status: 500 });
  }
}