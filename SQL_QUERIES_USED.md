# SQL Queries Used for Dashboard Fixes

## SMS Message Cleanup

### 1. Identify SMS Messages
```sql
-- Find all records with duration = 0 (SMS messages)
SELECT
  id,
  call_id,
  caller_number,
  duration,
  call_date,
  transcript
FROM openphone_calls
WHERE duration = 0
ORDER BY call_date DESC;
```

**Result:** 52 SMS messages identified

### 2. Delete SMS Messages
```sql
-- Delete all SMS messages (duration = 0)
DELETE FROM openphone_calls
WHERE duration = 0;
```

**Result:** 52 records deleted

### 3. Verify Deletion
```sql
-- Count remaining records
SELECT COUNT(*) as remaining_calls
FROM openphone_calls;
```

**Result:** 17 actual phone calls remaining

---

## Date Filtering Queries (Eastern Time)

### Before Fix (UTC Timezone)
```sql
-- INCORRECT: Uses UTC midnight
SELECT *
FROM openphone_calls
WHERE call_date >= '2025-10-16T00:00:00.000Z'  -- UTC midnight
  AND call_date < '2025-10-17T00:00:00.000Z'   -- Next UTC midnight
ORDER BY call_date DESC;
```

**Problem:** At 11 PM ET (3 AM UTC next day), calls would not appear in "today's calls"

### After Fix (Eastern Time)
```sql
-- CORRECT: Uses Eastern Time midnight converted to UTC
SELECT *
FROM openphone_calls
WHERE call_date >= '2025-10-16T04:00:00.000Z'  -- Midnight ET = 4 AM UTC (EDT)
  AND call_date < '2025-10-17T04:00:00.000Z'   -- Midnight ET next day
ORDER BY call_date DESC;
```

**Note:** During EDT (Daylight Saving Time), ET is UTC-4. During EST (Standard Time), ET is UTC-5.

---

## Verification Queries

### Check for Remaining SMS Messages
```sql
-- Should return 0 after cleanup
SELECT COUNT(*) as sms_count
FROM openphone_calls
WHERE duration = 0;
```

### Get Today's Calls (ET)
```sql
-- Replace timestamps with current day's ET midnight in UTC
SELECT
  call_id,
  caller_number,
  duration,
  call_date,
  classified_as_booked,
  classification_confidence
FROM openphone_calls
WHERE call_date >= '2025-10-16T04:00:00.000Z'  -- Today midnight ET
  AND call_date < '2025-10-17T04:00:00.000Z'   -- Tomorrow midnight ET
ORDER BY call_date DESC;
```

### Get This Week's Calls (ET)
```sql
-- Replace timestamps with current week start (Monday midnight ET) in UTC
SELECT
  call_id,
  caller_number,
  duration,
  call_date,
  classified_as_booked
FROM openphone_calls
WHERE call_date >= '2025-10-13T04:00:00.000Z'  -- Monday midnight ET
  AND call_date < '2025-10-17T04:00:00.000Z'   -- Current time (or end of day)
ORDER BY call_date DESC;
```

### Get Booked Calls Today
```sql
SELECT
  call_id,
  caller_number,
  call_date,
  classification_confidence
FROM openphone_calls
WHERE call_date >= '2025-10-16T04:00:00.000Z'
  AND call_date < '2025-10-17T04:00:00.000Z'
  AND classified_as_booked = true
ORDER BY call_date DESC;
```

---

## Database Schema

### openphone_calls Table
```sql
CREATE TABLE openphone_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id TEXT NOT NULL UNIQUE,
  caller_number TEXT,
  direction TEXT,
  duration INTEGER,  -- In seconds; 0 = SMS message
  transcript TEXT,
  classified_as_booked BOOLEAN,
  classification_confidence NUMERIC,
  call_date TIMESTAMP WITH TIME ZONE,
  pulled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date-based queries
CREATE INDEX idx_openphone_calls_call_date ON openphone_calls(call_date);

-- Index for classification queries
CREATE INDEX idx_openphone_calls_booked ON openphone_calls(classified_as_booked);
```

---

## Timezone Conversion Reference

### Eastern Time to UTC Conversion

**Eastern Daylight Time (EDT) - Spring/Summer:**
- ET Midnight (00:00) = 04:00 UTC
- ET Noon (12:00) = 16:00 UTC
- ET 11:59 PM (23:59) = 03:59 UTC (next day)

**Eastern Standard Time (EST) - Fall/Winter:**
- ET Midnight (00:00) = 05:00 UTC
- ET Noon (12:00) = 17:00 UTC
- ET 11:59 PM (23:59) = 04:59 UTC (next day)

### Example Timestamp Conversions

| Eastern Time | UTC (EDT) | UTC (EST) |
|--------------|-----------|-----------|
| Oct 16, 2025 12:00 AM | Oct 16, 2025 04:00 AM | Oct 16, 2025 05:00 AM |
| Oct 16, 2025 09:00 AM | Oct 16, 2025 01:00 PM | Oct 16, 2025 02:00 PM |
| Oct 16, 2025 11:59 PM | Oct 17, 2025 03:59 AM | Oct 17, 2025 04:59 AM |

---

## Query Patterns for Developers

### Pattern 1: Get records for specific ET date
```typescript
import { getTodayStartET, getTomorrowStartET } from '@/lib/timezone-utils';

const todayStart = getTodayStartET();
const tomorrowStart = getTomorrowStartET();

const { data } = await supabase
  .from('openphone_calls')
  .gte('call_date', todayStart.toISOString())
  .lt('call_date', tomorrowStart.toISOString());
```

### Pattern 2: Get records for current week (ET)
```typescript
import { getWeekStartET, getTomorrowStartET } from '@/lib/timezone-utils';

const weekStart = getWeekStartET();
const now = getTomorrowStartET();

const { data } = await supabase
  .from('openphone_calls')
  .gte('call_date', weekStart.toISOString())
  .lt('call_date', now.toISOString());
```

### Pattern 3: Filter by date string (ET)
```typescript
import { getTodayStringET } from '@/lib/timezone-utils';

const todayET = getTodayStringET(); // Returns "2025-10-16"

// Use with string comparison (less precise, includes entire UTC day)
const { data } = await supabase
  .from('table_name')
  .gte('date_column', todayET)
  .lt('date_column', `${todayET}T23:59:59`);
```

---

## Common Mistakes to Avoid

### ❌ Don't Use UTC Midnight
```typescript
// WRONG: This uses UTC timezone
const today = new Date().toISOString().split('T')[0];
```

### ❌ Don't Use Local Timezone
```typescript
// WRONG: This uses the server's local timezone
const today = new Date();
today.setHours(0, 0, 0, 0);
```

### ✅ Always Use ET Utilities
```typescript
// CORRECT: Use timezone utilities
import { getTodayStartET, getTomorrowStartET } from '@/lib/timezone-utils';

const todayStart = getTodayStartET();
const tomorrowStart = getTomorrowStartET();
```

---

## Notes

1. **All timestamps in the database are stored in UTC** (TIMESTAMP WITH TIME ZONE)
2. **Query filters must convert ET to UTC** using the timezone utilities
3. **Display times should show " ET" suffix** to avoid confusion
4. **SMS messages are identified by duration = 0** and filtered at webhook level
5. **The application timezone is America/New_York** (handles EDT/EST automatically)
