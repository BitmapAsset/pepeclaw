# Predictive Intent Engine

## Genome
```yaml
version: 1.0.0
fitness: 0.5
mutations: 0
lineage: [original]
created: 2026-03-25
```

## Purpose
Anticipate what Gravity needs before he asks. Mine temporal patterns from conversation history, pre-compute predicted requests, detect anomalies, and reduce decision fatigue through intelligent auto-completion of routine actions.

## Trigger
- **Automatic**: Runs on every conversation start (context preloading)
- **Cron**: Pattern mining daily at 1 AM, pre-computation at 5:30 AM (before morning brief)
- **Real-time**: Anomaly detection runs as a post-conversation hook
- **Manual**: `predict intent` or `what do I usually do now?`

## Capabilities

### 1. Temporal Pattern Mining
Analyze conversation logs to discover recurring request patterns:
- **Daily patterns**: "Every morning at 9 AM, check portfolio"
- **Weekly patterns**: "Every Monday, review project health"
- **Situational patterns**: "After deploying, always check logs"
- **Sequential patterns**: "Research → summarize → draft email"

### 2. Pre-Computation Scheduler
Before predicted requests arrive, execute queries and cache results:
- Morning brief data assembled at 5:30 AM
- Portfolio snapshots taken before market-check patterns
- Project status compiled before standup patterns
- Results stored in `data/pre-computed/` as timestamped JSON

### 3. Anomaly Detection
Monitor logged metrics for statistical deviations:
- Traffic spikes (>2 sigma from rolling average)
- Unusual transaction amounts or frequencies
- Sudden changes in project health scores
- Unexpected patterns in user behavior
- Alert via Telegram with analysis and recommended actions

### 4. Decision Fatigue Reduction
Track decision patterns and auto-complete routine ones:
- Categorize decisions by type and outcome
- Identify decisions with >90% consistency in outcome
- Suggest auto-approval for qualifying patterns
- Present as "Based on your history: [recommendation]"

### 5. Conversation Continuation
On session start, predict current focus:
- Check time of day + day of week against patterns
- Review recent activity and open threads
- Preload relevant context into session
- Present: "Looks like you're probably here for [X]. Here's what I've prepped."

## Data Model
All data stored in workspace JSON files under `data/predictive-intent/`:
- `patterns.json` — Discovered temporal patterns (see references/pattern-schema.json)
- `request-log.json` — Append-only log of all requests
- `pre-computed/` — Cached results directory
- `anomalies.json` — Detected anomaly log
- `decisions.json` — Decision pattern tracking

## Scripts
- `scripts/pattern-miner.sh` — Mines patterns from conversation logs (daily cron)
- `scripts/pre-compute.sh` — Pre-computes results for predicted requests (5:30 AM cron)
- `scripts/anomaly-detector.sh` — Detects anomalies in logged metrics (post-conversation hook)

## Cron Schedule
```
0 1 * * * openclaw run skill predictive-intent/scripts/pattern-miner.sh
30 5 * * * openclaw run skill predictive-intent/scripts/pre-compute.sh
*/15 * * * * openclaw run skill predictive-intent/scripts/anomaly-detector.sh
```

## Integration Points
- **Morning Brief**: Pre-computed data feeds into the 6 AM morning brief
- **Conversation Hook**: On session start, load predictions for current context
- **Telegram**: Anomaly alerts sent immediately via bot API
- **Skill Genome**: Pattern accuracy feeds back into fitness score

## Privacy & Control
- All data local to workspace (never transmitted externally)
- User can inspect all patterns: `show my patterns`
- User can delete patterns: `forget pattern [id]`
- User can disable auto-decisions: `disable auto-decisions`
- Anomaly alerting can be silenced: `silence anomaly alerts for [duration]`

## Success Metrics
- **Prediction accuracy**: % of predicted requests that actually occur within window
- **Time saved**: Average seconds saved per pre-computed response
- **Anomaly detection rate**: True positive rate of anomaly alerts
- **Decision auto-completion rate**: % of routine decisions handled automatically
