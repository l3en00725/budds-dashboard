import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

async function makeJobberRequest(query: string, variables: any, request: NextRequest) {
  const supabase = createServiceRoleClient();

  // Get Jobber token from database (same as the financial sync)
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('jobber_tokens')
    .select('access_token')
    .eq('id', 1)
    .single();

  if (tokenErr || !tokenRow?.access_token) {
    throw new Error('No Jobber token available in database. Please run Jobber OAuth first.');
  }

  const token = tokenRow.access_token;

  const response = await fetch(JOBBER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    // Check for authentication errors specifically
    if (response.status === 401 || response.status === 403) {
      const errorText = await response.text();
      console.error(`Jobber API authentication error ${response.status}:`, errorText);
      throw new Error(`Authentication error: ${response.status}. Token may be expired or invalid. Please re-authenticate with Jobber.`);
    }
    const errorText = await response.text();
    console.error(`Jobber API error ${response.status}:`, errorText);
    throw new Error(`Jobber API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Jobber GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]; // 2025-10-10

    console.log('🔍 JOBBER LIVE API - Checking payments for:', today);

    // Try to get payments through invoices with paymentRecords
    const query = `
      query GetInvoicesWithPayments($first: Int, $after: String) {
        invoices(first: $first, after: $after) {
          nodes {
            id
            invoiceNumber
            total
            issuedDate
            createdAt
            paymentRecords {
              nodes {
                id
                amount
              }
            }
            client {
              id
              firstName
              lastName
              companyName
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables = { first: 100, after: null };
    const response = await makeJobberRequest(query, variables, request);

    const allInvoices = response.data?.invoices?.nodes || [];

    // Extract all payment records from all invoices
    const allPayments = [];
    for (const invoice of allInvoices) {
      if (invoice.paymentRecords && invoice.paymentRecords.nodes && invoice.paymentRecords.nodes.length > 0) {
        for (const paymentRecord of invoice.paymentRecords.nodes) {
          allPayments.push({
            ...paymentRecord,
            paymentDate: invoice.issuedDate ? invoice.issuedDate.split('T')[0] : null, // Use invoice date as proxy
            invoice: {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber
            },
            client: invoice.client
          });
        }
      }
    }

    // Filter payments for today (Oct 10, 2025)
    const todaysPayments = allPayments.filter(payment => {
      const paymentDate = payment.paymentDate;
      return paymentDate === today;
    });

    // Filter payments from the last 7 days for context
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const recentPayments = allPayments.filter(payment => {
      const paymentDate = payment.paymentDate;
      return paymentDate && paymentDate >= sevenDaysAgoStr;
    });

    const totalTodayAmount = todaysPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    return NextResponse.json({
      date: today,
      lookingForAmount: 8415,
      directFromJobberAPI: {
        todaysPayments: {
          count: todaysPayments.length,
          totalAmount: totalTodayAmount,
          payments: todaysPayments
        },
        recentPayments: {
          count: recentPayments.length,
          payments: recentPayments.slice(0, 20) // Show first 20 for debugging
        },
        totalInvoicesChecked: allInvoices.length,
        totalPaymentRecordsFound: allPayments.length,
        hasMorePages: response.data?.invoices?.pageInfo?.hasNextPage || false
      }
    });

  } catch (error) {
    console.error('Jobber live payments error:', error);
    return NextResponse.json({
      error: 'Failed to query Jobber live payments',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}