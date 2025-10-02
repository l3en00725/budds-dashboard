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
        sync_type: 'jobber_line_items_only',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    let totalRecordsSynced = 0;

    try {
      // Get list of job IDs that we already have
      const { data: existingJobs } = await supabase
        .from('jobber_jobs')
        .select('job_id')
        .order('created_at_jobber', { ascending: false })
        .limit(100); // Start with most recent 100 jobs

      if (!existingJobs || existingJobs.length === 0) {
        throw new Error('No jobs found in database. Run full sync first.');
      }

      console.log(`Found ${existingJobs.length} jobs to sync line items for...`);

      // Get line items for existing jobs in very small batches
      totalRecordsSynced = await syncLineItemsForExistingJobs(existingJobs.map(j => j.job_id), request);

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
        message: `Successfully synced line items for ${totalRecordsSynced} jobs`
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
    console.error('Line items sync error:', error);
    return NextResponse.json(
      { error: 'Line items sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
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
    const accessToken = request.cookies.get('jobber_access_token')?.value;
    if (accessToken) {
      return accessToken;
    }

    // Fallback to server cookies
    const cookieStore = await cookies();
    const fallbackToken = cookieStore.get('jobber_access_token')?.value;

    return fallbackToken || null;
  } catch (error) {
    console.error('Error getting Jobber token from cookies:', error);
    return null;
  }
}

async function makeJobberRequest(query: string, variables: any = {}, request: NextRequest, retryCount = 0) {
  const token = await getJobberToken(request);
  if (!token) {
    throw new Error('No Jobber token available. Please authenticate with Jobber first.');
  }

  // Very conservative rate limiting for line items
  const baseDelay = 5000; // 5 seconds base delay
  const exponentialDelay = Math.pow(2, retryCount) * 2000; // More aggressive exponential backoff
  const jitterDelay = Math.random() * 2000; // More jitter
  const totalDelay = baseDelay + exponentialDelay + jitterDelay;

  if (retryCount > 0) {
    console.log(`Retry ${retryCount}: waiting ${Math.round(totalDelay/1000)}s before request...`);
    await new Promise(resolve => setTimeout(resolve, totalDelay));
  } else {
    // Always wait even on first request
    console.log(`Waiting ${Math.round(baseDelay/1000)}s before API request...`);
    await new Promise(resolve => setTimeout(resolve, baseDelay));
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
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Authentication error: ${response.status}. Token may be expired. Please re-authenticate.`);
    }
    throw new Error(`Jobber API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.errors) {
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
      throw new Error(`Authentication error: ${JSON.stringify(data.errors)}. Please re-authenticate with Jobber.`);
    }

    if (isThrottled && retryCount < 5) {
      console.log(`Rate limited (attempt ${retryCount + 1}/6), waiting longer...`);
      return makeJobberRequest(query, variables, request, retryCount + 1);
    }

    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

async function syncLineItemsForExistingJobs(jobIds: string[], request: NextRequest): Promise<number> {
  const supabase = createServiceRoleClient();
  let recordsSynced = 0;

  // Process jobs in very small batches to avoid rate limiting
  const batchSize = 5; // Very small batches

  for (let i = 0; i < jobIds.length; i += batchSize) {
    const batch = jobIds.slice(i, i + batchSize);

    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(jobIds.length/batchSize)} (${batch.length} jobs)...`);

    for (const jobId of batch) {
      try {
        // Wait between each job to be very conservative
        if (recordsSynced > 0) {
          console.log('Waiting 8 seconds between individual jobs...');
          await new Promise(resolve => setTimeout(resolve, 8000));
        }

        // Query for single job with line items
        const query = `
          query GetJobLineItems($jobId: ID!) {
            job(id: $jobId) {
              id
              jobNumber
              title
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
            }
          }
        `;

        const data = await makeJobberRequest(query, { jobId }, request);

        if (data?.job?.lineItems?.nodes?.length > 0) {
          console.log(`Job ${data.job.jobNumber}: Found ${data.job.lineItems.nodes.length} line items`);

          for (const lineItem of data.job.lineItems.nodes) {
            await supabase.from('jobber_line_items').upsert({
              line_item_id: lineItem.id,
              job_id: jobId,
              name: lineItem.name,
              description: lineItem.description,
              quantity: lineItem.quantity || 0,
              unit_cost: lineItem.unitCost || 0,
              total_cost: lineItem.totalCost || 0,
              pulled_at: new Date().toISOString(),
            });
          }
        } else {
          console.log(`Job ${data?.job?.jobNumber || jobId}: No line items found`);
        }

        recordsSynced++;
      } catch (error) {
        console.error(`Error syncing line items for job ${jobId}:`, error);
        // Continue with next job rather than failing entire sync
      }
    }

    // Wait between batches
    if (i + batchSize < jobIds.length) {
      console.log('Waiting 15 seconds between batches...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  return recordsSynced;
}