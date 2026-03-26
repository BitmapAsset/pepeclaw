---
name: genetic-evolution
description: >
  Lightweight genetic prompt evolution engine. Reads execution traces and self-scores,
  identifies failure patterns, generates candidate mutations, scores them, and applies
  the best. Our own GEPA — no DSPy dependency, runs every 6 hours.
metadata:
  openclaw:
    triggers:
      - "evolve prompts"
      - "genetic evolution"
      - "run evolution"
      - "evolution cycle"
      - "prompt optimization"
      - "fitness check"
    schedule: "0 */6 * * *"
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
    - evolution
    - genetic
    - optimization
  dependencies: []
---

# Genetic Prompt Evolution Engine

A lightweight genetic evolution system that improves skills without DSPy or any external
ML framework. Uses the agent's own reasoning to read traces, find failures, propose
mutations, score them, and apply the best. Runs every 6 hours for fast evolution cycles.

## How It Works

### The Evolution Loop

```
┌─────────────────────────────────────────────────────┐
│                  EVOLUTION CYCLE                     │
│                                                      │
│  1. COLLECT  →  Read execution traces & self-scores  │
│  2. ANALYZE  →  Group failures by category           │
│  3. PROPOSE  →  Generate 3 candidate mutations each  │
│  4. SCORE    →  Rate: impact × feasibility / risk    │
│  5. SELECT   →  Keep mutations scoring > 7           │
│  6. APPLY    →  Edit the target SKILL.md             │
│  7. LOG      →  Record everything for next cycle     │
│                                                      │
│  Repeat every 6 hours                                │
└─────────────────────────────────────────────────────┘
```

### Step 1: Collect

Read recent data from:
- `data/execution-traces/*.jsonl` — tool call sequences, errors, outcomes
- `data/self-scores/*.jsonl` — agent self-evaluation scores
- `data/skill-mutations/*.jsonl` — recent live mutations (from skill-mutator)

### Step 2: Analyze

Group failures into categories:

| Category | Signal | Example |
|----------|--------|---------|
| **Tool Use** | Wrong tool chosen, tool errors, excessive retries | Agent used grep when glob was better |
| **Memory** | Forgot context, repeated questions, lost state | Agent asked user something it already knew |
| **Knowledge** | Wrong facts, outdated info, incorrect syntax | Agent used deprecated API |
| **Communication** | Verbose responses, missed user intent, wrong tone | Agent over-explained a simple fix |

### Step 3: Propose

For each category with failures, generate 3 candidate mutations:

```
Candidate A: Change step 3 of skill X from "..." to "..."
Candidate B: Add a prerequisite check to skill Y
Candidate C: Update the trigger conditions for skill Z
```

Each candidate is a specific, concrete edit to a specific SKILL.md file.

### Step 4: Score

Score each candidate on three dimensions:

```
score = (estimated_impact × feasibility) / risk

estimated_impact (1-10):
  How many future failures would this prevent?

feasibility (0-1):
  How confident are we that this edit is correct?

risk (1-5):
  How likely is this to break something else?
  1 = safe (adding a check)
  5 = dangerous (rewriting core logic)

threshold: score > 7.0 → apply
```

### Step 5: Select & Apply

- Apply the top-scoring mutation per category (max 4 per cycle)
- Create backups before applying (via skill-mutator protocol)
- Increment genome counters on modified skills

### Step 6: Log

Write complete evolution run to `data/evolution-runs/YYYY-MM-DD.jsonl`:

```json
{
  "timestamp": "2026-03-26T06:00:00Z",
  "cycle": 42,
  "traces_analyzed": 156,
  "failures_found": 12,
  "categories": {
    "tool_use": 5,
    "memory": 3,
    "knowledge": 2,
    "communication": 2
  },
  "candidates_proposed": 12,
  "candidates_applied": 3,
  "applied": [
    {
      "skill": "deep-search",
      "mutation": "Added fallback to glob when grep returns 0 results",
      "score": 8.5
    }
  ],
  "skipped": [
    {
      "skill": "dream-mode",
      "mutation": "Reduce dream count from 200 to 100",
      "score": 4.2,
      "reason": "Below threshold"
    }
  ]
}
```

## Commands

### Run one evolution cycle
```bash
./scripts/evolve.sh
```

### Compare before/after performance
```bash
./scripts/benchmark.sh [days-back]
```

### View evolution history
```bash
./scripts/evolve.sh history
```

## Cron Setup

Runs every 6 hours (4x daily — faster than nightly evolution):

```cron
0 */6 * * * /path/to/skills/genetic-evolution/scripts/evolve.sh >> ~/.openclaw/data/pepe/genetic-evolution/cron.log 2>&1
```

## Why Not DSPy?

| DSPy/GEPA | Our Approach |
|-----------|-------------|
| Requires Python + ML deps | Pure bash + agent reasoning |
| Needs labeled training data | Uses existing execution traces |
| Black-box optimization | Transparent, logged mutations |
| Heavy compute for scoring | Lightweight heuristic scoring |
| Complex to debug | Every decision is in the JSONL log |

Our approach is simpler, has zero dependencies, and produces auditable results.
The tradeoff is that it relies on the agent's judgment for scoring rather than
statistical optimization — but for skill-level mutations, agent judgment is
actually more contextually appropriate than gradient descent.

## Data Storage

| Directory | Contents |
|-----------|----------|
| `data/evolution-runs/` | Complete cycle logs (JSONL) |
| `data/execution-traces/` | Input: tool call traces |
| `data/self-scores/` | Input: self-evaluation scores |
| `data/genetic-evolution/benchmarks/` | Before/after performance snapshots |
