import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    // Check all relevant tables for data counts
    const tables = [
      'jobber_jobs',
      'jobber_invoices', 
      'jobber_payments',
      'jobber_quotes',
      'openphone_calls',
      'sync_log',
      'jobber_tokens'
    ];

    const tableCounts: Record<string, number> = {};
    const tableSamples: Record<string, any[]> = {};
    const tableErrors: Record<string, string> = {};

    for (const table of tables) {
      try {
        // Get count
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          tableErrors[table] = countError.message;
          tableCounts[table] = 0;
        } else {
          tableCounts[table] = count || 0;
        }

        // Get sample data (first 3 records)
        if (tableCounts[table] > 0) {
          const { data: sampleData, error: sampleError } = await supabase
            .from(table)
            .select('*')
            .limit(3)
            .order('pulled_at', { ascending: false });
          
          if (sampleError) {
            tableErrors[table] = tableErrors[table] ? 
              `${tableErrors[table]}; Sample error: ${sampleError.message}` : 
              `Sample error: ${sampleError.message}`;
          } else {
            tableSamples[table] = sampleData || [];
          }
        } else {
          tableSamples[table] = [];
        }
      } catch (error) {
        tableErrors[table] = error instanceof Error ? error.message : 'Unknown error';
        tableCounts[table] = 0;
        tableSamples[table] = [];
      }
    }

    // Check recent sync activity
    const { data: recentSyncs } = await supabase
      .from('sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    // Check token status
    const { data: tokenData } = await supabase
      .from('jobber_tokens')
      .select('*')
      .eq('id', 1)
      .single();

    const tokenStatus = tokenData ? {
      hasToken: !!tokenData.access_token,
      expiresAt: tokenData.expires_at,
      isExpired: tokenData.expires_at ? new Date(tokenData.expires_at) < new Date() : true,
      lastUpdated: tokenData.updated_at
    } : {
      hasToken: false,
      expiresAt: null,
      isExpired: true,
      lastUpdated: null
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      databaseStatus: {
        tableCounts,
        tableErrors,
        recentSyncs: recentSyncs || [],
        tokenStatus
      },
      summary: {
        totalJobs: tableCounts.jobber_jobs,
        totalInvoices: tableCounts.jobber_invoices,
        totalPayments: tableCounts.jobber_payments,
        totalCalls: tableCounts.openphone_calls,
        hasValidToken: tokenStatus.hasToken && !tokenStatus.isExpired,
        lastSync: recentSyncs?.[0]?.started_at || 'Never'
      },
      samples: tableSamples
    });

  } catch (error) {
    console.error('Data status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
