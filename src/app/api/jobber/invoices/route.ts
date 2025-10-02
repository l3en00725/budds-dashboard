import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

const GET_INVOICES_QUERY = `
  query GetInvoices($first: Int, $after: String) {
    invoices(first: $first, after: $after) {
      nodes {
        id
        invoiceNumber
        status
        issueDate
        dueDate
        subtotal
        taxTotal
        total
        balance
        client {
          id
          firstName
          lastName
          companyName
          emails {
            address
          }
        }
        job {
          id
          jobNumber
          title
        }
        lineItems {
          id
          name
          description
          quantity
          unitCost
          total
        }
        createdAt
        updatedAt
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
        query: GET_INVOICES_QUERY,
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
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}