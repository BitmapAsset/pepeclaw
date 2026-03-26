---
name: self-scoring
description: "Mid-conversation self-scoring — after each response, silently scores performance (1-4) based on user reaction. Logs to daily JSONL files. Score of 1 triggers immediate micro-learning. Nightly evolution uses scores to find weak areas and track improvement over time."
metadata:
  openclaw:
    emoji: "📈"
    triggers:
      - "show my scores"
      - "how am I doing"
      - "self-score report"
      - "performance dashboard"
      - "score trends"
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
    - scoring
    - performance
    - self-assessment
    - feedback
  dependencies:
    - realtime-learning
---

# Mid-Conversation Self-Scoring

Silent, continuous self-assessment. The agent knows when it's doing well — and when it's not.

## How It Works

After each response, the agent silently evaluates:

1. **Did the user correct me?** → Score: 1
2. **Did the user seem satisfied?** → Score: 3-4
3. **Did I have to redo work?** → Score: 1-2
4. **Was the response praised?** → Score: 4

Scores are logged to `data/self-scores/YYYY-MM-DD.jsonl` for analysis.

## Scoring Scale

| Score | Meaning | Signals | Action |
|-------|---------|---------|--------|
| 1 | **Failed/Corrected** | User corrected, rejected, said "wrong", redid work | Immediately write micro-learning |
| 2 | **Acceptable** | User accepted but adjusted, or asked follow-up to clarify | Log for pattern review |
| 3 | **Good** | User continued without issue, accepted output as-is | No action needed |
| 4 | **Excellent/Praised** | User said "great", "perfect", "exactly right", expressed satisfaction | Log positive pattern for replication |

## Score Entry Format

Each line in `data/self-scores/YYYY-MM-DD.jsonl`:

```json
{
  "timestamp": "2026-03-26T14:32:00Z",
  "session_id": "abc123",
  "response_index": 5,
  "score": 3,
  "task_type": "code_edit",
  "signals": ["user_continued", "no_correction"],
  "context": {
    "task": "Refactor auth middleware",
    "tools_used": ["Read", "Edit"],
    "response_length": 45
  },
  "micro_learning_logged": false
}
```

## Agent Behavior Instructions

### After Every Response (Silent)
```
1. Wait for user's next message
2. Analyze the user's reaction to your previous response:

   Score 1 triggers:
   - User explicitly corrects you ("no", "wrong", "not that")
   - User asks you to redo the same task differently
   - User expresses frustration
   - Tool call failed and user had to intervene

   Score 2 triggers:
   - User accepts but modifies your output
   - User asks clarifying questions about your approach
   - User proceeds but with caveats ("ok but next time...")

   Score 3 triggers:
   - User continues to next task without comment
   - User uses your output without modification
   - User acknowledges with neutral response ("ok", "done", "next")

   Score 4 triggers:
   - User explicitly praises ("great", "perfect", "exactly")
   - User expresses surprise at quality ("wow", "nice")
   - User shares your output with others

3. Append score entry to data/self-scores/YYYY-MM-DD.jsonl
4. If score == 1: IMMEDIATELY trigger realtime-learning to log a micro-learning
5. If score == 4: Log the positive pattern for replication
```

### Do NOT
- Tell the user you're scoring yourself
- Let scoring slow down your responses
- Score trivial interactions (greetings, acknowledgments)
- Inflate scores — be honest with yourself

## Dashboard

When the user asks "how am I doing" or "show scores":

```markdown
## Self-Score Dashboard — Last 7 Days

### Overall
- Average score: 3.1 / 4.0
- Total interactions scored: 87
- Trend: ↑ improving (+0.2 from last week)

### By Category
| Category | Avg Score | Count | Trend |
|----------|-----------|-------|-------|
| Code editing | 3.4 | 32 | ↑ |
| Debugging | 2.8 | 18 | → |
| Explanation | 3.6 | 15 | ↑ |
| File ops | 3.2 | 12 | ↓ |
| Research | 2.5 | 10 | ↑ |

### Weak Areas (avg < 2.5)
1. **Complex debugging** — Avg 2.3, 5 corrections in 7 days
2. **API integration** — Avg 2.4, often missing auth setup

### Strong Areas (avg > 3.5)
1. **Code explanations** — Avg 3.8, frequently praised
2. **Git operations** — Avg 3.6, zero corrections

### Recent Score-1 Events
- [Mar 25 14:30] Wrong database migration order
- [Mar 24 09:15] Missed existing API key in .secrets/
```

## Installation

### Automatic
```bash
pepeclaw install self-scoring
```

### Manual
1. Copy `skills/self-scoring/` to your OpenClaw workspace
2. Create `data/self-scores/` directory
3. Ensure `realtime-learning` skill is installed (for score-1 micro-learnings)
4. Agent starts scoring on next session

## Configuration

```
SCORE_DIR=data/self-scores                    # Where to store scores
SCORE_MIN_INTERACTION_LENGTH=2                # Min response exchanges before scoring
SCORE_RETENTION_DAYS=180                      # Keep scores for this long
SCORE_MICRO_LEARNING_ON_1=true               # Auto-trigger micro-learning on score 1
SCORE_POSITIVE_PATTERN_ON_4=true             # Log positive patterns on score 4
```

## Cron Setup

Nightly score aggregation (runs after trace analysis):

```json
{
  "name": "score-aggregator",
  "schedule": { "kind": "cron", "expr": "45 0 * * *", "tz": "local" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Aggregate self-scores from data/self-scores/ for the last 24h. Calculate averages by category, identify trends, flag weak areas (avg < 2.5). Write summary to data/self-scores/weekly-summary.md. Feed weak areas to nightly evolution for improvement.",
    "timeoutSeconds": 300
  }
}
```

## Integration Points

- **Writes**: `data/self-scores/YYYY-MM-DD.jsonl`
- **Triggers**: realtime-learning (on score 1)
- **Read by**: nightly-evolution (weak area detection), meta-learning (trend analysis)
- **Depends on**: realtime-learning (for micro-learning on failures)

## Privacy

- Scores are local only
- No user messages are stored in scores — only metadata
- All data stays on your machine
