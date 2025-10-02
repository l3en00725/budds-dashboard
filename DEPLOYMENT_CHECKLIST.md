# Deployment Checklist - Jobber Dashboard

## Pre-Deployment Setup

### 1. Environment Setup
- [ ] Create production environment variables file
- [ ] Verify all required API keys are available
- [ ] Generate secure NEXTAUTH_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configure production domain URL

### 2. Sentry Configuration
- [ ] Create Sentry project for production
- [ ] Configure Sentry DSN in environment variables
- [ ] Set up Sentry organization and project settings
- [ ] Configure error filtering rules
- [ ] Set up alert notifications
- [ ] Test Sentry integration in staging

### 3. Database Preparation
- [ ] Create production Supabase project
- [ ] Apply all database migrations
- [ ] Configure Row Level Security (RLS) policies
- [ ] Create performance indexes
- [ ] Set up automated backups
- [ ] Configure connection pooling

### 4. Integration Setup
- [ ] Configure Jobber OAuth application for production domain
- [ ] Verify OpenPhone API key has necessary permissions
- [ ] Test Anthropic API key functionality
- [ ] Configure proper redirect URIs for all OAuth flows

## Security Configuration

### 5. SSL and Domain
- [ ] Configure SSL certificate
- [ ] Verify HTTPS enforcement
- [ ] Set up domain DNS records
- [ ] Configure proper CORS policies
- [ ] Implement security headers

### 6. API Security
- [ ] Verify all API keys are stored securely
- [ ] Configure rate limiting (if applicable)
- [ ] Set up API monitoring
- [ ] Review and test authentication flows
- [ ] Validate token refresh mechanisms

## Application Deployment

### 7. Build and Test
- [ ] Run production build locally: `npm run build`
- [ ] Test production build: `npm run start`
- [ ] Verify all pages load correctly
- [ ] Test all API endpoints
- [ ] Validate error handling

### 8. Hosting Platform Setup
- [ ] Configure hosting platform (Vercel recommended)
- [ ] Set up environment variables on platform
- [ ] Configure deployment settings
- [ ] Set up automatic deployments from main branch
- [ ] Configure build and output settings

## Post-Deployment Verification

### 9. Health Checks
- [ ] Test basic ping endpoint: `GET /api/ping`
- [ ] Verify comprehensive health: `GET /api/health`
- [ ] Check detailed health status: `GET /api/health/detailed`
- [ ] Confirm all integrations show as healthy

### 10. Integration Testing
- [ ] **Jobber Integration**:
  - [ ] Test OAuth login flow
  - [ ] Verify token storage and refresh
  - [ ] Test data sync endpoint
  - [ ] Confirm jobs data appears in dashboard
  - [ ] Test GraphQL queries work correctly

- [ ] **OpenPhone Integration**:
  - [ ] Test API connectivity
  - [ ] Verify call data sync
  - [ ] Check call analytics display

- [ ] **Supabase Integration**:
  - [ ] Test database connections
  - [ ] Verify data persistence
  - [ ] Check real-time subscriptions (if used)
  - [ ] Test row-level security

- [ ] **Anthropic Integration**:
  - [ ] Test API connectivity
  - [ ] Verify call classification works
  - [ ] Check usage limits

### 11. Dashboard Functionality
- [ ] Test all dashboard widgets load
- [ ] Verify metrics calculations are correct
- [ ] Check data refresh functionality
- [ ] Test responsive design on different devices
- [ ] Verify navigation works properly

### 12. Error Monitoring
- [ ] Verify Sentry is receiving errors
- [ ] Test error handling with `/api/test-errors` (development only)
- [ ] Check Sentry performance monitoring
- [ ] Verify error filtering is working
- [ ] Test alert notifications

## Monitoring Setup

### 13. External Monitoring
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure health check monitoring
- [ ] Set up performance monitoring
- [ ] Configure alert notifications
- [ ] Test monitoring alerts

### 14. Logging Configuration
- [ ] Verify application logs are captured
- [ ] Check error logs in Sentry
- [ ] Configure log retention policies
- [ ] Set up log aggregation (if needed)

## Performance Optimization

### 15. Performance Testing
- [ ] Test initial page load time
- [ ] Verify API response times
- [ ] Check database query performance
- [ ] Test under simulated load
- [ ] Optimize slow queries

### 16. Caching Configuration
- [ ] Verify Next.js static generation works
- [ ] Configure CDN (if applicable)
- [ ] Set up API response caching
- [ ] Test cache invalidation

## Security Validation

### 17. Security Audit
- [ ] Verify no secrets in client-side code
- [ ] Check for exposed sensitive endpoints
- [ ] Test CORS configuration
- [ ] Verify authentication is required where needed
- [ ] Test rate limiting (if implemented)

### 18. Penetration Testing
- [ ] Test common vulnerabilities (SQL injection, XSS)
- [ ] Verify input validation
- [ ] Test authentication bypass attempts
- [ ] Check for information disclosure

## Documentation and Training

### 19. Documentation Updates
- [ ] Update README with production URLs
- [ ] Document deployment process
- [ ] Create user guide (if needed)
- [ ] Document troubleshooting procedures
- [ ] Update API documentation

### 20. Team Training
- [ ] Train team on monitoring dashboard
- [ ] Document emergency procedures
- [ ] Create runbook for common issues
- [ ] Set up on-call procedures (if needed)

## Cleanup and Maintenance

### 21. Development Cleanup
- [ ] Remove test endpoints from production (`/api/test-errors`)
- [ ] Remove development-only code
- [ ] Clean up console.log statements
- [ ] Remove unused dependencies

### 22. Backup and Recovery
- [ ] Test database backup procedures
- [ ] Document recovery procedures
- [ ] Test backup restoration
- [ ] Set up automated backup monitoring

## Go-Live Checklist

### 23. Final Verification
- [ ] All above items completed and verified
- [ ] Stakeholders notified of go-live
- [ ] Monitoring dashboards ready
- [ ] Support team prepared
- [ ] Rollback plan documented

### 24. Launch
- [ ] Deploy to production
- [ ] Monitor for immediate issues
- [ ] Verify all functionality works
- [ ] Check monitoring systems
- [ ] Notify team of successful deployment

## Post-Launch Monitoring (First 24-48 hours)

### 25. Active Monitoring
- [ ] Monitor error rates in Sentry
- [ ] Check application performance
- [ ] Verify data sync is working
- [ ] Monitor user activity (if applicable)
- [ ] Check system resource usage

### 26. Issue Response
- [ ] Document any issues found
- [ ] Apply hotfixes if needed
- [ ] Update monitoring thresholds
- [ ] Gather feedback from users
- [ ] Plan improvements for next release

## Success Criteria

The deployment is considered successful when:

- [ ] All health checks pass
- [ ] All integrations are working
- [ ] Dashboard displays accurate data
- [ ] Error monitoring is active
- [ ] Performance meets requirements
- [ ] No critical issues in first 24 hours

## Emergency Contacts

- **Development Team**: [contact info]
- **Sentry Support**: [Sentry support portal]
- **Hosting Provider**: [provider support]
- **Database Provider**: [Supabase support]

## Rollback Plan

If critical issues are discovered:

1. **Immediate Response**:
   - [ ] Stop traffic to problematic features
   - [ ] Notify stakeholders
   - [ ] Document the issue

2. **Rollback Procedure**:
   - [ ] Revert to previous stable deployment
   - [ ] Verify rollback successful
   - [ ] Update monitoring systems
   - [ ] Communicate status to team

3. **Post-Rollback**:
   - [ ] Investigate root cause
   - [ ] Plan fix for next deployment
   - [ ] Update deployment procedures
   - [ ] Schedule re-deployment

---

**Note**: This checklist should be reviewed and updated for each deployment. Mark items as complete with initials and timestamps for audit purposes.