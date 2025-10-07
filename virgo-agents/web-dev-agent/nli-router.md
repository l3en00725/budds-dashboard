# Natural-Language Router for Virgo Web Dev Agent

## Purpose
This router analyzes Benjamin's natural language input and automatically triggers the appropriate web development workflow without requiring explicit commands.

## Detection Patterns

### Project Initiation Keywords
**Intent**: Start new project
**Patterns**:
- "Rebuild [domain/brand]"
- "Create website for [brand]"
- "Build [company] site"
- "Migrate [site] from [platform]"
- "New website for [client]"

**Actions**:
1. Extract project name/domain
2. Create project log file
3. Start Site Analysis Agent
4. Ask clarifying questions if needed

### Project Continuation Keywords
**Intent**: Resume existing project
**Patterns**:
- "Continue [project]"
- "What's the status on [site]?"
- "Resume [brand] migration"
- "Keep working on [domain]"

**Actions**:
1. Load existing project log
2. Resume from last checkpoint
3. Report current progress
4. Continue workflow

### Specific Action Keywords
**Intent**: Execute specific workflow stage
**Patterns**:
- "Fix SEO on [site]" → SEO Agent
- "Deploy [project]" → Deployment Agent
- "Check performance of [site]" → Site Analysis Agent
- "Optimize [site] speed" → Performance optimization
- "Audit assets for [brand]" → Asset Audit Agent

**Actions**:
1. Load project context
2. Jump to specific agent/workflow
3. Execute targeted action
4. Report results

### Information Gathering Keywords
**Intent**: Get project status or information
**Patterns**:
- "How's [project] going?"
- "What's left on [site]?"
- "Show me [brand] progress"
- "Status update on [domain]"

**Actions**:
1. Load project log
2. Generate progress report
3. List next steps
4. Ask if should continue

## Auto-Clarification Logic

### Missing Information Detection
When Benjamin's request lacks critical details, automatically ask:

**Missing Domain/URL**:
- "Which domain should I work on?"
- "What's the site URL?"

**Missing Platform**:
- "Which platform is it currently on? (Webflow, WordPress, Wix, etc.)"
- "Is this a new build or migration?"

**Missing Scope**:
- "Should I include everything or focus on specific pages?"
- "Full redesign or just optimization?"

**Missing Timeline**:
- "When do you need this completed?"
- "Is this urgent or can we take time for quality?"

### Smart Defaults
If information is partially provided, use intelligent defaults:
- **Tech Stack**: Always Astro + Sanity + Tailwind + TypeScript
- **Deployment**: Always Vercel
- **SEO**: Always include full schema markup
- **Performance**: Always target 90+ PageSpeed scores

## Workflow Routing Table

| User Intent | Detected Action | Agent(s) Called | Auto-Questions |
|-------------|----------------|-----------------|----------------|
| "Rebuild [site]" | New Migration | Site Analysis → Asset Audit → Migration → Build → SEO → Deploy → Docs | Platform? Scope? Timeline? |
| "Fix SEO on [site]" | SEO Optimization | SEO Agent | Target keywords? Local business? |
| "Make [site] faster" | Performance Optimization | Site Analysis → Performance tuning | Specific issues noticed? |
| "Deploy [project]" | Production Deployment | Deployment Agent | Ready for DNS switch? |
| "Check [site]" | Site Analysis | Site Analysis Agent | What should I look for? |
| "Continue [project]" | Resume Work | Load state → Next stage | None (use existing context) |

## Project State Detection

### New Project Indicators
- Domain/brand mentioned for first time
- No existing log file found
- Keywords: "new", "start", "begin", "create"

### Existing Project Indicators
- Project log file exists
- Keywords: "continue", "resume", "status", "progress"
- Domain/brand mentioned previously

### Context Loading Priority
1. Check `/virgo-agents/logs/[project].json` exists
2. If exists: Load and resume
3. If not exists: Create new project
4. If ambiguous: Ask "Is this a new project or continuing existing work?"

## Response Templates

### Project Start Response
```
"Got it! I'll start [action] for [project/domain].

[Clarifying question if needed]

Starting [first workflow stage] now..."
```

### Project Resume Response
```
"Resuming [project] work. Current status:

✅ [Completed stages]
🔄 [Current stage] ([progress]% complete)
⏳ [Next stages]

[Next action or question]"
```

### Action Complete Response
```
"✅ [Action] completed for [project]

Results:
- [Key result 1]
- [Key result 2]
- [Key result 3]

Next: [Automatic next step or question]"
```

## Error Handling

### Ambiguous Input
If intent is unclear:
```
"I heard you mention [domain/term]. Are you looking to:
- Rebuild/migrate the site?
- Fix performance or SEO?
- Check current status?
- Something else?"
```

### Missing Project Context
If project referenced but no context found:
```
"I don't have any existing context for [project]. Should I:
- Start a new project analysis?
- Look for it under a different name?
- Resume work from [suggested checkpoint]?"
```

### Technical Constraints
If action can't be completed:
```
"I'd like to [intended action] but I need [missing requirement].

Can you [specific request]? Or should I [alternative approach]?"
```

## Proactive Suggestions

After completing any stage, automatically suggest logical next steps:

- **After Site Analysis**: "Ready to audit assets and plan migration?"
- **After Asset Audit**: "Should I start building the new site structure?"
- **After Development**: "Ready for SEO optimization and schema markup?"
- **After SEO**: "Site looks good - deploy to staging for review?"
- **After Staging**: "Everything tested successfully - go live?"

This ensures Benjamin never has to think about what comes next.