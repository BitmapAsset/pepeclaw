---
name: realtime-skill-creator
description: >
  Creates new skill drafts MID-CONVERSATION when repeated patterns are detected.
  Triggers when the agent performs the same task type 3+ times or uses a multi-step
  workflow that could be templated. Saves drafts to memory/skill-drafts/ for user approval.
metadata:
  openclaw:
    triggers:
      - "create skill"
      - "draft skill"
      - "repeated pattern"
      - "skill suggestion"
      - "auto skill"
      - "pattern detected"
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
    - realtime
    - skill-creation
    - pattern-detection
  dependencies: []
---

# Real-Time Skill Creator

Creates new skills **during conversation** — not via a cron job, not overnight, but RIGHT NOW
when the agent notices it keeps doing the same thing.

## How It Works

The agent monitors its own actions within a session. When it detects a repeated pattern,
it drafts a new skill on the spot and offers it to the user for installation.

### Detection Triggers

1. **Repetition trigger**: The agent performs the same type of task 3+ times in one session
   - Same tool sequence (e.g., grep → read → edit → test)
   - Same file patterns (e.g., always editing `*.test.ts` after `*.ts`)
   - Same prompt patterns (e.g., "fix the imports in...")

2. **Workflow trigger**: The agent uses a multi-step workflow that could be templated
   - 4+ sequential tool calls that form a logical unit
   - A sequence that includes decision points with consistent choices
   - A pattern that spans grep → analyze → transform → verify

3. **User-request trigger**: The user explicitly says "make a skill for this" or similar

### What the Agent Does When a Pattern is Detected

1. **Recognize** — Identify the repeated pattern or templateable workflow
2. **Abstract** — Extract the general pattern from the specific instances
3. **Draft** — Create a SKILL.md with proper OpenClaw frontmatter:
   - Name derived from the pattern (e.g., `import-fixer`, `test-scaffolder`)
   - Triggers extracted from the contexts where the pattern appeared
   - Step-by-step instructions that replicate the workflow
   - Any scripts needed (saved alongside the SKILL.md)
4. **Save** — Write the draft to `memory/skill-drafts/<descriptive-name>.md`
5. **Notify** — Tell the user:
   > "I noticed I keep doing X — I drafted a skill for it. Want me to install it?"
6. **Install** (if approved) — Copy to `skills/<name>/SKILL.md` and make scripts executable

### Draft Format

```yaml
---
name: <pattern-name>
description: >
  <what the skill does, derived from the observed pattern>
metadata:
  openclaw:
    triggers:
      - "<trigger phrase 1>"
      - "<trigger phrase 2>"
    schedule: "<realtime|on-demand>"
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: realtime-skill-creator
    created: <today>
    last_mutated: null
    generation: 1
  tags: []
  dependencies: []
---

# <Skill Name>

## Pattern Origin
Observed <N> times in session <session-id> on <date>.
Original contexts: <brief description of each instance>

## Steps
1. <step>
2. <step>
...

## When to Use
<conditions under which this skill applies>
```

### Session Tracking

The agent maintains an in-memory tally during each conversation:

```
task_type_counts = {
  "import-fixing": 3,     # → TRIGGERED
  "test-writing": 2,      # → not yet
  "grep-then-edit": 4,    # → TRIGGERED
}
```

When any count hits 3, the agent pauses to draft the skill before continuing.

### Multi-Step Workflow Detection

Track sequences of tool calls. When a sequence of 4+ calls repeats with >70% structural
similarity, flag it as a templateable workflow:

```
Sequence A: grep("pattern") → read(file) → edit(file, fix) → test()
Sequence B: grep("other")   → read(file2) → edit(file2, fix2) → test()
Similarity: 100% structural match → DRAFT SKILL
```

## Commands

### Manually trigger pattern analysis
```bash
./scripts/pattern-detector.sh analyze <session-log>
```

### List draft skills awaiting approval
```bash
./scripts/pattern-detector.sh list-drafts
```

### Install a draft skill
```bash
./scripts/pattern-detector.sh install <draft-name>
```

## Data Storage

| Directory | Contents |
|-----------|----------|
| `memory/skill-drafts/` | Draft SKILL.md files awaiting user approval |
| `data/realtime-skill-creator/patterns/` | Detected pattern logs |
| `data/realtime-skill-creator/installs/` | Record of installed drafts |

## Key Principles

- **Never auto-install** — always ask the user first
- **Descriptive names** — the draft name should explain what it does
- **Minimal scope** — each skill should do ONE thing well
- **Include origin** — always note where the pattern was observed
- **Respect privacy** — never include sensitive data in skill drafts
