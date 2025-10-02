import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

async function getJobberToken(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const accessToken = request.cookies.get('jobber_access_token')?.value;
    if (accessToken) return accessToken;

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

    // Test query to get one job with line items to debug structure
    const testQuery = `
      query TestJobLineItems {
        jobs(first: 5) {
          nodes {
            id
            jobNumber
            title
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

    // Count jobs with line items
    const jobsWithLineItems = data.data?.jobs?.nodes?.filter((job: any) =>
      job.lineItems?.nodes?.length > 0
    ) || [];

    const totalLineItems = jobsWithLineItems.reduce((sum: number, job: any) =>
      sum + (job.lineItems?.nodes?.length || 0), 0
    );

    return NextResponse.json({
      success: true,
      totalJobs: data.data?.jobs?.nodes?.length || 0,
      jobsWithLineItems: jobsWithLineItems.length,
      totalLineItems,
      sampleJob: jobsWithLineItems[0] || null,
      errors: data.errors,
      rawData: data.data
    });
  } catch (error) {
    console.error('Job line items test error:', error);
    return NextResponse.json({
      error: 'Failed to test job line items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}