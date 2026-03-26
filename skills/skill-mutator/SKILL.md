---
name: skill-mutator
description: >
  Live mutation engine that edits SKILL.md files when they give wrong guidance.
  Triggers on skill-induced errors or user corrections. Logs all mutations for
  nightly evolution pattern analysis. Always keeps backups before mutating.
metadata:
  openclaw:
    triggers:
      - "fix skill"
      - "skill failed"
      - "wrong guidance"
      - "mutate skill"
      - "skill correction"
      - "update skill"
    schedule: "realtime"
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
    - mutation
    - self-correction
    - realtime
  dependencies: []
---

# Skill Mutator

Edits existing SKILL.md files **on the spot** when they give wrong guidance. Skills that
cause errors get fixed immediately — not next week, not overnight, NOW.

## How It Works

### Detection Triggers

The agent should mutate a skill when:

1. **Error trigger**: Following a skill's instructions leads to a runtime error
   - Command from the skill fails with non-zero exit code
   - Tool call sequence from the skill produces unexpected results
   - Script referenced by the skill doesn't work as documented

2. **Correction trigger**: The user corrects the agent after it followed a skill
   - User says "no, don't do it that way" after agent followed skill guidance
   - User provides alternative approach that contradicts the skill
   - User explicitly says the skill is wrong

3. **Staleness trigger**: The skill references outdated APIs, paths, or patterns
   - File paths in the skill no longer exist
   - API endpoints return different responses than documented
   - Dependencies listed in the skill have breaking changes

### Mutation Process

When a trigger is detected:

1. **Identify** — Determine which skill caused the issue and which section is wrong
   ```
   Failing skill: <skill-name>
   Failing section: <section heading or line range>
   Error: <what went wrong>
   Root cause: <why the guidance was wrong>
   ```

2. **Backup** — Before ANY edit, create a backup:
   ```bash
   cp skills/<name>/SKILL.md skills/<name>/SKILL.md.backup.<timestamp>
   ```

3. **Read** — Read the current SKILL.md to understand the full context

4. **Edit** — Make the minimal targeted edit to fix the issue:
   - Fix the specific incorrect instruction
   - Update the relevant section only
   - Do NOT rewrite the entire skill
   - Preserve all other sections unchanged
   - Increment the genome `mutations` counter
   - Update `last_mutated` date

5. **Log** — Record the mutation to `data/skill-mutations/YYYY-MM-DD.jsonl`:
   ```json
   {
     "timestamp": "2026-03-26T14:30:00Z",
     "skill": "skill-name",
     "trigger": "error|correction|staleness",
     "section": "section that was changed",
     "error": "what went wrong",
     "before": "original text (first 200 chars)",
     "after": "new text (first 200 chars)",
     "confidence": 0.9,
     "backup": "path/to/backup"
   }
   ```

6. **Notify** — Inform the user:
   > "I updated the `<skill-name>` skill because <reason>. The old version is backed up."

### Safety Rules

- **ALWAYS backup before mutating** — no exceptions
- **Minimal edits** — fix the broken part, don't rewrite everything
- **Log everything** — every mutation must be recorded
- **One mutation at a time** — don't chain multiple mutations
- **Confidence threshold** — only mutate if >80% confident the fix is correct
- **Never mutate the mutator** — this skill cannot edit itself
- **Preserve frontmatter** — only change content sections unless fixing metadata
- **Keep backups for 14 days** — the cleanup script handles rotation

### Genome Updates

After each mutation, update the target skill's genome header:

```yaml
genome:
  mutations: <increment by 1>
  lineage:
    last_mutated: <today's date>
```

## Commands

### Manually trigger a mutation
```bash
./scripts/mutate-skill.sh <skill-name> <section> "<fix-description>"
```

### View mutation history for a skill
```bash
./scripts/mutate-skill.sh history <skill-name>
```

### Rollback a mutation
```bash
./scripts/mutate-skill.sh rollback <skill-name> [backup-timestamp]
```

### View today's mutations
```bash
./scripts/mutate-skill.sh today
```

## Data Storage

| Directory | Contents |
|-----------|----------|
| `data/skill-mutations/` | JSONL mutation logs (one file per day) |
| `skills/<name>/SKILL.md.backup.*` | Pre-mutation backups |

## Integration with Nightly Evolution

The mutation log feeds directly into the nightly evolution cycle:

- Skills with many mutations may need a deeper rewrite
- Repeated mutations to the same section indicate a structural problem
- Mutation patterns reveal which skill types are most fragile
- The genetic evolution engine uses mutation logs to prioritize candidates
