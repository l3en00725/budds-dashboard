# Pipedream Workflow Deployment Guide

## 📋 Overview

This guide will help you deploy the optimized Jobber sync workflows to Pipedream. You now have two powerful options:

1. **Complete Sync** (`jobber-optimized-complete.mjs`) - Full data sync with automatic token refresh
2. **Active Members** (`jobber-simple-active-members.mjs`) - Focused on active membership tracking

## 🚀 Quick Start (Recommended)

### Option 1: Active Members Workflow (Simplest)

**Best for:** Quick setup and active membership tracking

1. **Create New Workflow in Pipedream:**
   - Go to [https://pipedream.com/new](https://pipedream.com/new)
   - Choose "Node.js" as your trigger
   - Copy the entire contents of `jobber-simple-active-members.mjs`

2. **Set Environment Variables:**
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Test & Deploy:**
   - Click "Test" to run immediately
   - Click "Deploy" to save for scheduled runs

### Option 2: Complete Sync Workflow (Advanced)

**Best for:** Full data synchronization with automatic token management

1. **Create New Workflow in Pipedream:**
   - Go to [https://pipedream.com/new](https://pipedream.com/new)
   - Choose "Node.js" as your trigger
   - Copy the entire contents of `jobber-optimized-complete.mjs`

2. **Set Environment Variables:**
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JOBBER_CLIENT_ID=your_jobber_app_client_id
   JOBBER_CLIENT_SECRET=your_jobber_app_client_secret
   ```

## 🔧 Environment Variables Setup

### Required for All Workflows:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (has write permissions)

### Required for Complete Sync Only:
- `JOBBER_CLIENT_ID` - Your Jobber app client ID
- `JOBBER_CLIENT_SECRET` - Your Jobber app client secret

### Where to Find These Values:

**Supabase Values:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy "Project URL" and "service_role secret"

**Jobber Values (if using complete sync):**
1. Go to [Jobber Developer Console](https://developer.getjobber.com/)
2. Select your app
3. Copy "Client ID" and "Client Secret"

## 📅 Scheduling Recommendations

### Active Members Workflow:
- **Frequency:** Every 2-4 hours during business hours
- **Purpose:** Keep membership counts current
- **Duration:** ~30-60 seconds

### Complete Sync Workflow:
- **Frequency:** Once daily (early morning)
- **Purpose:** Full data synchronization
- **Duration:** ~2-5 minutes

### How to Schedule in Pipedream:
1. After deploying your workflow
2. Click "Schedule" at the top
3. Choose your frequency (e.g., "Every 4 hours")
4. Set timezone and specific times if needed

## 🎯 What Each Workflow Does

### Active Members Workflow Features:
✅ Syncs only active jobs (filters out archived/cancelled)
✅ Pulls line items for membership detection
✅ Basic membership categorization (Silver/Gold/Platinum)
✅ Simple error handling
✅ Quick execution (~30-60 seconds)

### Complete Sync Workflow Features:
✅ Syncs jobs, invoices, payments, and line items
✅ Automatic token refresh when expired
✅ Advanced error handling with retry logic
✅ Rate limiting protection
✅ Comprehensive membership tracking
✅ Full financial data sync

## 🔍 Monitoring & Troubleshooting

### Check Workflow Success:
1. Go to your Pipedream workflow
2. Click "Executions" tab
3. Look for green checkmarks (success) or red X's (errors)

### Common Issues & Solutions:

**Issue:** "Missing Jobber token in database"
```
Solution: Run your local authentication first:
1. Start your Next.js app: npm run dev
2. Visit http://localhost:3000/auth/jobber
3. Complete OAuth flow
4. Token will be stored in your Supabase database
```

**Issue:** "Token expired" error
```
Solution:
- Simple workflow: Re-authenticate locally
- Complete workflow: Will auto-refresh (check logs for details)
```

**Issue:** "GraphQL Error" responses
```
Solution: Check the error details in Pipedream logs:
1. Click on failed execution
2. Expand the error step
3. Look for specific GraphQL field issues
```

**Issue:** Workflow times out
```
Solution: Reduce the page limits:
- Edit maxPages variable (reduce from 20 to 10)
- Or switch to Active Members workflow for faster execution
```

## 📊 Expected Results

### After Successful Run:

**Database Tables Updated:**
- `jobber_jobs` - Active jobs with current status
- `jobber_line_items` - Line items for membership tracking
- `jobber_invoices` - Financial data (complete sync only)
- `jobber_payments` - Payment records (complete sync only)

**Dashboard Impact:**
- Active member counts will reflect current Jobber data
- Financial metrics updated (if using complete sync)
- Historical data from September 2025 forward

### Data Volumes (September 2025):
- ~200-300 active jobs expected
- ~500-800 line items for membership tracking
- ~150-200 invoices (if using complete sync)
- ~200-300 payments (if using complete sync)

## 🔄 Migration from Old Workflows

If you're currently using the individual workflows (jobs-only, financial-only, line-items-only):

1. **Keep them as backup** - Don't delete immediately
2. **Test new workflow** - Run the new optimized version alongside
3. **Compare results** - Check that data matches in your dashboard
4. **Switch scheduling** - Move your schedule to the new workflow
5. **Archive old ones** - After confirming new workflow works

## 🛠️ Customization Options

### Adjust Date Range:
Edit the filter dates in the GraphQL queries:
```javascript
filter: {
  createdAt: {
    after: "2025-09-01T00:00:00Z",  // Adjust start date
    before: "2025-10-08T23:59:59Z"  // Adjust end date
  }
}
```

### Modify Page Limits:
Reduce for faster execution or increase for more complete data:
```javascript
const maxPages = 10; // Reduce for faster execution
```

### Custom Membership Detection:
Edit the membership stats logic in Active Members workflow:
```javascript
const itemName = (lineItem.name || "").toLowerCase();
if (itemName.includes('your_membership_term')) {
  membershipStats.custom++;
}
```

## 🚨 Important Notes

1. **Token Management:** The complete sync workflow handles token refresh automatically, but the simple workflow requires manual re-authentication when tokens expire.

2. **Rate Limiting:** Both workflows respect Jobber's API rate limits with built-in pauses and retry logic.

3. **Database Permissions:** Ensure your `SUPABASE_SERVICE_ROLE_KEY` has write permissions to all Jobber tables.

4. **Date Range:** Currently set to September 1 - October 8, 2025. Adjust as needed for your business requirements.

5. **Error Handling:** Both workflows will stop execution on critical errors and provide detailed error messages in Pipedream logs.

## 📞 Support

If you encounter issues:

1. Check Pipedream execution logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure your Jobber app has all required scopes enabled
4. Test your Supabase connection with a simple query

## 🎉 Success Indicators

Your workflow is working correctly when you see:

- ✅ Green checkmarks in Pipedream executions
- ✅ Updated `pulled_at` timestamps in your database tables
- ✅ Current active member counts in your dashboard
- ✅ Summary showing expected data volumes (jobs, line items, etc.)

Both workflows will provide detailed summary information at the end of each execution, showing exactly what data was synced and processed.