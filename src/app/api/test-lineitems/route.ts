import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

async function getJobberToken(request: NextRequest): Promise<string | null> {
  try {
    // Try to get from Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get from request cookies
    const accessToken = request.cookies.get('jobber_access_token')?.value;
    if (accessToken) return accessToken;

    // Fallback to server cookies
    const cookieStore = await cookies();
    return cookieStore.get('jobber_access_token')?.value || null;
  } catch (error) {
    console.error('Error getting Jobber token:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getJobberToken(request);

    if (!token) {
      return NextResponse.json({ error: 'No Jobber token found' }, { status: 401 });
    }

    // Test query with correct line items structure
    const testQuery = `
      query TestLineItemsQuery {
        jobs(first: 1) {
          nodes {
            id
            jobNumber
            title
            jobStatus
            lineItems {
              nodes {
                id
                name
                description
                quantity
                unitCost
                totalCost
              }
            }
          }
        }
      }
    `;

    const response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
      },
      body: JSON.stringify({
        query: testQuery,
      }),
    });

    if (!response.ok) {
      throw new Error(`Jobber API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      hasToken: !!token,
      apiResponse: data,
      lineItemsSupported: !data.errors || !data.errors.some((e: any) => e.message.includes('lineItems'))
    });
  } catch (error) {
    console.error('Line items test error:', error);
    return NextResponse.json({
      error: 'Failed to test line items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}