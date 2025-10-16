import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient();

    // Step 1: Check what job statuses exist
    const { data: allJobs, error: allJobsError } = await supabase
      .from('jobber_jobs')
      .select('id, job_status')
      .limit(100);

    console.log('🔍 All job statuses sample:', {
      count: allJobs?.length || 0,
      statuses: [...new Set(allJobs?.map(j => j.job_status) || [])],
      error: allJobsError
    });

    // Step 2: Check for closed jobs
    const { data: closedJobs, error: jobsError } = await supabase
      .from('jobber_jobs')
      .select('id, job_status')
      .in('job_status', ['complete', 'archived', 'closed']);

    // Step 3: Check what invoice fields exist
    const { data: sampleInvoices, error: invoicesStructureError } = await supabase
      .from('jobber_invoices')
      .select('*')
      .limit(5);

    console.log('🔍 Sample invoice structure:', {
      count: sampleInvoices?.length || 0,
      fields: sampleInvoices?.[0] ? Object.keys(sampleInvoices[0]) : [],
      error: invoicesStructureError
    });

    // Step 4: Try to find outstanding invoices
    const closedJobIds = closedJobs?.map(job => job.id) || [];

    let outstandingInvoices;
    let invoicesError;

    if (closedJobIds.length > 0) {
      const result = await supabase
        .from('jobber_invoices')
        .select('amount_outstanding, job_id, total, invoice_status')
        .in('job_id', closedJobIds)
        .limit(20);

      outstandingInvoices = result.data;
      invoicesError = result.error;
    }

    return NextResponse.json({
      debug: {
        totalJobsChecked: allJobs?.length || 0,
        uniqueJobStatuses: [...new Set(allJobs?.map(j => j.job_status) || [])],
        closedJobsCount: closedJobs?.length || 0,
        closedJobIds: closedJobIds.slice(0, 10),
        sampleInvoiceFields: sampleInvoices?.[0] ? Object.keys(sampleInvoices[0]) : [],
        outstandingInvoicesCount: outstandingInvoices?.length || 0,
        sampleOutstandingInvoices: outstandingInvoices?.slice(0, 5) || []
      },
      errors: {
        jobsError,
        invoicesStructureError,
        invoicesError
      }
    });

  } catch (error) {
    console.error('Debug daily revenue error:', error);
    return NextResponse.json({
      error: 'Failed to debug daily revenue',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}