# Evolution Algorithm Reference

Detailed specification of the PepeClaw Genetic Prompt Evolution algorithm.

## Algorithm Overview

PepeClaw's evolution engine is inspired by genetic algorithms but operates on
skill definitions (SKILL.md files) rather than numerical vectors. It uses the
agent's own reasoning as the fitness function instead of gradient descent.

## Formal Definition

```
POPULATION = set of all SKILL.md files
INDIVIDUAL = one SKILL.md file
GENE = one instruction section within a SKILL.md
MUTATION = a targeted edit to one gene
FITNESS = composite score from execution traces + self-scores
GENERATION = one 6-hour evolution cycle
```

## Selection Pressure

Skills are selected for mutation based on failure frequency:

```
selection_pressure(skill) = failures(skill, window=24h) / invocations(skill, window=24h)

If selection_pressure > 0.3 → candidate for mutation
If selection_pressure > 0.5 → priority candidate
If selection_pressure < 0.05 → leave alone (well-adapted)
```

## Mutation Operators

### 1. Point Mutation
Change a single instruction within a skill.
```
Before: "Use grep to search for the pattern"
After:  "Use grep to search; if no results, fall back to glob with fuzzy matching"
```

### 2. Insertion Mutation
Add a new step or check to a skill.
```
Before: Step 1 → Step 2 → Step 3
After:  Step 1 → Step 1.5 (validation) → Step 2 → Step 3
```

### 3. Deletion Mutation
Remove a step that causes errors or adds no value.
```
Before: Step 1 → Step 2 (always fails) → Step 3
After:  Step 1 → Step 3
```

### 4. Reorder Mutation
Change the sequence of steps for better results.
```
Before: Search → Edit → Test → Read context
After:  Read context → Search → Edit → Test
```

### 5. Parameter Mutation
Adjust thresholds, limits, or configuration values.
```
Before: "confidence_threshold: 0.7"
After:  "confidence_threshold: 0.6" (if too many false negatives)
```

## Fitness Function

```
fitness(skill) = weighted_average(
  success_rate      × 0.40,   # Did it work?
  user_acceptance   × 0.30,   # Did the user accept the result?
  efficiency        × 0.15,   # How many steps/tokens did it take?
  reuse_frequency   × 0.15    # How often is this skill invoked?
)
```

## Crossover (Skill Fusion)

When two skills are frequently used together, consider fusion:

```
If co_occurrence(skill_A, skill_B) > 0.7 for 7+ days:
  → Propose a merged skill that combines their workflows
  → The merged skill inherits the best genes from both parents
  → Both parent skills are kept (pruned only if merged skill dominates)
```

## Extinction Protocol

Skills that consistently underperform are pruned:

```
If fitness(skill) < 0.05 for 30 days AND invocations < 3:
  → Archive to data/skill-genome/archives/
  → Remove from active skills/
  → Log extinction event
```

## Evolution Run Scoring

Each evolution run is scored for quality:

```
run_quality = (mutations_that_improved / mutations_applied)

Track over time:
  - If run_quality > 0.7 → algorithm is working well
  - If run_quality < 0.3 → algorithm needs tuning
  - If run_quality trending down → reduce mutation aggressiveness
```

## Safeguards

1. **Maximum mutations per cycle**: 4 (prevents cascade failures)
2. **Rollback window**: 14 days (any mutation can be undone)
3. **Human approval**: Mutations scoring 6-7 require user confirmation
4. **Immutable skills**: Core skills can be flagged as `immutable: true`
5. **Rate limiting**: Same skill can only be mutated once per cycle
