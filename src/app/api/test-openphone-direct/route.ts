import { NextResponse } from 'next/server';

const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;

export async function GET() {
  try {
    if (!OPENPHONE_API_KEY) {
      return NextResponse.json({ error: 'OpenPhone API key not configured' }, { status: 500 });
    }

    // First, let's get your phone numbers to see what's available
    const phoneNumbersUrl = 'https://api.openphone.com/v1/phone-numbers';

    const phoneResponse = await fetch(phoneNumbersUrl, {
      headers: {
        'Authorization': `${OPENPHONE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let phoneNumbers = null;
    let phoneError = null;

    if (phoneResponse.ok) {
      phoneNumbers = await phoneResponse.json();
    } else {
      phoneError = {
        status: phoneResponse.status,
        statusText: phoneResponse.statusText,
        response: await phoneResponse.text()
      };
    }

    // Try to get calls for any phone number we find
    let callsData = null;
    let callsError = null;

    if (phoneNumbers?.data?.length > 0) {
      const firstPhoneId = phoneNumbers.data[0].id;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 7); // Last 7 days
      const dateStr = yesterday.toISOString().split('T')[0];

      const callsUrl = `https://api.openphone.com/v1/calls?phoneNumberId=${firstPhoneId}&createdAt[gte]=${dateStr}T00:00:00Z&limit=10`;

      const callsResponse = await fetch(callsUrl, {
        headers: {
          'Authorization': `${OPENPHONE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (callsResponse.ok) {
        callsData = await callsResponse.json();
      } else {
        callsError = {
          status: callsResponse.status,
          statusText: callsResponse.statusText,
          response: await callsResponse.text()
        };
      }
    }

    return NextResponse.json({
      apiKeyConfigured: !!OPENPHONE_API_KEY,
      apiKeyPreview: OPENPHONE_API_KEY ? `${OPENPHONE_API_KEY.substring(0, 8)}...` : 'Not set',
      phoneNumbers: {
        success: !!phoneNumbers,
        data: phoneNumbers,
        error: phoneError
      },
      calls: {
        success: !!callsData,
        data: callsData,
        error: callsError
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!OPENPHONE_API_KEY,
    }, { status: 500 });
  }
}