#!/usr/bin/env bash
# assumption-surfacer.sh — Extracts and stress-tests hidden assumptions
# Part of Adversarial Red Team skill for Pepe 2.0
#
# Usage: ./assumption-surfacer.sh --plan "PLAN TEXT" [--stress-test] [--output DIR]
#        ./assumption-surfacer.sh --file PATH [--stress-test]

set -euo pipefail

# --- Configuration ---
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw/workspace}"
DATA_DIR="${DATA_DIR:-$OPENCLAW_HOME/data/red-team}"

# --- Argument Parsing ---
PLAN_TEXT=""
PLAN_FILE=""
STRESS_TEST=false
OUTPUT_DIR="$DATA_DIR/assumptions"

while [[ $# -gt 0 ]]; do
  case $1 in
    --plan) PLAN_TEXT="$2"; shift 2 ;;
    --file) PLAN_FILE="$2"; shift 2 ;;
    --stress-test) STRESS_TEST=true; shift ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    --help)
      echo "Usage: $0 --plan \"PLAN TEXT\" [--stress-test] [--output DIR]"
      echo "       $0 --file PATH [--stress-test]"
      echo ""
      echo "Extracts hidden assumptions from plans/decisions and optionally stress-tests them."
      echo ""
      echo "Options:"
      echo "  --plan TEXT      The plan or decision to analyze"
      echo "  --file PATH      File containing the plan"
      echo "  --stress-test    Test each assumption: what if it's wrong?"
      echo "  --output DIR     Output directory"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Get input
if [[ -n "$PLAN_FILE" ]]; then
  if [[ ! -f "$PLAN_FILE" ]]; then
    echo "Error: File not found: $PLAN_FILE" >&2
    exit 1
  fi
  PLAN_TEXT=$(cat "$PLAN_FILE")
elif [[ -z "$PLAN_TEXT" ]]; then
  if [[ ! -t 0 ]]; then
    PLAN_TEXT=$(cat)
  else
    echo "Error: --plan or --file required (or pipe via stdin)" >&2
    exit 1
  fi
fi

if [[ -z "$PLAN_TEXT" ]]; then
  echo "Error: No plan text provided" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# --- Pattern-Based Assumption Extraction (via Python, stdin) ---
extract_assumptions_basic() {
  python3 -c "
import re, json, sys

text = sys.stdin.read()
assumptions = []
seen = set()

patterns = [
    (r'(?:assuming|assume|assumes) (?:that )?(.+?)[\.\n]', 'explicit'),
    (r'(?:if|when|once) (.+?)(?:,|\bthen\b)', 'conditional'),
    (r'(?:should|will|would|can|could) (?:be able to |easily |quickly )?(.+?)[\.\n]', 'expectation'),
    (r'(?:expect|expecting|expected) (?:that )?(.+?)[\.\n]', 'expectation'),
    (r'(?:plan is to|strategy is to|approach is to) (.+?)[\.\n]', 'strategic'),
    (r'(?:by |before |within |in )((?:Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December|\d+ (?:days?|weeks?|months?|years?)))', 'timeline'),
    (r'(?:budget|cost|price|revenue|profit).{0,30}?(\\\$[\d,.]+[KMB]?|\d+[KMB]?\\\$)', 'financial'),
    (r'(?:market|users?|customers?|audience) (?:will|should|would|can) (.+?)[\.\n]', 'market'),
]

for pattern, category in patterns:
    for m in re.finditer(pattern, text, re.IGNORECASE):
        assumption = m.group(1).strip()
        if len(assumption) > 10 and assumption not in seen:
            seen.add(assumption)
            assumptions.append({
                'assumption': assumption[:200],
                'category': category,
                'source': 'pattern_match',
                'fragility': 'unknown'
            })

print(json.dumps({'total': len(assumptions), 'assumptions': assumptions[:20]}, indent=2))
" <<< "$PLAN_TEXT"
}

# --- AI-Powered Deep Extraction ---
extract_assumptions_deep() {
  if ! command -v openclaw &>/dev/null; then
    echo "openclaw CLI not available, using basic extraction" >&2
    extract_assumptions_basic
    return
  fi

  local prompt_file
  prompt_file=$(mktemp)
  cat > "$prompt_file" <<'AIEOF'
You are an assumption surfacer. Extract ALL hidden assumptions from this plan/decision.
For each assumption: state it clearly, categorize it, rate fragility (LOW/MEDIUM/HIGH/CRITICAL),
estimate confidence (0-100%), and describe what happens if wrong.
Output ONLY valid JSON with keys: total, assumptions (array), most_fragile, overall_assumption_risk.
AIEOF
  echo "" >> "$prompt_file"
  echo "PLAN TO ANALYZE:" >> "$prompt_file"
  echo "$PLAN_TEXT" >> "$prompt_file"

  local result
  if result=$(openclaw run --prompt "$(cat "$prompt_file")" 2>/dev/null) && [[ -n "$result" ]]; then
    rm -f "$prompt_file"
    echo "$result"
  else
    rm -f "$prompt_file"
    extract_assumptions_basic
  fi
}

# --- Stress Testing ---
stress_test_assumptions() {
  local assumptions_json="$1"

  if ! command -v openclaw &>/dev/null; then
    echo "Stress testing requires openclaw CLI" >&2
    echo "$assumptions_json"
    return
  fi

  local prompt_file
  prompt_file=$(mktemp)
  cat > "$prompt_file" <<'STRESSEOF'
You are stress-testing assumptions extracted from a plan.
For each assumption: worst case, probability, cascade impact, early warning signal, mitigation.
Focus on HIGH/CRITICAL fragility assumptions.
Output as JSON with keys: stress_tests (array), critical_path, recommendation.
STRESSEOF
  echo "" >> "$prompt_file"
  echo "ORIGINAL PLAN:" >> "$prompt_file"
  echo "$PLAN_TEXT" >> "$prompt_file"
  echo "" >> "$prompt_file"
  echo "EXTRACTED ASSUMPTIONS:" >> "$prompt_file"
  echo "$assumptions_json" >> "$prompt_file"

  local result
  if result=$(openclaw run --prompt "$(cat "$prompt_file")" 2>/dev/null) && [[ -n "$result" ]]; then
    rm -f "$prompt_file"
    echo "$result"
  else
    rm -f "$prompt_file"
    echo "$assumptions_json"
  fi
}

# --- Main ---
echo "=== Assumption Surfacer ==="
echo "Input length: ${#PLAN_TEXT} characters"
echo "Stress test: $STRESS_TEST"
echo ""

# Extract assumptions
echo "Extracting hidden assumptions..."
if command -v openclaw &>/dev/null; then
  ASSUMPTIONS=$(extract_assumptions_deep)
else
  ASSUMPTIONS=$(extract_assumptions_basic)
fi

ASSUMPTION_COUNT=$(echo "$ASSUMPTIONS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total', 0))" 2>/dev/null || echo "0")

echo "Found $ASSUMPTION_COUNT assumption(s)"
echo ""

# Display assumptions
echo "$ASSUMPTIONS" | python3 -c "
import sys, json
data = json.load(sys.stdin)

for i, a in enumerate(data.get('assumptions', []), 1):
    assumption = a.get('assumption', 'unknown')
    category = a.get('category', '?')
    fragility = a.get('fragility', '?')
    confidence = a.get('confidence', '?')
    if_wrong = a.get('if_wrong', '')

    frag_icon = {'LOW': '.', 'MEDIUM': '*', 'HIGH': '!', 'CRITICAL': '!!!', 'unknown': '?'}.get(fragility, '?')
    print(f'  {i}. [{frag_icon}] ({category}) {assumption}')
    if confidence != '?' and confidence != 'unknown':
        print(f'     Confidence: {confidence}% | Fragility: {fragility}')
    if if_wrong:
        print(f'     If wrong: {if_wrong}')
    print()

most_fragile = data.get('most_fragile')
if most_fragile:
    print(f'  MOST FRAGILE: {most_fragile}')
    print()

overall = data.get('overall_assumption_risk')
if overall:
    print(f'  OVERALL ASSUMPTION RISK: {overall}')
" 2>/dev/null || echo "$ASSUMPTIONS"

# Stress test if requested
if [[ "$STRESS_TEST" == "true" && "$ASSUMPTION_COUNT" -gt 0 ]]; then
  echo ""
  echo "--- Stress Testing ---"
  STRESS_RESULTS=$(stress_test_assumptions "$ASSUMPTIONS")

  echo ""
  echo "$STRESS_RESULTS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tests = data.get('stress_tests', [])
    for t in tests:
        print(f\"  Assumption: {t.get('assumption', '?')}\")
        print(f\"    Worst case ({t.get('worst_case_probability', '?')}%): {t.get('worst_case', '?')}\")
        print(f\"    Early warning: {t.get('early_warning', '?')}\")
        print(f\"    Mitigation: {t.get('mitigation', '?')}\")
        cascade = t.get('cascade_impact', [])
        if cascade:
            print(f\"    Cascades to: {', '.join(cascade)}\")
        print()
    cp = data.get('critical_path')
    if cp:
        print(f'  CRITICAL PATH: {cp}')
    rec = data.get('recommendation')
    if rec:
        print(f'  RECOMMENDATION: {rec}')
except Exception:
    pass
" 2>/dev/null || echo "$STRESS_RESULTS"
fi

# Save report
REPORT_ID=$(date +%Y%m%d%H%M%S)-$(printf '%04x' $RANDOM)
REPORT_FILE="$OUTPUT_DIR/ASSUMPTIONS-${REPORT_ID}.json"

# Write report via Python using stdin (avoids quoting issues)
echo "$ASSUMPTIONS" | python3 -c "
import json, sys, os
from datetime import datetime, timezone

assumptions_raw = sys.stdin.read().strip()
try:
    assumptions = json.loads(assumptions_raw)
except Exception:
    assumptions = {'total': 0, 'assumptions': []}

report = {
    'id': '$REPORT_ID',
    'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'plan_excerpt': os.environ.get('PLAN_EXCERPT', '')[:500],
    'assumptions': assumptions,
    'stress_tested': $(if [[ "$STRESS_TEST" == "true" ]]; then echo "True"; else echo "False"; fi)
}

with open('$REPORT_FILE', 'w') as f:
    json.dump(report, f, indent=2)
" 2>/dev/null

if [[ -f "$REPORT_FILE" ]]; then
  echo ""
  echo "Report saved to: $REPORT_FILE"
else
  # Fallback: write raw assumptions
  echo "$ASSUMPTIONS" > "$REPORT_FILE"
  echo ""
  echo "Report saved to: $REPORT_FILE"
fi
