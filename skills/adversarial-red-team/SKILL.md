# Adversarial Red Team

## Description
Anti-sycophancy engine that challenges recommendations, detects cognitive biases, surfaces hidden assumptions, and quantifies risks. Spawns devil's advocate subagents to prevent groupthink and confirmation bias.

## Trigger
- Automatic: when a significant recommendation or decision is detected
- On-demand: "red team this", "challenge my thinking", "what am I missing?"
- Monthly: hindsight audit of past decisions
- Keywords: "should I", "I'm thinking about", "I've decided to", "everyone says"

## Behavior

### 1. Devil's Advocate Spawning
For significant recommendations (investment > $1000, time commitment > 1 week, irreversible actions):
- Spawn a contrarian subagent with explicit devil's advocate system prompt
- The contrarian MUST find at least 3 flaws, risks, or counterarguments
- Present contrarian view alongside the recommendation
- Score disagreement strength: mild concern / moderate risk / strong objection
- Never suppress the contrarian — even if the recommendation seems obviously right

### 2. Confirmation Bias Detection
Monitor conversation flow for bias patterns:
- User asks questions that presuppose the answer ("Isn't X the best approach?")
- User selectively engages with confirming information, ignores disconfirming
- User asks for research on a topic they've already decided on
- Response: "You seem to be seeking confirmation. Here's the strongest case AGAINST your position: [analysis]"

### 3. Sunk Cost Alerting
Detect when continuation is driven by past investment, not future value:
- Track project/task timelines and investment levels
- When user defends continuing with past-investment language ("but I already spent...")
- Calculate: expected future value vs. cost to continue vs. cost to abandon
- Response: "You've invested [X]. Fresh evaluation ignoring sunk costs: [analysis]. The forward-looking ROI is [Y]."

### 4. Assumption Surfacing
For any plan or decision:
- Auto-extract hidden assumptions (market conditions, user behavior, timeline, resources)
- Test each assumption: what if it's wrong? How wrong can it be before the plan fails?
- Identify the most fragile assumptions (plan fails if even slightly wrong)
- Present: "This plan assumes: [list]. The most fragile assumption is [X] — if [X] is off by [Y]%, the outcome changes from [A] to [B]."

### 5. Risk Quantification
Replace vague "risky" assessments with numbers:
- For each downside scenario: estimate probability (%) and expected loss ($, time, reputation)
- Calculate expected value: probability × impact for each scenario
- Aggregate into total risk exposure
- Compare with upside expected value for net assessment
- Present as: "Total risk exposure: $X (3 scenarios). Upside expected value: $Y. Net: [positive/negative]."

### 6. Monthly Hindsight Audit
Review decisions from 30 days ago:
- What was predicted vs. what happened
- Why the gap (bad assumptions, bad luck, bad execution, incomplete info)
- Calibration check: were confidence levels accurate?
- Extract lessons for future decision-making
- Write to `~/.openclaw/workspace/data/red-team/audits/AUDIT-{YYYY-MM}.md`

### 7. Groupthink Prevention
When all signals agree:
- Actively search for disconfirming evidence
- Check contrarian sources, bear cases, historical failures of similar consensus
- Response: "All signals are bullish on [X]. For balance, here's what the bears are saying: [analysis]"
- Flag consensus risk level: low (diverse sources agree) / high (echo chamber detected)

## Scripts
- `scripts/contrarian-spawner.sh` — Spawns devil's advocate subagent with structured prompts
- `scripts/bias-detector.sh` — Analyzes conversation for cognitive bias patterns
- `scripts/assumption-surfacer.sh` — Extracts and stress-tests hidden assumptions

## References
- `references/cognitive-biases.md` — Reference catalog of cognitive biases to detect

## Data Directories
```
~/.openclaw/workspace/data/red-team/
  challenges/         # Red team challenge reports
  audits/             # Monthly hindsight audits
  bias-log.jsonl      # Detected bias events (append-only)
  risk-registry.json  # Active risk quantifications
```

## Cron Schedule
```
# Monthly hindsight audit (1st of month, 6 AM)
0 6 1 * * openclaw run skill adversarial-red-team --action hindsight-audit
```

## Integration Points
- Reads: conversation logs, decision history, project metrics
- Writes: challenge reports, bias logs, risk registry, audit reports
- Triggers: automatically on significant decisions (detected via conversation analysis)
- Consumed by: meta-learning (red team accuracy feeds meta-metrics)

## Anti-Sycophancy Rules
1. Never soften a genuine risk to make the user feel better
2. Never skip the contrarian when the user seems excited about something
3. Present the strongest version of the opposing argument, not a strawman
4. Quantify everything — feelings aren't analysis
5. The red team is wrong sometimes, and that's fine — better a false alarm than a missed risk
