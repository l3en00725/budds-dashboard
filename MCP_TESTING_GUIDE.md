# Jobber MCP Server - Testing Guide

## Prerequisites

1. **Export your Jobber access token:**
```bash
export JOBBER_ACCESS_TOKEN="your_token_here"
```

Or retrieve it from Supabase:
```bash
bash scripts/get-jobber-token.sh
```

2. **Install Python dependencies:**
```bash
pip3 install -r mcp-server/requirements.txt
```

---

## Testing Results (October 23, 2025)

### ✅ Successfully Tested Tools:

1. **get_daily_revenue** - WORKING
   - Returns today's revenue from completed jobs
   - Result: $0.00 (no jobs completed today)

2. **get_membership_counts** - WORKING
   - Counts active members by tier (Silver, Gold, Platinum)
   - Result: 35 total members

### 🔄 Remaining Tools to Test:

3. **get_ar_aging** - Schema fixed, ready to test (rate-limited)
4. **get_revenue_metrics** - Schema fixed, ready to test
5. **get_business_kpis** - Schema fixed, ready to test

**Note:** Jobber API has rate limiting. Wait 60 seconds between test runs to avoid throttling.

---

## GraphQL Schema Changes (API version 2025-01-20)

The following field name changes were made to match the 2025-01-20 API:

### Job Type:
- `status` → `jobStatus`
- `endDate` → `endAt`
- `revenue` → `total`
- `description` → (removed, not available)
- `clientId` → nested as `client { id }`

### Invoice Type:
- `issueDate` → `issuedDate`
- `balance` → calculated from `total - sum(paymentRecords)`
- `status` → (removed, determine by checking if balance > 0)

### Payment Data:
- Accessed via nested `paymentRecords` on invoices
- Fields: `amount`, `receivedOn`, `createdAt`

---

## 1. Run All Tools Test

```bash
JOBBER_ACCESS_TOKEN="your_token" python3 mcp-server/jobber_dashboard_mcp.py
```

Expected output:
```
================================================================================
JOBBER DASHBOARD MCP - TESTING 5 TOOLS
================================================================================

📊 Running: get_daily_revenue...
✅ Total Revenue: $X,XXX.XX

📊 Running: get_membership_counts...
✅ Total Members: XX

📊 Running: get_ar_aging...
✅ Total AR: $X,XXX.XX

📊 Running: get_revenue_metrics...
✅ MTD Issued: $X,XXX.XX

📊 Running: get_business_kpis...
✅ Completion Rate: XX.X%

================================================================================
✅ ALL TOOLS SUCCESSFUL - Jobber connection verified!
================================================================================
```

Results saved to: `jobber_test_results.json`

---

## 2. Test Individual Tools

### Test get_daily_revenue
```bash
python3 -c "
import asyncio
import os
from mcp_server.jobber_dashboard_mcp import get_daily_revenue
print(asyncio.run(get_daily_revenue('2025-10-23')))
"
```

### Test get_membership_counts
```bash
python3 -c "
import asyncio
from mcp_server.jobber_dashboard_mcp import get_membership_counts
print(asyncio.run(get_membership_counts()))
"
```

---

## Troubleshooting

### Error: "JOBBER_ACCESS_TOKEN environment variable is required"
```bash
# Get token from Supabase
bash scripts/get-jobber-token.sh

# Export it
export JOBBER_ACCESS_TOKEN="your_token_here"
```

### Error: "401 Unauthorized"
Token has expired. Refresh it:
```bash
# Token is automatically refreshed and updated in Supabase
bash scripts/get-jobber-token.sh
```

### Error: "Throttled" / Rate Limiting
Jobber API has rate limits. Wait 60 seconds between test runs:
```bash
sleep 60 && python3 mcp-server/jobber_dashboard_mcp.py
```

### Error: GraphQL schema errors
The MCP server uses API version `2025-01-20`. Field names have changed from older versions:
- Use `jobStatus` instead of `status` for jobs
- Use `issuedDate` instead of `issueDate` for invoices
- Access payments via `paymentRecords` nested in invoices

---

## Next Steps

Once all 5 tools return real data:

1. ✅ Verify data accuracy against Jobber dashboard
2. ⬜ Add MCP server to Claude Desktop config
3. ⬜ Test MCP tools from Claude Desktop
4. ⬜ Compare this MCP connection to existing /api/sync/jobber integration
5. ⬜ Decide which approach to use in production

---

## MCP Server Configuration

The server includes:
- **5 Jobber data tools** with real-time GraphQL queries
- **Rate limit protection** (2-second delays between calls)
- **Automatic token refresh** support (via Supabase)
- **Error handling** for GraphQL schema validation

### File Structure:
```
budds-dashboard/
├── mcp-server/
│   ├── jobber_dashboard_mcp.py    # Main MCP server (418 lines)
│   └── requirements.txt            # httpx, python-dotenv
├── scripts/
│   └── get-jobber-token.sh        # Retrieve token from Supabase
└── MCP_TESTING_GUIDE.md           # This file
```
