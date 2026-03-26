---
name: skill-genome
description: >
  Self-improving skill evolution system. Tracks skill fitness, mutates underperformers,
  detects crossover opportunities, and prunes dead skills. Triggers on: "evolve skills",
  "skill fitness", "mutate skill", "skill leaderboard", "evolution cycle", "skill health".
metadata:
  openclaw:
    triggers:
      - "evolve skills"
      - "skill fitness"
      - "mutate skill"
      - "skill leaderboard"
      - "evolution cycle"
      - "skill health"
    schedule: "0 3 * * 0"
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
    - evolution
    - self-improvement
    - skills
  dependencies: []
---

# Skill Genome System

Autonomous skill evolution engine that tracks fitness, mutates underperformers, fuses
co-occurring skills, and prunes dead ones. Skills improve themselves over time.

## How It Works

Every skill has a **genome header** — YAML frontmatter encoding version, fitness score,
mutation count, and lineage. After each invocation, the fitness tracker records the outcome.
A weekly evolution cycle identifies the bottom 20% of skills by fitness and rewrites them
via subagent mutation.

## Commands

### Track a skill invocation
```bash
# Log an outcome: accepted, edited, or rejected
./scripts/fitness-tracker.sh log <skill-name> <outcome> [session-id] [co-skill-1 co-skill-2...]

# Examples:
./scripts/fitness-tracker.sh log exa-mcp accepted sess-001
./scripts/fitness-tracker.sh log summarize edited sess-001 exa-mcp
./scripts/fitness-tracker.sh log old-reporter rejected sess-002
```

### View fitness scores
```bash
# Single skill
./scripts/fitness-tracker.sh score exa-mcp

# All skills (sorted by fitness)
./scripts/fitness-tracker.sh scores

# Generate SKILL_FITNESS.md leaderboard
./scripts/fitness-tracker.sh leaderboard
```

### Find dead skills
```bash
# Skills with < 5% usage (default threshold)
./scripts/fitness-tracker.sh dead

# Custom threshold
./scripts/fitness-tracker.sh dead 0.10
```

### Find co-occurring skills (crossover candidates)
```bash
# Pairs that co-occur 3+ times (default)
./scripts/fitness-tracker.sh cooccurrence

# Custom minimum
./scripts/fitness-tracker.sh cooccurrence 5
```

### Mutate an underperforming skill
```bash
# List candidates
./scripts/mutation-engine.sh candidates

# Mutate a specific skill (archives current version first)
./scripts/mutation-engine.sh mutate /path/to/skill-dir

# Apply metadata updates after subagent rewrites the skill
./scripts/mutation-engine.sh apply-meta /path/to/skill-dir/SKILL.md
```

### Crossover two skills
```bash
./scripts/mutation-engine.sh crossover skill-a skill-b
```

### Rollback a mutation
```bash
./scripts/mutation-engine.sh rollback /path/to/skill-dir
```

### Archive a dead skill
```bash
./scripts/mutation-engine.sh archive /path/to/skill-dir
```

### Run the full evolution cycle
```bash
# Live run
./scripts/evolution-cycle.sh

# Dry run (no changes, just analysis)
./scripts/evolution-cycle.sh --dry-run
```

## Genome Header Format

Add this to any SKILL.md to make it genome-enabled:

```yaml
---
name: my-skill
description: What this skill does.
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
    - relevant-tag
  dependencies: []
---
```

See `references/genome-spec.md` for full specification.

## Fitness Formula

```
fitness = (0.5 × success_rate) + (0.3 × usage_frequency) + (0.2 × satisfaction)
```

- **success_rate**: accepted / (accepted + rejected) over 30 days
- **usage_frequency**: invocations normalized against the most-used skill
- **satisfaction**: (accepted + 0.5×edited) / total over 30 days

## Data Storage

All data lives in `data/` as workspace files — no external database needed:

| File | Format | Purpose |
|------|--------|---------|
| `data/fitness-log.jsonl` | Append-only JSONL | Every skill invocation outcome |
| `data/mutation-log.jsonl` | Append-only JSONL | Mutation, crossover, rollback events |
| `data/evolution-report-*.md` | Markdown | Weekly evolution cycle reports |
| `SKILL_FITNESS.md` | Markdown table | Human-readable fitness leaderboard |
| `archive/` | Directory | Archived skill versions and dead skills |

## Cron Setup

Add to OpenClaw cron for weekly evolution:

```
0 3 * * 0 /path/to/skills/skill-genome/scripts/evolution-cycle.sh
```

## Configuration

Environment variables:
- `OPENCLAW_WORKSPACE` — Workspace root (default: `$HOME/.openclaw/workspace`)
- `GENOME_EVAL_WINDOW` — Fitness evaluation window in days (default: 30)

## Integration Points

- **Post-Invocation Hook**: Fitness tracker called after every skill invocation
- **Meta-Learning**: Fitness data feeds capability gap detection
- **Dream Mode**: Crossover candidates inspire creative connections
- **All Skills**: Every SKILL.md can have a genome header for tracking

The fitness tracker should be called after every skill invocation:

```bash
fitness-tracker.sh log "$SKILL_NAME" "$OUTCOME" "$SESSION_ID" "${CO_SKILLS[@]}"
```

## Architecture

```
skill-genome/
├── SKILL.md                          # This file
├── SKILL_FITNESS.md                  # Generated leaderboard
├── scripts/
│   ├── fitness-tracker.sh            # Track invocations + compute scores
│   ├── mutation-engine.sh            # Rewrite/crossover/rollback/archive
│   └── evolution-cycle.sh            # Weekly cron orchestrator
├── references/
│   ├── genome-spec.md                # Full genome header specification
│   └── fitness-schema.json           # JSON schema for fitness data
├── data/
│   ├── fitness-log.jsonl             # Append-only invocation log
│   ├── mutation-log.jsonl            # Mutation event log
│   └── evolution-report-*.md         # Weekly reports
└── archive/                          # Archived skill versions
```
