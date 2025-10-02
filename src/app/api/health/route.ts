import { NextRequest, NextResponse } from 'next/server';
import { checkServiceHealth, withErrorHandling } from '@/lib/error-handler';
import { createServiceRoleClient } from '@/lib/supabase';

async function healthCheckHandler(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // Check Supabase connection
  checks.supabase = await checkServiceHealth(
    'supabase',
    async () => {
      const supabase = createServiceRoleClient();
      const { error } = await supabase.from('sync_log').select('id').limit(1);
      return !error;
    }
  );

  // Check Jobber API connectivity (if token available)
  checks.jobber = await checkServiceHealth(
    'jobber',
    async () => {
      const token = request.cookies.get('jobber_access_token')?.value;
      if (!token) {
        return false; // No token available
      }

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

      const data = await response.json();
      return response.ok && !data.errors;
    }
  );

  // Check OpenPhone API connectivity
  checks.openphone = await checkServiceHealth(
    'openphone',
    async () => {
      if (!process.env.OPENPHONE_API_KEY) {
        return false; // No API key configured
      }

      const response = await fetch(`${process.env.OPENPHONE_API_BASE_URL}/phone-numbers`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENPHONE_API_KEY}`,
        },
      });

      return response.ok;
    }
  );

  // Check Anthropic API connectivity
  checks.anthropic = await checkServiceHealth(
    'anthropic',
    async () => {
      if (!process.env.ANTHROPIC_API_KEY) {
        return false; // No API key configured
      }

      // Simple API test - we don't want to use credits unnecessarily
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
          'anthropic-version': '2023-06-01',
        },
      });

      return response.ok;
    }
  );

  // Overall health calculation
  const healthyServices = Object.values(checks).filter(check => check.healthy).length;
  const totalServices = Object.keys(checks).length;
  const overallHealth = healthyServices / totalServices;

  const totalResponseTime = Date.now() - startTime;

  const status = overallHealth >= 0.75 ? 'healthy' : overallHealth >= 0.5 ? 'degraded' : 'unhealthy';

  const response = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    responseTime: totalResponseTime,
    services: checks,
    summary: {
      healthy: healthyServices,
      total: totalServices,
      percentage: Math.round(overallHealth * 100),
    },
  };

  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

  return NextResponse.json(response, { status: httpStatus });
}

export const GET = withErrorHandling(healthCheckHandler, 'health_check');