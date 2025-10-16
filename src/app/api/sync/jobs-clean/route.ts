import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

const JOBBER_API_URL = 'https://api.getjobber.com/api/graphql';

interface JobberJob {
  id: string;
  jobNumber: string;
  title: string;
  jobStatus: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
  total: number;
  client: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();

    // Get Jobber token from database (like other sync endpoints)
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('jobber_tokens')
      .select('access_token')
      .eq('id', 1)
      .single();

    if (tokenErr || !tokenRow?.access_token) {
      return NextResponse.json({
        error: 'No Jobber token available in database. Please run Pipedream sync first.'
      }, { status: 401 });
    }

    const token = tokenRow.access_token;

    console.log('🔧 Starting CLEAN jobs sync with proper status tracking...');

    // Fetch recent jobs (last 30 days) with current status information
    let allJobs: JobberJob[] = [];
    let after: string | null = null;
    let pageCount = 0;
    const maxPages = 10; // Reasonable limit to avoid timeouts

    // Dynamic date range - last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startDate = thirtyDaysAgo.toISOString();

    console.log(`📅 Syncing jobs from ${startDate.split('T')[0]} to now`);

    do {
      pageCount++;
      console.log(`📝 Fetching jobs page ${pageCount}/${maxPages}...`);

      const response = await fetch(JOBBER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
        },
        body: JSON.stringify({
          query: `
            query GetRecentJobs($after: String) {
              jobs(
                first: 20
                after: $after
              ) {
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
                  client {
                    id
                    firstName
                    lastName
                    companyName
                  }
                  invoices {
                    nodes {
                      id
                      invoiceNumber
                      total
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          `,
          variables: { after },
        }),
      });

      if (!response.ok) {
        throw new Error(`Jobber API error: ${response.status}`);
      }

      const json = await response.json();

      if (json.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
      }

      const { nodes, pageInfo } = json.data.jobs;
      console.log(`📄 Page ${pageCount}: Retrieved ${nodes.length} jobs`);

      allJobs.push(...nodes);
      after = pageInfo.hasNextPage ? pageInfo.endCursor : null;

      if (pageCount >= maxPages) {
        console.log(`🛑 Reached page limit (${maxPages}). Stopping to prevent timeout.`);
        break;
      }

      // Small delay between requests
      if (after) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } while (after);

    console.log(`✅ Jobs fetched: ${allJobs.length} total jobs`);

    // Insert jobs with proper upsert to handle duplicates
    let jobsProcessed = 0;
    const batchSize = 25;

    for (let i = 0; i < allJobs.length; i += batchSize) {
      const batch = allJobs.slice(i, i + batchSize);

      for (const job of batch) {
        const clientName = job.client?.companyName ||
          `${job.client?.firstName || ''} ${job.client?.lastName || ''}`.trim() || 'Unknown';

        // Generate a UUID based on the job number for consistency
        const jobId = `${job.jobNumber.toString().padStart(10, '0')}-0000-0000-0000-000000000000`;

        const { error: upsertError } = await supabase.from('jobber_jobs').insert({
          job_id: jobId,
          job_number: job.jobNumber,
          title: job.title,
          status: job.jobStatus, // Using correct field name
          start_date: job.startAt,
          end_date: job.endAt,
          created_at_jobber: job.createdAt,
          revenue: job.total || 0,
          client_name: clientName,
          pulled_at: new Date().toISOString(),
        });

        if (upsertError) {
          console.error(`❌ Failed to upsert job ${job.jobNumber}:`, upsertError);
          throw new Error(`Job upsert failed: ${upsertError.message}`);
        }

        jobsProcessed++;
      }

      console.log(`📊 Processed ${jobsProcessed}/${allJobs.length} jobs...`);

      // Small delay between batches to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get status breakdown for verification
    const statusBreakdown = {};
    allJobs.forEach(job => {
      const status = job.jobStatus || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    // Count jobs closed today and calculate daily closed revenue
    const todayString = today.toISOString().split('T')[0];
    const closedToday = allJobs.filter(job =>
      ['complete', 'archived', 'closed'].includes(job.jobStatus?.toLowerCase()) &&
      (job.endAt?.startsWith(todayString) || job.updatedAt?.startsWith(todayString))
    );

    // Calculate daily closed revenue = job totals for jobs closed today
    // This includes both invoiced and uninvoiced closed jobs
    let dailyClosedRevenue = 0;
    const jobDetails = [];

    for (const job of closedToday) {
      const jobTotal = job.total || 0;
      if (jobTotal > 0) {
        dailyClosedRevenue += jobTotal;
        jobDetails.push({
          jobNumber: job.jobNumber,
          jobTotal: jobTotal,
          hasInvoices: job.invoices && job.invoices.nodes.length > 0,
          invoiceCount: job.invoices ? job.invoices.nodes.length : 0
        });
      }
    }

    console.log(`🎯 Jobs closed today: ${closedToday.length}`);
    console.log(`💰 Daily closed revenue: $${dailyClosedRevenue}`);
    console.log(`📋 Job details:`, jobDetails);
    console.log(`📊 Status breakdown:`, statusBreakdown);

    return NextResponse.json({
      success: true,
      totalJobsSynced: jobsProcessed,
      statusBreakdown,
      jobsClosedToday: closedToday.length,
      closedTodayJobNumbers: closedToday.map(j => j.jobNumber),
      dailyClosedRevenue,
      jobDetails,
      dateRange: `${startDate.split('T')[0]} to ${today.toISOString().split('T')[0]}`,
      message: `✅ Clean jobs sync completed! ${jobsProcessed} jobs synced. Daily closed revenue: $${dailyClosedRevenue}`
    });

  } catch (error) {
    console.error('Jobs sync error:', error);
    return NextResponse.json({
      error: 'Jobs sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}