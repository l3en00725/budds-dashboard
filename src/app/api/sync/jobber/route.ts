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
  const supabase = createServiceRoleClient();
  let totalRecordsSynced = 0;
  let syncLogId: string | null = null;

  try {
    // ============================================
    // START LOG: Create initial sync_log entry
    // ============================================
    const startTime = new Date().toISOString();
    console.log(`[SYNC START] Initiating Jobber full sync at ${startTime}`);

    const { data: syncLog, error: syncLogError } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'jobber_full_sync',
        status: 'running',
        started_at: startTime,
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('[SYNC START ERROR] Failed to create sync log:', syncLogError);
      throw syncLogError;
    }

    if (!syncLog || !syncLog.id) {
      const error = new Error('Sync log created but no ID returned');
      console.error('[SYNC START ERROR]', error);
      throw error;
    }

    syncLogId = syncLog.id;
    console.log(`[SYNC START] Created sync log entry with ID: ${syncLogId}`);

    try {
      // ============================================
      // SYNC EXECUTION: Run all sync operations
      // ============================================
      console.log('[SYNC EXECUTION] Starting Jobs sync...');
      const jobsRecords = await syncJobberJobs(request);
      totalRecordsSynced += jobsRecords;
      console.log(`[SYNC EXECUTION] Jobs complete: ${jobsRecords} records`);

      console.log('[SYNC EXECUTION] Starting Quotes, Invoices, and Payments sync...');

      const quotesRecords = await syncJobberQuotes(request);
      totalRecordsSynced += quotesRecords;
      console.log(`[SYNC EXECUTION] Quotes complete: ${quotesRecords} records`);

      const invoicesRecords = await syncJobberInvoices(request);
      totalRecordsSynced += invoicesRecords;
      console.log(`[SYNC EXECUTION] Invoices complete: ${invoicesRecords} records`);

      const paymentsRecords = await syncJobberPayments(request);
      totalRecordsSynced += paymentsRecords;
      console.log(`[SYNC EXECUTION] Payments complete: ${paymentsRecords} records`);

      // ============================================
      // SUCCESS LOG: Update sync_log with success
      // ============================================
      const completedAt = new Date().toISOString();
      console.log(`[SYNC SUCCESS] All operations complete. Total records: ${totalRecordsSynced}`);

      const { error: updateError } = await supabase
        .from('sync_log')
        .update({
          status: 'success',
          records_synced: totalRecordsSynced,
          completed_at: completedAt,
        })
        .eq('id', syncLogId);

      if (updateError) {
        console.error('[SYNC SUCCESS] Warning: Failed to update sync log:', updateError);
      } else {
        console.log(`[SYNC SUCCESS] Updated sync log ${syncLogId} with success status`);
      }

      return NextResponse.json({
        success: true,
        recordsSynced: totalRecordsSynced,
        syncId: syncLogId,
      });

    } catch (error) {
      // ============================================
      // ERROR LOG: Update sync_log with error details
      // ============================================
      const completedAt = new Date().toISOString();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[SYNC ERROR] Sync failed after ${totalRecordsSynced} records:`, errorMessage);

      if (syncLogId) {
        const { error: updateError } = await supabase
          .from('sync_log')
          .update({
            status: 'error',
            error_message: errorMessage,
            records_synced: totalRecordsSynced, // Track partial progress even on failure
            completed_at: completedAt,
          })
          .eq('id', syncLogId);

        if (updateError) {
          console.error('[SYNC ERROR] Warning: Failed to update sync log with error:', updateError);
        } else {
          console.log(`[SYNC ERROR] Updated sync log ${syncLogId} with error status`);
        }
      }

      throw error;
    }
  } catch (error) {
    console.error('Jobber sync error:', error);

    // Add context to Sentry
    Sentry.setContext('sync_operation', {
      type: 'jobber_full_sync',
      recordsSynced: totalRecordsSynced,
      syncId: syncLogId,
    });

    throw new IntegrationError(
      'jobber',
      error instanceof Error ? error.message : 'Unknown sync error',
      error instanceof Error ? error : undefined,
      { totalRecordsSynced, syncId: syncLogId }
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

    // Fallback to server cookies (synchronous)
    const cookieStore = cookies();
    accessToken = cookieStore.get('jobber_access_token')?.value;

    if (accessToken) {
      return accessToken;
    }

    // If no access token in cookies, load from Supabase `jobber_tokens` table (service-role)
    const supabase = createServiceRoleClient();
    const { data: storedToken } = await supabase
      .from('jobber_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('id', 1)
      .single();

    if (storedToken?.access_token && Date.now() < new Date(storedToken.expires_at).getTime()) {
      console.log('Using Jobber token from database');
      return storedToken.access_token;
    }

    // Token expired or missing - try to refresh
    const refreshToken = storedToken?.refresh_token ??
                        request.cookies.get('jobber_refresh_token')?.value ??
                        cookieStore.get('jobber_refresh_token')?.value;

    if (refreshToken) {
      console.log('Token expired or missing, attempting to refresh...');
      const newAccessToken = await refreshJobberToken(refreshToken);
      if (newAccessToken) {
        console.log('Successfully refreshed Jobber token');
        // Persist refreshed token to database
        await supabase.from('jobber_tokens').upsert({
          id: 1,
          access_token: newAccessToken,
          refresh_token: refreshToken,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
        return newAccessToken;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting Jobber token:', error);
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

    // Update database with new tokens
    const supabase = createServiceRoleClient();
    const expiresInSeconds = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000));

    await supabase
      .from('jobber_tokens')
      .upsert({
        id: 1,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken, // Keep old refresh token if new one not provided
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

    console.log('Jobber token refreshed and saved to database');

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

    console.error('Jobber GraphQL errors:', JSON.stringify(data.errors, null, 2));
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
    query GetJobs($first: Int!, $after: String) {
      jobs(first: $first, after: $after) {
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

    const data = await makeJobberRequest(query, { first: 15, after: cursor }, request);
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
        client_phone: null, // Phone/email not available on Jobs API Client
        client_email: null,
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
    query GetInvoices($first: Int!, $after: String) {
      invoices(first: $first, after: $after) {
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
    const data = await makeJobberRequest(query, { first: 50, after: cursor }, request);
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

  // Get payment records through invoices since direct 'payments' query doesn't exist
  const query = `
    query GetInvoicePaymentRecords($first: Int!, $after: String) {
      invoices(first: $first, after: $after) {
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
          }
          job {
            id
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
          endCursor
        }
      }
    }
  `;

  while (hasNextPage) {
    // Add delay between requests
    if (cursor) {
      console.log('Waiting 3 seconds between payment record requests...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const data = await makeJobberRequest(query, { first: 30, after: cursor }, request);
    const invoices = data.invoices.nodes;

    console.log(`Processing payment records from ${invoices.length} invoices (batch ${Math.floor(recordsSynced / 30) + 1})...`);

    // Extract payment records from invoices
    for (const invoice of invoices) {
      for (const paymentRecord of invoice.paymentRecords?.nodes || []) {
        await supabase.from('jobber_payments').upsert({
          payment_id: paymentRecord.id,
          customer: `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`.trim() || invoice.client?.companyName,
          client_id: invoice.client?.id,
          invoice_id: invoice.id,
          amount: paymentRecord.amount || 0,
          payment_date: paymentRecord.receivedOn,
          payment_method: paymentRecord.paymentMethod?.name || 'Unknown',
          created_at_jobber: paymentRecord.createdAt,
          pulled_at: new Date().toISOString(),
        });
        recordsSynced++;
      }
    }

    hasNextPage = data.invoices.pageInfo.hasNextPage;
    cursor = data.invoices.pageInfo.endCursor;
  }

  return recordsSynced;
}