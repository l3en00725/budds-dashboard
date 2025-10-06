import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getOAuthToken, refreshOAuthToken } from '@/lib/oauth-tokens';
import {
  withErrorHandling,
  IntegrationError,
  AuthenticationError,
  RateLimitError
} from '@/lib/error-handler';
import * as Sentry from '@sentry/nextjs';

const QB_BASE_URL = process.env.QUICKBOOKS_BASE_URL || process.env.QUICKBOOKS_SANDBOX_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com';
const QB_API_VERSION = 'v3';

export const runtime = 'nodejs';

async function syncQuickBooksHandler(request: NextRequest) {
  const supabase = createServiceRoleClient();
  let totalRecordsSynced = 0;
  let syncLog: { id: string } | null = null;
  try {
    // Log sync start
    const { data } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'quickbooks_full_sync',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    syncLog = data;

    try {
      // Get QuickBooks token using OAuth token manager
      console.log('Attempting to get QuickBooks token...');
      const accessToken = await getOAuthToken('quickbooks');

      if (!accessToken) {
        throw new AuthenticationError('No valid QuickBooks token available', {
          provider: 'quickbooks'
        });
      }

      // Get realm ID from stored QuickBooks tokens (company identifier)
      const { data: tokenData } = await supabase
        .from('quickbooks_tokens')
        .select('realm_id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!tokenData?.realm_id) {
        throw new IntegrationError(
          'quickbooks',
          'No QuickBooks company ID (realm_id) found in storage'
        );
      }

      const realmId = tokenData.realm_id;
      console.log(`Using QuickBooks company ID: ${realmId}`);

      // Calculate date ranges
      const currentYear = new Date().getFullYear();
      const currentDate = new Date();

      // YTD: January 1 to today
      const ytdStart = `${currentYear}-01-01`;
      const ytdEnd = currentDate.toISOString().split('T')[0];

      // TTM: 12 months ago to today
      const ttmStart = new Date();
      ttmStart.setFullYear(ttmStart.getFullYear() - 1);
      const ttmStartStr = ttmStart.toISOString().split('T')[0];

      // Last year TTM: 24 months ago to 12 months ago
      const lastYearTtmStart = new Date();
      lastYearTtmStart.setFullYear(lastYearTtmStart.getFullYear() - 2);
      const lastYearTtmStartStr = lastYearTtmStart.toISOString().split('T')[0];
      const lastYearTtmEndStr = ttmStartStr;

      // Sync invoices and payments for AR aging
      console.log('Starting QuickBooks invoice sync...');
      const invoicesRecords = await syncQuickBooksInvoices(accessToken, realmId, supabase);
      totalRecordsSynced += invoicesRecords;

      console.log('Starting QuickBooks payment sync...');
      const paymentsRecords = await syncQuickBooksPayments(accessToken, realmId, supabase);
      totalRecordsSynced += paymentsRecords;

      // Fetch revenue data
      console.log('Fetching revenue reports...');
      const [ytdRevenue, ttmRevenue, lastYearTtmRevenue] = await Promise.all([
        fetchProfitLossReport(accessToken, realmId, ytdStart, ytdEnd),
        fetchProfitLossReport(accessToken, realmId, ttmStartStr, ytdEnd),
        fetchProfitLossReport(accessToken, realmId, lastYearTtmStartStr, lastYearTtmEndStr),
      ]);

      totalRecordsSynced += 1; // Count the revenue report as one record

      // Store in database
      await supabase.from('quickbooks_revenue_ytd').upsert({
        year: currentYear,
        ytd_revenue: ytdRevenue,
        ttm_revenue: ttmRevenue,
        ttm_revenue_last_year: lastYearTtmRevenue,
        pulled_at: new Date().toISOString(),
      });

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
        ytdRevenue,
        ttmRevenue,
        lastYearTtmRevenue,
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
    console.error('QuickBooks sync error:', error);

    // Add context to Sentry
    Sentry.setContext('sync_operation', {
      type: 'quickbooks_full_sync',
      recordsSynced: totalRecordsSynced,
      syncId: syncLog?.id,
    });

    throw new IntegrationError(
      'quickbooks',
      error instanceof Error ? error.message : 'Unknown sync error',
      error instanceof Error ? error : undefined,
      { totalRecordsSynced, syncId: syncLog?.id }
    );
  }
}

export const POST = withErrorHandling(syncQuickBooksHandler, 'quickbooks_sync');

async function syncQuickBooksInvoices(
  accessToken: string,
  realmId: string,
  supabase: any
): Promise<number> {
  let recordsSynced = 0;

  try {
    // Set historical date to September 1st, 2025 for accurate financial data
    const historicalDate = '2025-09-01';
    const url = `${QB_BASE_URL}/${QB_API_VERSION}/company/${realmId}/query`;

    // Query for invoices updated since our target date
    const query = `SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime >= '${historicalDate}' MAXRESULTS 1000`;

    console.log(`Syncing QuickBooks invoices updated since ${historicalDate}...`);

    const response = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new IntegrationError(
        'quickbooks',
        `Invoice query failed: ${response.status}`,
        undefined,
        { query, statusCode: response.status }
      );
    }

    const data = await response.json();
    const invoices = data.QueryResponse?.Invoice || [];

    console.log(`Found ${invoices.length} QuickBooks invoices to sync`);

    for (const invoice of invoices) {
      try {
        if (!invoice.Id) {
          console.warn('Skipping QuickBooks invoice with missing ID:', invoice);
          continue;
        }

        const invoiceData = {
          qb_invoice_id: invoice.Id,
          invoice_number: invoice.DocNumber || null,
          customer_ref: invoice.CustomerRef?.value || null,
          customer_name: invoice.CustomerRef?.name || 'Unknown Customer',
          total_amount: parseFloat(invoice.TotalAmt || '0'),
          balance: parseFloat(invoice.Balance || '0'),
          due_date: invoice.DueDate || null,
          txn_date: invoice.TxnDate || null,
          currency_ref: invoice.CurrencyRef?.value || 'USD',
          email_status: invoice.EmailStatus || null,
          print_status: invoice.PrintStatus || null,
          created_time: invoice.MetaData?.CreateTime || null,
          last_updated_time: invoice.MetaData?.LastUpdatedTime || null,
          pulled_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('quickbooks_invoices').upsert(invoiceData, {
          onConflict: 'qb_invoice_id'
        });

        if (error) {
          console.error(`Error storing QuickBooks invoice ${invoice.Id}:`, error);
          continue;
        }

        recordsSynced++;
      } catch (error) {
        console.error(`Error processing QuickBooks invoice ${invoice.Id}:`, error);
      }
    }

    console.log(`Successfully synced ${recordsSynced} QuickBooks invoices`);
    return recordsSynced;

  } catch (error) {
    console.error('QuickBooks invoice sync error:', error);
    throw error;
  }
}

async function syncQuickBooksPayments(
  accessToken: string,
  realmId: string,
  supabase: any
): Promise<number> {
  let recordsSynced = 0;

  try {
    // Set historical date to September 1st, 2025 for accurate financial data
    const historicalDate = '2025-09-01';
    const url = `${QB_BASE_URL}/${QB_API_VERSION}/company/${realmId}/query`;

    // Query for payments updated since our target date
    const query = `SELECT * FROM Payment WHERE MetaData.LastUpdatedTime >= '${historicalDate}' MAXRESULTS 1000`;

    console.log(`Syncing QuickBooks payments updated since ${historicalDate}...`);

    const response = await fetch(`${url}?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new IntegrationError(
        'quickbooks',
        `Payment query failed: ${response.status}`,
        undefined,
        { query, statusCode: response.status }
      );
    }

    const data = await response.json();
    const payments = data.QueryResponse?.Payment || [];

    console.log(`Found ${payments.length} QuickBooks payments to sync`);

    for (const payment of payments) {
      try {
        if (!payment.Id) {
          console.warn('Skipping QuickBooks payment with missing ID:', payment);
          continue;
        }

        const paymentData = {
          qb_payment_id: payment.Id,
          customer_ref: payment.CustomerRef?.value || null,
          customer_name: payment.CustomerRef?.name || 'Unknown Customer',
          total_amount: parseFloat(payment.TotalAmt || '0'),
          unapplied_amount: parseFloat(payment.UnappliedAmt || '0'),
          txn_date: payment.TxnDate || null,
          currency_ref: payment.CurrencyRef?.value || 'USD',
          payment_method_ref: payment.PaymentMethodRef?.name || null,
          deposit_to_account_ref: payment.DepositToAccountRef?.value || null,
          created_time: payment.MetaData?.CreateTime || null,
          last_updated_time: payment.MetaData?.LastUpdatedTime || null,
          pulled_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('quickbooks_payments').upsert(paymentData, {
          onConflict: 'qb_payment_id'
        });

        if (error) {
          console.error(`Error storing QuickBooks payment ${payment.Id}:`, error);
          continue;
        }

        recordsSynced++;
      } catch (error) {
        console.error(`Error processing QuickBooks payment ${payment.Id}:`, error);
      }
    }

    console.log(`Successfully synced ${recordsSynced} QuickBooks payments`);
    return recordsSynced;

  } catch (error) {
    console.error('QuickBooks payment sync error:', error);
    throw error;
  }
}

async function fetchProfitLossReport(
  accessToken: string,
  realmId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const url = `${QB_BASE_URL}/${QB_API_VERSION}/company/${realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new IntegrationError(
      'quickbooks',
      `ProfitAndLoss report failed: ${response.status}`,
      undefined,
      { startDate, endDate, statusCode: response.status }
    );
  }

  const data = await response.json();
  const report = data.QueryResponse.Report;
  let totalRevenue = 0;

  if (report && report.Rows) {
    // Look for the "Total Income" line in the report
    for (const row of report.Rows) {
      if (row.group === 'Income' || row.ColData?.some((col: any) => col.value?.includes('Total Income'))) {
        const totalCol = row.ColData?.find((col: any) =>
          col.value && !isNaN(parseFloat(col.value.replace(/[,$]/g, '')))
        );

        if (totalCol) {
          totalRevenue = parseFloat(totalCol.value.replace(/[,$]/g, ''));
          break;
        }
      }
    }
  }

  return totalRevenue;
}

// Note: Token refresh is now handled by the OAuth token manager