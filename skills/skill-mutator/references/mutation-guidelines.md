# Mutation Guidelines

Rules for safe, effective skill mutation. Follow these when editing any SKILL.md.

## The 3 Laws of Mutation

1. **Backup First** — Every mutation starts with a backup. No backup, no mutation.
2. **Minimal Change** — Fix the broken part. Leave everything else alone.
3. **Log Everything** — If it's not logged, it didn't happen.

## What CAN Be Mutated

| Section | Allowed Changes |
|---------|----------------|
| Instructions/Steps | Fix incorrect commands, update file paths, correct sequences |
| Code examples | Fix syntax errors, update API calls, correct output formats |
| Trigger phrases | Add missing triggers, remove misleading ones |
| Dependencies | Update version requirements, add missing deps |
| Data paths | Fix incorrect directory references |

## What CANNOT Be Mutated

| Section | Reason |
|---------|--------|
| Skill name | Would break references from other skills |
| Core purpose | Requires a new skill instead |
| Another skill's content | Each skill manages its own mutations |
| The skill-mutator itself | Self-modification creates infinite loops |
| Security-related instructions | Requires human review |

## Confidence Scoring

Before mutating, score your confidence:

| Score | Meaning | Action |
|-------|---------|--------|
| 0.9-1.0 | Certain the fix is correct | Mutate immediately |
| 0.8-0.9 | Very likely correct | Mutate and notify user |
| 0.6-0.8 | Probably correct | Ask user before mutating |
| < 0.6 | Uncertain | Do NOT mutate — flag for review |

## Mutation Categories

### Category 1: Factual Corrections
- Wrong file paths → correct paths
- Wrong command flags → correct flags
- Wrong API endpoints → correct endpoints
- **Confidence**: Usually 0.95+ (verifiable)

### Category 2: Process Improvements
- Reordering steps for better results
- Adding missing prerequisite steps
- Removing steps that cause issues
- **Confidence**: Usually 0.8-0.9

### Category 3: Behavioral Adjustments
- Changing when a skill triggers
- Adjusting thresholds or parameters
- Modifying decision criteria
- **Confidence**: Usually 0.7-0.85 (subjective)

## Rollback Protocol

If a mutation makes things worse:

1. Identify the backup file: `SKILL.md.backup.<timestamp>`
2. Compare: `diff SKILL.md SKILL.md.backup.<timestamp>`
3. Restore: `cp SKILL.md.backup.<timestamp> SKILL.md`
4. Log the rollback in the mutation log with `"action": "rollback"`

## Pattern Recognition for Nightly Evolution

The mutation log enables pattern analysis:

- **Hot spots**: Sections mutated 3+ times → structural rewrite needed
- **Fragile skills**: Skills with >5 mutations/week → architecture issue
- **Stable skills**: 0 mutations for 30+ days → well-designed, promote as template
- **Correlated failures**: Multiple skills failing together → shared dependency issue
