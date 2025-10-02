import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase';

const QB_SANDBOX_BASE_URL = process.env.QUICKBOOKS_SANDBOX_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com';
const QB_PRODUCTION_BASE_URL = 'https://quickbooks.api.intuit.com';

// For production, you'd switch this
const QB_BASE_URL = QB_SANDBOX_BASE_URL;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('quickbooks_access_token')?.value;
    const realmId = cookieStore.get('quickbooks_realm_id')?.value;

    if (!accessToken || !realmId) {
      return NextResponse.json({ error: 'QuickBooks not authenticated' }, { status: 401 });
    }

    // Calculate date ranges
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const lastYear = currentYear - 1;

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

    // Fetch revenue data using QuickBooks Profit & Loss report
    const [ytdRevenue, ttmRevenue, lastYearTtmRevenue] = await Promise.all([
      fetchProfitLossReport(accessToken, realmId, ytdStart, ytdEnd),
      fetchProfitLossReport(accessToken, realmId, ttmStartStr, ytdEnd),
      fetchProfitLossReport(accessToken, realmId, lastYearTtmStartStr, lastYearTtmEndStr),
    ]);

    const revenueData = {
      year: currentYear,
      ytd_revenue: ytdRevenue,
      ttm_revenue: ttmRevenue,
      ttm_revenue_last_year: lastYearTtmRevenue,
    };

    // Store in Supabase
    const supabase = createServiceRoleClient();
    await supabase
      .from('quickbooks_revenue_ytd')
      .upsert({
        ...revenueData,
        pulled_at: new Date().toISOString(),
      });

    return NextResponse.json(revenueData);
  } catch (error) {
    console.error('Error fetching QuickBooks revenue:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue data' }, { status: 500 });
  }
}

async function fetchProfitLossReport(
  accessToken: string,
  realmId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const url = `${QB_BASE_URL}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`;

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

  // Parse the Profit & Loss report to extract total revenue
  // QuickBooks P&L structure: QueryResponse.Report.Rows
  const report = data.QueryResponse.Report;
  let totalRevenue = 0;

  if (report && report.Rows) {
    // Look for the "Total Income" line in the report
    for (const row of report.Rows) {
      if (row.group === 'Income' || row.ColData?.some((col: any) => col.value?.includes('Total Income'))) {
        // Find the total column (usually the last ColData item)
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

// Token refresh function
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