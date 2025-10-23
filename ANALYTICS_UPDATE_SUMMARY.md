# Call Analytics Update Summary

## ✅ Changes Completed

### 1. Inbound/Outbound Call Splitting
- Added `direction` field to all call queries
- Split calls into inbound and outbound categories
- Inbound: calls with `direction` = "incoming" or "inbound" (or null/undefined)
- Outbound: calls with `direction` = "outgoing" or "outbound"

### 2. Conversion Rate Logic
- **Old**: (booked calls / total calls) * 100
- **New**: (booked inbound calls / total inbound calls) * 100
- Only inbound calls count toward conversion rate
- Outbound calls excluded from conversion calculations

### 3. Appointments Booked
- **Old**: Counted all booked calls (inbound + outbound)
- **New**: Only counts inbound booked calls
- Outbound calls cannot be "appointments booked"

### 4. Follow-ups Detection
- **New logic**: Detects outbound calls with follow-up keywords
- Keywords: "follow up", "check in", "checking in", "confirm satisfaction", "how did", "feedback"
- Only counts outbound calls as follow-ups
- Displayed in dashboard as separate metric

### 5. Emergency Detection
- Uses `is_emergency` field when available
- Falls back to transcript keywords: "emergency", "leak", "leaking", "flood", "flooding", "no heat", "burst"
- Counts emergencies from all calls (inbound + outbound)

### 6. Pipeline Breakdown
- **Changed**: Now only includes inbound calls
- Qualified: Inbound booked calls
- Follow-Up: Inbound calls with "call back" or "follow" in transcript
- New Leads: Inbound not booked, duration < 60s
- Closed-Lost: Inbound not booked, duration > 60s

## 📊 Updated Dashboard Metrics

### Call Analytics Interface
```typescript
callAnalytics: {
  today: {
    totalCalls: number;           // All calls (inbound + outbound)
    inboundCalls: number;         // ✨ NEW
    outboundCalls: number;        // ✨ NEW
    appointmentsBooked: number;   // Inbound only
    followUpsScheduled: number;   // Outbound only (with keywords)
    emergencyCallsToday: number;  // All calls
    // ... other fields
  };
  thisWeek: {
    totalCalls: number;
    inboundCalls: number;         // ✨ NEW
    outboundCalls: number;        // ✨ NEW
    appointmentsBooked: number;   // Inbound only
    // ... other fields
  };
}
```

### Booked Call Percentage
```typescript
bookedCallPercentage: {
  percentage: number;   // (booked inbound / total inbound) * 100
  booked: number;       // Inbound booked calls only
  total: number;        // Inbound calls only
  status: 'green' | 'yellow' | 'red';
}
```

## 🧪 Test Results

**Today's Calls (EST timezone):**
```json
{
  "totalCalls": 93,
  "inboundCalls": 86,
  "outboundCalls": 7,
  "appointmentsBooked": 3,
  "followUpsScheduled": 0,
  "emergencyCallsToday": 1
}
```

**Conversion Rate:**
```json
{
  "percentage": 3.49,
  "booked": 3,
  "total": 86,
  "status": "red"
}
```
- 3 appointments booked out of 86 inbound calls = 3.49% conversion rate
- 7 outbound calls not counted in conversion calculation

## 🔍 Business Logic

### What Counts as "Booked"?
- Call must be **inbound**
- Must have `classified_as_booked = true`
- Detection via service fee acceptance phrases:
  - "that's fine", "go ahead", "sounds good", "yes please", "book it"

### What Counts as "Follow-up"?
- Call must be **outbound**
- Must contain follow-up keywords in transcript:
  - "follow up", "check in", "checking in"
  - "confirm satisfaction", "how did", "feedback"

### What Counts as "Emergency"?
- Can be any call (inbound or outbound)
- Uses `is_emergency` field OR transcript keywords
- Keywords: "emergency", "leak", "leaking", "flood", "flooding", "no heat", "burst"

## 📝 Files Modified

1. `/Users/benjaminhaberman/jobber-dashboard/src/lib/dashboard-service.ts`
   - Updated `DashboardMetrics` interface (lines 116-147)
   - Updated `getBookedCallPercentage()` to filter inbound only (lines 309-335)
   - Updated `getCallAnalytics()` to select direction field (lines 337-396)
   - Completely rewrote `processCallData()` with inbound/outbound logic (lines 635-741)

## ✅ EST Timezone Consistency

All date filtering uses EST timezone via `getTodayEST()`:
- Dashboard metrics API
- Call analytics calculations
- Booked call percentage
- Call details modal

## 🚀 Ready for Production

All changes are complete and tested:
- ✅ Inbound/outbound call splitting working
- ✅ Conversion rate only counts inbound calls
- ✅ Follow-ups detect outbound calls with keywords
- ✅ Emergency detection uses field + fallback
- ✅ EST timezone filtering consistent throughout
- ✅ No database schema changes required
