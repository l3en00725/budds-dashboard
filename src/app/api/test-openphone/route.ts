import { NextResponse } from 'next/server';

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

export async function GET() {
  try {
    if (!OPENPHONE_API_KEY) {
      return NextResponse.json({ error: 'OpenPhone API key not configured' }, { status: 500 });
    }

    // Test calls endpoint - try the simple list all calls approach
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const callsUrl = `https://api.openphone.com/v1/calls?createdAt[gte]=${yesterdayStr}T00:00:00Z&limit=5`;

    const response = await fetch(callsUrl, {
      headers: {
        'Authorization': `${OPENPHONE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      apiKeyConfigured: !!OPENPHONE_API_KEY,
      apiKeyPreview: OPENPHONE_API_KEY ? `${OPENPHONE_API_KEY.substring(0, 8)}...` : 'Not set',
      response: responseText ? JSON.parse(responseText) : null,
      headers: Object.fromEntries(response.headers.entries())
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!OPENPHONE_API_KEY,
      apiKeyPreview: OPENPHONE_API_KEY ? `${OPENPHONE_API_KEY.substring(0, 8)}...` : 'Not set'
    }, { status: 500 });
  }
}