# Meta-Learning Loop

## Description
Self-improvement engine that analyzes conversations, extracts implicit feedback, detects capability gaps, and proposes targeted self-modifications. The loop itself is improvable (recursive meta-learning).

## Trigger
- Nightly cron (conversation replay analysis)
- On-demand: "analyze my recent conversations", "what should I improve?", "run meta-learning"
- Weekly: self-modification proposal review
- Monthly: meta-metrics report

## Behavior

### 1. Conversation Replay Analysis (Nightly)
Scan the day's conversation logs and classify each exchange:
- **Successes**: fast, accurate, user accepted output without edits
- **Failures**: misunderstandings, wrong approaches, user had to re-explain
- **Corrections**: user edited or corrected output (implicit negative feedback)
- **Praise**: explicit positive signals ("great", "perfect", "exactly what I needed")
- **Abandonment**: user dropped a thread without resolution

Extract structured events into `~/.openclaw/workspace/data/meta-learning/daily/{DATE}.json`.

### 2. Self-Modification Proposals
Based on accumulated analysis:
- Identify recurring failure patterns (same mistake type > 2x in 7 days)
- Draft specific changes: skill prompt edits, new behavior rules, memory structure adjustments
- Score proposals by expected impact (frequency of issue × severity)
- Write proposals to `~/.openclaw/workspace/data/meta-learning/proposals/PROPOSAL-{ID}.md`
- Proposals require user approval before application

### 3. Capability Gap Detection
- Track tasks where Pepe failed or was unusually slow
- Categorize gaps: missing skill, missing knowledge, missing tool, wrong approach
- Research solutions: can a new MCP tool help? A new skill? A behavior change?
- Prioritize gaps by frequency and user impact
- Output to `~/.openclaw/workspace/data/meta-learning/gaps/GAP-{ID}.md`

### 4. A/B Behavior Testing
- For task types with > 5 occurrences, identify variant approaches
- Track which approach variant gets better user response
- Maintain variant registry in `~/.openclaw/workspace/data/meta-learning/ab-tests.json`
- Auto-converge on winning variants after statistical significance (n > 10, p < 0.05)

### 5. Meta-Metrics Dashboard
Track over time:
- `response_quality`: ratio of accepted vs corrected outputs
- `task_completion_rate`: tasks completed vs abandoned
- `proactive_value`: user-acknowledged proactive suggestions / total proactive suggestions
- `correction_trend`: is correction rate decreasing over time? (the key metric)
- `gap_closure_rate`: identified gaps resolved / total identified gaps

Write dashboard to `~/.openclaw/workspace/data/meta-learning/META_DASHBOARD.md` (weekly).

### 6. Recursive Self-Improvement
The meta-learning loop tracks its own effectiveness:
- Did a self-modification proposal actually improve the target metric?
- If not, revert the proposal and analyze why
- Track meta-loop metrics: proposal acceptance rate, improvement hit rate, false positive rate
- Propose modifications to the meta-learning process itself when hit rate drops below 50%

## Scripts
- `scripts/conversation-analyzer.sh` — Replays and analyzes daily conversations
- `scripts/self-modifier.sh` — Generates self-modification proposals
- `scripts/gap-detector.sh` — Identifies and prioritizes capability gaps

## References
- `references/meta-metrics-schema.json` — Schema for all tracked metrics

## Data Directories
```
~/.openclaw/workspace/data/meta-learning/
  daily/              # Daily conversation analysis JSON
  proposals/          # Self-modification proposals
  gaps/               # Capability gap reports
  metrics/            # Raw metric data (append-only JSON lines)
  ab-tests.json       # A/B test registry
  META_DASHBOARD.md   # Weekly dashboard
```

## Cron Schedule
```
# Nightly conversation analysis (2 AM)
0 2 * * * openclaw run skill meta-learning --action analyze

# Weekly self-modification proposals (Sunday 3 AM)
0 3 * * 0 openclaw run skill meta-learning --action propose

# Weekly dashboard generation (Sunday 4 AM)
0 4 * * 0 openclaw run skill meta-learning --action dashboard

# Monthly recursive self-eval (1st of month, 5 AM)
0 5 1 * * openclaw run skill meta-learning --action recursive-eval
```

## Integration Points
- Reads: conversation logs, skill fitness data (from skill-genome), user corrections
- Writes: daily analysis, proposals, gap reports, dashboard, metrics
- Triggers: skill-genome mutation cycle (when gap → new skill needed)
- Consumed by: dream-mode (gap reports feed creative exploration)
