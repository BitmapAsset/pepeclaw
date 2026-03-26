#!/usr/bin/env bash
# contrarian-spawner.sh — Spawns a devil's advocate subagent
# Part of Adversarial Red Team skill for Pepe 2.0
#
# Usage: ./contrarian-spawner.sh --topic "TOPIC" [--context "CONTEXT"] [--severity low|medium|high]

set -euo pipefail

# --- Configuration ---
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw/workspace}"
DATA_DIR="${DATA_DIR:-$OPENCLAW_HOME/data/red-team}"
CHALLENGES_DIR="$DATA_DIR/challenges"
BIAS_LOG="$DATA_DIR/bias-log.jsonl"

# --- Argument Parsing ---
TOPIC=""
CONTEXT=""
SEVERITY="medium"
OUTPUT_FORMAT="markdown"

while [[ $# -gt 0 ]]; do
  case $1 in
    --topic) TOPIC="$2"; shift 2 ;;
    --context) CONTEXT="$2"; shift 2 ;;
    --severity) SEVERITY="$2"; shift 2 ;;
    --format) OUTPUT_FORMAT="$2"; shift 2 ;;
    --help)
      echo "Usage: $0 --topic \"TOPIC\" [--context \"CONTEXT\"] [--severity low|medium|high]"
      echo ""
      echo "Spawns a devil's advocate subagent to challenge a recommendation or decision."
      echo ""
      echo "Options:"
      echo "  --topic     The recommendation or decision to challenge (required)"
      echo "  --context   Additional context for the contrarian analysis"
      echo "  --severity  Expected severity level: low, medium, high (default: medium)"
      echo "  --format    Output format: markdown, json (default: markdown)"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$TOPIC" ]]; then
  echo "Error: --topic is required" >&2
  echo "Usage: $0 --topic \"TOPIC\" [--context \"CONTEXT\"]" >&2
  exit 1
fi

# Validate severity
case "$SEVERITY" in
  low|medium|high) ;;
  *) echo "Error: --severity must be low, medium, or high" >&2; exit 1 ;;
esac

mkdir -p "$CHALLENGES_DIR"

# --- Contrarian System Prompt ---
CONTRARIAN_PROMPT="You are the Adversarial Red Team — a devil's advocate whose ONLY job is to find flaws, risks, and counterarguments.

RULES:
1. You MUST find at least 3 genuine flaws, risks, or counterarguments
2. Present the STRONGEST version of opposing arguments — no strawmen
3. Quantify risks where possible: estimate probability (%) and impact ($ or time)
4. Calculate expected loss = probability × impact for each risk
5. Rate your overall disagreement: MILD CONCERN / MODERATE RISK / STRONG OBJECTION
6. Be specific and actionable — vague warnings are useless
7. Do NOT soften risks to be polite
8. If you genuinely cannot find 3 flaws, state that clearly — but try harder first

OUTPUT FORMAT:
## Red Team Challenge: [Topic]

### Disagreement Level: [MILD CONCERN / MODERATE RISK / STRONG OBJECTION]

### Flaws & Risks
1. **[Risk Name]** (Probability: X%, Impact: \$Y or Z hours)
   - Expected loss: \$W
   - Detail: [specific explanation]
   - Mitigation: [how to address this]

2. ...

3. ...

### Hidden Assumptions
- [Assumption 1]: If wrong, [consequence]
- [Assumption 2]: If wrong, [consequence]

### Strongest Counter-Argument
[The single best argument AGAINST this decision, presented as persuasively as possible]

### Risk Summary
- Total risk exposure: [sum of expected losses]
- Worst-case scenario: [description and cost]
- Reversibility: [easy/moderate/difficult/irreversible]

### Verdict
[One-paragraph honest assessment — should this proceed, proceed with changes, or be reconsidered?]"

# --- Spawn Contrarian ---
echo "=== Adversarial Red Team Challenge ==="
echo "Topic: $TOPIC"
echo "Severity: $SEVERITY"
echo ""

CHALLENGE_ID=$(date +%Y%m%d%H%M%S)-$(printf '%04x' $RANDOM)
CHALLENGE_FILE="$CHALLENGES_DIR/CHALLENGE-${CHALLENGE_ID}.md"

if command -v openclaw &>/dev/null; then
  # Spawn the contrarian subagent via openclaw
  RESULT=$(openclaw run --prompt "$(cat <<PROMPT
$CONTRARIAN_PROMPT

---

TOPIC TO CHALLENGE:
$TOPIC

ADDITIONAL CONTEXT:
${CONTEXT:-No additional context provided.}

SEVERITY LEVEL: $SEVERITY
(For $SEVERITY severity: $(case "$SEVERITY" in
  low) echo "Focus on minor risks and edge cases. Quick review." ;;
  medium) echo "Thorough analysis of risks, assumptions, and alternatives." ;;
  high) echo "Deep adversarial analysis. Challenge every assumption. Model failure scenarios. This decision has major consequences." ;;
esac))

Provide your red team analysis now.
PROMPT
)" 2>/dev/null || echo "Error: Contrarian subagent failed to execute")

  # Write challenge report
  cat > "$CHALLENGE_FILE" <<EOF
---
id: $CHALLENGE_ID
topic: $(echo "$TOPIC" | head -c 200)
severity: $SEVERITY
timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
---

$RESULT
EOF

else
  # Fallback: structured template when openclaw is unavailable
  cat > "$CHALLENGE_FILE" <<EOF
---
id: $CHALLENGE_ID
topic: $(echo "$TOPIC" | head -c 200)
severity: $SEVERITY
timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
---

## Red Team Challenge: $TOPIC

### Disagreement Level: PENDING ANALYSIS

### Analysis Required
The contrarian subagent could not be spawned (openclaw CLI unavailable).

Manual red team review needed for:

**Topic:** $TOPIC

**Context:** ${CONTEXT:-None provided}

**Checklist:**
- [ ] Identify at least 3 flaws or risks
- [ ] Quantify each risk (probability × impact)
- [ ] Surface hidden assumptions
- [ ] Present strongest counter-argument
- [ ] Assess reversibility
- [ ] Provide verdict

### Severity: $SEVERITY
$(case "$SEVERITY" in
  low) echo "Quick review — focus on edge cases and minor risks." ;;
  medium) echo "Thorough analysis — risks, assumptions, alternatives." ;;
  high) echo "Deep analysis required — this decision has major consequences." ;;
esac)
EOF
fi

echo "Challenge report written to: $CHALLENGE_FILE"
echo ""

if [[ -f "$CHALLENGE_FILE" ]]; then
  # Display the report
  cat "$CHALLENGE_FILE" | sed -n '/^---$/,/^---$/!p' | tail -n +1
fi

# Log the challenge
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"id\":\"$CHALLENGE_ID\",\"topic\":\"$(echo "$TOPIC" | tr '"' "'" | head -c 200)\",\"severity\":\"$SEVERITY\"}" >> "$DATA_DIR/challenges.jsonl" 2>/dev/null || true
