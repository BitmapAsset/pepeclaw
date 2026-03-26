---
name: realtime-learning
description: "Real-time micro-learning system — after every mistake or correction, immediately logs the lesson to memory. Creates a feedback loop where the agent learns from errors in real-time, not just during nightly evolution. Any OpenClaw agent gets instant self-correction behavior."
metadata:
  openclaw:
    emoji: "⚡"
    hooks:
      - event: "user_correction"
        action: "log_micro_learning"
      - event: "tool_failure"
        action: "log_micro_learning"
    triggers:
      - "log learning"
      - "what did I learn"
      - "show micro-learnings"
      - "review learnings"
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
    - learning
    - real-time
    - feedback
    - self-improvement
  dependencies: []
---

# Real-Time Micro-Learning System

Instant learning from every mistake. No waiting for nightly evolution — the agent adapts in real-time.

## How It Works

After EVERY mistake or correction from the user, the agent immediately:

1. **Detects the correction** — User says "no", "wrong", "not that", rephrases, or redoes work
2. **Logs the micro-learning** — Writes to `memory/micro-learnings.md` with full context
3. **Applies immediately** — The lesson is available for the rest of the conversation
4. **Feeds nightly evolution** — Micro-learnings get reviewed nightly for pattern detection

## Micro-Learning Format

Each entry in `memory/micro-learnings.md`:

```markdown
## [YYYY-MM-DD HH:MM] Topic

- **What happened**: Description of the mistake or correction
- **What should have been done**: The correct approach
- **Lesson learned**: Generalized rule to apply in future
- **Category**: [code|communication|workflow|tools|knowledge]
- **Severity**: [minor|moderate|critical]
```

## Detection Triggers

The agent should log a micro-learning when:

| Signal | Example | Action |
|--------|---------|--------|
| Explicit correction | "No, use X instead" | Log immediately |
| Redo request | "Try again with..." | Log what went wrong |
| User frustration | "I already told you..." | Log + flag as critical |
| Tool failure | Tool returns error | Log tool+input pattern |
| Wrong assumption | Agent assumed incorrectly | Log the false assumption |
| Scope mismatch | Agent did too much/little | Log scope calibration |

## Agent Behavior Instructions

When installed, the agent MUST follow these rules:

### On Every User Correction
```
1. Acknowledge the correction briefly
2. Fix the issue
3. Silently append to memory/micro-learnings.md:
   - Timestamp (ISO 8601)
   - What happened (1-2 sentences)
   - What should have been done (1-2 sentences)
   - Lesson learned (generalized rule)
   - Category and severity
4. Check if this lesson contradicts any existing memory — if so, update the memory
```

### On Session Start
```
1. Read memory/micro-learnings.md (last 20 entries)
2. Keep recent lessons in active context
3. Apply lessons proactively during the session
```

### On Session End
```
1. Review if any new micro-learnings were logged
2. If critical lessons found, ensure they're also in permanent memory
```

## Hook Integration

Any OpenClaw agent that installs PepeClaw gets this behavior via a hook:

```json
{
  "hook": "post_user_message",
  "condition": "message contains correction signals",
  "action": "run skills/realtime-learning/scripts/log-learning.sh",
  "correction_signals": [
    "no,", "wrong", "not that", "I said", "I meant", "try again",
    "that's not", "don't", "stop", "instead", "actually"
  ]
}
```

## Scripts

### log-learning.sh
Logs a micro-learning entry to the memory file.

```bash
./scripts/log-learning.sh --what "Used wrong API endpoint" \
  --should "Check .secrets/ for existing keys first" \
  --lesson "Always search local config before asking user" \
  --category tools --severity moderate
```

### review-learnings.sh
Reviews and summarizes micro-learnings for a time period.

```bash
# Review today's learnings
./scripts/review-learnings.sh

# Review last 7 days
./scripts/review-learnings.sh --days 7

# Find patterns (for nightly evolution)
./scripts/review-learnings.sh --patterns
```

## Installation

### Automatic
```bash
pepeclaw install realtime-learning
```

### Manual
1. Copy `skills/realtime-learning/` to your OpenClaw workspace
2. Create `memory/micro-learnings.md` if it doesn't exist
3. The agent will start logging on next session

## Configuration

```
MICRO_LEARNING_FILE=memory/micro-learnings.md    # Where to log
MICRO_LEARNING_MAX_ENTRIES=500                     # Max entries before rotation
MICRO_LEARNING_CONTEXT_WINDOW=20                   # Recent entries to load on session start
MICRO_LEARNING_AUTO_PROMOTE=true                   # Auto-promote critical lessons to permanent memory
```

## Integration Points

- **Writes**: `memory/micro-learnings.md`
- **Read by**: nightly-evolution (pattern detection), meta-learning (gap analysis)
- **Triggers**: self-scoring (correction = score 1)
- **Feeds**: skill-autocreator (repeated tool failures → new skill candidates)

## Privacy

- All data stays local
- No external calls
- User can review/delete any entry
