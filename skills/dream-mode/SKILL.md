# Dream Mode — Autonomous Background Ideation

## Genome
```yaml
version: 1.0.0
fitness: 0.5
mutations: 0
lineage: [original]
created: 2026-03-25
```

## Purpose
Run creative "dream cycles" during off-hours when Gravity is asleep. Cross-pollinate ideas between projects, generate speculative business strategies, write exploratory prototypes, and stress-test architecture decisions. Capture results in a dream journal for morning review.

## Trigger
- **Cron**: Dream cycle runs 2-5 AM daily
- **Manual**: `dream about [topic]` or `run dream cycle`
- **Morning Brief Integration**: Top 3 dreams auto-included in 6 AM brief

## Capabilities

### 1. Dream Cycle Orchestration
Spawn creative subagents with divergent thinking prompts:
- Each cycle runs 3-5 independent dream threads
- Threads are seeded with different creative lenses (analogy, inversion, combination, constraint-removal, random-walk)
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

## Data Model
All data stored in workspace files:
- `DREAM_LOG.md` — Ranked dream results (append-only, newest first)
- `data/dream-mode/dreams.json` — Structured dream data
- `data/dream-mode/connections.json` — Cross-project connection map
- `data/dream-mode/cycle-history.json` — History of dream cycles run

## Dream Output Format
Each dream entry contains:
- **Title**: Catchy one-liner
- **Category**: cross-pollination | speculation | architecture | serendipity
- **Novelty Score**: 0.0-1.0 (how original is this idea?)
- **Feasibility Score**: 0.0-1.0 (how actionable with current resources?)
- **Combined Score**: novelty * 0.4 + feasibility * 0.6 (weighted toward actionability)
- **Summary**: 2-3 sentence description
- **Details**: Full exploration notes
- **Next Steps**: Concrete actions if pursuing this idea
- **Source Projects**: Which projects inspired this dream

## Scripts
- `scripts/dream-cycle.sh` — Main dream cycle orchestrator (2 AM cron)
- `scripts/cross-pollinator.sh` — Cross-project idea generation

## Cron Schedule
```
0 2 * * * openclaw run skill dream-mode/scripts/dream-cycle.sh
```

## Integration Points
- **Morning Brief**: Top 3 dreams (by combined score) included in 6 AM brief
- **Knowledge Graph**: Dream connections feed back into entity relationships
- **Skill Genome**: High-scoring dreams that lead to new skills boost fitness
- **Project War Room**: Architecture stress tests feed into project health

## Configuration
```yaml
# dream-mode config (in data/dream-mode/config.yaml)
schedule:
  start_hour: 2
  end_hour: 5
  timezone: "America/Chicago"
threads_per_cycle: 4
creative_lenses:
  - analogy
  - inversion
  - combination
  - constraint_removal
  - random_walk
scoring:
  novelty_weight: 0.4
  feasibility_weight: 0.6
  promotion_threshold: 0.6
morning_brief_count: 3
```

## Success Metrics
- **Dream-to-action rate**: % of dreams that lead to actual work items
- **Novelty average**: Mean novelty score across all dreams
- **Cross-pollination hits**: Ideas that successfully transfer between projects
- **Morning brief engagement**: Does Gravity read/act on dream summaries?
