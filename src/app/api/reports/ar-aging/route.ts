import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { withErrorHandling, IntegrationError } from '@/lib/error-handler';

export const runtime = 'nodejs';

interface ARAgingData {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOutstanding: number;
  over60Percent: number;
  over90Percent: number;
  status: 'green' | 'orange' | 'red';
  invoiceBreakdown: {
    current: Invoice[];
    days1to30: Invoice[];
    days31to60: Invoice[];
    days61to90: Invoice[];
    days90plus: Invoice[];
  };
  summary: {
    totalInvoices: number;
    averageOutstanding: number;
    largestOutstanding: number;
    oldestInvoice: string | null;
  };
}

interface Invoice {
  invoice_id: string;
  invoice_number: string | null;
  client_name: string | null;
  amount: number;
  balance: number;
  issue_date: string | null;
  due_date: string | null;
  days_outstanding: number;
}

async function calculateARAgingHandler(request: NextRequest) {
  const supabase = createServiceRoleClient();

  try {
    console.log('Starting AR aging calculation...');

    // Get all outstanding invoices (invoices with remaining balance)
    const { data: outstandingInvoices, error: invoicesError } = await supabase
      .from('jobber_invoices')
      .select('invoice_id, invoice_number, client_name, amount, balance, issue_date, due_date, status')
      .neq('status', 'paid')
      .gt('balance', 0)
      .order('issue_date', { ascending: true });

    if (invoicesError) {
      throw new IntegrationError(
        'supabase',
        `Failed to fetch outstanding invoices: ${invoicesError.message}`,
        invoicesError
      );
    }

    console.log(`Found ${outstandingInvoices?.length || 0} outstanding invoices`);

    if (!outstandingInvoices || outstandingInvoices.length === 0) {
      // Return empty AR aging data
      const emptyData: ARAgingData = {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
        totalOutstanding: 0,
        over60Percent: 0,
        over90Percent: 0,
        status: 'green',
        invoiceBreakdown: {
          current: [],
          days1to30: [],
          days31to60: [],
          days61to90: [],
          days90plus: [],
        },
        summary: {
          totalInvoices: 0,
          averageOutstanding: 0,
          largestOutstanding: 0,
          oldestInvoice: null,
        },
      };

      return NextResponse.json({
        success: true,
        data: emptyData,
        calculatedAt: new Date().toISOString(),
      });
    }

    const now = new Date();

    // Initialize aging buckets
    const agingBuckets = {
      current: { amount: 0, invoices: [] as Invoice[] },
      days1to30: { amount: 0, invoices: [] as Invoice[] },
      days31to60: { amount: 0, invoices: [] as Invoice[] },
      days61to90: { amount: 0, invoices: [] as Invoice[] },
      days90plus: { amount: 0, invoices: [] as Invoice[] },
    };

    let totalOutstanding = 0;
    let largestOutstanding = 0;
    let oldestInvoice: string | null = null;
    let oldestDate: Date | null = null;

    // Process each outstanding invoice
    for (const invoice of outstandingInvoices) {
      const balance = invoice.balance || 0;
      totalOutstanding += balance;

      if (balance > largestOutstanding) {
        largestOutstanding = balance;
      }

      // Calculate days outstanding based on issue date
      const issueDate = invoice.issue_date ? new Date(invoice.issue_date) : null;
      let daysOutstanding = 0;

      if (issueDate) {
        daysOutstanding = Math.floor((now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Track oldest invoice
        if (!oldestDate || issueDate < oldestDate) {
          oldestDate = issueDate;
          oldestInvoice = invoice.invoice_number || invoice.invoice_id;
        }
      }

      const invoiceData: Invoice = {
        invoice_id: invoice.invoice_id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        amount: invoice.amount || 0,
        balance,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        days_outstanding: daysOutstanding,
      };

      // Categorize into aging buckets
      if (daysOutstanding <= 0) {
        agingBuckets.current.amount += balance;
        agingBuckets.current.invoices.push(invoiceData);
      } else if (daysOutstanding <= 30) {
        agingBuckets.days1to30.amount += balance;
        agingBuckets.days1to30.invoices.push(invoiceData);
      } else if (daysOutstanding <= 60) {
        agingBuckets.days31to60.amount += balance;
        agingBuckets.days31to60.invoices.push(invoiceData);
      } else if (daysOutstanding <= 90) {
        agingBuckets.days61to90.amount += balance;
        agingBuckets.days61to90.invoices.push(invoiceData);
      } else {
        agingBuckets.days90plus.amount += balance;
        agingBuckets.days90plus.invoices.push(invoiceData);
      }
    }

    // Calculate percentages and status
    const over60Amount = agingBuckets.days61to90.amount + agingBuckets.days90plus.amount;
    const over90Amount = agingBuckets.days90plus.amount;
    const over60Percent = totalOutstanding > 0 ? (over60Amount / totalOutstanding) * 100 : 0;
    const over90Percent = totalOutstanding > 0 ? (over90Amount / totalOutstanding) * 100 : 0;

    // Determine health status
    let status: 'green' | 'orange' | 'red' = 'green';
    if (over60Percent > 30) {
      status = 'red'; // Critical
    } else if (over60Percent > 15) {
      status = 'orange'; // Warning
    }

    const arAgingData: ARAgingData = {
      current: agingBuckets.current.amount,
      days1to30: agingBuckets.days1to30.amount,
      days31to60: agingBuckets.days31to60.amount,
      days61to90: agingBuckets.days61to90.amount,
      days90plus: agingBuckets.days90plus.amount,
      totalOutstanding,
      over60Percent: Math.round(over60Percent * 100) / 100,
      over90Percent: Math.round(over90Percent * 100) / 100,
      status,
      invoiceBreakdown: {
        current: agingBuckets.current.invoices,
        days1to30: agingBuckets.days1to30.invoices,
        days31to60: agingBuckets.days31to60.invoices,
        days61to90: agingBuckets.days61to90.invoices,
        days90plus: agingBuckets.days90plus.invoices,
      },
      summary: {
        totalInvoices: outstandingInvoices.length,
        averageOutstanding: outstandingInvoices.length > 0 ? totalOutstanding / outstandingInvoices.length : 0,
        largestOutstanding,
        oldestInvoice,
      },
    };

    console.log('AR aging calculation completed:', {
      totalOutstanding,
      over60Percent,
      status,
      invoiceCount: outstandingInvoices.length,
    });

    // Store the calculation results for caching
    const { error: cacheError } = await supabase
      .from('ar_aging_cache')
      .upsert({
        calculated_at: new Date().toISOString(),
        total_outstanding: totalOutstanding,
        current_amount: agingBuckets.current.amount,
        days_1_30: agingBuckets.days1to30.amount,
        days_31_60: agingBuckets.days31to60.amount,
        days_61_90: agingBuckets.days61to90.amount,
        days_90_plus: agingBuckets.days90plus.amount,
        over_60_percent: over60Percent,
        status,
        invoice_count: outstandingInvoices.length,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (cacheError) {
      console.warn('Failed to cache AR aging results:', cacheError);
    }

    return NextResponse.json({
      success: true,
      data: arAgingData,
      calculatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('AR aging calculation error:', error);
    throw new IntegrationError(
      'ar_aging',
      error instanceof Error ? error.message : 'Unknown error during AR aging calculation',
      error instanceof Error ? error : undefined
    );
  }
}

export const GET = withErrorHandling(calculateARAgingHandler, 'ar_aging_report');
export const POST = withErrorHandling(calculateARAgingHandler, 'ar_aging_report');