import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({
    message: 'Jobber cookies cleared. You can now re-authenticate.',
    nextStep: 'Go to http://localhost:3000/api/auth/jobber/login'
  });

  // Clear all Jobber-related cookies
  response.cookies.delete('jobber_access_token');
  response.cookies.delete('jobber_refresh_token');

  return response;
}