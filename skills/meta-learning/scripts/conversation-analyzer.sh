#!/usr/bin/env bash
# conversation-analyzer.sh — Replays and analyzes daily conversations
# Part of Meta-Learning Loop skill for Pepe 2.0
#
# Usage: ./conversation-analyzer.sh [--date YYYY-MM-DD] [--input DIR] [--output DIR]
# Defaults: today's date, standard OpenClaw log paths

set -euo pipefail

# --- Configuration ---
DATE="${DATE:-$(date +%Y-%m-%d)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
LOG_DIR="${LOG_DIR:-$OPENCLAW_WORKSPACE/logs}"
OUTPUT_DIR="${OUTPUT_DIR:-${SKILL_DIR}/data/daily}"
METRICS_DIR="${METRICS_DIR:-${SKILL_DIR}/data/metrics}"

# --- Argument Parsing ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --date) DATE="$2"; shift 2 ;;
    --input) LOG_DIR="$2"; shift 2 ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    --help)
      echo "Usage: $0 [--date YYYY-MM-DD] [--input DIR] [--output DIR]"
      echo ""
      echo "Analyzes conversation logs for a given date and produces structured analysis."
      echo ""
      echo "Options:"
      echo "  --date    Date to analyze (default: today)"
      echo "  --input   Directory containing conversation logs"
      echo "  --output  Directory for analysis output"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# --- Validate Date Format ---
if ! [[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Error: Invalid date format '$DATE'. Expected YYYY-MM-DD." >&2
  exit 1
fi

# --- Setup ---
mkdir -p "$OUTPUT_DIR" "$METRICS_DIR"

OUTPUT_FILE="$OUTPUT_DIR/${DATE}.json"

# --- Collect Conversation Logs ---
# Look for conversation logs matching the date
# OpenClaw stores logs as JSON files with timestamps
LOGS=()
if [[ -d "$LOG_DIR" ]]; then
  while IFS= read -r -d '' file; do
    LOGS+=("$file")
  done < <(find "$LOG_DIR" -name "*${DATE}*" -type f -print0 2>/dev/null || true)
fi

if [[ ${#LOGS[@]} -eq 0 ]]; then
  echo "No conversation logs found for $DATE in $LOG_DIR"
  # Write empty analysis
  cat > "$OUTPUT_FILE" <<EOF
{
  "date": "$DATE",
  "total_exchanges": 0,
  "successes": [],
  "failures": [],
  "corrections": [],
  "praise": [],
  "abandonments": [],
  "summary": "No conversations recorded.",
  "analyzed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  echo "Empty analysis written to $OUTPUT_FILE"
  exit 0
fi

echo "Found ${#LOGS[@]} log file(s) for $DATE"

# --- Analysis Functions ---

# Extract exchanges from log files and classify them
analyze_logs() {
  local log_file="$1"

  # Use openclaw subagent for intelligent analysis if available
  if command -v openclaw &>/dev/null; then
    openclaw run --prompt "$(cat <<PROMPT
Analyze this conversation log and extract structured feedback.

For each exchange, classify as one of:
- SUCCESS: User accepted output, no corrections needed
- FAILURE: Misunderstanding, wrong approach, user had to re-explain
- CORRECTION: User edited or corrected the output (implicit negative feedback)
- PRAISE: Explicit positive signal from user
- ABANDONMENT: Thread dropped without resolution

Return ONLY valid JSON in this exact format:
{
  "exchanges": [
    {
      "type": "SUCCESS|FAILURE|CORRECTION|PRAISE|ABANDONMENT",
      "topic": "brief description of the exchange topic",
      "detail": "what specifically happened",
      "implicit_feedback": "what this tells us about user preferences",
      "improvement_signal": "specific actionable improvement if applicable, null otherwise"
    }
  ],
  "patterns": [
    "recurring pattern observations"
  ],
  "quality_score": 0.0-1.0
}

Conversation log:
$(cat "$log_file")
PROMPT
)" 2>/dev/null || echo '{"exchanges":[],"patterns":[],"quality_score":null}'
  else
    # Fallback: basic text analysis without AI
    analyze_logs_basic "$log_file"
  fi
}

# Basic analysis without AI — pattern matching on conversation text
analyze_logs_basic() {
  local log_file="$1"
  local content
  content=$(cat "$log_file")

  local successes=0
  local failures=0
  local corrections=0
  local praise=0

  # Count correction signals
  corrections=$(echo "$content" | grep -ciE '(no,? (actually|instead|I meant)|not (that|what I)|wrong|incorrect|try again|that.s not)' || echo 0)

  # Count praise signals
  praise=$(echo "$content" | grep -ciE '(perfect|exactly|great|thanks|awesome|nice|good job|well done|love it)' || echo 0)

  # Count failure signals
  failures=$(echo "$content" | grep -ciE '(I don.t understand|what do you mean|that.s confusing|can you explain|not helpful|doesn.t work)' || echo 0)

  # Estimate total exchanges (rough: count user message indicators)
  local total
  total=$(echo "$content" | grep -cE '^(user|human|assistant):' || echo 1)

  # Successes = total - failures - corrections (floor at 0)
  successes=$((total - failures - corrections))
  if [[ $successes -lt 0 ]]; then successes=0; fi

  local quality_score
  if [[ $total -gt 0 ]]; then
    quality_score=$(echo "scale=2; ($successes + $praise) / ($total + $praise)" | bc 2>/dev/null || echo "0.5")
  else
    quality_score="0.5"
  fi

  cat <<EOF
{
  "exchanges": [],
  "patterns": ["basic analysis mode - AI unavailable"],
  "quality_score": $quality_score,
  "counts": {
    "total": $total,
    "successes": $successes,
    "failures": $failures,
    "corrections": $corrections,
    "praise": $praise
  }
}
EOF
}

# --- Main Analysis ---
echo "Analyzing conversations for $DATE..."

# Aggregate results from all log files
ALL_RESULTS=()
TOTAL_EXCHANGES=0
TOTAL_SUCCESSES=0
TOTAL_FAILURES=0
TOTAL_CORRECTIONS=0
TOTAL_PRAISE=0
TOTAL_ABANDONMENTS=0

for log_file in "${LOGS[@]}"; do
  echo "  Processing: $(basename "$log_file")"
  result=$(analyze_logs "$log_file")
  ALL_RESULTS+=("$result")

  # Extract counts if available
  if echo "$result" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    counts=$(echo "$result" | python3 -c "
import sys, json
data = json.load(sys.stdin)
exchanges = data.get('exchanges', [])
counts = data.get('counts', {})
if exchanges:
    types = [e['type'] for e in exchanges]
    print(json.dumps({
        'total': len(exchanges),
        'successes': types.count('SUCCESS'),
        'failures': types.count('FAILURE'),
        'corrections': types.count('CORRECTION'),
        'praise': types.count('PRAISE'),
        'abandonments': types.count('ABANDONMENT')
    }))
elif counts:
    counts.setdefault('abandonments', 0)
    print(json.dumps(counts))
else:
    print(json.dumps({'total':0,'successes':0,'failures':0,'corrections':0,'praise':0,'abandonments':0}))
" 2>/dev/null || echo '{"total":0,"successes":0,"failures":0,"corrections":0,"praise":0,"abandonments":0}')

    TOTAL_EXCHANGES=$((TOTAL_EXCHANGES + $(echo "$counts" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null || echo 0)))
    TOTAL_SUCCESSES=$((TOTAL_SUCCESSES + $(echo "$counts" | python3 -c "import sys,json; print(json.load(sys.stdin).get('successes',0))" 2>/dev/null || echo 0)))
    TOTAL_FAILURES=$((TOTAL_FAILURES + $(echo "$counts" | python3 -c "import sys,json; print(json.load(sys.stdin).get('failures',0))" 2>/dev/null || echo 0)))
    TOTAL_CORRECTIONS=$((TOTAL_CORRECTIONS + $(echo "$counts" | python3 -c "import sys,json; print(json.load(sys.stdin).get('corrections',0))" 2>/dev/null || echo 0)))
    TOTAL_PRAISE=$((TOTAL_PRAISE + $(echo "$counts" | python3 -c "import sys,json; print(json.load(sys.stdin).get('praise',0))" 2>/dev/null || echo 0)))
    TOTAL_ABANDONMENTS=$((TOTAL_ABANDONMENTS + $(echo "$counts" | python3 -c "import sys,json; print(json.load(sys.stdin).get('abandonments',0))" 2>/dev/null || echo 0)))
  fi
done

# --- Compute Quality Score ---
QUALITY_SCORE="0.0"
if [[ $TOTAL_EXCHANGES -gt 0 ]]; then
  QUALITY_SCORE=$(python3 -c "
total = $TOTAL_EXCHANGES
successes = $TOTAL_SUCCESSES
praise = $TOTAL_PRAISE
corrections = $TOTAL_CORRECTIONS
failures = $TOTAL_FAILURES
# Weighted score: successes and praise positive, corrections and failures negative
score = (successes * 1.0 + praise * 0.5) / max(total, 1)
# Penalty for corrections and failures
penalty = (corrections * 0.3 + failures * 0.5) / max(total, 1)
final = max(0.0, min(1.0, score - penalty))
print(f'{final:.3f}')
" 2>/dev/null || echo "0.5")
fi

# --- Write Daily Analysis ---
python3 -c "
import json, sys

results = []
for r in sys.stdin.read().strip().split('\n---SEPARATOR---\n'):
    if r.strip():
        try:
            results.append(json.loads(r))
        except:
            pass

# Collect all exchanges
all_exchanges = []
all_patterns = []
for r in results:
    all_exchanges.extend(r.get('exchanges', []))
    all_patterns.extend(r.get('patterns', []))

# Classify
successes = [e for e in all_exchanges if e.get('type') == 'SUCCESS']
failures = [e for e in all_exchanges if e.get('type') == 'FAILURE']
corrections = [e for e in all_exchanges if e.get('type') == 'CORRECTION']
praise = [e for e in all_exchanges if e.get('type') == 'PRAISE']
abandonments = [e for e in all_exchanges if e.get('type') == 'ABANDONMENT']

# Extract improvement signals
improvements = [e['improvement_signal'] for e in all_exchanges
                if e.get('improvement_signal') and e['improvement_signal'] != 'null']

output = {
    'date': '$DATE',
    'total_exchanges': $TOTAL_EXCHANGES,
    'counts': {
        'successes': $TOTAL_SUCCESSES,
        'failures': $TOTAL_FAILURES,
        'corrections': $TOTAL_CORRECTIONS,
        'praise': $TOTAL_PRAISE,
        'abandonments': $TOTAL_ABANDONMENTS
    },
    'quality_score': $QUALITY_SCORE,
    'successes': successes[:20],
    'failures': failures[:20],
    'corrections': corrections[:20],
    'praise': praise[:10],
    'abandonments': abandonments[:10],
    'patterns': list(set(all_patterns))[:10],
    'improvement_signals': improvements[:10],
    'analyzed_at': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'log_files_analyzed': ${#LOGS[@]}
}

print(json.dumps(output, indent=2))
" <<< "$(printf '%s\n---SEPARATOR---\n' "${ALL_RESULTS[@]}")" > "$OUTPUT_FILE"

echo ""
echo "=== Daily Analysis Summary ($DATE) ==="
echo "Total exchanges:  $TOTAL_EXCHANGES"
echo "Successes:        $TOTAL_SUCCESSES"
echo "Failures:         $TOTAL_FAILURES"
echo "Corrections:      $TOTAL_CORRECTIONS"
echo "Praise:           $TOTAL_PRAISE"
echo "Abandonments:     $TOTAL_ABANDONMENTS"
echo "Quality score:    $QUALITY_SCORE"
echo ""
echo "Analysis written to: $OUTPUT_FILE"

# --- Append to Metrics Log ---
METRICS_FILE="$METRICS_DIR/quality.jsonl"
echo "{\"date\":\"$DATE\",\"quality_score\":$QUALITY_SCORE,\"exchanges\":$TOTAL_EXCHANGES,\"successes\":$TOTAL_SUCCESSES,\"failures\":$TOTAL_FAILURES,\"corrections\":$TOTAL_CORRECTIONS,\"praise\":$TOTAL_PRAISE,\"abandonments\":$TOTAL_ABANDONMENTS}" >> "$METRICS_FILE"
echo "Metrics appended to: $METRICS_FILE"
