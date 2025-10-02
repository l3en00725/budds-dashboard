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

    console.log('Testing messages and broader date ranges...');

    const results = {
      apiKeyConfigured: true,
      tests: []
    };

    // Test 1: Messages for each phone number
    console.log('Testing messages endpoint for each phone...');
    for (const phone of PHONE_NUMBERS) {
      try {
        const messagesUrl = `https://api.openphone.com/v1/messages?phoneNumberId=${phone.id}&participants[]=any&limit=20`;

        const messagesResponse = await fetch(messagesUrl, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const messagesData = messagesResponse.ok ? await messagesResponse.json() : await messagesResponse.text();
        const messageCount = messagesResponse.ok && messagesData.data ? messagesData.data.length : 0;

        results.tests.push({
          testName: `Messages - ${phone.name} (${phone.number})`,
          phoneId: phone.id,
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

        if (messageCount > 0) {
          console.log(`Found ${messageCount} messages for ${phone.name}`);
        }

      } catch (error) {
        results.tests.push({
          testName: `Messages - ${phone.name} (${phone.number})`,
          phoneId: phone.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 2: Broader date ranges for calls - last 3, 6, 12 months
    console.log('Testing broader date ranges for calls...');
    const broadDateRanges = [
      {
        name: 'Last 3 months',
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z',
        lt: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
      },
      {
        name: 'Last 6 months',
        gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z',
        lt: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
      },
      {
        name: 'Last 12 months',
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z',
        lt: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
      }
    ];

    // Test the main line and Mike Budd's line with broader dates
    const testPhones = [PHONE_NUMBERS[3], PHONE_NUMBERS[2]]; // Main line and Mike Budd

    for (const phone of testPhones) {
      for (const dateRange of broadDateRanges) {
        try {
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
            testName: `Calls - ${phone.name} - ${dateRange.name}`,
            phoneId: phone.id,
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

          if (callCount > 0) {
            console.log(`Found ${callCount} calls for ${phone.name} in ${dateRange.name}`);
          }

        } catch (error) {
          results.tests.push({
            testName: `Calls - ${phone.name} - ${dateRange.name}`,
            phoneId: phone.id,
            dateRange: dateRange.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Test 3: Try without date filters to see if there are ANY calls
    console.log('Testing calls without date filters...');
    for (const phone of testPhones) {
      try {
        const url = `https://api.openphone.com/v1/calls?phoneNumberId=${phone.id}&participants[]=any&limit=10`;

        const response = await fetch(url, {
          headers: {
            'Authorization': OPENPHONE_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        const data = response.ok ? await response.json() : await response.text();
        const callCount = response.ok && data.data ? data.data.length : 0;

        results.tests.push({
          testName: `Calls - ${phone.name} - No date filter`,
          phoneId: phone.id,
          url,
          status: response.status,
          success: response.ok,
          callCount,
          data: response.ok ? {
            totalCalls: callCount,
            calls: data.data || [],
            hasMore: false
          } : data
        });

        if (callCount > 0) {
          console.log(`Found ${callCount} calls for ${phone.name} with no date filter`);
        }

      } catch (error) {
        results.tests.push({
          testName: `Calls - ${phone.name} - No date filter`,
          phoneId: phone.id,
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
      testsWithMessages: results.tests.filter(t => (t.messageCount || 0) > 0),
      insights: []
    };

    // Add insights
    if (totalCalls === 0) {
      summary.insights.push('No calls found across all phone numbers and date ranges tested');
    }
    if (totalMessages === 0) {
      summary.insights.push('No messages found across all phone numbers');
    }
    if (totalCalls === 0 && totalMessages === 0) {
      summary.insights.push('This suggests either the account has no activity or there may be permission/scope issues');
    }

    console.log('Broader test completed:', summary);

    return NextResponse.json({
      ...results,
      summary
    });

  } catch (error) {
    console.error('Messages and broader dates test failed:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!OPENPHONE_API_KEY,
    }, { status: 500 });
  }
}