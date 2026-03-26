---
name: meta-learning
description: >
  Self-improvement engine that analyzes conversations, extracts implicit feedback,
  detects capability gaps, and proposes targeted self-modifications. The loop itself
  is improvable (recursive meta-learning).
  Triggers on: "analyze my conversations", "what should I improve", "run meta-learning",
  "show proposals", "capability gaps".
metadata:
  openclaw:
    triggers:
      - "analyze my conversations"
      - "what should I improve"
      - "run meta-learning"
      - "show proposals"
      - "capability gaps"
      - "meta dashboard"
    schedule: "0 2 * * *"
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: null
    created: 2026-03-25
    last_mutated: null
    generation: 1
  tags:
    - meta
    - self-improvement
    - analysis
    - feedback
  dependencies: []
---

# Meta-Learning Loop

Self-improvement engine that analyzes conversations, extracts implicit feedback,
detects capability gaps, and proposes targeted self-modifications. The loop itself
is improvable (recursive meta-learning).

## How It Works

Every night, the conversation analyzer replays the day's interactions and classifies
each exchange as success, failure, correction, praise, or abandonment. When failure
patterns recur (>2x in 7 days), the self-modifier drafts improvement proposals.
A gap detector identifies missing capabilities. All proposals require user approval
before application.

## Capabilities

### 1. Conversation Replay Analysis (Nightly)
Scan the day's conversation logs and classify each exchange:
- **Successes**: Fast, accurate, user accepted output without edits
- **Failures**: Misunderstandings, wrong approaches, user had to re-explain
- **Corrections**: User edited or corrected output (implicit negative feedback)
- **Praise**: Explicit positive signals ("great", "perfect", "exactly what I needed")
- **Abandonment**: User dropped a thread without resolution

### 2. Self-Modification Proposals
Based on accumulated analysis:
- Identify recurring failure patterns (same mistake type > 2x in 7 days)
- Draft specific changes: skill prompt edits, behavior rules, memory adjustments
- Score proposals by expected impact (frequency × severity)
- Proposals require user approval before application

### 3. Capability Gap Detection
Track tasks where the agent failed or was unusually slow:
- Categorize gaps: missing skill, missing knowledge, missing tool, wrong approach
- Research solutions: can a new MCP tool help? A new skill? A behavior change?
- Prioritize gaps by frequency and user impact

### 4. A/B Behavior Testing
For task types with > 5 occurrences, identify variant approaches:
- Track which approach variant gets better user response
- Auto-converge on winning variants after statistical significance (n > 10, p < 0.05)

### 5. Meta-Metrics Dashboard
Track over time:
- `response_quality`: Ratio of accepted vs corrected outputs
- `task_completion_rate`: Tasks completed vs abandoned
- `proactive_value`: User-acknowledged proactive suggestions / total
- `correction_trend`: Is correction rate decreasing over time?
- `gap_closure_rate`: Identified gaps resolved / total identified gaps

### 6. Recursive Self-Improvement
The meta-learning loop tracks its own effectiveness:
- Did a self-modification proposal actually improve the target metric?
- If not, revert the proposal and analyze why
- Propose modifications to the meta-learning process itself when hit rate < 50%

## Commands

### Analyze conversations
```bash
# Analyze today's conversations
./scripts/conversation-analyzer.sh

# Analyze a specific date
./scripts/conversation-analyzer.sh --date 2026-03-24
```

### Manage self-modification proposals
```bash
# Generate proposals from recent analysis
./scripts/self-modifier.sh

# Review pending proposals
./scripts/self-modifier.sh --review

# Apply a specific proposal
./scripts/self-modifier.sh --apply PROPOSAL-001
```

### Detect capability gaps
```bash
# Scan for gaps in last 14 days
./scripts/gap-detector.sh

# Custom window
./scripts/gap-detector.sh --days 30

# List existing gaps
./scripts/gap-detector.sh --list
```

## Data Storage

All data lives in `data/` as workspace files — no external database needed:

| File | Format | Purpose |
|------|--------|---------|
| `data/daily/` | Directory | Daily conversation analysis JSON |
| `data/proposals/` | Directory | Self-modification proposals |
| `data/gaps/` | Directory | Capability gap reports |
| `data/metrics/` | Directory | Raw metric data (append-only JSONL) |
| `data/ab-tests.json` | JSON | A/B test registry |

## Cron Setup

```
# Nightly conversation analysis (2 AM)
0 2 * * * /path/to/skills/meta-learning/scripts/conversation-analyzer.sh

# Weekly self-modification proposals (Sunday 3 AM)
0 3 * * 0 /path/to/skills/meta-learning/scripts/self-modifier.sh

# Weekly gap detection (Sunday 4 AM)
0 4 * * 0 /path/to/skills/meta-learning/scripts/gap-detector.sh
```

## Configuration

Environment variables:
- `OPENCLAW_WORKSPACE` — Workspace root (default: `$HOME/.openclaw/workspace`)
- `META_EVAL_DAYS` — Days to look back for analysis (default: 14)
- `META_FAILURE_THRESHOLD` — Minimum recurrences to trigger proposal (default: 2)

## Integration Points

- Reads: conversation logs, skill fitness data (from skill-genome), user corrections
- Writes: daily analysis, proposals, gap reports, dashboard, metrics
- Triggers: skill-genome mutation cycle (when gap → new skill needed)
- Consumed by: dream-mode (gap reports feed creative exploration)

## Architecture

```
meta-learning/
├── SKILL.md                          # This file
├── scripts/
│   ├── conversation-analyzer.sh      # Nightly conversation replay
│   ├── self-modifier.sh              # Self-modification proposals
│   └── gap-detector.sh               # Capability gap detection
├── references/
│   └── meta-metrics-schema.json      # JSON schema for metrics
└── data/
    ├── daily/                        # Daily analysis JSON
    ├── proposals/                    # Modification proposals
    ├── gaps/                         # Gap reports
    ├── metrics/                      # Raw metrics (JSONL)
    └── ab-tests.json                 # A/B test registry
```
