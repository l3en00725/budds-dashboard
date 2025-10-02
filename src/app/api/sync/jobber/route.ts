import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import {
  withErrorHandling,
  IntegrationError,
  AuthenticationError,
  RateLimitError,
  retryWithBackoff
} from '@/lib/error-handler';
import * as Sentry from '@sentry/nextjs';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

async function syncJobberHandler(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Log sync start
    const { data: syncLog } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'jobber_full_sync',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    let totalRecordsSynced = 0;

    try {
      // Get stored Jobber token
      // Note: In production, you'd get this from your token storage
      // For now, we'll need the token to be available somehow

      // Sync Jobs data
      const jobsRecords = await syncJobberJobs(request);
      totalRecordsSynced += jobsRecords;

      // Enable invoice and payment sync to fix AR and weekly revenue
      console.log('Syncing jobs, invoices, and payments...');

      // const quotesRecords = await syncJobberQuotes(request);
      // totalRecordsSynced += quotesRecords;
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
    console.error('Jobber sync error:', error);

    // Add context to Sentry
    Sentry.setContext('sync_operation', {
      type: 'jobber_full_sync',
      recordsSynced: totalRecordsSynced,
      syncId: syncLog?.id,
    });

    throw new IntegrationError(
      'jobber',
      error instanceof Error ? error.message : 'Unknown sync error',
      error instanceof Error ? error : undefined,
      { totalRecordsSynced, syncId: syncLog?.id }
    );
  }
}

export const POST = withErrorHandling(syncJobberHandler, 'jobber_sync');

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
      const newAccessToken = await refreshJobberToken(refreshToken);
      if (newAccessToken) {
        console.log('Successfully refreshed Jobber token');
        return newAccessToken;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting Jobber token from cookies:', error);
    return null;
  }
}

async function refreshJobberToken(refreshToken: string): Promise<string | null> {
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
      console.error(`Token refresh failed: ${response.status}`);
      return null;
    }

    const tokenData = await response.json();

    // Update cookies with new tokens (Note: this won't affect current request but future ones)
    // In a real app, you'd want to store this in a database or return it to update cookies
    console.log('Jobber token refreshed successfully');

    return tokenData.access_token;
  } catch (error) {
    console.error('Jobber token refresh error:', error);
    return null;
  }
}

async function makeJobberRequest(query: string, variables: any = {}, request: NextRequest, retryCount = 0) {
  const token = await getJobberToken(request);
  if (!token) {
    throw new AuthenticationError('No Jobber token available for API request', {
      endpoint: 'jobber_api',
      retryCount,
    });
  }

  // More aggressive rate limiting upfront
  const baseDelay = 3000; // 3 seconds base delay
  const exponentialDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
  const jitterDelay = Math.random() * 1000; // Random jitter to avoid thundering herd
  const totalDelay = baseDelay + exponentialDelay + jitterDelay;

  if (retryCount > 0) {
    console.log(`Retry ${retryCount}: waiting ${Math.round(totalDelay/1000)}s before request...`);
    await new Promise(resolve => setTimeout(resolve, totalDelay));
  }

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
      throw new AuthenticationError(
        `Jobber authentication failed: ${response.status}. Token may be expired or invalid.`,
        { statusCode: response.status, retryCount }
      );
    }

    if (response.status === 429) {
      throw new RateLimitError('jobber', undefined, { statusCode: response.status, retryCount });
    }

    throw new IntegrationError(
      'jobber',
      `API request failed with status ${response.status}`,
      undefined,
      { statusCode: response.status, retryCount }
    );
  }

  const data = await response.json();
  if (data.errors) {
    // Check for rate limiting and retry with exponential backoff
    const isThrottled = data.errors.some((error: any) =>
      error.extensions?.code === 'THROTTLED' ||
      error.message?.toLowerCase().includes('rate') ||
      error.message?.toLowerCase().includes('throttle')
    );

    const isAuthError = data.errors.some((error: any) =>
      error.extensions?.code === 'UNAUTHENTICATED' ||
      error.message?.toLowerCase().includes('authentication') ||
      error.message?.toLowerCase().includes('unauthorized')
    );

    if (isAuthError) {
      throw new AuthenticationError(
        'Jobber authentication failed. Please re-authenticate.',
        { errors: data.errors, retryCount }
      );
    }

    if (isThrottled && retryCount < 3) {
      console.log(`Rate limited (attempt ${retryCount + 1}/4), implementing exponential backoff...`);
      return retryWithBackoff(
        () => makeJobberRequest(query, variables, request, retryCount + 1),
        1,
        totalDelay,
        'jobber_rate_limit_retry'
      );
    }

    throw new IntegrationError(
      'jobber',
      'GraphQL query failed',
      undefined,
      { errors: data.errors, retryCount }
    );
  }

  return data.data;
}

async function syncJobberJobs(request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsSynced = 0;
  let hasNextPage = true;
  let cursor = null;

  const query = `
    query GetJobs($first: Int, $after: String, $createdAtGte: DateTime) {
      jobs(first: $first, after: $after, filter: { createdAtGte: $createdAtGte }) {
        nodes {
          id
          jobNumber
          title
          jobStatus
          startAt
          endAt
          createdAt
          updatedAt
          total
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

  while (hasNextPage) {
    // More conservative pagination and delays
    if (cursor) {
      console.log('Waiting 5 seconds between pages to respect rate limits...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Set historical date to September 1st, 2025 for accurate financial data
    const historicalDate = '2025-09-01T00:00:00Z';
    const data = await makeJobberRequest(query, { first: 15, after: cursor, createdAtGte: historicalDate }, request);
    const jobs = data.jobs.nodes;

    console.log(`Processing ${jobs.length} jobs (batch ${Math.floor(recordsSynced / 15) + 1})...`);

    for (const job of jobs) {
      // Store job data
      await supabase.from('jobber_jobs').upsert({
        job_id: job.id,
        job_number: job.jobNumber,
        title: job.title,
        description: null, // Field not available in API
        status: job.jobStatus,
        invoiced: job.jobStatus === 'complete', // Simplified logic
        revenue: job.total || 0,
        client_id: job.client?.id,
        client_name: `${job.client?.firstName || ''} ${job.client?.lastName || ''}`.trim() || job.client?.companyName,
        start_date: job.startAt,
        end_date: job.endAt,
        created_at_jobber: job.createdAt,
        pulled_at: new Date().toISOString(),
      });

      // Store line items separately for accurate membership analysis
      if (job.lineItems?.nodes?.length > 0) {
        for (const lineItem of job.lineItems.nodes) {
          // Store each line item in its own record
          await supabase.from('jobber_line_items').upsert({
            line_item_id: lineItem.id,
            job_id: job.id,
            name: lineItem.name,
            description: lineItem.description,
            quantity: lineItem.quantity || 0,
            unit_cost: lineItem.unitCost || 0,
            total_cost: lineItem.totalCost || 0,
            pulled_at: new Date().toISOString(),
          });

          // Update job description with membership info if found
          const membershipKeywords = ['membership', 'silver', 'gold', 'platinum', 'budd'];
          const hasMembership = membershipKeywords.some(keyword =>
            lineItem.name?.toLowerCase().includes(keyword) ||
            lineItem.description?.toLowerCase().includes(keyword)
          );

          if (hasMembership) {
            const membershipInfo = [];
            if (lineItem.name) membershipInfo.push(`LineItem: ${lineItem.name}`);
            if (lineItem.description) membershipInfo.push(`Desc: ${lineItem.description.substring(0, 100)}`);

            // Update job description with membership line item info
            await supabase.from('jobber_jobs')
              .update({
                description: membershipInfo.join(' | ')
              })
              .eq('job_id', job.id);
          }
        }
      }

      recordsSynced++;
    }

    hasNextPage = data.jobs.pageInfo.hasNextPage;
    cursor = data.jobs.pageInfo.endCursor;
  }

  return recordsSynced;
}

async function syncJobberQuotes(request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsSynced = 0;
  let hasNextPage = true;
  let cursor = null;

  const query = `
    query GetQuotes($first: Int, $after: String) {
      quotes(first: $first, after: $after) {
        nodes {
          id
          quoteNumber
          quoteStatus
          total
          createdAt
          expiresAt
          client {
            id
            firstName
            lastName
            companyName
            emails {
              address
            }
            phoneNumbers {
              number
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

  while (hasNextPage) {
    const data = await makeJobberRequest(query, { first: 50, after: cursor }, request);
    const quotes = data.quotes.nodes;

    for (const quote of quotes) {
      await supabase.from('jobber_quotes').upsert({
        quote_id: quote.id,
        quote_number: quote.quoteNumber,
        client_id: quote.client?.id,
        client_name: `${quote.client?.firstName || ''} ${quote.client?.lastName || ''}`.trim() || quote.client?.companyName,
        client_email: quote.client?.emails?.[0]?.address,
        client_phone: quote.client?.phoneNumbers?.[0]?.number,
        status: quote.quoteStatus,
        amount: quote.total || 0,
        created_at_jobber: quote.createdAt,
        expires_at: quote.expiresAt,
        pulled_at: new Date().toISOString(),
      });
      recordsSynced++;
    }

    hasNextPage = data.quotes.pageInfo.hasNextPage;
    cursor = data.quotes.pageInfo.endCursor;
  }

  return recordsSynced;
}

async function syncJobberInvoices(request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsSynced = 0;
  let hasNextPage = true;
  let cursor = null;

  const query = `
    query GetInvoices($first: Int, $after: String, $createdAtGte: DateTime) {
      invoices(first: $first, after: $after, filter: { createdAtGte: $createdAtGte }) {
        nodes {
          id
          invoiceNumber
          invoiceStatus
          total
          outstandingAmount
          issueDate
          dueDate
          createdAt
          client {
            id
            firstName
            lastName
            companyName
          }
          job {
            id
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  while (hasNextPage) {
    // Set historical date to September 1st, 2025 for accurate financial data
    const historicalDate = '2025-09-01T00:00:00Z';
    const data = await makeJobberRequest(query, { first: 50, after: cursor, createdAtGte: historicalDate }, request);
    const invoices = data.invoices.nodes;

    for (const invoice of invoices) {
      await supabase.from('jobber_invoices').upsert({
        invoice_id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        client_id: invoice.client?.id,
        client_name: `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`.trim() || invoice.client?.companyName,
        job_id: invoice.job?.id,
        status: invoice.invoiceStatus,
        amount: invoice.total || 0,
        balance: invoice.outstandingAmount || 0,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        created_at_jobber: invoice.createdAt,
        pulled_at: new Date().toISOString(),
      });
      recordsSynced++;
    }

    hasNextPage = data.invoices.pageInfo.hasNextPage;
    cursor = data.invoices.pageInfo.endCursor;
  }

  return recordsSynced;
}

async function syncJobberPayments(request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsSynced = 0;
  let hasNextPage = true;
  let cursor = null;

  const query = `
    query GetPayments($first: Int, $after: String, $createdAtGte: DateTime) {
      payments(first: $first, after: $after, filter: { createdAtGte: $createdAtGte }) {
        nodes {
          id
          amount
          paymentDate
          paymentMethod
          createdAt
          client {
            id
            firstName
            lastName
            companyName
          }
          invoice {
            id
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  while (hasNextPage) {
    // Set historical date to September 1st, 2025 for accurate financial data
    const historicalDate = '2025-09-01T00:00:00Z';
    const data = await makeJobberRequest(query, { first: 50, after: cursor, createdAtGte: historicalDate }, request);
    const payments = data.payments.nodes;

    for (const payment of payments) {
      await supabase.from('jobber_payments').upsert({
        payment_id: payment.id,
        customer: `${payment.client?.firstName || ''} ${payment.client?.lastName || ''}`.trim() || payment.client?.companyName,
        client_id: payment.client?.id,
        invoice_id: payment.invoice?.id,
        amount: payment.amount || 0,
        payment_date: payment.paymentDate,
        payment_method: payment.paymentMethod,
        created_at_jobber: payment.createdAt,
        pulled_at: new Date().toISOString(),
      });
      recordsSynced++;
    }

    hasNextPage = data.payments.pageInfo.hasNextPage;
    cursor = data.payments.pageInfo.endCursor;
  }

  return recordsSynced;
}