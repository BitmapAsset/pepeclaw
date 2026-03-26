---
name: user-modeling
description: "User modeling system — builds a profile of the user across sessions including communication style, preferred tools, common tasks, schedule, annoyances, and preferences. Like Honcho but simpler. Agent reads the model on session start to personalize behavior automatically."
metadata:
  openclaw:
    emoji: "👤"
    triggers:
      - "show user model"
      - "what do you know about me"
      - "update my profile"
      - "my preferences"
      - "how do I work"
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
    - personalization
    - user-profile
    - preferences
    - context
  dependencies:
    - execution-trace
    - self-scoring
---

# User Modeling

Like Honcho, but simpler. Your agent actually knows you.

## How It Works

1. **Observes** — Tracks communication patterns, tool preferences, and workflow habits
2. **Models** — Builds a structured profile in `data/user-model.json`
3. **Updates** — Nightly evolution refines the model from conversation analysis
4. **Personalizes** — Agent reads the model on session start to adapt behavior

## User Model Schema

Stored in `data/user-model.json`:

```json
{
  "version": 2,
  "last_updated": "2026-03-26T00:00:00Z",
  "communication": {
    "style": "terse",
    "detail_level": "low",
    "preferred_format": "bullet_points",
    "emoji_preference": "none",
    "explanation_depth": "minimal",
    "code_comment_preference": "sparse",
    "response_length_preference": "short"
  },
  "expertise": {
    "languages": ["typescript", "python", "go"],
    "frameworks": ["react", "next.js", "fastapi"],
    "domains": ["web-dev", "devops", "ml-ops"],
    "experience_level": "senior",
    "learning_areas": ["rust", "wasm"]
  },
  "workflow": {
    "preferred_tools": {
      "editor": "vscode",
      "terminal": "warp",
      "git_client": "cli",
      "package_manager": "pnpm"
    },
    "common_tasks": [
      {
        "task": "deploy-to-staging",
        "frequency": "daily",
        "preferred_method": "npm run deploy:staging"
      },
      {
        "task": "code-review",
        "frequency": "daily",
        "preferred_method": "gh pr review"
      }
    ],
    "automation_preferences": {
      "auto_commit": false,
      "auto_push": false,
      "auto_format": true,
      "auto_test": true
    }
  },
  "schedule": {
    "timezone": "America/Los_Angeles",
    "active_hours": { "start": "09:00", "end": "23:00" },
    "peak_focus": { "start": "10:00", "end": "14:00" },
    "meeting_heavy_days": ["tuesday", "thursday"]
  },
  "preferences": {
    "likes": [
      "concise responses",
      "code over explanation",
      "proactive error checking",
      "following existing patterns"
    ],
    "dislikes": [
      "unnecessary summaries",
      "asking obvious questions",
      "over-engineering",
      "adding comments to obvious code"
    ],
    "pet_peeves": [
      "repeating information already given",
      "suggesting changes to unrelated code",
      "emoji in code or docs"
    ]
  },
  "projects": {
    "active": [
      {
        "name": "pepeclaw",
        "path": "/path/to/pepeclaw",
        "role": "lead",
        "priority": "high"
      }
    ],
    "technologies": {
      "pepeclaw": ["react", "three.js", "typescript", "vite"]
    }
  },
  "interaction_stats": {
    "total_sessions": 42,
    "avg_session_length_min": 45,
    "most_common_first_request": "code_change",
    "correction_rate": 0.12,
    "praise_rate": 0.25,
    "avg_satisfaction_score": 3.2
  }
}
```

## How the Model Is Built

### Initial Profile (First Session)
```
1. Observe communication style from first few messages
2. Scan workspace for technology stack indicators
3. Check git config for timezone hints
4. Note response preferences from early interactions
5. Create initial user-model.json with low confidence scores
```

### Continuous Updates (Every Session)
```
After each session, update:
- Communication patterns (if style differs from model)
- New tools or workflows observed
- New projects detected
- Schedule patterns (when user is active)
- Satisfaction signals (corrections, praise)
```

### Nightly Evolution Updates
```
Daily refinement:
- Analyze self-scores for preference signals
- Review micro-learnings for pet peeves
- Update expertise areas from task types
- Recalculate interaction stats
- Adjust confidence scores for each field
```

## Agent Behavior Instructions

### On Session Start
```
1. Read data/user-model.json
2. Apply communication preferences:
   - If style=terse → keep responses short
   - If emoji_preference=none → no emojis
   - If detail_level=low → lead with action, skip preamble
3. Note active projects and their tech stacks
4. Check schedule: is this peak focus time? Meeting-heavy day?
5. Review pet peeves — actively avoid them
```

### During Session
```
1. Observe communication signals:
   - Short messages → user prefers brevity
   - "Just do it" → user wants less discussion, more action
   - Detailed specs → user wants precision
2. Note new preferences or corrections
3. Queue model updates for end of session
```

### On Session End
```
1. Calculate session stats
2. Update user-model.json with new observations
3. Increase confidence for confirmed preferences
4. Decrease confidence for contradicted assumptions
```

## Model Fields and How They're Detected

| Field | Detection Method | Confidence Source |
|-------|-----------------|-------------------|
| `style` | Message length, formality analysis | First 10 messages |
| `detail_level` | Does user ask for more/less detail? | Explicit feedback |
| `preferred_tools` | Execution traces, user references | Tool usage frequency |
| `timezone` | git config, active hours, explicit mention | High after 3 sessions |
| `likes` | Score-4 events, explicit praise | Accumulated over time |
| `dislikes` | Score-1 events, corrections | Accumulated over time |
| `pet_peeves` | Repeated corrections for same thing | 3+ occurrences |
| `expertise` | Task types, terminology used, correction types | Ongoing |

## Scripts

### update-model.sh
Manually trigger a model update.

```bash
# Update from recent sessions
./scripts/update-model.sh

# Update a specific field
./scripts/update-model.sh --field "communication.style" --value "verbose"

# Reset a field (re-detect)
./scripts/update-model.sh --reset "schedule"

# Show current model
./scripts/update-model.sh --show

# Export model (for migration)
./scripts/update-model.sh --export user-model-backup.json
```

## Installation

### Automatic
```bash
pepeclaw install user-modeling
```

### Manual
1. Copy `skills/user-modeling/` to your OpenClaw workspace
2. Create `data/user-model.json` with empty template:
   ```json
   { "version": 1, "last_updated": null, "communication": {}, "expertise": {}, "workflow": {}, "schedule": {}, "preferences": { "likes": [], "dislikes": [], "pet_peeves": [] }, "projects": {}, "interaction_stats": {} }
   ```
3. Model will populate automatically over sessions

## Configuration

```
USER_MODEL_FILE=data/user-model.json          # Where to store the model
USER_MODEL_MIN_CONFIDENCE=0.3                  # Min confidence to apply a preference
USER_MODEL_UPDATE_FREQUENCY=session            # session|daily|manual
USER_MODEL_FIELDS_REQUIRE_CONFIRMATION=[]     # Fields that need user confirmation before updating
```

## Integration Points

- **Reads**: execution-trace, self-scoring, micro-learnings, conversation patterns
- **Writes**: `data/user-model.json`
- **Read by**: All skills (on session start for personalization)
- **Updated by**: nightly-evolution (daily refinement)
- **Depends on**: execution-trace (tool preferences), self-scoring (satisfaction signals)

## Privacy

- User model is stored locally only
- No data sent externally
- User can view, edit, or delete any field
- Export/import supported for workspace migration
- Fields marked as "sensitive" are never logged in traces
