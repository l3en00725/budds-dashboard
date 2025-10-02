import { NextResponse } from 'next/server';

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

export async function GET() {
  try {
    if (!OPENPHONE_API_KEY) {
      return NextResponse.json({ error: 'OpenPhone API key not configured' }, { status: 500 });
    }

    console.log('Testing alternative OpenPhone endpoints...');

    const results = {
      apiKeyConfigured: true,
      tests: []
    };

    // Test 1: Conversations endpoint - this might be where the activity is
    console.log('Testing conversations endpoint...');
    try {
      const conversationsUrl = 'https://api.openphone.com/v1/conversations?limit=50';

      const conversationsResponse = await fetch(conversationsUrl, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const conversationsData = conversationsResponse.ok ? await conversationsResponse.json() : await conversationsResponse.text();
      const conversationCount = conversationsResponse.ok && conversationsData.data ? conversationsData.data.length : 0;

      results.tests.push({
        testName: 'Conversations Endpoint',
        url: conversationsUrl,
        status: conversationsResponse.status,
        success: conversationsResponse.ok,
        conversationCount,
        data: conversationsResponse.ok ? {
          totalConversations: conversationCount,
          conversations: conversationsData.data?.slice(0, 5) || [],
          hasMore: conversationCount > 5
        } : conversationsData
      });

      if (conversationCount > 0) {
        console.log(`Found ${conversationCount} conversations`);
      }

    } catch (error) {
      results.tests.push({
        testName: 'Conversations Endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Webhooks endpoint to see what's configured
    console.log('Testing webhooks endpoint...');
    try {
      const webhooksUrl = 'https://api.openphone.com/v1/webhooks';

      const webhooksResponse = await fetch(webhooksUrl, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const webhooksData = webhooksResponse.ok ? await webhooksResponse.json() : await webhooksResponse.text();
      const webhookCount = webhooksResponse.ok && webhooksData.data ? webhooksData.data.length : 0;

      results.tests.push({
        testName: 'Webhooks Endpoint',
        url: webhooksUrl,
        status: webhooksResponse.status,
        success: webhooksResponse.ok,
        webhookCount,
        data: webhooksResponse.ok ? {
          totalWebhooks: webhookCount,
          webhooks: webhooksData.data || [],
          hasMore: false
        } : webhooksData
      });

    } catch (error) {
      results.tests.push({
        testName: 'Webhooks Endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Try calls endpoint with different participants approach
    console.log('Testing calls with different participants approaches...');
    const mainPhoneId = "PN7r9F5MtW"; // Main Budd's Plumbing line
    const phoneNumber = "+16094653759"; // Main number

    // Try without participants parameter
    try {
      const url1 = `https://api.openphone.com/v1/calls?phoneNumberId=${mainPhoneId}&limit=10`;

      const response1 = await fetch(url1, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const data1 = response1.ok ? await response1.json() : await response1.text();
      const callCount1 = response1.ok && data1.data ? data1.data.length : 0;

      results.tests.push({
        testName: 'Calls without participants parameter',
        url: url1,
        status: response1.status,
        success: response1.ok,
        callCount: callCount1,
        data: response1.ok ? {
          totalCalls: callCount1,
          calls: data1.data || [],
          hasMore: false
        } : data1
      });

    } catch (error) {
      results.tests.push({
        testName: 'Calls without participants parameter',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Try with empty participants array
    try {
      const url2 = `https://api.openphone.com/v1/calls?phoneNumberId=${mainPhoneId}&participants=&limit=10`;

      const response2 = await fetch(url2, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const data2 = response2.ok ? await response2.json() : await response2.text();
      const callCount2 = response2.ok && data2.data ? data2.data.length : 0;

      results.tests.push({
        testName: 'Calls with empty participants',
        url: url2,
        status: response2.status,
        success: response2.ok,
        callCount: callCount2,
        data: response2.ok ? {
          totalCalls: callCount2,
          calls: data2.data || [],
          hasMore: false
        } : data2
      });

    } catch (error) {
      results.tests.push({
        testName: 'Calls with empty participants',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 4: Try API info/status endpoints
    console.log('Testing API status/info endpoints...');

    // Try account info
    try {
      const accountUrl = 'https://api.openphone.com/v1/account';

      const accountResponse = await fetch(accountUrl, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const accountData = accountResponse.ok ? await accountResponse.json() : await accountResponse.text();

      results.tests.push({
        testName: 'Account Info',
        url: accountUrl,
        status: accountResponse.status,
        success: accountResponse.ok,
        data: accountData
      });

    } catch (error) {
      results.tests.push({
        testName: 'Account Info',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Try users endpoint
    try {
      const usersUrl = 'https://api.openphone.com/v1/users';

      const usersResponse = await fetch(usersUrl, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const usersData = usersResponse.ok ? await usersResponse.json() : await usersResponse.text();
      const userCount = usersResponse.ok && usersData.data ? usersData.data.length : 0;

      results.tests.push({
        testName: 'Users Endpoint',
        url: usersUrl,
        status: usersResponse.status,
        success: usersResponse.ok,
        userCount,
        data: usersResponse.ok ? {
          totalUsers: userCount,
          users: usersData.data || [],
          hasMore: false
        } : usersData
      });

    } catch (error) {
      results.tests.push({
        testName: 'Users Endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 5: Try activity/events endpoint if it exists
    try {
      const activityUrl = 'https://api.openphone.com/v1/activity?limit=10';

      const activityResponse = await fetch(activityUrl, {
        headers: {
          'Authorization': OPENPHONE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      const activityData = activityResponse.ok ? await activityResponse.json() : await activityResponse.text();

      results.tests.push({
        testName: 'Activity Endpoint',
        url: activityUrl,
        status: activityResponse.status,
        success: activityResponse.ok,
        data: activityData
      });

    } catch (error) {
      results.tests.push({
        testName: 'Activity Endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Summary
    const successfulTests = results.tests.filter(t => t.success).length;
    const totalCalls = results.tests.reduce((sum, t) => sum + (t.callCount || 0), 0);
    const totalConversations = results.tests.reduce((sum, t) => sum + (t.conversationCount || 0), 0);
    const totalWebhooks = results.tests.reduce((sum, t) => sum + (t.webhookCount || 0), 0);
    const totalUsers = results.tests.reduce((sum, t) => sum + (t.userCount || 0), 0);

    const summary = {
      totalTests: results.tests.length,
      successfulTests,
      failedTests: results.tests.length - successfulTests,
      findings: {
        totalCallsFound: totalCalls,
        totalConversationsFound: totalConversations,
        totalWebhooksFound: totalWebhooks,
        totalUsersFound: totalUsers
      },
      successfulEndpoints: results.tests.filter(t => t.success).map(t => t.testName),
      insights: []
    };

    // Add insights
    if (totalConversations > 0) {
      summary.insights.push(`Found ${totalConversations} conversations - this might be where the activity is stored`);
    }
    if (totalUsers > 0) {
      summary.insights.push(`Account has ${totalUsers} users configured`);
    }
    if (totalCalls === 0 && totalConversations === 0) {
      summary.insights.push('No call or conversation activity found - the account may be empty or require different query parameters');
    }

    console.log('Alternative endpoints test completed:', summary);

    return NextResponse.json({
      ...results,
      summary
    });

  } catch (error) {
    console.error('Alternative endpoints test failed:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!OPENPHONE_API_KEY,
    }, { status: 500 });
  }
}