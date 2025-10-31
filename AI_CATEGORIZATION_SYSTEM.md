# AI Call Categorization System v1.0

## Overview

This system provides **flawless accuracy** in categorizing incoming calls by separating three distinct dimensions:
- **Category**: What service is being discussed (Plumbing, HVAC, Drain, Water Heater, Financing, Membership, Other)
- **Intent**: What the caller wants to accomplish (Booking, Estimate, Emergency, Inquiry, Complaint, Follow-up)
- **Sentiment**: How the caller feels (Positive, Neutral, Negative)

This replaces the generic "HVAC inquiry" issue with specific, actionable categorization.

---

## Architecture

### Database
**Table**: `calls_ai_analysis`
- Stores enhanced AI analysis separately from raw call data
- Links to `openphone_calls` via `call_id`
- Includes confidence scoring and manual review flagging
- RLS enabled for security

### API Endpoints

#### 1. POST `/api/calls/analyze`
**Purpose**: Analyze a single call transcript
```json
{
  "call_id": "call_123",
  "transcript": "Customer: My water heater is leaking...",
  "direction": "inbound",
  "duration": 180,
  "caller_number": "+15551234567",
  "call_date": "2024-10-31T10:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "call_id": "call_123",
  "analysis": {
    "category": "Water Heater",
    "intent": "Emergency",
    "sentiment": "Negative",
    "service_detail": "Water heater leaking, needs immediate attention",
    "customer_need": "Emergency repair for leaking water heater",
    "confidence": 0.92,
    "needs_review": false
  }
}
```

#### 2. GET `/api/calls/analyze?call_id=call_123`
**Purpose**: Retrieve existing analysis for a call

#### 3. GET `/api/cron/reanalyze-calls`
**Purpose**: Nightly cron job to re-analyze:
- Calls with no analysis
- Low confidence calls (<0.6)
- Calls analyzed with old prompt versions

**Authentication**: Requires `Authorization: Bearer {CRON_SECRET}`

#### 4. GET `/api/debug/test-categorization`
**Purpose**: Validate categorization accuracy on recent calls
- Shows category/intent breakdown
- Identifies generic classifications
- Calculates accuracy rate

#### 5. POST `/api/debug/test-categorization`
**Purpose**: Batch analyze 10 recent calls for testing

---

## Integration Points

### Webhook Handler
The OpenPhone webhook handler (`/api/webhooks/openphone/route.ts`) now:
1. Receives transcript from OpenPhone
2. Updates `openphone_calls` table (legacy fields)
3. **NEW**: Calls `/api/calls/analyze` to populate `calls_ai_analysis`
4. Analysis happens asynchronously (non-blocking)

### Dashboard
The CallDetailsModal now displays:
- **Category** badge (📂 Water Heater)
- **Intent** badge (🎯 Emergency)
- **Sentiment** badge (😟 Negative)
- **Service Detail** (specific issue description)
- **Customer Need** (what they're asking for)
- **Confidence** progress bar with color coding
- **Needs Review** flag if confidence < 0.6

---

## Categorization Rules

### Category Logic
```
Water Heater: water heater, hot water tank, tankless, pilot light, no hot water
HVAC: furnace, AC, air conditioning, heating, cooling, thermostat
Drain: drain cleaning, clogged, snake, sewer, backup, slow drain
Plumbing: toilet, sink, faucet, pipe leak, fixture, general plumbing
Financing: payment plans, financing, credit arrangements
Membership: service plans, maintenance agreements, membership programs
Other: Administrative, multi-service, or unclear
```

### Intent Logic
```
Booking: Scheduling appointment, ready to proceed, "send someone out"
Estimate: Price shopping, asking for quotes, wants cost before deciding
Emergency: Urgent issue, flooding, no heat (winter), gas smell
Inquiry: General questions, exploring options, information gathering
Complaint: Billing dispute, service dissatisfaction, issues with prior work
Follow-up: Status checks, parts updates, permit delays, existing work
```

### Sentiment Logic
```
Positive: Friendly, cooperative, grateful, satisfied
Neutral: Matter-of-fact, businesslike, calm
Negative: Frustrated, upset, angry, demanding
```

---

## Confidence Scoring

| Score | Meaning | Action |
|-------|---------|--------|
| 0.9-1.0 | Very confident | No action needed |
| 0.7-0.89 | Moderately confident | Monitor periodically |
| 0.6-0.69 | Low confidence | Review weekly |
| 0.0-0.59 | Very low confidence | **Flagged for manual review** |

Calls with confidence < 0.6 are automatically flagged with `needs_review: true`.

---

## Setup Instructions

### 1. Run Database Migration
```bash
# Apply the migration (creates calls_ai_analysis table)
cd supabase
supabase migration up
```

### 2. Set Environment Variables
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...  # Required for AI analysis
CRON_SECRET=your-secret-here   # For nightly reanalysis cron
NEXT_PUBLIC_APP_URL=https://yourapp.vercel.app
```

### 3. Configure Vercel Cron (Optional)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/reanalyze-calls",
    "schedule": "0 2 * * *"  // 2 AM daily
  }]
}
```

### 4. Test the System
```bash
# Analyze 10 recent calls
curl -X POST http://localhost:3000/api/debug/test-categorization

# Check categorization accuracy
curl http://localhost:3000/api/debug/test-categorization
```

---

## Testing & Validation

### Success Criteria
✅ No "HVAC inquiry" generic classifications for plumbing/drain calls  
✅ Category always reflects actual service mentioned  
✅ 70%+ of analyses have confidence >= 0.8  
✅ Inbound vs outbound properly distinguished  
✅ Sentiment scoring consistent across similar calls  

### Test with Sample Transcripts
```bash
# 1. Get test results
curl http://localhost:3000/api/debug/test-categorization | jq .

# 2. Check for issues
# Should return: { "passed": true, "issues": [] }

# 3. Review individual calls
curl http://localhost:3000/api/debug/test-categorization | jq '.calls[] | {call_id, category: .analysis.category, intent: .analysis.intent, confidence: .analysis.confidence}'
```

---

## Prompt Engineering

The AI prompt is defined in `/api/calls/analyze/route.ts` in the `buildAnalysisPrompt()` function.

**Key Features:**
- Temperature: 0.2 (low for consistency)
- Model: Claude 3.5 Sonnet (best for classification)
- Max tokens: 500 (sufficient for JSON response)
- Explicit examples of each category
- Clear exclusion rules (vendor calls, invoice inquiries, etc.)

**To Update:**
1. Modify prompt in `buildAnalysisPrompt()`
2. Increment `ANALYSIS_VERSION` constant
3. Old analyses will be re-analyzed on next cron run

---

## Monitoring & Maintenance

### Weekly Checks
- Review calls flagged `needs_review: true`
- Check category distribution (should match business mix)
- Verify confidence scores trending upward

### Monthly Reviews
- Audit 10 random high-confidence calls for accuracy
- Update prompts if consistent misclassifications found
- Increment `ANALYSIS_VERSION` after prompt changes

### Troubleshooting

**Issue**: All confidences are low (<0.5)
- Check: Is ANTHROPIC_API_KEY set correctly?
- Solution: System falls back to keyword matching without API key

**Issue**: Generic "HVAC inquiry" appearing
- Check: `/api/debug/test-categorization` validation
- Solution: Update prompt with more specific service keywords

**Issue**: Sentiment always "Neutral"
- Check: Are transcripts complete? (Short transcripts = neutral)
- Solution: Ensure OpenPhone webhooks delivering full transcripts

---

## Migration Path

### From Old System
The old system stored classification directly in `openphone_calls`:
- `service_type` - Generic service category
- `classified_as_booked` - Boolean booking status
- `sentiment` - Basic sentiment

The new system:
- ✅ Keeps old fields for backward compatibility
- ✅ Adds detailed analysis in separate table
- ✅ Gradually re-analyzes all historical calls via cron
- ✅ Dashboard shows new analysis if available, falls back to old

### Gradual Rollout
1. **Phase 1** (✅ Complete): New calls get enhanced analysis
2. **Phase 2** (Automated): Cron re-analyzes last 30 days
3. **Phase 3** (Manual): Backfill older calls if needed

---

## API Rate Limits

**Claude API**: 
- Free tier: 50 requests/day
- Paid tier: Unlimited (costs ~$0.003 per call)
- Each analysis = 1 request

**Recommendations**:
- For <20 calls/day: Free tier OK
- For >20 calls/day: Upgrade to paid
- Use fallback keyword system for burst traffic

---

## Support & Contact

**Documentation**: See this file  
**Debug Tools**: `/api/debug/test-categorization`  
**Logs**: Check Vercel logs for `[OpenPhone]` prefix  
**Issues**: Review calls with `needs_review: true` flag  

---

## Version History

**v1.0** (2024-10-31)
- Initial release
- 3-dimensional categorization (category/intent/sentiment)
- Confidence scoring with manual review flags
- Webhook integration
- Nightly re-analysis cron
- Enhanced dashboard display

