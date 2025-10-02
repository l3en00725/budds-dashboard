import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('jobber_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No Jobber token found' }, { status: 401 });
    }

    // Test query to check for line items availability
    const testQuery = `
      query TestLineItemsQuery {
        jobs(first: 2) {
          nodes {
            id
            jobNumber
            title
            jobStatus
            lineItems {
              id
              name
              description
              quantity
              unitCost
              total
            }
            client {
              id
              firstName
              lastName
              companyName
            }
          }
        }
      }
    `;

    const response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
      hasToken: !!accessToken,
      tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : null,
      apiResponse: data,
    });
  } catch (error) {
    console.error('Test Jobber error:', error);
    return NextResponse.json({
      error: 'Failed to test Jobber connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}