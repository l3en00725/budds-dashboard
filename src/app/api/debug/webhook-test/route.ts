import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook test endpoint is working',
    timestamp: new Date().toISOString(),
    webhookUrl: process.env.NEXT_PUBLIC_APP_URL ? 
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/openphone` : 
      'http://localhost:3000/api/webhooks/openphone',
    instructions: [
      '1. Copy the webhookUrl above',
      '2. Go to OpenPhone webhook settings',
      '3. Paste the URL as your webhook endpoint',
      '4. Enable call.completed and call.transcript.completed events',
      '5. Make a test call to verify webhooks are received'
    ]
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test webhook received successfully',
      receivedAt: new Date().toISOString(),
      payload: payload,
      eventType: payload.object?.type || payload.event || payload.type || 'unknown'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
