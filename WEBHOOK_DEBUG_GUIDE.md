# Why Calls Aren't Showing in Database - Debug Guide

**Last Updated:** October 16, 2025, 2:15 PM ET

---

## 🔍 Problem Summary

**Issue:** OpenPhone webhooks are firing successfully, but calls are NOT appearing in the database.

**Root Cause:** Webhook handler only processes specific event types. If OpenPhone is sending different events, they're being ignored.

---

## 📋 Current Webhook Handler Logic

### Events We **SAVE** to Database:
```javascript
// Line 33-35 in src/app/api/webhooks/openphone/route.ts
if (eventType === 'call.completed' ||
    eventType === 'call.transcript.completed' ||
    eventType === 'call.summary.completed' ||
    eventType === 'call.recording.completed') {
  // Save call to database
}
```

### Events We **IGNORE**:
```javascript
// SMS events (line 24-30)
if (eventType === 'message.received' || eventType === 'message.delivered') {
  // Return success but don't save
}

// All other events (line 149-155)
console.log('Unhandled webhook event:', payload.event);
// Return success but don't save
```

### **Missing Event:** `call.ringing`
This event type is **NOT** in either list, so it gets ignored!

---

## 🔎 How to Debug

### Step 1: Check OpenPhone Webhook History

1. Go to OpenPhone Dashboard: https://app.openphone.com
2. Navigate to **Settings → Webhooks**
3. Click on your webhook: `https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone`
4. View **Recent Deliveries**

**Look for:**
- What event types are being sent? (`call.ringing`? `call.ended`? `call.completed`?)
- Are they getting 200 OK responses? (means webhook received but might not process)
- Are there any failed deliveries?

---

### Step 2: Check Vercel Logs

**Option A - Via CLI:**
```bash
vercel logs budds-dashboard --since 1h
```

**Option B - Via Dashboard:**
1. Go to: https://vercel.com/l3en00725s-projects/budds-dashboard/logs
2. Filter by last hour
3. Look for function: `/api/webhooks/openphone`

**What to look for:**
```
✅ Good signs:
- "OpenPhone webhook received"
- "Payload event type: call.completed"
- "Inserting new call AC..."
- "Call AC... processed"

❌ Problem signs:
- "Unhandled webhook event: call.ringing"
- "Unhandled webhook event: call.answered"
- "Ignoring SMS event" (for actual calls)
- Database errors
- No logs at all (webhook not reaching Vercel)
```

---

## 🛠️ Possible Fixes

### Fix #1: Add Missing Event Types

If OpenPhone is sending `call.ringing` or other events, add them to the handler:

**File:** `src/app/api/webhooks/openphone/route.ts` (line 33)

**Current:**
```typescript
if (eventType === 'call.completed' || eventType === 'call.transcript.completed' ||
    eventType === 'call.summary.completed' || eventType === 'call.recording.completed' ||
    eventType === 'test' || !eventType) {
```

**Updated:**
```typescript
if (eventType === 'call.completed' || eventType === 'call.transcript.completed' ||
    eventType === 'call.summary.completed' || eventType === 'call.recording.completed' ||
    eventType === 'call.ringing' || eventType === 'call.ended' ||
    eventType === 'test' || !eventType) {
```

---

### Fix #2: Log ALL Events (Temporary Debug)

To see exactly what OpenPhone is sending, temporarily log everything:

**Add this at line 22:**
```typescript
// TEMPORARY DEBUG - Log everything
console.log('=== WEBHOOK DEBUG ===');
console.log('Event type:', eventType);
console.log('Full payload:', JSON.stringify(payload, null, 2));
console.log('==================');
```

Then check Vercel logs after next call.

---

### Fix #3: Check Webhook URL in OpenPhone

Verify webhook URL is correct:
- **Expected:** `https://budds-dashboard-l3en00725s-projects.vercel.app/api/webhooks/openphone`
- **Method:** POST
- **Events subscribed:** Should include `call.completed` or similar

---

## 📊 Database Status (After Cleanup)

**Before cleanup:**
- 18 total records (all test data from development)
- 0 real customer calls

**After cleanup:**
- 1 old record from 2022 (can be ignored or deleted)
- 0 current real calls
- Database is clean and ready for new calls

**To delete remaining test record:**
```sql
DELETE FROM openphone_calls WHERE call_date < '2025-01-01';
```

---

## ✅ Expected Behavior (When Working)

When a real call comes in, you should see:

**In Vercel Logs:**
```
OpenPhone webhook received: { event: 'call.completed', data: {...} }
Payload event type: call.completed
Extracted call_id: AC123abc...
Inserting new call AC123abc...
Call AC123abc... processed: { outcome: '...', confidence: 90 }
```

**In Dashboard:**
- Call appears immediately in "Today's Calls"
- Shows correct phone number (not +1555...)
- Shows correct time in ET timezone
- Duration > 0 seconds
- Real transcript (if available)

---

## 🔧 Action Items

1. **Check OpenPhone webhook history** - What events are being sent?
2. **Check Vercel logs** - Are events reaching the webhook?
3. **Update webhook handler** - Add missing event types if needed
4. **Test with real call** - Make test call and verify it appears

---

## 📞 Testing Checklist

- [ ] Make test call to OpenPhone number
- [ ] Check OpenPhone webhook delivery status (should be 200 OK)
- [ ] Check Vercel logs for webhook received message
- [ ] Check Vercel logs for event type (call.completed? call.ringing?)
- [ ] Check dashboard - does call appear in "Today's Calls"?
- [ ] Verify call shows correct time in ET timezone
- [ ] Verify duration > 0
- [ ] Verify transcript appears (if OpenPhone sends it)

---

**Need Help?**
Check OpenPhone webhook documentation: https://www.openphone.com/docs/webhooks

Look for section on "Call Events" to see all available event types.
