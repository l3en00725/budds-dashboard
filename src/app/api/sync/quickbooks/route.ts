import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

const QB_SANDBOX_BASE_URL = process.env.QUICKBOOKS_SANDBOX_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Log sync start
    const { data: syncLog } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'quickbooks_revenue',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      // Get QuickBooks tokens from storage
      const { data: tokenData } = await supabase
        .from('quickbooks_tokens')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (!tokenData) {
        throw new Error('No QuickBooks tokens found');
      }

      let accessToken = tokenData.access_token;

      // Check if token needs refresh
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      if (expiresAt <= now) {
        accessToken = await refreshQuickBooksToken(tokenData.refresh_token, tokenData.realm_id);
        if (!accessToken) {
          throw new Error('Failed to refresh QuickBooks token');
        }
      }

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

      // Fetch revenue data
      const [ytdRevenue, ttmRevenue, lastYearTtmRevenue] = await Promise.all([
        fetchProfitLossReport(accessToken, tokenData.realm_id, ytdStart, ytdEnd),
        fetchProfitLossReport(accessToken, tokenData.realm_id, ttmStartStr, ytdEnd),
        fetchProfitLossReport(accessToken, tokenData.realm_id, lastYearTtmStartStr, lastYearTtmEndStr),
      ]);

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
          records_synced: 1,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      return NextResponse.json({
        success: true,
        ytdRevenue,
        ttmRevenue,
        lastYearTtmRevenue,
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
    console.error('QuickBooks sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fetchProfitLossReport(
  accessToken: string,
  realmId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const url = `${QB_SANDBOX_BASE_URL}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`QuickBooks API error: ${response.status}`);
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

async function refreshQuickBooksToken(refreshToken: string, realmId: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = await response.json();

    // Update stored tokens
    const supabase = createServiceRoleClient();
    await supabase
      .from('quickbooks_tokens')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('realm_id', realmId);

    return tokenData.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}