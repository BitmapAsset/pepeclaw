---
name: dialectic-user-model
description: >
  Deep user understanding system that models HOW the user thinks, not just WHAT they know.
  Tracks decision patterns, communication triggers, emotional states, learning style,
  trust boundaries, and temporal patterns. Our own Honcho — no external dependencies.
metadata:
  openclaw:
    triggers:
      - "user model"
      - "user profile"
      - "user preferences"
      - "how does user think"
      - "user patterns"
      - "dialectic model"
    schedule: "post-session"
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
    - user-modeling
    - dialectic
    - personalization
  dependencies: []
---

# Dialectic User Model

Goes beyond flat facts about the user. Models HOW the user thinks — their decision
patterns, emotional triggers, learning style, and trust boundaries. Our own deep user
understanding system, no Honcho dependency required.

## How It Works

### What We Track (6 Dimensions)

#### 1. Decision Patterns
How the user makes choices when presented with options.

```json
{
  "decision_patterns": [
    {
      "pattern": "Prefers pragmatic solutions over elegant ones when under deadline",
      "confidence": 0.85,
      "observed_count": 7,
      "last_seen": "2026-03-26"
    },
    {
      "pattern": "Chooses performance over readability for hot paths",
      "confidence": 0.72,
      "observed_count": 4,
      "last_seen": "2026-03-25"
    }
  ]
}
```

**Detection signals:**
- User picks option A over B when presented with alternatives
- User rejects agent suggestions in favor of their own approach
- User consistently prioritizes certain qualities (speed, safety, simplicity)

#### 2. Communication Triggers
What makes the user engaged, frustrated, or satisfied.

```json
{
  "communication_triggers": {
    "frustration": [
      "Agent asks permission before trying (prefers 'just do it')",
      "Verbose explanations when a short answer suffices",
      "Re-reading files the user already shared"
    ],
    "satisfaction": [
      "Agent anticipates next step without being asked",
      "Concise responses with code, not prose",
      "Proactive error handling"
    ],
    "engagement": [
      "Technical deep-dives on architecture decisions",
      "Novel approaches the user hadn't considered"
    ]
  }
}
```

**Detection signals:**
- User sends short, curt replies → frustration
- User sends follow-up questions → engagement
- User says "perfect" or "exactly" → satisfaction
- User interrupts agent mid-response → wrong approach

#### 3. Emotional States
How the user communicates differently based on their state.

```json
{
  "emotional_indicators": {
    "excited": "Uses exclamation marks, sends rapid messages, describes vision",
    "focused": "Short precise requests, no pleasantries, expects fast responses",
    "frustrated": "Repeats requests, uses ALL CAPS, says 'I already told you'",
    "exploring": "Asks 'what if' questions, open to suggestions, no time pressure",
    "tired": "Typos increase, shorter messages, accepts first working solution"
  }
}
```

#### 4. Learning Style
How the user prefers to receive information.

```json
{
  "learning_style": {
    "primary": "top-down",
    "description": "Wants high-level overview first, then details on demand",
    "code_preference": "Show working code before explaining theory",
    "analogy_effectiveness": "High — responds well to analogies from domains they know",
    "detail_tolerance": "Low for initial explanation, high for deep-dives they request"
  }
}
```

#### 5. Trust Boundaries
What the user trusts the agent to do autonomously vs. what needs approval.

```json
{
  "trust_boundaries": {
    "autonomous": [
      "File edits within the current task scope",
      "Running tests",
      "Reading any file in the project",
      "Installing dev dependencies"
    ],
    "ask_first": [
      "Deleting files or directories",
      "Git operations (commit, push, rebase)",
      "Modifying CI/CD configuration",
      "Changes outside the current task scope"
    ],
    "never": [
      "Force pushing to main",
      "Modifying production configs",
      "Sending messages on behalf of user"
    ]
  }
}
```

#### 6. Temporal Patterns
When and how the user works.

```json
{
  "temporal_patterns": {
    "peak_hours": "22:00-02:00",
    "low_hours": "08:00-12:00",
    "session_length_avg": "45min",
    "break_pattern": "Works in bursts, disappears for 20-30min between sessions",
    "day_preferences": {
      "weekdays": "Focused feature work, minimal exploration",
      "weekends": "Refactoring, experimentation, longer sessions"
    }
  }
}
```

### Profile Storage

The complete model is stored as structured JSON:

```
data/user-model/dialectic-profile.json
```

This file is updated **incrementally** after each conversation — never rewritten from
scratch. Each update adds or refines observations, never deletes existing ones unless
explicitly contradicted.

### Update Protocol

After each session:

1. **Observe** — Review the conversation for signals across all 6 dimensions
2. **Extract** — Identify new patterns or reinforcements of existing ones
3. **Compare** — Check against existing profile for consistency
4. **Update** — Merge new observations:
   - New pattern → add with confidence 0.5
   - Repeated pattern → increase confidence by 0.1 (cap at 0.99)
   - Contradicted pattern → decrease confidence by 0.2
   - Pattern below 0.2 confidence → flag for removal
5. **Log** — Record what changed in `data/user-model/updates/YYYY-MM-DD.jsonl`

### How the Agent Uses This Model

Before responding, the agent should consider:

- **Decision patterns** → Frame options in the order the user prefers
- **Communication triggers** → Avoid frustration triggers, aim for satisfaction triggers
- **Emotional state** → Detect current state and adapt tone/verbosity
- **Learning style** → Structure explanations the way the user absorbs best
- **Trust boundaries** → Act autonomously within bounds, ask outside them
- **Temporal patterns** → Adjust urgency and complexity based on time of day

## Commands

### Update the model after a session
```bash
./scripts/update-model.sh [session-log]
```

### Generate actionable insights
```bash
./scripts/generate-insights.sh
```

### View current profile
```bash
cat data/user-model/dialectic-profile.json | jq .
```

## Data Storage

| Directory | Contents |
|-----------|----------|
| `data/user-model/dialectic-profile.json` | The active user model |
| `data/user-model/updates/` | JSONL logs of each update |
| `data/user-model/insights/` | Generated insight reports |

## 3D Visualization

The Meta-Learning room displays the dialectic model as a radar chart with 6 axes:
- Decision confidence (avg confidence of decision patterns)
- Communication alignment (satisfaction triggers hit / frustration triggers avoided)
- Emotional read accuracy (correct state detections)
- Learning adaptation (explanation acceptance rate)
- Trust calibration (autonomous actions within bounds)
- Temporal sync (response timing matches user rhythm)

## Why Not Honcho?

| Honcho | Our Approach |
|--------|-------------|
| Hosted service, API dependency | Local JSON, zero network calls |
| Generic user modeling | 6 dimensions tuned for agent collaboration |
| Requires integration work | Works with any OpenClaw agent natively |
| Data leaves your machine | Everything stays in `~/.openclaw/data/` |
| Session-based | Accumulates across all sessions |
