import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

const GET_PAYMENT_RECORDS_QUERY = `
  query GetPaymentRecords($first: Int, $after: String, $filter: InvoiceFilter) {
    invoices(first: $first, after: $after, filter: $filter) {
      nodes {
        id
        invoiceNumber
        total
        createdAt
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
        job {
          id
          jobNumber
          title
        }
        paymentRecords {
          nodes {
            id
            amount
            receivedOn
            createdAt
            updatedAt
            paymentMethod {
              name
            }
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

    // Use invoice creation date as filter since payment records are nested
    let filter = {};
    if (startDate && endDate) {
      filter = {
        createdAt: {
          after: startDate,
          before: endDate,
        },
      };
    } else if (startDate) {
      filter = {
        createdAt: {
          after: startDate,
        },
      };
    }

    const response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
      },
      body: JSON.stringify({
        query: GET_PAYMENT_RECORDS_QUERY,
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

    // Extract payment records from invoices and format them like the old payments response
    const invoices = data.data.invoices.nodes;
    const payments = [];

    for (const invoice of invoices) {
      for (const paymentRecord of invoice.paymentRecords?.nodes || []) {
        // Filter by payment date if specified
        if (startDate || endDate) {
          const paymentDate = new Date(paymentRecord.receivedOn || paymentRecord.createdAt);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;

          if (start && paymentDate < start) continue;
          if (end && paymentDate > end) continue;
        }

        payments.push({
          id: paymentRecord.id,
          amount: paymentRecord.amount,
          paymentDate: paymentRecord.receivedOn,
          paymentMethod: paymentRecord.paymentMethod?.name || 'Unknown',
          memo: null, // Not available in paymentRecords
          createdAt: paymentRecord.createdAt,
          updatedAt: paymentRecord.updatedAt,
          client: invoice.client,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            job: invoice.job
          }
        });
      }
    }

    // Return in the same format as the original payments query
    return NextResponse.json({
      payments: {
        nodes: payments,
        pageInfo: data.data.invoices.pageInfo
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}