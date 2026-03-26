---
name: openclaw-optimizer
description: "OpenClaw setup optimizer — audits any OpenClaw agent's configuration, identifies gaps, and generates a personalized upgrade report with one-command fixes. The meta-skill that makes any OpenClaw agent 10x better. Checks memory architecture, search quality, heartbeat config, cron jobs, and tool coverage."
metadata:
  openclaw:
    emoji: "🚀"
    triggers:
      - "optimize my setup"
      - "audit my openclaw"
      - "how can I improve"
      - "openclaw health check"
      - "upgrade report"
      - "optimize openclaw"
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: null
    created: 2026-03-26
    last_mutated: null
    generation: 1
  tags:
    - meta
    - optimization
    - audit
    - setup
    - onboarding
  dependencies: []
---

# OpenClaw Optimizer

The meta-skill that makes any OpenClaw agent 10x better.

## How It Works

1. **On first install** — Runs a full audit of the user's OpenClaw setup
2. **Checks everything** — Memory, search, heartbeat, crons, tools, skills
3. **Generates a report** — Personalized upgrade report with specific fixes
4. **Provides one-command fixes** — Each suggestion has an automated solution
5. **Applies with permission** — Agent can apply fixes after user approval

## Audit Checklist

### 1. Memory Architecture
```
Check:
  ☐ MEMORY.md exists and is not empty
  ☐ MEMORY.md has structured index (not just a dump)
  ☐ USER.md exists with user profile
  ☐ SOUL.md exists with agent personality/rules
  ☐ AGENTS.md exists with agent capabilities map
  ☐ Memory files use proper frontmatter
  ☐ Memory directory is organized (not flat dump)
  ☐ No duplicate memory entries
  ☐ Memory is under 200 lines (for context efficiency)

Fix if missing:
  → Create structured MEMORY.md template
  → Create USER.md from conversation analysis
  → Create SOUL.md with default agent rules
  → Create AGENTS.md with tool/capability map
```

### 2. Search Quality
```
Check:
  ☐ deep-search skill installed
  ☐ .secrets/ directory exists with env files
  ☐ config/ directory has MCP server configs
  ☐ Agent searches before asking user
  ☐ Workspace map is cached on session start

Fix if missing:
  → Install deep-search skill
  → Create .secrets/ with template .env
  → Create config/mcp-servers.json template
```

### 3. Heartbeat Configuration
```
Check:
  ☐ HEARTBEAT.md exists
  ☐ Heartbeat has meaningful checks (not just "alive")
  ☐ Checks cover: API availability, disk space, tool health
  ☐ Heartbeat frequency is appropriate (not too frequent/rare)
  ☐ Heartbeat results are logged

Fix if missing:
  → Create HEARTBEAT.md with standard checks
  → Add project-specific health checks
  → Configure appropriate frequency
```

### 4. Cron Jobs
```
Check:
  ☐ Nightly evolution is scheduled
  ☐ Memory cleanup is scheduled
  ☐ Heartbeat checks are scheduled
  ☐ No conflicting schedules
  ☐ Cron logs exist and show recent runs

Fix if missing:
  → Install nightly-evolution skill
  → Set up memory cleanup cron
  → Configure heartbeat schedule
```

### 5. Tool Coverage
```
Check:
  ☐ MCP servers configured for user's common tools
  ☐ Skills installed for user's common workflows
  ☐ No "tool not found" errors in recent traces
  ☐ API keys available for configured tools
  ☐ Tools are actually being used (not just configured)

Fix if missing:
  → Suggest MCP servers for common platforms
  → Suggest skills for detected workflow patterns
  → Help configure missing API keys
```

### 6. Self-Improvement Loop
```
Check:
  ☐ realtime-learning skill installed
  ☐ execution-trace skill installed
  ☐ self-scoring skill installed
  ☐ skill-autocreator skill installed
  ☐ nightly-evolution skill installed
  ☐ Data directories exist and have recent data
  ☐ Micro-learnings are being logged
  ☐ Traces are being recorded
  ☐ Scores are being tracked

Fix if missing:
  → Install missing self-improvement skills
  → Create required data directories
  → Verify the improvement pipeline is flowing
```

### 7. QMD Structure (if applicable)
```
Check:
  ☐ Using Quantum Memory Design for memory
  ☐ Memory has dimensional organization
  ☐ Cross-references between memory entries
  ☐ Memory search is multi-dimensional

Fix if missing:
  → Suggest QMD migration path
  → Provide QMD templates
```

## Scripts

### audit.sh
Run a full audit of the OpenClaw setup.

```bash
# Full audit
./scripts/audit.sh

# Specific section
./scripts/audit.sh --section memory
./scripts/audit.sh --section search
./scripts/audit.sh --section heartbeat
./scripts/audit.sh --section cron
./scripts/audit.sh --section tools
./scripts/audit.sh --section self-improvement

# Output format
./scripts/audit.sh --format markdown  # Default
./scripts/audit.sh --format json      # Machine-readable
```

### fix.sh
Apply fixes from the audit report.

```bash
# Apply a specific fix
./scripts/fix.sh --fix "create-memory-md"
./scripts/fix.sh --fix "install-deep-search"
./scripts/fix.sh --fix "setup-nightly-evolution"

# Apply all safe fixes (non-destructive only)
./scripts/fix.sh --all-safe

# Preview fixes without applying
./scripts/fix.sh --dry-run --all

# Apply with user confirmation for each
./scripts/fix.sh --interactive --all
```

### report.sh
Generate the upgrade report.

```bash
# Generate full report
./scripts/report.sh

# Generate and save to file
./scripts/report.sh --output memory/optimizer-report.md

# Compare with previous audit
./scripts/report.sh --compare
```

## Upgrade Report Format

```markdown
# OpenClaw Optimizer Report

**Generated**: 2026-03-26
**Overall Score**: 6/10 → Could be 9/10

## Current Setup Summary
- Memory: ⚠️ Basic (MEMORY.md exists but unstructured)
- Search: ❌ No deep-search installed
- Heartbeat: ✅ Configured and running
- Cron: ⚠️ Missing nightly evolution
- Tools: ✅ 5 MCP servers configured
- Self-Improvement: ❌ No feedback loop installed

## Top 5 Recommendations

### 1. Install Deep Search [+2 points]
Your agent asks you for API keys that are already in .secrets/
```bash
pepeclaw install deep-search
```

### 2. Set Up Self-Improvement Pipeline [+1.5 points]
No learning from mistakes — same errors repeat across sessions
```bash
pepeclaw install realtime-learning execution-trace self-scoring
```

### 3. Structure Your Memory [+1 point]
MEMORY.md is a flat list — should be indexed with frontmatter
```bash
./scripts/fix.sh --fix "restructure-memory"
```

### 4. Add Nightly Evolution [+0.5 points]
Agent doesn't improve overnight
```bash
pepeclaw install nightly-evolution
```

### 5. Create USER.md Profile [+0.5 points]
Agent doesn't know your preferences across sessions
```bash
./scripts/fix.sh --fix "create-user-profile"
```

## Estimated Impact
- Before: Agent repeats mistakes, asks redundant questions, no overnight learning
- After: Self-improving agent that knows your workspace and gets better daily
```

## Installation

### Automatic
```bash
pepeclaw install openclaw-optimizer
```

### Manual
1. Copy `skills/openclaw-optimizer/` to your OpenClaw workspace
2. Run `./scripts/audit.sh` for initial assessment
3. Apply recommended fixes

## Configuration

```
OPTIMIZER_AUTO_AUDIT=true                      # Run audit on first session
OPTIMIZER_AUDIT_FREQUENCY=weekly               # How often to re-audit
OPTIMIZER_SAFE_AUTO_FIX=false                  # Auto-apply safe fixes without asking
OPTIMIZER_REPORT_DIR=memory                    # Where to store reports
```

## Integration Points

- **Reads**: Everything — this skill audits the entire workspace
- **Writes**: Audit reports, fix scripts, upgrade recommendations
- **Triggers**: Installation of other skills (with user permission)
- **Used by**: New OpenClaw users (onboarding), existing users (optimization)

## Privacy

- Audit is entirely local
- Reports stay in your workspace
- No data sent externally
- Fix scripts are transparent and reviewable
