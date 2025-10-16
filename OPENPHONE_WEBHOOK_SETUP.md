# OpenPhone Webhook Setup Guide

**Production URL:** https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone

---

## 🎯 Quick Setup Steps

### 1. Log into OpenPhone Dashboard
Go to: https://app.openphone.com

### 2. Navigate to Webhooks
**Path:** Settings → Integrations → Webhooks → Add Webhook

### 3. Configure Webhook

**Webhook URL:**
```
https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone
```

**Events to Subscribe:**
- ☑ `call.completed` - Triggered when a call ends
- ☑ `call.transcribed` - Triggered when transcription is ready

**Authentication:**
- The webhook endpoint will verify requests using the `OPENPHONE_API_KEY` from your environment variables

### 4. Test Webhook
After saving, OpenPhone will send a test event. Check your Vercel logs to verify it was received:

```bash
vercel logs --follow
```

---

## 🔧 Webhook Endpoint Details

### Endpoint: `/api/webhooks/openphone`

**Method:** POST

**Expected Payload:**
```json
{
  "event": "call.completed",
  "data": {
    "id": "call-xyz123",
    "phoneNumberId": "PN7r9F5MtW",
    "direction": "inbound",
    "from": "+15551234567",
    "to": "+16094657590",
    "status": "completed",
    "duration": 180,
    "createdAt": "2025-10-15T10:30:00Z",
    "completedAt": "2025-10-15T10:33:00Z"
  }
}
```

### What Happens When Webhook is Triggered:

1. **Webhook receives call data** from OpenPhone
2. **Orchestrator routes to `openphone-analyzer` agent**
3. **Agent fetches call transcript** (if not included)
4. **Claude AI classifies the call:**
   - Booked appointment
   - Emergency call
   - Missed opportunity
   - Spam/irrelevant
5. **Classification saved to Supabase** (`openphone_calls` table)
6. **Dashboard updates in real-time** with new call data

---

## 📊 Expected Behavior

### For `call.completed` Event:
- Immediately captures call metadata (duration, caller, etc.)
- Queues transcript retrieval if not available yet
- Saves preliminary call data to database

### For `call.transcribed` Event:
- Retrieves full call transcript
- Sends to Claude AI for classification
- Updates database with classification results
- Confidence score and booking intent extracted

---

## 🧪 Testing the Webhook

### Manual Test with cURL:
```bash
curl -X POST https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone \
  -H "Content-Type: application/json" \
  -d '{
    "event": "call.completed",
    "data": {
      "id": "test-call-123",
      "phoneNumberId": "PN7r9F5MtW",
      "direction": "inbound",
      "from": "+15551234567",
      "to": "+16094657590",
      "status": "completed",
      "duration": 120,
      "createdAt": "2025-10-15T14:00:00Z",
      "completedAt": "2025-10-15T14:02:00Z"
    }
  }'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Webhook received and processed",
  "callId": "test-call-123",
  "status": "queued_for_classification"
}
```

---

## 🔍 Verifying Webhook Activity

### Check Vercel Logs:
```bash
# View real-time logs
vercel logs --follow

# View recent webhook calls
vercel logs | grep "openphone webhook"
```

### Check Supabase Database:
```sql
-- View recent call entries
SELECT * FROM openphone_calls
ORDER BY call_date DESC
LIMIT 10;

-- Check classification results
SELECT
  call_id,
  caller_number,
  classified_as_booked,
  classification_confidence,
  call_date
FROM openphone_calls
WHERE call_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY call_date DESC;
```

---

## ⚠️ Troubleshooting

### Webhook Not Receiving Events

1. **Verify URL is correct:**
   ```
   https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone
   ```

2. **Check OpenPhone webhook status:**
   - Go to OpenPhone Settings → Webhooks
   - Look for delivery status (Success/Failed)
   - Check recent deliveries log

3. **Verify API endpoint exists:**
   ```bash
   curl -I https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone
   ```
   Should return `200 OK` or `405 Method Not Allowed` (GET not supported, only POST)

4. **Check Vercel deployment:**
   ```bash
   vercel ls
   # Ensure budds-dashboard is listed and production deployment is active
   ```

### Webhook Receiving But Not Processing

1. **Check environment variables in Vercel:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Verify these are set:
     - `OPENPHONE_API_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `ANTHROPIC_API_KEY`

2. **Check Vercel function logs for errors:**
   ```bash
   vercel logs --follow
   ```

3. **Test database connection:**
   - Run `/api/debug/data` endpoint to verify Supabase connectivity

---

## 🔄 Switching from Polling to Webhooks

Once webhooks are configured and tested:

1. **Disable polling sync** (optional):
   - Remove or comment out OpenPhone cron job in `vercel.json`
   - Or reduce frequency to daily backup sync

2. **Current config in `vercel.json`:**
   ```json
   {
     "crons": [
       {
         "path": "/api/sync/openphone",
         "schedule": "*/30 * * * *"  // Every 30 minutes (fallback)
       }
     ]
   }
   ```

3. **Recommended: Keep polling as fallback:**
   - Webhooks = real-time processing
   - Polling = backup to catch missed events
   - Reduce polling to once daily: `"0 6 * * *"`

---

## 📈 Performance Improvements

### Before Webhooks (Polling):
- ❌ 30-minute delay for new calls
- ❌ Unnecessary API calls when no new data
- ❌ Higher API usage

### After Webhooks (Real-time):
- ✅ Instant call processing (< 5 seconds)
- ✅ Only process when calls actually happen
- ✅ Lower API usage and costs
- ✅ Better customer experience (faster follow-up)

---

## 🎯 Next Steps After Webhook Setup

1. ✅ **Configure webhook in OpenPhone dashboard** (use URL above)
2. ✅ **Make a test call** to your business line
3. ✅ **Check Vercel logs** to confirm webhook received
4. ✅ **Check Supabase database** for new call record
5. ✅ **Verify classification** appears in dashboard UI
6. ✅ **Monitor for 24 hours** to ensure stability

---

## 📞 Support

If webhook setup fails or events aren't being received:

1. Check OpenPhone webhook delivery logs
2. Check Vercel function logs for errors
3. Verify environment variables are set
4. Test manual cURL request to webhook endpoint
5. Check Supabase for database connectivity

---

**Webhook URL (Copy this):**
```
https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone
```

**Events to enable:**
- `call.completed`
- `call.transcribed`

**Status:** Ready to configure
**Last Updated:** October 15, 2025
