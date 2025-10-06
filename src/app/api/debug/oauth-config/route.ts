import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    clientId: process.env.JOBBER_CLIENT_ID?.substring(0, 8) + '...',
    redirectUri: process.env.JOBBER_REDIRECT_URI,
    baseUrl: process.env.NEXT_PUBLIC_APP_URL,
    hasClientId: !!process.env.JOBBER_CLIENT_ID,
    hasClientSecret: !!process.env.JOBBER_CLIENT_SECRET,
    fullAuthUrl: `https://api.getjobber.com/api/oauth/authorize?client_id=${process.env.JOBBER_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.JOBBER_REDIRECT_URI!)}&response_type=code&scope=read%20write&state=test123`
  });
}