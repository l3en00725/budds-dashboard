import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

const GET_JOBS_QUERY = `
  query GetJobs($first: Int, $after: String) {
    jobs(first: $first, after: $after) {
      nodes {
        id
        jobNumber
        title
        description
        status
        startAt
        endAt
        createdAt
        updatedAt
        client {
          id
          firstName
          lastName
          companyName
          emails {
            address
          }
        }
        lineItems {
          id
          name
          description
          quantity
          unitCost
          total
        }
        total
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('jobber_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const first = parseInt(searchParams.get('first') || '20');
    const after = searchParams.get('after');

    const response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-JOBBER-GRAPHQL-VERSION': '2023-03-15',
      },
      body: JSON.stringify({
        query: GET_JOBS_QUERY,
        variables: { first, after },
      }),
    });

    if (!response.ok) {
      throw new Error(`Jobber API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json({ error: 'GraphQL errors', details: data.errors }, { status: 400 });
    }

    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}