import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Set token as cookie for testing
    const cookieStore = await cookies();

    const response = NextResponse.json({
      success: true,
      message: 'Token set for testing',
      tokenPreview: token.substring(0, 20) + '...'
    });

    // Set cookie that expires in 1 hour
    response.cookies.set('jobber_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
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

export async function DELETE() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Token cleared'
    });

    // Clear the token cookie
    response.cookies.delete('jobber_access_token');

    return response;
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to clear token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}