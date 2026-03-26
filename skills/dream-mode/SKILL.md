---
name: dream-mode
description: >
  Autonomous background ideation engine. Runs creative dream cycles during off-hours,
  cross-pollinates ideas between projects, and captures results for morning review.
  Triggers on: "dream about", "run dream cycle", "dream results", "morning dreams".
metadata:
  openclaw:
    triggers:
      - "dream about"
      - "run dream cycle"
      - "dream results"
      - "morning dreams"
      - "cross-pollinate"
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
    - creativity
    - ideation
    - cross-pollination
    - background
  dependencies: []
---

# Dream Mode — Autonomous Background Ideation

Run creative "dream cycles" during off-hours when the user is away. Cross-pollinate
ideas between projects, generate speculative strategies, and stress-test architecture
decisions. Capture results in a dream journal for morning review.

## How It Works

Every night at 2 AM, the dream cycle spawns creative subagents with divergent thinking
prompts. Each thread uses a different creative lens (analogy, inversion, combination,
constraint-removal, random-walk). Results are scored by novelty and feasibility, and
the top dreams are promoted to DREAM_LOG.md for inclusion in the morning brief.

## Capabilities

### 1. Dream Cycle Orchestration
Spawn creative subagents with divergent thinking prompts:
- Each cycle runs 3-5 independent dream threads
- Threads are seeded with different creative lenses
- Results scored by novelty (0-1) and feasibility (0-1)
- Top results promoted to DREAM_LOG.md

### 2. Cross-Project Pollination
Read state from all active projects and find unexpected connections:
- Map capabilities, technologies, and domain concepts across projects
- Generate "what if Project A's approach applied to Project B?" hypotheses
- Identify shared infrastructure opportunities
- Surface technology transfer possibilities

### 3. Speculative Ideation
Generate novel ideas from observed trends and knowledge:
- Business model variations from current projects
- Feature ideas from adjacent industries
- Partnership and integration opportunities
- Market gap hypotheses from competitive intelligence

### 4. Architecture Stress Testing
Probe current designs against edge cases:
- Generate adversarial scenarios for existing systems
- Identify single points of failure
- Propose resilience improvements
- Test scaling assumptions against 10x/100x growth

### 5. Serendipity Engine
Deliberately connect unrelated knowledge nodes:
- Random walks through the knowledge graph
- Forced analogy generation between distant domains
- Pattern matching across unrelated datasets
- "What would [person/company] do with our stack?"

## Commands

### Run a dream cycle
```bash
./scripts/dream-cycle.sh
```

### Run cross-project pollination
```bash
./scripts/cross-pollinator.sh
```

## Dream Output Format

Each dream entry contains:
- **Title**: Catchy one-liner
- **Category**: cross-pollination | speculation | architecture | serendipity
- **Novelty Score**: 0.0-1.0 (how original is this idea?)
- **Feasibility Score**: 0.0-1.0 (how actionable with current resources?)
- **Combined Score**: novelty × 0.4 + feasibility × 0.6 (weighted toward actionability)
- **Summary**: 2-3 sentence description
- **Details**: Full exploration notes
- **Next Steps**: Concrete actions if pursuing this idea
- **Source Projects**: Which projects inspired this dream

## Scoring Formula

```
combined = (novelty × 0.4) + (feasibility × 0.6)
```

Dreams with combined score ≥ 0.6 are promoted to the dream log. At least the top
dream is always promoted, even if below threshold.

## Data Storage

All data lives in `data/` as workspace files — no external database needed:

| File | Format | Purpose |
|------|--------|---------|
| `data/dreams.json` | JSON array | All generated dreams (capped at 200) |
| `data/connections.json` | JSON | Cross-project connection map |
| `data/cycle-history.json` | JSON array | History of dream cycles (capped at 100) |
| `DREAM_LOG.md` | Markdown | Human-readable promoted dreams |

## Cron Setup

Add to OpenClaw cron for nightly dream cycles:

```
0 2 * * * /path/to/skills/dream-mode/scripts/dream-cycle.sh
```

## Configuration

Environment variables:
- `OPENCLAW_WORKSPACE` — Workspace root (default: `$HOME/.openclaw/workspace`)
- `THREADS_PER_CYCLE` — Dream threads per cycle (default: 4)
- `PROMOTION_THRESHOLD` — Minimum combined score to promote (default: 0.6)
- `MORNING_BRIEF_COUNT` — Dreams in morning brief (default: 3)

## Integration Points

- **Morning Brief**: Top 3 dreams (by combined score) included in 6 AM brief
- **Knowledge Graph**: Dream connections feed back into entity relationships
- **Skill Genome**: High-scoring dreams that lead to new skills boost fitness
- **Project War Room**: Architecture stress tests feed into project health

## Architecture

```
dream-mode/
├── SKILL.md                          # This file
├── DREAM_LOG.md                      # Generated dream journal
├── scripts/
│   ├── dream-cycle.sh                # Main dream cycle orchestrator
│   └── cross-pollinator.sh           # Cross-project idea generation
├── references/
│   └── dream-journal-format.md       # Dream log format specification
└── data/
    ├── dreams.json                   # All generated dreams
    ├── connections.json              # Cross-project connections
    └── cycle-history.json            # Cycle run history
```
