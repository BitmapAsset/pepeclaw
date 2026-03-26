# Dream Journal Entry Format

## DREAM_LOG.md Structure

The dream log is an append-only markdown file with newest entries first.
Each dream cycle adds a dated section with ranked dream entries.

### Header
```markdown
# Dream Log — Pepe 2.0

> Autonomous background ideation. Top dreams surface in morning brief.
> Last cycle: [ISO 8601 timestamp]
> Total dreams: [count] | Actioned: [count] | Hit rate: [percentage]
```

### Cycle Section
```markdown
---

## Dream Cycle — [YYYY-MM-DD] [HH:MM] - [HH:MM]

**Threads**: [count] | **Duration**: [minutes]m | **Top Score**: [score]

### 1. [Dream Title] ★[combined_score]

| Field | Value |
|-------|-------|
| Category | cross-pollination / speculation / architecture / serendipity |
| Novelty | [0.0-1.0] |
| Feasibility | [0.0-1.0] |
| Combined | [0.0-1.0] |
| Source Projects | [project1], [project2] |
| Status | new / reviewing / actioned / archived |

**Summary**: [2-3 sentence description of the idea]

**Exploration**:
[Full details of the creative exploration — what was considered,
what connections were made, why this is interesting]

**Next Steps**:
- [ ] [Concrete action item 1]
- [ ] [Concrete action item 2]
- [ ] [Concrete action item 3]

---
```

### Morning Brief Integration
The top 3 dreams by combined score are formatted for the morning brief:

```markdown
## While You Slept...

1. **[Dream Title]** (score: [combined]) — [one-line summary]
2. **[Dream Title]** (score: [combined]) — [one-line summary]
3. **[Dream Title]** (score: [combined]) — [one-line summary]

> Run `dream details [number]` for full exploration notes.
```

## dreams.json Entry Format

```json
{
  "id": "dream-uuid-v4",
  "cycle_id": "cycle-uuid-v4",
  "timestamp": "2026-03-25T03:14:00Z",
  "title": "Dream title",
  "category": "cross-pollination",
  "creative_lens": "analogy",
  "novelty_score": 0.8,
  "feasibility_score": 0.7,
  "combined_score": 0.74,
  "summary": "Brief description",
  "details": "Full exploration text",
  "next_steps": ["action1", "action2"],
  "source_projects": ["project-a", "project-b"],
  "connections": [
    {
      "from_project": "project-a",
      "from_concept": "concept-x",
      "to_project": "project-b",
      "to_concept": "concept-y",
      "relationship": "technology-transfer"
    }
  ],
  "status": "new",
  "actioned_at": null,
  "action_outcome": null
}
```

## Cycle History Entry Format

```json
{
  "cycle_id": "cycle-uuid-v4",
  "started_at": "2026-03-25T02:00:00Z",
  "completed_at": "2026-03-25T04:32:00Z",
  "threads_spawned": 4,
  "dreams_generated": 12,
  "dreams_promoted": 3,
  "top_score": 0.82,
  "average_score": 0.54,
  "creative_lenses_used": ["analogy", "inversion", "combination", "random_walk"],
  "projects_scanned": ["pepe-2.0", "naxora", "block-genomics"]
}
```

## Scoring Guidelines

### Novelty (0.0-1.0)
- **0.0-0.2**: Obvious, already known or discussed
- **0.2-0.4**: Minor variation on existing ideas
- **0.4-0.6**: Interesting twist, non-obvious connection
- **0.6-0.8**: Genuinely surprising insight or connection
- **0.8-1.0**: Paradigm-shifting, no one has considered this

### Feasibility (0.0-1.0)
- **0.0-0.2**: Requires resources/tech we don't have
- **0.2-0.4**: Significant effort, unclear ROI
- **0.4-0.6**: Doable with dedicated effort over weeks
- **0.6-0.8**: Achievable within days with current stack
- **0.8-1.0**: Could implement today with minimal effort

### Combined Score
`combined = (novelty * 0.4) + (feasibility * 0.6)`

Promotion threshold: combined >= 0.6
Morning brief threshold: top 3 by combined score
