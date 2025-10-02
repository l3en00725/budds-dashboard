# Production Deployment Guide - Jobber Dashboard

## Overview

This document provides comprehensive guidance for deploying the Jobber Dashboard to production with proper monitoring, error handling, and security configurations.

## Architecture

```
├── Frontend (Next.js 15 App Router)
│   ├── Dashboard UI Components
│   ├── Real-time metrics
│   └── Client-side error handling
├── API Routes
│   ├── /api/health - Health checks
│   ├── /api/sync/jobber - Data synchronization
│   ├── /api/sync/openphone - Call data sync
│   └── /api/dashboard/metrics - Business metrics
├── Integrations
│   ├── Jobber API (GraphQL)
│   ├── OpenPhone API (REST)
│   ├── Supabase (Database)
│   └── Anthropic Claude (AI classification)
└── Monitoring
    ├── Sentry (Error tracking)
    ├── Health checks
    └── Performance monitoring
```

## Prerequisites

### Required Services

1. **Sentry Account** - For error monitoring and performance tracking
2. **Supabase Project** - Database and real-time subscriptions
3. **Jobber Developer Account** - API access for business data
4. **OpenPhone Account** - Call analytics integration
5. **Anthropic Account** - AI-powered call classification
6. **Vercel Account** (recommended) - Hosting platform

### Required Credentials

Gather the following credentials before deployment:

- Sentry DSN
- Supabase URL and service role key
- Jobber Client ID and Secret
- OpenPhone API key
- Anthropic API key
- NextAuth secret (generate a secure random string)

## Environment Configuration

### Production Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_super_secret_nextauth_key_here

# Sentry Configuration (REQUIRED for production monitoring)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Jobber API Configuration
JOBBER_CLIENT_ID=your_jobber_client_id
JOBBER_CLIENT_SECRET=your_jobber_client_secret
JOBBER_REDIRECT_URI=https://your-domain.com/api/auth/jobber/callback
JOBBER_API_BASE_URL=https://api.getjobber.com/api/graphql

# OpenPhone Configuration
OPENPHONE_API_KEY=your_openphone_api_key
OPENPHONE_API_BASE_URL=https://api.openphone.com/v1

# Anthropic Claude Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: QuickBooks (if using)
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=https://your-domain.com/api/auth/quickbooks/callback
```

### Security Considerations

1. **API Keys**: Store all API keys securely using your hosting provider's environment variable system
2. **HTTPS**: Ensure all production traffic uses HTTPS
3. **CORS**: Configure appropriate CORS policies for your domain
4. **Rate Limiting**: Monitor API usage and implement rate limiting if needed

## Database Setup

### Supabase Configuration

1. **Create Database Tables**: Ensure all required tables exist:
   - `jobber_jobs`
   - `jobber_invoices`
   - `jobber_payments`
   - `jobber_quotes`
   - `openphone_calls`
   - `sync_log`

2. **Row Level Security (RLS)**: Configure appropriate RLS policies
3. **Indexes**: Create indexes for performance on frequently queried columns
4. **Backups**: Enable automated backups

### Database Migration Script

```sql
-- Enable RLS on all tables
ALTER TABLE jobber_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobber_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobber_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_created_at ON jobber_jobs(created_at_jobber);
CREATE INDEX IF NOT EXISTS idx_jobber_jobs_status ON jobber_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobber_invoices_status ON jobber_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status, completed_at);

-- Create function for cleaning old sync logs
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM sync_log
  WHERE completed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

## Sentry Setup

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create a new project
2. Choose "Next.js" as the platform
3. Copy the DSN and add it to your environment variables

### 2. Configure Error Filtering

The application includes pre-configured error filtering to reduce noise:

- Development errors are not sent to production Sentry
- Rate limiting errors are filtered (handled gracefully)
- Network timeouts with retry logic are filtered
- User input validation errors are filtered

### 3. Set Up Alerts

Configure Sentry alerts for:
- New issues in production
- Error rate increases
- Performance degradation
- Integration failures

## Health Monitoring

### Health Check Endpoints

The application provides comprehensive health monitoring:

1. **Basic Health Check**: `GET /api/ping`
   - Simple uptime check
   - Returns basic system information

2. **Comprehensive Health Check**: `GET /api/health`
   - Tests all integrations
   - Returns overall system health
   - Suitable for load balancer health checks

3. **Detailed Health Check**: `GET /api/health/detailed`
   - In-depth integration testing
   - Table-level database checks
   - Data freshness validation
   - Detailed response times

### Monitoring Setup

Configure your monitoring system to:

1. **Health Checks**: Poll `/api/health` every 1-2 minutes
2. **Alerting**: Alert if health check fails 3 consecutive times
3. **Uptime Monitoring**: Use external service (Pingdom, UptimeRobot)
4. **Performance**: Monitor response times via Sentry

## Deployment Process

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Sentry project created and DSN added
- [ ] Database migrations applied
- [ ] SSL certificate configured
- [ ] Domain DNS configured
- [ ] Health checks tested

### Vercel Deployment (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Environment Variables**: Add all production environment variables
3. **Deploy**: Vercel will automatically deploy on pushes to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Test production build locally
npm run start

# Deploy to your hosting provider
# (Follow your provider's specific deployment instructions)
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Test basic connectivity
curl https://your-domain.com/api/ping

# Test comprehensive health
curl https://your-domain.com/api/health

# Test detailed health (should show all integrations)
curl https://your-domain.com/api/health/detailed
```

### 2. Integration Testing

1. **Jobber Integration**:
   - Test OAuth flow: `/api/auth/jobber`
   - Test sync endpoint: `/api/sync/jobber`
   - Verify data appears in dashboard

2. **OpenPhone Integration**:
   - Test call sync: `/api/sync/openphone`
   - Verify call analytics data

3. **Dashboard Metrics**:
   - Test metrics endpoint: `/api/dashboard/metrics`
   - Verify dashboard loads with real data

### 3. Error Monitoring

1. **Sentry Integration**:
   - Check Sentry dashboard for any deployment errors
   - Verify error tracking is working

2. **Performance Monitoring**:
   - Monitor initial page load times
   - Check API response times

## Maintenance

### Regular Tasks

1. **Database Maintenance**:
   - Monitor database size and performance
   - Clean up old sync logs (automated via cron)
   - Review and optimize slow queries

2. **Monitoring**:
   - Review Sentry errors weekly
   - Monitor health check trends
   - Update alerting thresholds as needed

3. **Security**:
   - Rotate API keys quarterly
   - Review access logs
   - Update dependencies monthly

### Automated Jobs

Set up the following automated tasks:

1. **Data Sync**: Schedule Jobber sync every 4-6 hours
2. **Log Cleanup**: Clean old sync logs daily
3. **Health Monitoring**: Continuous health checks
4. **Backup Verification**: Test backup restoration monthly

## Troubleshooting

### Common Issues

1. **Integration Failures**:
   - Check API key validity
   - Verify network connectivity
   - Review rate limiting

2. **Database Issues**:
   - Check connection pool settings
   - Monitor query performance
   - Verify RLS policies

3. **Authentication Problems**:
   - Verify OAuth redirect URIs
   - Check token expiration handling
   - Test refresh token flow

### Debug Endpoints

For production debugging (remove in final deployment):

- `/api/test-errors` - Test error handling
- `/api/debug/auth-status` - Check authentication state

### Logging

The application uses structured logging:

- Console logs for development
- Sentry for error tracking
- Performance metrics via Sentry tracing

## Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **API Keys**: Rotate regularly and use least privilege access
3. **HTTPS**: Force HTTPS for all traffic
4. **Headers**: Implement security headers (CSP, HSTS, etc.)
5. **Rate Limiting**: Implement API rate limiting
6. **Monitoring**: Monitor for suspicious activity

## Support

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Jobber API Documentation](https://developer.getjobber.com/)

### Emergency Contacts

- Sentry Support: [support portal]
- Hosting Provider Support: [provider contact]
- Database Support: [Supabase support]

### Monitoring Dashboard

Create a monitoring dashboard with:
- Health check status
- Error rates
- Performance metrics
- Integration status
- Data freshness indicators

This comprehensive setup ensures your Jobber Dashboard is production-ready with proper monitoring, error handling, and maintenance procedures.