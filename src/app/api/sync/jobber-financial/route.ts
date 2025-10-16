import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Log sync start
    const { data: syncLog } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'jobber_financial_only',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    let totalRecordsSynced = 0;

    try {
      console.log('Syncing invoices and payments only...');

      // Skip jobs sync, go straight to financial data
      const invoicesRecords = await syncJobberInvoices(request);
      totalRecordsSynced += invoicesRecords;

      const paymentsRecords = await syncJobberPayments(request);
      totalRecordsSynced += paymentsRecords;

      // Update sync log with success
      await supabase
        .from('sync_log')
        .update({
          status: 'success',
          records_synced: totalRecordsSynced,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      return NextResponse.json({
        success: true,
        recordsSynced: totalRecordsSynced,
        syncId: syncLog.id,
        message: 'Financial data sync completed successfully'
      });

    } catch (error) {
      // Update sync log with error
      await supabase
        .from('sync_log')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      throw error;
    }
  } catch (error) {
    console.error('Jobber financial sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getJobberToken(request: NextRequest): Promise<string | null> {
  try {
    // Try to get from Authorization header first (client-side approach)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return token;
    }

    // Try to get from request cookies
    let accessToken = request.cookies.get('jobber_access_token')?.value;
    if (accessToken) {
      return accessToken;
    }

    // Fallback to server cookies
    const cookieStore = await cookies();
    accessToken = cookieStore.get('jobber_access_token')?.value;

    if (accessToken) {
      return accessToken;
    }

    // If no access token, try to refresh using refresh token
    const refreshToken = request.cookies.get('jobber_refresh_token')?.value ||
                        cookieStore.get('jobber_refresh_token')?.value;

    if (refreshToken) {
      console.log('Access token not found, attempting to refresh...');
      const tokenData = await refreshJobberToken(refreshToken);
      if (tokenData?.access_token) {
        console.log('Successfully refreshed Jobber token');
        // TODO: Store the new tokens back in cookies for future requests
        return tokenData.access_token;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting Jobber token from cookies:', error);
    return null;
  }
}

async function refreshJobberToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number } | null> {
  try {
    const response = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.JOBBER_CLIENT_ID!,
        client_secret: process.env.JOBBER_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = await response.json();
    return tokenData;
  } catch (error) {
    console.error('Jobber token refresh error:', error);
    return null;
  }
}

async function makeJobberRequest(query: string, variables: any, request: NextRequest) {
  const supabase = createServiceRoleClient();

  // Get Jobber token from database (like the jobs sync)
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

async function syncJobberInvoices(request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsProcessed = 0;
  let hasNextPage = true;
  let cursor = null;

  console.log('Starting invoice sync...');

  while (hasNextPage) {
    const query = `
      query GetInvoices($first: Int, $after: String) {
        invoices(first: $first, after: $after) {
          nodes {
            id
            invoiceNumber
            total
            subtotal
            tax
            issuedDate
            dueDate
            createdAt
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

    const variables = { first: 50, after: cursor };
    const response = await makeJobberRequest(query, variables, request);
    const invoices = response.data?.invoices?.nodes || [];

    console.log(`Processing ${invoices.length} invoices...`);

    for (const invoice of invoices) {
      // Filter to September 2025 or later based on createdAt date
      const createdDate = new Date(invoice.createdAt);
      const september2025 = new Date('2025-09-01T00:00:00Z');

      if (createdDate >= september2025) {
        await supabase.from('jobber_invoices').upsert({
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          amount: invoice.total || 0,
          subtotal: invoice.subtotal || 0,
          tax: invoice.tax || 0,
          balance: invoice.total || 0, // Use total as balance since outstandingAmount not available
          issue_date: invoice.issuedDate,
          due_date: invoice.dueDate,
          status: 'issued', // Default status since not available from API
          client_id: invoice.client?.id,
          client_name: `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`.trim() ||
                       invoice.client?.companyName || 'Unknown',
          pulled_at: new Date().toISOString()
        });
        recordsProcessed++;
      }
    }

    hasNextPage = response.data?.invoices?.pageInfo?.hasNextPage || false;
    cursor = response.data?.invoices?.pageInfo?.endCursor;

    if (hasNextPage) {
      console.log('Waiting 2 seconds between invoice pages...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`Invoice sync completed: ${recordsProcessed} records`);
  return recordsProcessed;
}

async function syncJobberPayments(request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsProcessed = 0;
  let hasNextPage = true;
  let cursor = null;

  console.log('Starting payments sync...');

  while (hasNextPage) {
    const query = `
      query GetPayments($first: Int, $after: String) {
        payments(first: $first, after: $after) {
          nodes {
            id
            amount
            paymentDate
            paymentMethod
            createdAt
            invoice {
              id
              invoiceNumber
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

    const variables = { first: 50, after: cursor };
    const response = await makeJobberRequest(query, variables, request);
    const payments = response.data?.payments?.nodes || [];

    console.log(`Processing ${payments.length} payments...`);

    for (const payment of payments) {
      // Filter to September 2025 or later based on createdAt date
      const createdDate = new Date(payment.createdAt);
      const september2025 = new Date('2025-09-01T00:00:00Z');

      if (createdDate >= september2025) {
        await supabase.from('jobber_payments').upsert({
          payment_id: payment.id,
          amount: payment.amount || 0,
          payment_date: payment.paymentDate,
          payment_method: payment.paymentMethod || 'unknown',
          invoice_id: payment.invoice?.id,
          invoice_number: payment.invoice?.invoiceNumber,
          client_id: payment.client?.id,
          customer: `${payment.client?.firstName || ''} ${payment.client?.lastName || ''}`.trim() ||
                    payment.client?.companyName || 'Unknown',
          pulled_at: new Date().toISOString()
        });
        recordsProcessed++;
      }
    }

    hasNextPage = response.data?.payments?.pageInfo?.hasNextPage || false;
    cursor = response.data?.payments?.pageInfo?.endCursor;

    if (hasNextPage) {
      console.log('Waiting 2 seconds between payment pages...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`Payments sync completed: ${recordsProcessed} records`);
  return recordsProcessed;
}