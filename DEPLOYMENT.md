# Plumbing & HVAC Dashboard - Deployment Guide

This guide walks you through deploying your complete jobber dashboard with all integrations.

## 🎯 What You're Deploying

A **real-time accountability dashboard** with:
- 🟢🟡🔴 **Color-coded status indicators** for instant decision-making
- **Daily revenue target tracking** with progress bars
- **Unsent invoices monitoring** with urgency alerts
- **Open quotes drill-down** with "Follow Up Now" buttons
- **Booked call percentage** with gauge charts
- **Weekly payments tracking** vs goals
- **YTD revenue comparison** with growth arrows

## 📋 Prerequisites

### 1. API Accounts Needed
- **Jobber Developer Account** - [Get API credentials](https://developer.getjobber.com/)
- **QuickBooks Developer Account** - [Get app keys](https://developer.intuit.com/)
- **OpenPhone Business Account** - [Get API key](https://www.openphone.com/api) *(optional)*
- **Anthropic API Key** - [Get Claude access](https://www.anthropic.com/api) *(for call classification)*

### 2. Services Setup
- **Supabase Account** - [Create project](https://supabase.com/)
- **Vercel Account** - [Connect GitHub](https://vercel.com/)
- **GitHub Repository** - Fork or create repo

## 🚀 Step-by-Step Deployment

### Step 1: Set Up Supabase Database

1. **Create Supabase Project**
   ```bash
   # Go to https://supabase.com/dashboard
   # Create new project
   # Note your Project URL and API keys
   ```

2. **Run Database Schema**
   ```sql
   -- Copy and paste the entire contents of supabase-schema.sql
   -- into Supabase SQL Editor and run
   ```

3. **Get Your Supabase Credentials**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Step 2: Configure API Integrations

#### Jobber Setup
1. **Create Jobber App**
   - Go to [Jobber Developer Portal](https://developer.getjobber.com/)
   - Create new app
   - Set redirect URI: `https://yourdomain.vercel.app/api/auth/jobber/callback`
   - Request scopes: `read write`

2. **Get Credentials**
   ```bash
   JOBBER_CLIENT_ID=your_client_id
   JOBBER_CLIENT_SECRET=your_client_secret
   JOBBER_REDIRECT_URI=https://yourdomain.vercel.app/api/auth/jobber/callback
   ```

#### QuickBooks Setup
1. **Create QuickBooks App**
   - Go to [QuickBooks Developer](https://developer.intuit.com/)
   - Create new app for QuickBooks Online
   - Set redirect URI: `https://yourdomain.vercel.app/api/auth/quickbooks/callback`
   - Request scope: `com.intuit.quickbooks.accounting`

2. **Get Credentials**
   ```bash
   QUICKBOOKS_CLIENT_ID=your_client_id
   QUICKBOOKS_CLIENT_SECRET=your_client_secret
   QUICKBOOKS_REDIRECT_URI=https://yourdomain.vercel.app/api/auth/quickbooks/callback
   QUICKBOOKS_SCOPE=com.intuit.quickbooks.accounting
   ```

#### OpenPhone Setup *(Optional)*
1. **Get API Key**
   - Contact OpenPhone support for API access
   - Get your API key from account settings

2. **Get Credentials**
   ```bash
   OPENPHONE_API_KEY=your_api_key
   ```

#### Anthropic Setup *(For Call Classification)*
1. **Get API Key**
   - Go to [Anthropic Console](https://console.anthropic.com/)
   - Create API key

2. **Get Credentials**
   ```bash
   ANTHROPIC_API_KEY=your_api_key
   ```

### Step 3: Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Complete dashboard implementation"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import GitHub repository
   - Deploy project

3. **Add Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables, add all the variables from your `.env.local`:

   ```bash
   # Jobber
   JOBBER_CLIENT_ID=your_value
   JOBBER_CLIENT_SECRET=your_value
   JOBBER_REDIRECT_URI=https://your-domain.vercel.app/api/auth/jobber/callback
   JOBBER_API_BASE_URL=https://api.getjobber.com/api/graphql

   # QuickBooks
   QUICKBOOKS_CLIENT_ID=your_value
   QUICKBOOKS_CLIENT_SECRET=your_value
   QUICKBOOKS_REDIRECT_URI=https://your-domain.vercel.app/api/auth/quickbooks/callback
   QUICKBOOKS_SANDBOX_BASE_URL=https://sandbox-quickbooks.api.intuit.com
   QUICKBOOKS_SCOPE=com.intuit.quickbooks.accounting

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_value
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_value
   SUPABASE_SERVICE_ROLE_KEY=your_value

   # OpenPhone (Optional)
   OPENPHONE_API_KEY=your_value
   OPENPHONE_API_BASE_URL=https://api.openphone.com/v1

   # Anthropic
   ANTHROPIC_API_KEY=your_value

   # App
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your_random_secret_key
   ```

4. **Update Redirect URIs**
   - Update Jobber app redirect URI to your Vercel domain
   - Update QuickBooks app redirect URI to your Vercel domain

### Step 4: Test the Integration

1. **Visit Your Dashboard**
   ```bash
   https://your-domain.vercel.app
   ```

2. **Connect Services**
   - Click "Connect to Jobber" and authorize
   - Click "Connect to QuickBooks" and authorize
   - Go to dashboard and verify widgets load

3. **Verify Cron Jobs**
   - Check Vercel Functions logs for sync jobs
   - Jobber sync: every 5 minutes
   - QuickBooks sync: every 15 minutes
   - OpenPhone sync: every 30 minutes

## 📊 Dashboard Features

### ✅ **Working Out of the Box:**
- **Daily Target Tracker** - Shows revenue vs daily goal with 🟢🟡🔴 status
- **Unsent Invoices** - Count and $ amount with urgency alerts
- **Open Quotes** - Drill-down table with "Follow Up Now" buttons
- **Weekly Payments** - Bar chart showing progress vs weekly goal
- **YTD Revenue** - TTM comparison with ▲▼ growth indicators
- **Booked Call %** - Gauge chart for call conversion rates

### 🔄 **Automated Workflows:**
- **Every 5 minutes:** Sync Jobber data (jobs, quotes, invoices, payments)
- **Every 15 minutes:** Update QuickBooks revenue data
- **Every 30 minutes:** Classify OpenPhone calls with Claude AI

### 🎯 **Business Intelligence:**
- Real-time status indicators during business hours (8 AM - 5 PM)
- Color-coded alerts: 🟢 Good | 🟡 Caution | 🔴 Action Needed
- Click-to-call and click-to-email from quote drill-downs
- Direct links to Jobber for follow-up actions

## 🛠 Customization

### Update Target Goals
Edit these values in Supabase `dashboard_targets` table:
- **Daily Revenue Target:** $2,000 (adjust for your business)
- **Weekly Payments Goal:** $10,000 (adjust for your business)
- **Booked Call Target:** 70% (industry standard)

### Modify Sync Schedules
Edit `vercel.json` to change sync frequencies:
```json
{
  "crons": [
    {"path": "/api/sync/jobber", "schedule": "*/5 * * * *"},    // Every 5 min
    {"path": "/api/sync/quickbooks", "schedule": "*/15 * * * *"}, // Every 15 min
    {"path": "/api/sync/openphone", "schedule": "*/30 * * * *"}   // Every 30 min
  ]
}
```

## 🚨 Troubleshooting

### Common Issues

**Dashboard shows "Not authenticated"**
- Check if redirect URIs match exactly in API provider settings
- Verify environment variables are set correctly in Vercel

**Revenue data not showing**
- Ensure QuickBooks connection is active
- Check Vercel function logs for sync errors
- Verify P&L report access in QuickBooks

**Call data not updating**
- Confirm OpenPhone API key has correct permissions
- Check Anthropic API key for call classification
- Review sync logs in Supabase `sync_log` table

**Sync failures**
- Check Vercel function logs under "Functions" tab
- Verify API tokens haven't expired
- Review error messages in `sync_log` table

### Token Refresh Issues
The dashboard automatically refreshes expired tokens, but if you see persistent auth errors:
1. Disconnect and reconnect the affected service
2. Check token expiry in `quickbooks_tokens` table
3. Verify refresh token is still valid

## 📈 What's Next?

Your dashboard is now live and providing real-time accountability metrics! Here are some next steps:

1. **Set Realistic Targets** - Adjust daily/weekly goals based on your business
2. **Train Your Team** - Show them how to use the follow-up buttons and status indicators
3. **Monitor Performance** - Watch the sync logs and optimize as needed
4. **Scale Up** - Add more locations or additional metrics as your business grows

## 🎉 You're Done!

You now have a **professional, real-time dashboard** that provides the exact accountability metrics you specified:
- Dummy-proof 🟢🟡🔴 indicators
- One-click follow-up actions
- Automated data collection
- Business intelligence at a glance

Perfect for managing your plumbing & HVAC operation with confidence!