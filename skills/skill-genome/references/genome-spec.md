# Skill Genome Specification v1.0

## Overview

The Skill Genome is a YAML frontmatter block embedded in every SKILL.md file. It encodes
the skill's identity, fitness metrics, mutation history, and lineage — enabling autonomous
evolution of skills over time.

## Genome Header Format

Every genome-enabled SKILL.md begins with this YAML frontmatter:

```yaml
---
name: skill-name
description: What the skill does and when to trigger it.
genome:
  version: 1            # Integer, increments on each mutation
  fitness: 0.75         # Float 0.0–1.0, weighted composite score
  mutations: 0          # Total mutation count
  lineage:
    parent: null        # Parent skill name (null if original)
    created: 2026-03-25 # ISO date of creation
    last_mutated: null  # ISO date of last mutation (null if never)
    generation: 1       # How many generations from the original
  tags:                 # Searchable tags for crossover detection
    - research
    - web
  dependencies: []      # Other skills or MCP tools required
---
```

## Field Definitions

### `genome.version` (integer, required)
Starts at `1`. Incremented by `1` on every mutation. Never decremented.

### `genome.fitness` (float, required)
Composite fitness score from 0.0 (worst) to 1.0 (best). Calculated as:

```
fitness = (0.5 × success_rate) + (0.3 × usage_frequency) + (0.2 × satisfaction_score)
```

Where:
- **success_rate**: accepted / (accepted + rejected) over the last 30 days
- **usage_frequency**: normalized invocation count (skill_invocations / max_invocations across all skills)
- **satisfaction_score**: (accepted + 0.5×edited) / total_invocations over last 30 days

New skills start at `0.5` (neutral). Scores update after each invocation via the fitness tracker.

### `genome.mutations` (integer, required)
Count of how many times this skill has been rewritten by the mutation engine.

### `genome.lineage.parent` (string|null, required)
The `name` of the skill this was derived from. `null` for original skills.
For crossover (fused) skills, use format: `"skill-a + skill-b"`.

### `genome.lineage.created` (string, required)
ISO 8601 date when the skill was first created.

### `genome.lineage.last_mutated` (string|null, required)
ISO 8601 date of the most recent mutation. `null` if never mutated.

### `genome.lineage.generation` (integer, required)
Generation count. Original skills are generation `1`. Each mutation or fork increments by `1`.

### `genome.tags` (array of strings, required)
Freeform tags used for crossover detection. Skills that share 2+ tags and co-occur
in the same session are crossover candidates.

### `genome.dependencies` (array of strings, optional)
List of required skills or MCP tools. Checked before invocation.

## Fitness Tracking

All invocation outcomes are logged to `data/fitness-log.jsonl` as append-only entries:

```json
{"timestamp":"2026-03-25T14:30:00Z","skill":"skill-name","outcome":"accepted","session":"abc123","co_skills":["other-skill"]}
```

Valid `outcome` values: `accepted`, `edited`, `rejected`

## Mutation Rules

1. The mutation engine runs during the weekly evolution cycle
2. Skills in the bottom 20% by fitness are candidates for mutation
3. Before mutation, the current SKILL.md is archived in `archive/`
4. The mutated skill gets `version += 1`, `mutations += 1`, updated `last_mutated`
5. If a mutation produces a worse fitness after 2 weeks, auto-rollback to the archived version

## Crossover Rules

1. Two skills are crossover candidates if:
   - They share 2+ tags AND
   - They co-occur in 3+ sessions within 30 days
2. Crossover generates a new fused skill with `lineage.parent = "skill-a + skill-b"`
3. The fused skill starts at fitness `0.5` and must earn its place

## Dead Skill Pruning

1. A skill is "dead" if its usage_frequency < 0.05 over the last 30 days
2. Dead skills are moved to `archive/` with a tombstone entry in the fitness log
3. Archived skills can be restored manually

## Version History

| Version | Date       | Changes                    |
|---------|------------|----------------------------|
| 1.0     | 2026-03-25 | Initial genome spec        |
