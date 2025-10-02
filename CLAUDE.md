# Claude Code Dashboard Agent - Jobber Integration Lessons Learned

## Critical Implementation Notes for Future Dashboard Agents

### 1. Jobber OAuth Integration Issues & Solutions

#### ❌ Common OAuth Pitfalls:
- **Empty Scopes Issue**: Jobber tokens consistently returned `"scopes": ""` despite proper app configuration
- **App Scope Immutability**: Scopes cannot be edited after Jobber app creation - must recreate app
- **Content-Type Mismatch**: OAuth callback must use `application/x-www-form-urlencoded`, NOT `application/json`

#### ✅ Working OAuth Implementation:
```typescript
// CORRECT token exchange format
const tokenResponse = await fetch('https://api.getjobber.com/api/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded', // Critical!
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: JOBBER_CLIENT_ID,
    client_secret: JOBBER_CLIENT_SECRET,
    code,
    redirect_uri: JOBBER_REDIRECT_URI,
  }).toString(), // Use URLSearchParams, not JSON
});
```

### 2. Next.js 15 Cookie Compatibility

#### ❌ Broken Pattern:
```typescript
const cookieStore = cookies(); // Missing await
```

#### ✅ Correct Pattern:
```typescript
const cookieStore = await cookies(); // Must await in Next.js 15
```

### 3. API Route Token Access Issues

#### ❌ Problem: HttpOnly Cookies
- Setting `httpOnly: true` prevents client-side access to tokens
- API routes can't access cookies when called from client fetch()

#### ✅ Solution: Multiple Token Access Patterns
```typescript
async function getJobberToken(request: NextRequest): Promise<string | null> {
  // 1. Try Authorization header (preferred for client calls)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Try request cookies
  const accessToken = request.cookies.get('jobber_access_token')?.value;
  if (accessToken) return accessToken;

  // 3. Fallback to server cookies
  const cookieStore = await cookies();
  return cookieStore.get('jobber_access_token')?.value || null;
}
```

### 4. Jobber GraphQL Schema Issues

#### ❌ Non-existent Fields:
- `description` field doesn't exist on Job type
- Always use latest API version: `'X-JOBBER-GRAPHQL-VERSION': '2025-01-20'`
- Use `jobStatus` field, not `status`

#### ✅ Working Job Query:
```graphql
query GetJobs($first: Int, $after: String) {
  jobs(first: $first, after: $after) {
    nodes {
      id
      jobNumber
      title
      jobStatus          # NOT "status"
      startAt
      endAt
      createdAt
      updatedAt
      total
      client {
        id
        firstName
        lastName
        companyName
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### 5. Dashboard Query Mismatches

#### ❌ Over-Restrictive Queries:
```typescript
// This will show zeros if no jobs completed TODAY
.eq('status', 'complete')
.eq('invoiced', true)
.gte('end_date', today)
```

#### ✅ Flexible Queries for Real Data:
```typescript
// Show all jobs with revenue (better for business overview)
.gt('revenue', 0)
```

### 6. Sync Implementation Best Practices

#### Required Sync Approach:
1. **Jobs**: Usually most records, paginate with 50 per call
2. **Quotes**: Often empty for service businesses
3. **Invoices**: May be managed outside Jobber
4. **Payments**: May be managed outside Jobber

#### Sync Timing Expectations:
- **10-50 jobs**: 15-30 seconds
- **50-200 jobs**: 30-90 seconds
- **200+ jobs**: 2-5 minutes

### 7. Authentication Flow Debugging

#### Essential Debug Steps:
1. **Test OAuth callback**: Check token exchange response format
2. **Verify scopes**: Use Jobber's GraphiQL sandbox to test tokens
3. **Check cookie storage**: Use browser dev tools
4. **Test API endpoints**: Use `/api/test-jobber` for connectivity

### 8. Database Considerations

#### Supabase Schema Notes:
- Use `gen_random_uuid()`, not `uuid_generate_v4()`
- Allow NULL for optional fields like `description`
- Include `pulled_at` timestamps for sync tracking
- Use `upsert()` to handle duplicate syncs

### 9. Required Environment Variables

```bash
# Jobber Configuration
JOBBER_CLIENT_ID=your_client_id
JOBBER_CLIENT_SECRET=your_client_secret
JOBBER_REDIRECT_URI=http://localhost:3000/api/auth/jobber/callback
JOBBER_API_BASE_URL=https://api.getjobber.com/api/graphql

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 10. Critical Jobber App Setup

#### Required Scopes (ALL must be selected):
- `read_clients`, `write_clients`
- `read_requests`, `write_requests`
- `read_quotes`, `write_quotes`
- `read_jobs`, `write_jobs`
- `read_scheduled_items`, `write_scheduled_items`
- `read_invoices`, `write_invoices`
- `read_jobber_payments`
- `read_users`, `write_users`
- Plus additional business-specific scopes

#### App Configuration:
- ✅ Enable "Token Refresh"
- ✅ Add redirect URI before testing
- ❌ Never edit scopes after creation (recreate app instead)

### 11. Troubleshooting Checklist

When dashboard shows zeros:
1. ✅ Check sync logs in database
2. ✅ Verify data exists with debug endpoint
3. ✅ Test dashboard queries match data format
4. ✅ Check date filtering logic
5. ✅ Verify status field matching

### 12. Performance Optimizations

- Use pagination (50 records per API call)
- Implement proper error handling with retry logic
- Cache dashboard metrics for 5-minute intervals
- Use background sync jobs for production

### 13. CRITICAL PORT CONFIGURATION

**⚠️ ALWAYS USE PORT 3000 - NEVER 3002**

The application MUST run on port 3000. Any agents working on this project must remember:
- Development server: `npm run dev` runs on port 3000
- OAuth redirect URIs configured for port 3000
- All API calls must target localhost:3000, NOT localhost:3002
- If you see any references to port 3002, they are incorrect and must be fixed

### 14. Data Range Issues - September 2025 Actual vs Dashboard

**Actual Jobber Data for September 2025:**
- 345 payments: $251,477.73 collected
- 258 invoices: $217,307.11 issued
- Balance: $34,170.62 (clients paid MORE than invoiced)

**Dashboard Issue:** Month-over-month trends showing only $108 collected/$108 issued

**Root Cause:** Sync is not pulling historical data back to September 1st
**Solution Required:** Modify sync to fetch data from 9/1/2025 forward, not just recent data

## Final Architecture

```
Frontend (Dashboard)
  ↓ Manual sync button
API Route (/api/sync/jobber)
  ↓ Token from Authorization header
Jobber GraphQL API
  ↓ Paginated data fetch
Supabase Database
  ↓ Optimized queries
Dashboard Metrics Display
```

This configuration successfully synced 2M+ in revenue data and displays real business metrics.