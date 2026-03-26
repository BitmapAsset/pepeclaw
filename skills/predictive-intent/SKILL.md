---
name: predictive-intent
description: >
  Anticipates user needs by mining temporal patterns from conversation history,
  pre-computing predicted requests, and detecting anomalies. Reduces decision
  fatigue through intelligent auto-completion of routine actions.
  Triggers on: "predict intent", "what do I usually do now", "show my patterns",
  "forget pattern", "silence anomaly alerts".
metadata:
  openclaw:
    triggers:
      - "predict intent"
      - "what do I usually do now"
      - "show my patterns"
      - "forget pattern"
      - "silence anomaly alerts"
    schedule: "0 1 * * *"
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
    - prediction
    - patterns
    - anomaly-detection
    - automation
  dependencies: []
---

# Predictive Intent Engine

Anticipate what the user needs before they ask. Mine temporal patterns from
conversation history, pre-compute predicted requests, detect anomalies, and
reduce decision fatigue through intelligent auto-completion of routine actions.

## How It Works

The engine runs three automated processes: a nightly pattern miner that discovers
recurring request patterns, a pre-computation scheduler that caches results before
predicted requests arrive, and a real-time anomaly detector that flags statistical
deviations. Together, they create a system that learns the user's habits and stays
one step ahead.

## Capabilities

### 1. Temporal Pattern Mining
Analyze conversation logs to discover recurring request patterns:
- **Daily patterns**: "Every morning at 9 AM, check portfolio"
- **Weekly patterns**: "Every Monday, review project health"
- **Situational patterns**: "After deploying, always check logs"
- **Sequential patterns**: "Research → summarize → draft email"

### 2. Pre-Computation Scheduler
Before predicted requests arrive, execute queries and cache results:
- Morning brief data assembled at 5:30 AM
- Portfolio snapshots taken before market-check patterns
- Project status compiled before standup patterns
- Results stored in `data/pre-computed/` as timestamped JSON

### 3. Anomaly Detection
Monitor logged metrics for statistical deviations:
- Traffic spikes (>2 sigma from rolling average)
- Unusual transaction amounts or frequencies
- Sudden changes in project health scores
- Unexpected patterns in user behavior
- Alert via system event with analysis and recommended actions

### 4. Decision Fatigue Reduction
Track decision patterns and auto-complete routine ones:
- Categorize decisions by type and outcome
- Identify decisions with >90% consistency in outcome
- Suggest auto-approval for qualifying patterns
- Present as "Based on your history: [recommendation]"

### 5. Conversation Continuation
On session start, predict current focus:
- Check time of day + day of week against patterns
- Review recent activity and open threads
- Preload relevant context into session
- Present: "Looks like you're probably here for [X]. Here's what I've prepped."

## Commands

### Mine patterns from conversation logs
```bash
./scripts/pattern-miner.sh
```

### Pre-compute results for predicted requests
```bash
./scripts/pre-compute.sh
```

### Run anomaly detection
```bash
./scripts/anomaly-detector.sh
```

## Data Storage

All data lives in `data/` as workspace files — no external database needed:

| File | Format | Purpose |
|------|--------|---------|
| `data/patterns.json` | JSON | Discovered temporal patterns |
| `data/request-log.json` | JSON array | Append-only log of all requests |
| `data/pre-computed/` | Directory | Cached pre-computed results |
| `data/anomalies.json` | JSON array | Detected anomaly log |
| `data/decisions.json` | JSON | Decision pattern tracking |

## Cron Setup

```
# Daily pattern mining (1 AM)
0 1 * * * /path/to/skills/predictive-intent/scripts/pattern-miner.sh

# Pre-computation (5:30 AM, before morning brief)
30 5 * * * /path/to/skills/predictive-intent/scripts/pre-compute.sh

# Anomaly detection (every 15 minutes)
*/15 * * * * /path/to/skills/predictive-intent/scripts/anomaly-detector.sh
```

## Configuration

Environment variables:
- `OPENCLAW_WORKSPACE` — Workspace root (default: `$HOME/.openclaw/workspace`)
- `PATTERN_CONFIDENCE_MIN` — Minimum confidence for pattern detection (default: 0.6)
- `ANOMALY_SIGMA` — Standard deviations for anomaly threshold (default: 2)
- `CACHE_TTL_HOURS` — Default cache TTL in hours (default: 6)

## Privacy & Control

- All data local to workspace (never transmitted externally)
- User can inspect all patterns: `show my patterns`
- User can delete patterns: `forget pattern [id]`
- User can disable auto-decisions: `disable auto-decisions`
- Anomaly alerting can be silenced: `silence anomaly alerts for [duration]`

## Integration Points

- **Morning Brief**: Pre-computed data feeds into the 6 AM morning brief
- **Conversation Hook**: On session start, load predictions for current context
- **Skill Genome**: Pattern accuracy feeds back into fitness score

## Architecture

```
predictive-intent/
├── SKILL.md                          # This file
├── scripts/
│   ├── pattern-miner.sh              # Mine temporal patterns (1 AM cron)
│   ├── pre-compute.sh                # Pre-compute predicted results (5:30 AM)
│   └── anomaly-detector.sh           # Detect anomalies (every 15 min)
├── references/
│   └── pattern-schema.json           # JSON schema for pattern data
└── data/
    ├── patterns.json                 # Discovered patterns
    ├── request-log.json              # Request log
    ├── anomalies.json                # Anomaly log
    ├── decisions.json                # Decision patterns
    └── pre-computed/                 # Cached results
```
