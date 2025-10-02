import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

const GET_PAYMENTS_QUERY = `
  query GetPayments($first: Int, $after: String, $filter: PaymentFilter) {
    payments(first: $first, after: $after, filter: $filter) {
      nodes {
        id
        amount
        paymentDate
        paymentMethod
        memo
        createdAt
        updatedAt
        client {
          id
          firstName
          lastName
          companyName
          emails {
            address
            isPrimary
          }
        }
        invoice {
          id
          invoiceNumber
          total
          job {
            id
            jobNumber
            title
          }
        }
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
    const first = parseInt(searchParams.get('first') || '100');
    const after = searchParams.get('after');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let filter = {};
    if (startDate && endDate) {
      filter = {
        paymentDate: {
          greaterThanOrEqualTo: startDate,
          lessThanOrEqualTo: endDate,
        },
      };
    } else if (startDate) {
      filter = {
        paymentDate: {
          greaterThanOrEqualTo: startDate,
        },
      };
    }

    const response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-JOBBER-GRAPHQL-VERSION': '2023-03-15',
      },
      body: JSON.stringify({
        query: GET_PAYMENTS_QUERY,
        variables: { first, after, filter },
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
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}