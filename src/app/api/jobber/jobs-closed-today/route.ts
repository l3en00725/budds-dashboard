import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BusinessDateUtils } from '@/lib/date-utils';

const JOBBER_API_URL = process.env.JOBBER_API_BASE_URL || 'https://api.getjobber.com/api/graphql';

// Primary query - try to get jobs that were actually closed today
const JOBS_CLOSED_TODAY_QUERY = `
  query JobsClosedToday($todayStart: String!, $todayEnd: String!) {
    jobs(
      first: 100
      filter: {
        status_in: [CLOSED, ARCHIVED]
        closedAt_gte: $todayStart
        closedAt_lte: $todayEnd
      }
    ) {
      nodes {
        id
        jobNumber
        title
        total
        closedAt
        status
        client {
          id
          firstName
          lastName
          companyName
        }
        invoices {
          nodes {
            id
            issuedAt
            total
            status
          }
        }
      }
    }
  }
`;

// Fallback query - if closedAt is not available, get jobs with invoices issued today
const JOBS_INVOICED_TODAY_QUERY = `
  query JobsInvoicedToday($todayStart: String!, $todayEnd: String!) {
    invoices(
      first: 100
      filter: {
        issuedAt_gte: $todayStart
        issuedAt_lte: $todayEnd
      }
    ) {
      nodes {
        id
        issuedAt
        total
        status
        job {
          id
          jobNumber
          title
          total
          status
          client {
            id
            firstName
            lastName
            companyName
          }
        }
      }
    }
  }
`;

// Test query to check what fields are available
const TEST_SCHEMA_QUERY = `
  query TestSchema {
    jobs(first: 1) {
      nodes {
        id
        jobNumber
        title
        total
        status
        createdAt
        updatedAt
        startAt
        endAt
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('jobber_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated. Please authenticate with Jobber first.' }, { status: 401 });
    }

    // Get today's date range in business timezone, then convert to UTC for GraphQL
    const todayBusiness = BusinessDateUtils.getTodayBusinessDate();
    const todayStart = new Date(`${todayBusiness}T00:00:00.000Z`).toISOString();
    const todayEnd = new Date(`${todayBusiness}T23:59:59.999Z`).toISOString();

    const searchParams = request.nextUrl.searchParams;
    const testSchema = searchParams.get('test') === 'true';

    // If testing, use the schema test query
    if (testSchema) {
      const response = await fetch(JOBBER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
        },
        body: JSON.stringify({
          query: TEST_SCHEMA_QUERY,
        }),
      });

      const data = await response.json();
      return NextResponse.json({
        message: 'Schema test query',
        data: data,
        availableFields: data.data?.jobs?.nodes?.[0] ? Object.keys(data.data.jobs.nodes[0]) : []
      });
    }

    // Try the primary query first (jobs with closedAt)
    let response = await fetch(JOBBER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
      },
      body: JSON.stringify({
        query: JOBS_CLOSED_TODAY_QUERY,
        variables: { todayStart, todayEnd },
      }),
    });

    if (!response.ok) {
      throw new Error(`Jobber API responded with status: ${response.status}`);
    }

    let data = await response.json();

    // Check if the primary query worked
    if (data.errors) {
      console.log('Primary query failed, trying fallback. Errors:', data.errors);

      // Try fallback query (jobs with invoices issued today)
      response = await fetch(JOBBER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
        },
        body: JSON.stringify({
          query: JOBS_INVOICED_TODAY_QUERY,
          variables: { todayStart, todayEnd },
        }),
      });

      if (!response.ok) {
        throw new Error(`Jobber API fallback responded with status: ${response.status}`);
      }

      data = await response.json();

      if (data.errors) {
        console.error('Both queries failed. GraphQL errors:', data.errors);
        return NextResponse.json({
          error: 'GraphQL queries failed',
          details: data.errors,
          suggestion: 'Try ?test=true to check available fields'
        }, { status: 400 });
      }

      // Process fallback data (invoices -> jobs)
      const jobsFromInvoices = data.data?.invoices?.nodes?.map((invoice: any) => ({
        id: invoice.job?.id,
        jobNumber: invoice.job?.jobNumber,
        title: invoice.job?.title,
        totalRevenue: invoice.job?.total,
        closedAt: invoice.issuedAt, // Use invoice date as proxy for close date
        invoices: [{
          id: invoice.id,
          issuedAt: invoice.issuedAt,
          total: invoice.total,
          status: invoice.status
        }]
      })) || [];

      // Remove duplicates by job ID
      const uniqueJobs = jobsFromInvoices.filter((job: any, index: number, self: any[]) =>
        index === self.findIndex((j) => j.id === job.id)
      );

      return NextResponse.json({
        jobs: uniqueJobs,
        totalRevenue: uniqueJobs.reduce((sum: number, job: any) => sum + (job.totalRevenue || 0), 0),
        count: uniqueJobs.length
      });
    }

    // Process primary data (jobs with closedAt)
    const jobsClosedToday = data.data?.jobs?.nodes?.map((job: any) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      totalRevenue: job.total,
      closedAt: job.closedAt,
      invoices: job.invoices?.nodes?.map((invoice: any) => ({
        id: invoice.id,
        issuedAt: invoice.issuedAt,
        total: invoice.total,
        status: invoice.status
      })) || []
    })) || [];

    return NextResponse.json({
      jobs: jobsClosedToday,
      totalRevenue: jobsClosedToday.reduce((sum: number, job: any) => sum + (job.totalRevenue || 0), 0),
      count: jobsClosedToday.length
    });

  } catch (error) {
    console.error('Error fetching jobs closed today:', error);
    return NextResponse.json({
      error: 'Failed to fetch jobs closed today',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check authentication and try ?test=true to verify API access'
    }, { status: 500 });
  }
}