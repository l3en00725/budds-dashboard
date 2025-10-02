import { NextRequest, NextResponse } from 'next/server';
import { checkServiceHealth, withErrorHandling } from '@/lib/error-handler';
import { createServiceRoleClient } from '@/lib/supabase';

async function detailedHealthCheckHandler(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // Detailed Supabase checks
  checks.supabase = {
    ...(await checkServiceHealth(
      'supabase_connection',
      async () => {
        const supabase = createServiceRoleClient();
        const { error } = await supabase.from('sync_log').select('id').limit(1);
        return !error;
      }
    )),
    tables: {},
  };

  // Check individual table health
  const tables = ['jobber_jobs', 'jobber_invoices', 'jobber_payments', 'openphone_calls', 'sync_log'];
  for (const table of tables) {
    checks.supabase.tables[table] = await checkServiceHealth(
      `supabase_table_${table}`,
      async () => {
        const supabase = createServiceRoleClient();
        const { error } = await supabase.from(table).select('*').limit(1);
        return !error;
      }
    );
  }

  // Detailed Jobber API checks
  const token = request.cookies.get('jobber_access_token')?.value;
  checks.jobber = {
    ...(await checkServiceHealth(
      'jobber_auth',
      async () => {
        if (!token) return false;

        const response = await fetch(process.env.JOBBER_API_BASE_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
          },
          body: JSON.stringify({
            query: 'query { jobs(first: 1) { nodes { id } } }'
          }),
        });

        return response.ok;
      }
    )),
    token_available: !!token,
    endpoints: {},
  };

  if (token) {
    // Check individual Jobber endpoints
    const endpoints = ['jobs', 'invoices', 'payments', 'quotes'];
    for (const endpoint of endpoints) {
      checks.jobber.endpoints[endpoint] = await checkServiceHealth(
        `jobber_${endpoint}`,
        async () => {
          const response = await fetch(process.env.JOBBER_API_BASE_URL!, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-JOBBER-GRAPHQL-VERSION': '2025-01-20',
            },
            body: JSON.stringify({
              query: `query { ${endpoint}(first: 1) { nodes { id } } }`
            }),
          });

          const data = await response.json();
          return response.ok && !data.errors;
        }
      );
    }
  }

  // Detailed OpenPhone checks
  checks.openphone = {
    ...(await checkServiceHealth(
      'openphone_api',
      async () => {
        if (!process.env.OPENPHONE_API_KEY) return false;

        const response = await fetch(`${process.env.OPENPHONE_API_BASE_URL}/phone-numbers`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENPHONE_API_KEY}`,
          },
        });

        return response.ok;
      }
    )),
    api_key_configured: !!process.env.OPENPHONE_API_KEY,
    endpoints: {},
  };

  if (process.env.OPENPHONE_API_KEY) {
    const opEndpoints = ['phone-numbers', 'calls'];
    for (const endpoint of opEndpoints) {
      checks.openphone.endpoints[endpoint] = await checkServiceHealth(
        `openphone_${endpoint}`,
        async () => {
          const response = await fetch(`${process.env.OPENPHONE_API_BASE_URL}/${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${process.env.OPENPHONE_API_KEY}`,
            },
          });

          return response.ok;
        }
      );
    }
  }

  // Anthropic API check
  checks.anthropic = {
    ...(await checkServiceHealth(
      'anthropic_api',
      async () => {
        if (!process.env.ANTHROPIC_API_KEY) return false;

        const response = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
            'anthropic-version': '2023-06-01',
          },
        });

        return response.ok;
      }
    )),
    api_key_configured: !!process.env.ANTHROPIC_API_KEY,
  };

  // Data freshness checks
  checks.data_freshness = {};
  const supabase = createServiceRoleClient();

  // Check last sync times
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('*')
    .eq('status', 'success')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single();

  if (lastSync) {
    const lastSyncTime = new Date(lastSync.completed_at);
    const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);

    checks.data_freshness.last_successful_sync = {
      timestamp: lastSync.completed_at,
      hours_ago: Math.round(hoursSinceSync * 100) / 100,
      records_synced: lastSync.records_synced,
      healthy: hoursSinceSync < 24, // Consider data stale after 24 hours
      responseTime: 0,
    };
  }

  // Check record counts
  const recordCounts = {};
  for (const table of ['jobber_jobs', 'jobber_invoices', 'jobber_payments', 'openphone_calls']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    recordCounts[table] = count || 0;
  }

  checks.data_freshness.record_counts = recordCounts;

  const totalResponseTime = Date.now() - startTime;

  // Calculate overall health
  const flattenHealthChecks = (obj: any, prefix = ''): boolean[] => {
    const results: boolean[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && 'healthy' in value) {
        results.push(value.healthy);
      } else if (typeof value === 'object' && value !== null) {
        results.push(...flattenHealthChecks(value, prefix + key + '.'));
      }
    }
    return results;
  };

  const healthResults = flattenHealthChecks(checks);
  const healthyCount = healthResults.filter(Boolean).length;
  const totalCount = healthResults.length;
  const overallHealth = totalCount > 0 ? healthyCount / totalCount : 0;

  const status = overallHealth >= 0.8 ? 'healthy' : overallHealth >= 0.6 ? 'degraded' : 'unhealthy';

  const response = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    responseTime: totalResponseTime,
    checks,
    summary: {
      healthy: healthyCount,
      total: totalCount,
      percentage: Math.round(overallHealth * 100),
    },
  };

  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: httpStatus });
}

export const GET = withErrorHandling(detailedHealthCheckHandler, 'detailed_health_check');