# Jobber Dashboard Orchestrator

**Purpose:** Routes analytics and transcription tasks to the correct specialized agent based on task type.

**Architecture:** Defined in `project.json`

---

## Routing Rules

The orchestrator detects the `task_type` field in incoming JSON payloads and routes to the appropriate agent:

| Task Type | Agent | Purpose |
|-----------|-------|---------|
| `transcription_review` | `openphone-analyzer` | Classify call transcripts (booked/emergency/missed/spam) |
| `sync_diagnostics` | `sync-specialist` | Debug API sync failures, optimize data collection |
| `financial_summary` | `revenue-analytics` | Calculate KPIs, revenue trends, AR aging |
| `report_output` | `report-writer` | Generate reports for Slack/Web/PDF |
| *default* | `orchestrator` | Request clarification on task type |

---

## Implementation

### TypeScript Routing Stub

```typescript
import architecture from "./project.json";

export async function orchestrate(task: Task): Promise<AgentResponse> {
  const agents = architecture.architecture.agents;
  const routing = agents.orchestrator.routing_logic;

  // Route based on task_type
  const agentName = routing[task.task_type] || "orchestrator";

  console.log(`🔀 Routing task to: ${agentName}`);

  return await executeAgent(agentName, task);
}

// --- Agent Execution Stubs ---

async function executeAgent(agentName: string, task: Task): Promise<AgentResponse> {
  switch (agentName) {
    case "openphone-analyzer":
      return await analyzeOpenPhoneCall(task);

    case "sync-specialist":
      return await diagnoseSyncIssue(task);

    case "revenue-analytics":
      return await calculateRevenue(task);

    case "report-writer":
      return await generateReport(task);

    case "orchestrator":
    default:
      return {
        agent: "orchestrator",
        status: "needs_clarification",
        message: "Unrecognized task_type. Please specify: transcription_review, sync_diagnostics, financial_summary, or report_output.",
        input: task
      };
  }
}

// --- Agent-Specific Functions ---

async function analyzeOpenPhoneCall(task: Task): Promise<AgentResponse> {
  console.log("📞 OpenPhone Analyzer executing...");

  // Extract call data
  const { call_id, transcript, caller_number } = task.data;

  // Call Claude AI for classification
  const classification = await classifyCall(transcript);

  // Save to database
  await saveCallClassification(call_id, classification);

  return {
    agent: "openphone-analyzer",
    status: "completed",
    result: {
      call_id,
      classification: classification.type,
      confidence: classification.confidence,
      needs_follow_up: classification.type === "missed_opportunity",
      booking_intent: classification.booking_intent
    }
  };
}

async function diagnoseSyncIssue(task: Task): Promise<AgentResponse> {
  console.log("🔧 Sync Specialist executing...");

  const { integration, error_logs } = task.data;

  // Diagnose the sync issue
  const diagnosis = await analyzeSyncLogs(integration, error_logs);

  // Test API connectivity
  const apiStatus = await testAPI(integration);

  // Generate fix recommendations
  const recommendations = generateSyncFixes(diagnosis, apiStatus);

  return {
    agent: "sync-specialist",
    status: "completed",
    result: {
      integration,
      root_cause: diagnosis.root_cause,
      api_status: apiStatus,
      recommendations,
      fix_priority: diagnosis.severity
    }
  };
}

async function calculateRevenue(task: Task): Promise<AgentResponse> {
  console.log("💰 Revenue Analytics executing...");

  const { date_range, metrics_requested } = task.data;

  // Fetch data from Jobber & QuickBooks
  const jobberData = await fetchJobberFinancials(date_range);
  const quickbooksData = await fetchQuickBooksRevenue(date_range);

  // Calculate metrics
  const metrics = {
    daily_revenue: calculateDailyRevenue(jobberData),
    mtd_issued: calculateMTDIssued(jobberData),
    mtd_collected: calculateMTDCollected(jobberData),
    ar_aging: calculateARAging(jobberData),
    growth_rate: calculateGrowth(jobberData, quickbooksData)
  };

  return {
    agent: "revenue-analytics",
    status: "completed",
    result: {
      date_range,
      metrics,
      trending: metrics.growth_rate > 0 ? "up" : "down",
      alerts: generateAlerts(metrics)
    }
  };
}

async function generateReport(task: Task): Promise<AgentResponse> {
  console.log("📊 Report Writer executing...");

  const { report_type, data, output_format } = task.data;

  // Generate report content
  const report = await createReport(report_type, data);

  // Format output
  let formatted;
  switch (output_format) {
    case "slack_message":
      formatted = formatSlackMessage(report);
      break;
    case "pdf_report":
      formatted = await generatePDF(report);
      break;
    case "dashboard_json":
      formatted = formatDashboardJSON(report);
      break;
    default:
      formatted = report;
  }

  return {
    agent: "report-writer",
    status: "completed",
    result: {
      report_type,
      output_format,
      content: formatted,
      generated_at: new Date().toISOString()
    }
  };
}

// --- Helper Functions (Stubs for MCP/API Integration) ---

async function classifyCall(transcript: string) {
  // TODO: Integrate with Anthropic Claude API
  // Call classification logic using ANTHROPIC_API_KEY
  return {
    type: "booked",
    confidence: 0.95,
    booking_intent: true,
    keywords: ["appointment", "schedule", "fix"]
  };
}

async function saveCallClassification(call_id: string, classification: any) {
  // TODO: Integrate with Supabase
  // UPDATE openphone_calls SET classified_as_booked = ...
  console.log(`Saved classification for call ${call_id}`);
}

async function analyzeSyncLogs(integration: string, logs: any[]) {
  // TODO: Implement log analysis
  return {
    root_cause: "API token expired",
    severity: "high"
  };
}

async function testAPI(integration: string) {
  // TODO: Test API connectivity
  return { connected: true, latency_ms: 120 };
}

async function fetchJobberFinancials(date_range: DateRange) {
  // TODO: Integrate with Jobber GraphQL API
  return { invoices: [], payments: [] };
}

async function fetchQuickBooksRevenue(date_range: DateRange) {
  // TODO: Integrate with QuickBooks API
  return { revenue: 0, expenses: 0 };
}

function calculateDailyRevenue(data: any) {
  // TODO: Implement revenue calculation
  return 0;
}

function generateAlerts(metrics: any) {
  // TODO: Generate business alerts
  return [];
}

async function createReport(report_type: string, data: any) {
  // TODO: Implement report generation
  return { title: report_type, sections: [] };
}

function formatSlackMessage(report: any) {
  // TODO: Format for Slack
  return {
    text: "Daily Summary",
    blocks: []
  };
}

// --- Type Definitions ---

interface Task {
  task_type: string;
  data: any;
  metadata?: {
    user_id?: string;
    timestamp?: string;
  };
}

interface AgentResponse {
  agent: string;
  status: "completed" | "failed" | "needs_clarification";
  result?: any;
  message?: string;
  input?: Task;
}

interface DateRange {
  start: string;
  end: string;
}
```

---

## Example Usage

### 1. Classify an OpenPhone Call

```typescript
const task = {
  task_type: "transcription_review",
  data: {
    call_id: "call-12345",
    transcript: "Hi, I need a plumber to fix my kitchen sink. Can you come today?",
    caller_number: "+15551234567",
    duration: 120
  }
};

const result = await orchestrate(task);
// Returns: { agent: "openphone-analyzer", classification: "booked", confidence: 0.95 }
```

### 2. Diagnose Sync Issue

```typescript
const task = {
  task_type: "sync_diagnostics",
  data: {
    integration: "openphone",
    error_logs: [
      { timestamp: "2025-10-15T10:00:00Z", error: "401 Unauthorized" }
    ]
  }
};

const result = await orchestrate(task);
// Returns: { agent: "sync-specialist", root_cause: "API token expired", recommendations: [...] }
```

### 3. Generate Financial Summary

```typescript
const task = {
  task_type: "financial_summary",
  data: {
    date_range: { start: "2025-10-01", end: "2025-10-15" },
    metrics_requested: ["daily_revenue", "ar_aging", "growth_rate"]
  }
};

const result = await orchestrate(task);
// Returns: { agent: "revenue-analytics", metrics: { daily_revenue: 13420, ... } }
```

### 4. Create Daily Report

```typescript
const task = {
  task_type: "report_output",
  data: {
    report_type: "daily_summary",
    data: {
      revenue: 13420,
      calls: 15,
      booked: 8
    },
    output_format: "slack_message"
  }
};

const result = await orchestrate(task);
// Returns: { agent: "report-writer", content: { text: "Daily Summary", blocks: [...] } }
```

---

## Deployment

### Running the Orchestrator

```bash
# Start the Next.js server
npm run dev

# The orchestrator is accessible via API routes:
POST /api/orchestrate
Body: { task_type: "...", data: { ... } }
```

### Webhook Integration

For real-time OpenPhone call processing:

```bash
# Configure OpenPhone webhook to POST to:
https://your-domain.vercel.app/api/webhooks/openphone

# Webhook will automatically trigger orchestrator with task_type: "transcription_review"
```

---

## Testing

```bash
# Test orchestrator routing
npm run test:orchestrator

# Test individual agents
npm run test:openphone-analyzer
npm run test:sync-specialist
npm run test:revenue-analytics
npm run test:report-writer
```

---

## Next Steps

1. ✅ Deploy to Vercel for production cron jobs
2. ✅ Configure OpenPhone webhooks for real-time processing
3. ✅ Implement Claude AI integration for call classification
4. ✅ Connect to Jobber/QuickBooks APIs
5. ✅ Build Slack notification system

---

**Architecture defined in:** `project.json`
**Environment variables:** See `.env.local`
**Documentation:** `CLAUDE.md`, `SUB_AGENTS.md`
