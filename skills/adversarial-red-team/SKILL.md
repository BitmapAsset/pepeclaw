---
name: adversarial-red-team
description: >
  Anti-sycophancy engine that challenges recommendations, detects cognitive biases,
  surfaces hidden assumptions, and quantifies risks. Spawns devil's advocate subagents
  to prevent groupthink and confirmation bias.
  Triggers on: "red team this", "challenge my thinking", "what am I missing",
  "should I", "devil's advocate".
metadata:
  openclaw:
    triggers:
      - "red team this"
      - "challenge my thinking"
      - "what am I missing"
      - "should I"
      - "devil's advocate"
      - "I've decided to"
      - "everyone says"
    schedule: "0 6 1 * *"
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: null
    created: 2026-03-25
    last_mutated: null
    generation: 1
  tags:
    - adversarial
    - bias-detection
    - risk-analysis
    - decision-quality
  dependencies: []
---

# Adversarial Red Team

Anti-sycophancy engine that challenges recommendations, detects cognitive biases,
surfaces hidden assumptions, and quantifies risks. Spawns devil's advocate subagents
to prevent groupthink and confirmation bias.

## How It Works

When a significant decision is detected (investment > $1000, time commitment > 1 week,
irreversible actions), the red team automatically spawns a contrarian subagent. The
contrarian MUST find at least 3 flaws, risks, or counterarguments. Monthly hindsight
audits review past decisions to calibrate accuracy.

## Capabilities

### 1. Devil's Advocate Spawning
For significant recommendations:
- Spawn a contrarian subagent with explicit devil's advocate system prompt
- The contrarian MUST find at least 3 flaws, risks, or counterarguments
- Present contrarian view alongside the recommendation
- Score disagreement strength: mild concern / moderate risk / strong objection
- Never suppress the contrarian — even if the recommendation seems obviously right

### 2. Confirmation Bias Detection
Monitor conversation flow for bias patterns:
- User asks questions that presuppose the answer
- User selectively engages with confirming information
- User asks for research on a topic they've already decided on
- Response: "You seem to be seeking confirmation. Here's the strongest case AGAINST your position."

### 3. Sunk Cost Alerting
Detect when continuation is driven by past investment, not future value:
- Track project/task timelines and investment levels
- Detect past-investment language ("but I already spent...")
- Calculate: expected future value vs. cost to continue vs. cost to abandon

### 4. Assumption Surfacing
For any plan or decision:
- Auto-extract hidden assumptions (market conditions, user behavior, timeline, resources)
- Test each assumption: what if it's wrong? How wrong before the plan fails?
- Identify the most fragile assumptions
- Rank by fragility and impact

### 5. Risk Quantification
Replace vague "risky" assessments with numbers:
- For each downside scenario: estimate probability (%) and expected loss
- Calculate expected value: probability × impact for each scenario
- Aggregate into total risk exposure
- Compare with upside expected value for net assessment

### 6. Monthly Hindsight Audit
Review decisions from 30 days ago:
- What was predicted vs. what happened
- Why the gap (bad assumptions, bad luck, bad execution, incomplete info)
- Calibration check: were confidence levels accurate?
- Extract lessons for future decision-making

### 7. Groupthink Prevention
When all signals agree:
- Actively search for disconfirming evidence
- Check contrarian sources, bear cases, historical failures of similar consensus
- Flag consensus risk level: low (diverse sources agree) / high (echo chamber detected)

## Commands

### Spawn a devil's advocate challenge
```bash
./scripts/contrarian-spawner.sh "Should we migrate to microservices?"
./scripts/contrarian-spawner.sh --severity strong "Invest $50k in new infrastructure"
```

### Scan for cognitive biases
```bash
# Quick pattern-matching scan
./scripts/bias-detector.sh scan "conversation text or file"

# Deep AI-powered analysis
./scripts/bias-detector.sh deep "conversation text or file"
```

### Surface hidden assumptions
```bash
# Extract assumptions from a plan
./scripts/assumption-surfacer.sh extract "We'll launch in Q2 with 3 engineers..."

# Extract and stress-test assumptions
./scripts/assumption-surfacer.sh stress-test "We'll launch in Q2 with 3 engineers..."
```

## Anti-Sycophancy Rules

1. Never soften a genuine risk to make the user feel better
2. Never skip the contrarian when the user seems excited about something
3. Present the strongest version of the opposing argument, not a strawman
4. Quantify everything — feelings aren't analysis
5. The red team is wrong sometimes, and that's fine — better a false alarm than a missed risk

## Data Storage

All data lives in `data/` as workspace files — no external database needed:

| File | Format | Purpose |
|------|--------|---------|
| `data/challenges/` | Directory | Red team challenge reports |
| `data/audits/` | Directory | Monthly hindsight audits |
| `data/bias-log.jsonl` | JSONL | Detected bias events (append-only) |
| `data/assumptions/` | Directory | Assumption analysis reports |

## Cron Setup

```
# Monthly hindsight audit (1st of month, 6 AM)
0 6 1 * * /path/to/skills/adversarial-red-team/scripts/contrarian-spawner.sh --audit
```

## Configuration

Environment variables:
- `OPENCLAW_WORKSPACE` — Workspace root (default: `$HOME/.openclaw/workspace`)
- `RED_TEAM_MIN_FLAWS` — Minimum flaws the contrarian must find (default: 3)
- `RED_TEAM_AUTO_TRIGGER` — Auto-trigger on significant decisions (default: true)

## Integration Points

- Reads: conversation logs, decision history, project metrics
- Writes: challenge reports, bias logs, assumption reports, audit reports
- Triggers: automatically on significant decisions
- Consumed by: meta-learning (red team accuracy feeds meta-metrics)

## Architecture

```
adversarial-red-team/
├── SKILL.md                          # This file
├── scripts/
│   ├── contrarian-spawner.sh         # Devil's advocate subagent
│   ├── bias-detector.sh              # Cognitive bias pattern detection
│   └── assumption-surfacer.sh        # Hidden assumption extraction
├── references/
│   └── cognitive-biases.md           # Reference catalog of cognitive biases
└── data/
    ├── challenges/                   # Challenge reports
    ├── audits/                       # Monthly audit reports
    ├── assumptions/                  # Assumption analysis reports
    └── bias-log.jsonl                # Bias detection log
```
