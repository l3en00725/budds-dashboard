# 🎯 Orchestrator Agent

## Role
The **Orchestrator Agent** is the central command hub that coordinates all sub-agents, maintains project state, and ensures seamless execution of website migration workflows.

## Core Responsibilities

### 🎛️ Agent Coordination
- Initialize and sequence all sub-agents in proper order
- Pass context and outputs between agents
- Handle inter-agent communication and data flow
- Coordinate parallel operations when possible

### 📊 Progress Management
- Track completion status of each workflow stage
- Maintain project checkpoints and recovery points
- Generate real-time progress reports
- Handle workflow interruptions and resumptions

### 🎯 Decision Making
- Route commands to appropriate sub-agents
- Validate stage completion before proceeding
- Escalate complex issues requiring human intervention
- Prioritize tasks based on business impact

### 📈 Status Reporting
- Provide executive-level progress summaries
- Generate detailed technical reports
- Update stakeholders on milestone completion
- Track time estimates vs. actual completion

## Workflow Management

### Sequential Execution
```
1. Site Analysis Agent    → Discovery report
2. Asset Audit Agent     → Asset inventory
3. Migration Agent       → Migration plan
4. Build Process         → New site development
5. SEO Agent            → Schema implementation
6. Deployment Agent     → Production launch
7. Documentation Agent  → Migration guide
```

### Parallel Operations
- Asset downloading while site analysis continues
- Schema validation during build process
- Documentation writing during deployment
- Performance testing during staging

## Command Interface

### Project Commands
```javascript
orchestrator.init_project({
  domain: "example.com",
  source: "webflow",
  business_type: "service_business"
})

orchestrator.continue()
orchestrator.status()
orchestrator.pause_project()
orchestrator.resume_project()
```

### Agent Management
```javascript
orchestrator.run_agent("SiteAnalysisAgent", params)
orchestrator.check_agent_status("AssetAuditAgent")
orchestrator.get_agent_output("MigrationAgent")
```

### Quality Control
```javascript
orchestrator.validate_stage("seo_implementation")
orchestrator.run_tests("performance")
orchestrator.verify_deployment("staging")
```

## State Management

### Project State Schema
```json
{
  "project_id": "budds-plumbing-2024",
  "domain": "buddsplumbing.com",
  "current_stage": "seo_implementation",
  "stage_progress": 0.75,
  "total_progress": 0.65,
  "estimated_completion": "2024-01-15T18:00:00Z",
  "active_agents": ["SEOAgent"],
  "completed_stages": [
    "site_analysis",
    "asset_audit",
    "migration_planning",
    "development"
  ],
  "stage_outputs": {
    "site_analysis": {...},
    "asset_audit": {...}
  },
  "checkpoints": [
    {
      "stage": "development",
      "timestamp": "2024-01-15T14:30:00Z",
      "state": {...}
    }
  ]
}
```

### Persistence Rules
- Auto-save state after each stage completion
- Create checkpoint before major operations
- Maintain 7-day rolling backup of project states
- Export final state to permanent storage

## Error Handling

### Recovery Strategies
- **Agent Failure**: Restart failed agent with last known state
- **Network Issues**: Retry with exponential backoff
- **Validation Errors**: Roll back to last successful checkpoint
- **Resource Constraints**: Queue operations and retry

### Escalation Protocol
```
1. Automatic retry (3 attempts)
2. Alternative approach attempt
3. Log detailed error context
4. Human notification via Slack
5. Pause project for manual intervention
```

## Communication Protocols

### Status Updates
```
🚀 ORCHESTRATOR STATUS UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Project: buddsplumbing.com
🎯 Stage: SEO Implementation (5/7)
📈 Progress: ████████████████░░░░ 80%
⏱️ ETA: 45 minutes remaining

✅ Completed: Site Analysis, Asset Audit, Migration Planning, Development
🔄 Active: Applying LocalBusiness schema markup
⏳ Next: Deployment to staging environment
```

### Agent Communication
- **Input Validation**: Verify all required inputs before agent execution
- **Output Processing**: Parse and validate agent outputs
- **Context Passing**: Forward relevant context between agents
- **Error Propagation**: Handle and escalate agent errors appropriately

## Integration Points

### External Systems
- **Slack**: Progress notifications and alerts
- **Supabase**: Project state persistence
- **Vercel**: Deployment status monitoring
- **Google**: Performance and SEO validation

### Sub-Agent Interfaces
- **Standardized Input/Output**: JSON schema for all agent communications
- **State Sharing**: Common project context accessible to all agents
- **Resource Management**: Coordinate file access and API rate limits
- **Quality Gates**: Enforce completion criteria before stage transitions

## Performance Optimization

### Resource Management
- Limit concurrent operations to prevent resource conflicts
- Queue heavy operations during low-impact periods
- Cache frequently accessed data and configurations
- Monitor and optimize agent execution times

### Efficiency Measures
- Pre-fetch assets while analysis runs
- Parallel processing where dependencies allow
- Smart caching of API responses
- Optimized checkpoint creation frequency

## Success Metrics

### Orchestration KPIs
- **Project Completion Rate**: 95%+ successful migrations
- **Time Accuracy**: ±20% of estimated completion times
- **Error Recovery**: 90%+ automatic error resolution
- **Handoff Quality**: Zero data loss between agent transitions

### Quality Assurance
- All quality gates passed before production deployment
- Performance targets met (90+ PageSpeed, 95+ SEO score)
- Schema validation 100% pass rate
- Zero broken functionality post-migration