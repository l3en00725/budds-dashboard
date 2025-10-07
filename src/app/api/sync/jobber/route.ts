import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import {
  withErrorHandling,
  IntegrationError,
  AuthenticationError,
  RateLimitError,
  retryWithBackoff
} from '@/lib/error-handler';
import { getOAuthToken, refreshOAuthToken } from '@/lib/oauth-tokens';
import * as Sentry from '@sentry/nextjs';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

async function syncJobberHandler(request: NextRequest) {
  const supabase = createServiceRoleClient();
  let totalRecordsSynced = 0;
  let syncLog: { id: string } | null = null;

  try {
    // Log sync start
    const { data } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'jobber_full_sync',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    syncLog = data;

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
        .eq('id', syncLog?.id);

      return NextResponse.json({
        success: true,
        recordsSynced: totalRecordsSynced,
        syncId: syncLog?.id,
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
        .eq('id', syncLog?.id);

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
export const runtime = 'nodejs';

async function getJobberToken(request: NextRequest): Promise<string | null> {
  try {
    // Try to get from Authorization header first (client-side approach)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Using token from Authorization header');
      return token;
    }

    // Use the OAuth token manager for persistent token storage
    console.log('Attempting to get Jobber token from OAuth token manager...');
    const token = await getOAuthToken('jobber');

    if (token) {
      console.log('Successfully retrieved Jobber token from OAuth token manager');
      return token;
    }

    console.warn('No valid Jobber token found in OAuth token manager');
    return null;
  } catch (error) {
    console.error('Error getting Jobber token:', error);
    return null;
  }
}


async function makeJobberRequest(query: string, variables: Record<string, unknown> = {}, request: NextRequest, retryCount = 0) {
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
    const isThrottled = data.errors.some((error: { extensions?: { code?: string }; message?: string }) =>
      error.extensions?.code === 'THROTTLED' ||
      error.message?.toLowerCase().includes('rate') ||
      error.message?.toLowerCase().includes('throttle')
    );

    const isAuthError = data.errors.some((error: { extensions?: { code?: string }; message?: string }) =>
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
    query GetJobs($first: Int, $after: String, $updatedAtGte: DateTime) {
      jobs(first: $first, after: $after, filter: { updatedAtGte: $updatedAtGte }) {
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
    // Use updatedAtGte to capture all jobs that have been modified since our target date
    const historicalDate = '2025-09-01T00:00:00Z';
    console.log(`Syncing jobs updated since ${historicalDate}...`);
    const data = await makeJobberRequest(query, { first: 15, after: cursor, updatedAtGte: historicalDate }, request);
    const jobs = data.jobs.nodes;

    console.log(`Processing ${jobs.length} jobs (batch ${Math.floor(recordsSynced / 15) + 1})...`);

    if (jobs.length === 0) {
      console.log('No more jobs to process, ending pagination');
      break;
    }

    for (const job of jobs) {
      try {
        // Validate job data before storing
        if (!job.id) {
          console.warn('Skipping job with missing ID:', job);
          continue;
        }

        // Store job data with improved validation
        // Only include jobs that are completed, archived, or invoiced (per Jobber Transaction List logic)
        const jobStatus = job.jobStatus || 'unknown';
        const isCompleted = ['complete', 'archived', 'invoiced'].includes(jobStatus.toLowerCase());
        const revenue = Math.max(0, job.total || 0);

        // Skip jobs that are open, in-progress, or have no revenue (to match Jobber reports)
        if (!isCompleted || revenue <= 0) {
          console.log(`Skipping job ${job.id} - Status: ${jobStatus}, Revenue: ${revenue}`);
          continue;
        }

        // Normalize status for dashboard consistency - map Jobber statuses to consistent values
        const normalizedStatus = ['complete', 'invoiced'].includes(jobStatus.toLowerCase()) ? 'archived' : jobStatus.toLowerCase();

        const jobData = {
          job_id: job.id,
          job_number: job.jobNumber || null,
          title: job.title || 'Untitled Job',
          description: null, // Field not available in API
          status: normalizedStatus,
          invoiced: isCompleted,
          revenue: revenue,
          client_id: job.client?.id || null,
          client_name: `${job.client?.firstName || ''} ${job.client?.lastName || ''}`.trim() || job.client?.companyName || 'Unknown Client',
          start_date: job.startAt || null,
          end_date: job.endAt || null,
          created_at_jobber: job.createdAt,
          updated_at_jobber: job.updatedAt,
          pulled_at: new Date().toISOString(),
        };

        const { error: jobError } = await supabase.from('jobber_jobs').upsert(jobData);
        if (jobError) {
          console.error(`Error storing job ${job.id}:`, jobError);
          continue;
        }

        // Store line items separately for accurate membership analysis
        if (job.lineItems?.nodes?.length > 0) {
          for (const lineItem of job.lineItems.nodes) {
            try {
              if (!lineItem.id) {
                console.warn('Skipping line item with missing ID for job:', job.id);
                continue;
              }

              // Store each line item in its own record with validation
              const lineItemData = {
                line_item_id: lineItem.id,
                job_id: job.id,
                name: lineItem.name || 'Unnamed Item',
                description: lineItem.description || null,
                quantity: Math.max(0, lineItem.quantity || 0),
                unit_cost: Math.max(0, lineItem.unitCost || 0),
                total_cost: Math.max(0, lineItem.totalCost || 0),
                pulled_at: new Date().toISOString(),
              };

              const { error: lineItemError } = await supabase.from('jobber_line_items').upsert(lineItemData);
              if (lineItemError) {
                console.error(`Error storing line item ${lineItem.id} for job ${job.id}:`, lineItemError);
                continue;
              }

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
                const { error: updateError } = await supabase.from('jobber_jobs')
                  .update({
                    description: membershipInfo.join(' | ')
                  })
                  .eq('job_id', job.id);

                if (updateError) {
                  console.error(`Error updating job description for ${job.id}:`, updateError);
                }
              }
            } catch (lineItemError) {
              console.error(`Error processing line item ${lineItem.id} for job ${job.id}:`, lineItemError);
            }
          }
        }
      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError);
        // Continue with next job instead of failing the entire sync
      }

      recordsSynced++;
    }

    hasNextPage = data.jobs.pageInfo.hasNextPage;
    cursor = data.jobs.pageInfo.endCursor;
  }

  return recordsSynced;
}


async function syncJobberInvoices(request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsSynced = 0;
  let hasNextPage = true;
  let cursor = null;

  const query = `
    query GetInvoices($first: Int, $after: String, $updatedAtGte: DateTime) {
      invoices(first: $first, after: $after, filter: { updatedAtGte: $updatedAtGte }) {
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
    // Use updatedAtGte to ensure we get invoices that have been modified since our target date
    const historicalDate = '2025-09-01T00:00:00Z';
    console.log(`Syncing invoices updated since ${historicalDate}...`);
    const data = await makeJobberRequest(query, { first: 50, after: cursor, updatedAtGte: historicalDate }, request);
    const invoices = data.invoices.nodes;

    for (const invoice of invoices) {
      try {
        if (!invoice.id) {
          console.warn('Skipping invoice with missing ID:', invoice);
          continue;
        }

        // Only include invoices that are completed or issued (per Jobber Transaction List logic)
        const invoiceStatus = invoice.invoiceStatus || 'unknown';
        const isValidInvoice = ['completed', 'issued', 'sent', 'paid', 'overdue'].includes(invoiceStatus.toLowerCase());
        const amount = Math.max(0, invoice.total || 0);

        // Skip draft or cancelled invoices (to match Jobber reports)
        if (!isValidInvoice || amount <= 0) {
          console.log(`Skipping invoice ${invoice.id} - Status: ${invoiceStatus}, Amount: ${amount}`);
          continue;
        }

        const invoiceData = {
          invoice_id: invoice.id,
          invoice_number: invoice.invoiceNumber || null,
          client_id: invoice.client?.id || null,
          client_name: `${invoice.client?.firstName || ''} ${invoice.client?.lastName || ''}`.trim() || invoice.client?.companyName || 'Unknown Client',
          job_id: invoice.job?.id || null,
          status: invoiceStatus,
          amount: amount,
          balance: Math.max(0, invoice.outstandingAmount || 0),
          issue_date: invoice.issueDate || null,
          due_date: invoice.dueDate || null,
          created_at_jobber: invoice.createdAt,
          pulled_at: new Date().toISOString(),
        };

        const { error: invoiceError } = await supabase.from('jobber_invoices').upsert(invoiceData);
        if (invoiceError) {
          console.error(`Error storing invoice ${invoice.id}:`, invoiceError);
          continue;
        }
        recordsSynced++;
      } catch (error) {
        console.error(`Error processing invoice ${invoice.id}:`, error);
      }
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
    query GetPayments($first: Int, $after: String, $updatedAtGte: DateTime) {
      payments(first: $first, after: $after, filter: { updatedAtGte: $updatedAtGte }) {
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
    // Use updatedAtGte to capture all payments that have been modified since our target date
    const historicalDate = '2025-09-01T00:00:00Z';
    console.log(`Syncing payments updated since ${historicalDate}...`);
    const data = await makeJobberRequest(query, { first: 50, after: cursor, updatedAtGte: historicalDate }, request);
    const payments = data.payments.nodes;

    for (const payment of payments) {
      try {
        if (!payment.id) {
          console.warn('Skipping payment with missing ID:', payment);
          continue;
        }

        const paymentData = {
          payment_id: payment.id,
          customer: `${payment.client?.firstName || ''} ${payment.client?.lastName || ''}`.trim() || payment.client?.companyName || 'Unknown Client',
          client_id: payment.client?.id || null,
          invoice_id: payment.invoice?.id || null,
          amount: Math.max(0, payment.amount || 0),
          payment_date: payment.paymentDate || null,
          payment_method: payment.paymentMethod || 'unknown',
          created_at_jobber: payment.createdAt,
          pulled_at: new Date().toISOString(),
        };

        const { error: paymentError } = await supabase.from('jobber_payments').upsert(paymentData);
        if (paymentError) {
          console.error(`Error storing payment ${payment.id}:`, paymentError);
          continue;
        }
        recordsSynced++;
      } catch (error) {
        console.error(`Error processing payment ${payment.id}:`, error);
      }
    }

    hasNextPage = data.payments.pageInfo.hasNextPage;
    cursor = data.payments.pageInfo.endCursor;
  }

  return recordsSynced;
}