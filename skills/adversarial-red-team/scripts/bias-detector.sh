#!/usr/bin/env bash
# bias-detector.sh — Detects cognitive biases in conversations and decisions
# Part of Adversarial Red Team skill for Pepe 2.0
#
# Usage: ./bias-detector.sh --input "TEXT" [--mode scan|deep] [--output DIR]
#        ./bias-detector.sh --file PATH [--mode scan|deep]

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${DATA_DIR:-${SKILL_DIR}/data}"
BIAS_LOG="$DATA_DIR/bias-log.jsonl"
BIASES_REF="${SKILL_DIR}/references/cognitive-biases.md"

# --- Argument Parsing ---
INPUT_TEXT=""
INPUT_FILE=""
MODE="scan"
OUTPUT_DIR="$DATA_DIR"

while [[ $# -gt 0 ]]; do
  case $1 in
    --input) INPUT_TEXT="$2"; shift 2 ;;
    --file) INPUT_FILE="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    --help)
      echo "Usage: $0 --input \"TEXT\" [--mode scan|deep]"
      echo "       $0 --file PATH [--mode scan|deep]"
      echo ""
      echo "Analyzes text for cognitive bias patterns."
      echo ""
      echo "Modes:"
      echo "  scan   Quick pattern-matching scan (default)"
      echo "  deep   AI-powered deep analysis"
      echo ""
      echo "Options:"
      echo "  --input TEXT    Text to analyze"
      echo "  --file PATH    File containing text to analyze"
      echo "  --mode MODE    Analysis mode: scan or deep"
      echo "  --output DIR   Output directory for bias reports"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Get input text
if [[ -n "$INPUT_FILE" ]]; then
  if [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: File not found: $INPUT_FILE" >&2
    exit 1
  fi
  INPUT_TEXT=$(cat "$INPUT_FILE")
elif [[ -z "$INPUT_TEXT" ]]; then
  # Read from stdin if available
  if [[ ! -t 0 ]]; then
    INPUT_TEXT=$(cat)
  else
    echo "Error: --input or --file required (or pipe via stdin)" >&2
    exit 1
  fi
fi

if [[ -z "$INPUT_TEXT" ]]; then
  echo "Error: No input text provided" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# --- Scan Mode: Use Python for pattern matching (bash 3.2 compatible) ---
scan_biases() {
  local text="$1"
  python3 -c "
import re, json, sys
from datetime import datetime, timezone

text = sys.stdin.read()

# Bias patterns: name, regex, description
BIASES = [
    ('confirmation_bias',
     r'(?i)(isn.t it (true|obvious|clear)|don.t you (think|agree)|proves (that|my)|confirms (what|that)|I (knew|told you)|as I (expected|predicted|thought)|looking for (evidence|proof|data) (that|to support))',
     'Seeking or interpreting information to confirm pre-existing beliefs'),
    ('sunk_cost',
     r'(?i)(already (spent|invested|put in)|too (late|far|much invested)|can.t (stop|quit|give up) now|wasted if|come this far|throwing away|all that (work|effort|time|money))',
     'Continuing because of past investment rather than future expected value'),
    ('anchoring',
     r'(?i)(first (offer|price|estimate)|starting (point|from)|based on (the initial|that first)|compared to (the original|what they said))',
     'Over-relying on the first piece of information encountered'),
    ('availability',
     r'(?i)(just (saw|heard|read)|in the news|everyone.s (talking|saying)|trending|viral|that (story|article|tweet) about)',
     'Overweighting easily recalled or recent information'),
    ('overconfidence',
     r'(?i)(definitely|100%|guaranteed|no (way|chance|doubt)|absolutely (will|certain)|impossible (that|to fail)|can.t (fail|go wrong)|sure thing|slam dunk)',
     'Excessive confidence in predictions or assessments'),
    ('bandwagon',
     r'(?i)(everyone (is|says|thinks|does)|nobody (does|thinks)|the market (says|thinks)|consensus (is|says)|all the (experts|analysts)|most people)',
     'Following the crowd without independent analysis'),
    ('loss_aversion',
     r'(?i)(can.t (afford|risk) (losing|to lose)|protect (what we have|our)|downside|worst case|what if (it|we) (fail|lose)|too risky|play it safe|don.t want to lose)',
     'Overweighting potential losses relative to equivalent gains'),
    ('recency',
     r'(?i)(lately|these days|right now|currently|the (trend|momentum)|things are (going|moving)|based on (recent|last (week|month)))',
     'Overweighting recent events when predicting the future'),
    ('planning_fallacy',
     r'(?i)(should (only|just) take|how hard can it be|simple (enough|matter)|quick (fix|change|project)|easy to|straightforward|no big deal|piece of cake|by (tomorrow|next week|end of day))',
     'Underestimating time, cost, and complexity of future tasks'),
    ('survivorship',
     r'(?i)(look at (how|what) (they|X) did|successful (people|companies) (do|all)|the ones that (made it|succeeded)|follow (their|the) (example|model|playbook))',
     'Drawing conclusions from visible successes while ignoring invisible failures'),
    ('status_quo',
     r'(?i)(why (change|fix|bother)|always (done|been|worked)|if it ain.t broke|keep (things|it) (as is|the same)|too much (change|disruption)|comfortable with)',
     'Preference for the current state regardless of optimal alternatives'),
    ('dunning_kruger',
     r'(?i)(how hard can it be|I could (do|build) that|it.s (just|only|simply)|anyone could|trivial|basic (stuff|thing))',
     'Overestimating capability in unfamiliar domains'),
]

results = []
for name, pattern, description in BIASES:
    matches = re.findall(pattern, text)
    if matches:
        evidence_matches = re.findall(pattern, text)
        evidence = '; '.join(m[0] if isinstance(m, tuple) else m for m in evidence_matches[:3])
        results.append({
            'bias': name,
            'description': description,
            'matches': len(matches),
            'evidence': evidence[:200]
        })

output = {
    'mode': 'scan',
    'biases_detected': len(results),
    'results': results,
    'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
}

print(json.dumps(output, indent=2))
" <<< "$text"
}

# --- Deep Mode ---
deep_analysis() {
  local text="$1"

  if ! command -v openclaw &>/dev/null; then
    echo "Error: Deep mode requires openclaw CLI" >&2
    echo "Falling back to scan mode..." >&2
    scan_biases "$text"
    return
  fi

  # Load cognitive biases reference if available
  local biases_ref=""
  if [[ -f "$BIASES_REF" ]]; then
    biases_ref=$(cat "$BIASES_REF")
  fi

  local prompt_file
  prompt_file=$(mktemp)
  cat > "$prompt_file" <<'DEEPEOF'
You are a cognitive bias detector. Analyze the following text for cognitive biases.
For each detected bias, provide: bias name, category, confidence (low/medium/high), evidence, impact, debiasing suggestion.
Also check for: motivated reasoning, framing effects, base rate neglect, narrative fallacy.
Output as JSON with keys: mode ("deep"), biases_detected (int), results (array), overall_assessment (string), timestamp.
DEEPEOF
  echo "" >> "$prompt_file"
  echo "Reference:" >> "$prompt_file"
  echo "$biases_ref" >> "$prompt_file"
  echo "" >> "$prompt_file"
  echo "TEXT TO ANALYZE:" >> "$prompt_file"
  echo "$text" >> "$prompt_file"

  local result
  if result=$(openclaw run --prompt "$(cat "$prompt_file")" 2>/dev/null) && [[ -n "$result" ]]; then
    rm -f "$prompt_file"
    echo "$result"
  else
    rm -f "$prompt_file"
    scan_biases "$text"
  fi
}

# --- Main ---
echo "=== Cognitive Bias Detection ==="
echo "Mode: $MODE"
echo "Input length: ${#INPUT_TEXT} characters"
echo ""

case "$MODE" in
  scan)
    RESULT=$(scan_biases "$INPUT_TEXT")
    ;;
  deep)
    RESULT=$(deep_analysis "$INPUT_TEXT")
    ;;
  *)
    echo "Error: Unknown mode '$MODE'. Use 'scan' or 'deep'." >&2
    exit 1
    ;;
esac

# Display results
BIAS_COUNT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('biases_detected', 0))" 2>/dev/null || echo "0")

echo "Biases detected: $BIAS_COUNT"
echo ""

if [[ "$BIAS_COUNT" -gt 0 ]]; then
  echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('results', []):
    bias = r.get('bias', 'unknown')
    desc = r.get('description', r.get('impact', ''))
    evidence = r.get('evidence', '')
    confidence = r.get('confidence', '')
    debiasing = r.get('debiasing', '')
    matches = r.get('matches', '')

    print(f'  ** {bias.replace(\"_\", \" \").title()} **')
    if desc:
        print(f'    {desc}')
    if evidence:
        print(f'    Evidence: {evidence[:150]}')
    if confidence:
        print(f'    Confidence: {confidence}')
    if matches:
        print(f'    Matches: {matches}')
    if debiasing:
        print(f'    Debiasing: {debiasing}')
    print()

assessment = data.get('overall_assessment')
if assessment:
    print(f'Overall: {assessment}')
" 2>/dev/null || echo "$RESULT"
else
  echo "  No cognitive biases detected in this text."
  echo "  (This doesn't mean there are none — consider a deep analysis with --mode deep)"
fi

# Log detection
echo "$RESULT" >> "$BIAS_LOG" 2>/dev/null || true

echo ""
echo "Results logged to: $BIAS_LOG"
