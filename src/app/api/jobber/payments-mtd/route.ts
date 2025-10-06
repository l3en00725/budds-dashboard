import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('jobber_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Query payments collected this month
    const paymentsQuery = `
      query GetPaymentsMTD($startDate: String!, $endDate: String!) {
        paymentRecords(
          first: 200
          filter: {
            collectedAt: { start: $startDate, end: $endDate }
          }
        ) {
          nodes {
            id
            collectedAt
            total
            paymentType
            invoice {
              id
              invoiceNumber
              total
              client {
                firstName
                lastName
                companyName
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await fetch('https://api.getjobber.com/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
      },
      body: JSON.stringify({
        query: paymentsQuery,
        variables: {
          startDate: startOfMonth.toISOString(),
          endDate: startOfNextMonth.toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Jobber API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return NextResponse.json({
        error: 'GraphQL query failed',
        details: data.errors,
      }, { status: 400 });
    }

    const payments = data.data?.paymentRecords?.nodes || [];
    const totalRevenue = payments.reduce((sum: number, payment: any) => sum + (payment.total || 0), 0);

    return NextResponse.json({
      payments: payments.map((payment: any) => ({
        id: payment.id,
        amount: payment.total,
        collectedAt: payment.collectedAt,
        paymentType: payment.paymentType,
        clientName: payment.invoice?.client?.companyName ||
                   `${payment.invoice?.client?.firstName} ${payment.invoice?.client?.lastName}`.trim(),
        invoiceNumber: payment.invoice?.invoiceNumber,
      })),
      totalRevenue,
      count: payments.length,
      dateRange: {
        start: startOfMonth.toISOString(),
        end: startOfNextMonth.toISOString(),
      },
    });

  } catch (error) {
    console.error('Error fetching payments MTD:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch payments MTD',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}