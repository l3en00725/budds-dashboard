import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Test the token with a simple Jobber API call
    const testResponse = await fetch('https://api.getjobber.com/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
      },
      body: JSON.stringify({
        query: `query TestQuery { viewer { id firstName lastName } }`
      }),
    });

    if (!testResponse.ok) {
      return NextResponse.json({
        error: 'Token validation failed',
        status: testResponse.status
      }, { status: 400 });
    }

    const testData = await testResponse.json();
    if (testData.errors) {
      return NextResponse.json({
        error: 'Token validation failed',
        details: testData.errors
      }, { status: 400 });
    }

    // If token is valid, store it
    const response = NextResponse.json({
      message: 'Token stored successfully',
      user: testData.data?.viewer
    });

    response.cookies.set('jobber_access_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7200, // 2 hours
    });

    return response;
  } catch (error) {
    console.error('Test token error:', error);
    return NextResponse.json({
      error: 'Failed to set test token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}