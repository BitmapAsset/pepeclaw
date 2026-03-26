---
name: skill-autocreator
description: "Automatic skill creator — monitors execution traces for repeated workflows, and when a pattern appears 3+ times, auto-generates a SKILL.md draft. Drafts go to memory/skill-drafts/ for human review. Runs daily at 2 AM via cron."
metadata:
  openclaw:
    emoji: "🧬"
    cron:
      schedule: "0 2 * * *"
      timezone: "local"
    triggers:
      - "create skill from pattern"
      - "show skill drafts"
      - "auto-create skill"
      - "what patterns did you find"
      - "review skill drafts"
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
    - automation
    - skill-generation
    - pattern-detection
    - meta
  dependencies:
    - execution-trace
---

# Skill Auto-Creator

Turns repeated workflows into reusable skills — automatically.

## How It Works

1. **Monitors execution traces** — Reads `data/execution-traces/*.jsonl` daily
2. **Detects repeated patterns** — Finds tool sequences that appear 3+ times
3. **Generates skill drafts** — Creates a SKILL.md with proper frontmatter, instructions, and scripts
4. **Stores for review** — Drafts go to `memory/skill-drafts/` for human approval
5. **Human approves** — User moves approved draft to `skills/` directory to activate

## Pattern Detection

The analyzer looks for:

### Tool Sequence Patterns
Same sequence of 3+ tools used for similar tasks:
```
Grep → Read → Edit → Bash (test) → Bash (deploy)
→ "deployment-workflow" skill candidate
```

### Task Category Patterns
Same type of request handled 3+ times:
```
"Check TikHub for X" (5 times)
→ "social-monitoring" skill candidate
```

### MCP Tool Patterns
Same MCP tool used repeatedly with similar inputs:
```
tikhub_search(platform=tiktok, query=*) (4 times)
→ "tiktok-monitoring" skill candidate
```

### Error-Recovery Patterns
Same error encountered and resolved the same way:
```
"ENOENT → create directory → retry" (3 times)
→ "safe-file-writer" skill candidate
```

## Draft Format

Generated drafts in `memory/skill-drafts/`:

```markdown
---
name: {{auto-generated-name}}
description: "Auto-detected pattern: {{description}}"
metadata:
  openclaw:
    emoji: "🔧"
    auto_generated: true
    source_pattern: "{{pattern_id}}"
    occurrences: {{count}}
    first_seen: "{{date}}"
    last_seen: "{{date}}"
    confidence: {{0.0-1.0}}
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: skill-autocreator
    created: {{date}}
    generation: 1
  tags: [{{auto-tags}}]
---

# {{Skill Name}}

Auto-generated skill from detected pattern.

## Pattern Summary
- **Occurrences**: {{count}} times in {{days}} days
- **Avg success score**: {{score}}
- **Typical trigger**: "{{user_request}}"

## Workflow Steps
1. {{step1}}
2. {{step2}}
...

## Suggested Implementation
{{generated instructions for the agent}}

## Review Notes
- [ ] Verify this pattern is worth automating
- [ ] Check for edge cases
- [ ] Approve by moving to skills/ directory
```

## Scripts

### detect-patterns.sh
Scan execution traces for repeated patterns.

```bash
# Scan last 7 days (default)
./scripts/detect-patterns.sh

# Scan last 30 days
./scripts/detect-patterns.sh --days 30

# Set minimum occurrences (default: 3)
./scripts/detect-patterns.sh --min-occurrences 5

# Only show high-confidence patterns
./scripts/detect-patterns.sh --min-confidence 0.8
```

### generate-draft.sh
Generate a SKILL.md draft from a detected pattern.

```bash
# Generate from a specific pattern
./scripts/generate-draft.sh --pattern "social-monitoring"

# Generate all pending drafts
./scripts/generate-draft.sh --all

# Preview without writing
./scripts/generate-draft.sh --dry-run --pattern "deployment-workflow"
```

### manage-drafts.sh
Review and manage skill drafts.

```bash
# List all drafts
./scripts/manage-drafts.sh --list

# Show a specific draft
./scripts/manage-drafts.sh --show social-monitoring

# Approve a draft (moves to skills/)
./scripts/manage-drafts.sh --approve social-monitoring

# Reject a draft (archives it)
./scripts/manage-drafts.sh --reject social-monitoring

# Bulk approve
./scripts/manage-drafts.sh --approve-all --min-confidence 0.9
```

## Cron Job

Runs daily at 2 AM:

```json
{
  "name": "skill-autocreator",
  "schedule": { "kind": "cron", "expr": "0 2 * * *", "tz": "local" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "SKILL AUTO-CREATOR RUN\n\n1. Read execution traces from data/execution-traces/ (last 7 days)\n2. Detect repeated tool sequences (3+ occurrences)\n3. Detect repeated task categories\n4. Detect repeated MCP tool usage patterns\n5. Detect repeated error-recovery patterns\n6. For each pattern with confidence > 0.6:\n   - Generate a SKILL.md draft\n   - Save to memory/skill-drafts/{{pattern-name}}.md\n7. Write summary to memory/skill-drafts/SUMMARY.md\n8. If any high-confidence drafts (>0.9), note them for user notification",
    "timeoutSeconds": 600
  }
}
```

## Installation

### Automatic
```bash
pepeclaw install skill-autocreator
```

### Manual
1. Copy `skills/skill-autocreator/` to your OpenClaw workspace
2. Ensure `execution-trace` skill is also installed (dependency)
3. Create `memory/skill-drafts/` directory
4. Set up cron job (see above)

## Configuration

```
SKILL_DRAFTS_DIR=memory/skill-drafts          # Where to store drafts
PATTERN_MIN_OCCURRENCES=3                      # Minimum times a pattern must appear
PATTERN_MIN_CONFIDENCE=0.6                     # Minimum confidence to generate draft
PATTERN_LOOKBACK_DAYS=7                        # Days of traces to analyze
PATTERN_AUTO_APPROVE_CONFIDENCE=0.95           # Auto-approve above this confidence (optional)
```

## Integration Points

- **Reads**: `data/execution-traces/*.jsonl` (from execution-trace skill)
- **Writes**: `memory/skill-drafts/*.md`
- **Read by**: User (manual review), nightly-evolution
- **Triggers**: skill-genome (new skills enter the genome)
- **Depends on**: execution-trace skill

## Privacy

- Pattern detection is purely local
- No data leaves your machine
- Drafts are suggestions only — nothing activates without approval
