import { NextResponse } from 'next/server';

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

export async function GET() {
  try {
    if (!OPENPHONE_API_KEY) {
      return NextResponse.json({ error: 'OpenPhone API key not configured' }, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];
    const mainPhoneId = "PN7r9F5MtW"; // Main Budd's Plumbing line from our test

    // Try different API endpoints to get today's calls
    const results = [];

    // Try 1: Simple calls endpoint without phoneNumberId
    try {
      const url1 = `https://api.openphone.com/v1/calls?limit=20`;
      const response1 = await fetch(url1, {
        headers: {
          'Authorization': `${OPENPHONE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      results.push({
        endpoint: 'Simple calls',
        url: url1,
        status: response1.status,
        success: response1.ok,
        data: response1.ok ? await response1.json() : await response1.text()
      });
    } catch (error) {
      results.push({
        endpoint: 'Simple calls',
        error: error.message
      });
    }

    // Try 2: Calls with date filter
    try {
      const url2 = `https://api.openphone.com/v1/calls?createdAt[gte]=${today}T00:00:00Z&limit=20`;
      const response2 = await fetch(url2, {
        headers: {
          'Authorization': `${OPENPHONE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      results.push({
        endpoint: 'Calls with date filter',
        url: url2,
        status: response2.status,
        success: response2.ok,
        data: response2.ok ? await response2.json() : await response2.text()
      });
    } catch (error) {
      results.push({
        endpoint: 'Calls with date filter',
        error: error.message
      });
    }

    return NextResponse.json({
      today,
      results,
      apiKeyConfigured: true
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}