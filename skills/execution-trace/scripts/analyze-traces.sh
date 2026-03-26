#!/usr/bin/env bash
# analyze-traces.sh — Analyze execution traces for patterns, failures, and optimization opportunities
# Usage: ./scripts/analyze-traces.sh [--days N] [--failures] [--sequences] [--report]

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
TRACE_DIR="${WORKSPACE_ROOT}/${TRACE_DIR:-data/execution-traces}"

DAYS=1 SHOW_FAILURES=false SHOW_SEQUENCES=false FULL_REPORT=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --days)      DAYS="$2"; shift 2 ;;
    --failures)  SHOW_FAILURES=true; shift ;;
    --sequences) SHOW_SEQUENCES=true; shift ;;
    --report)    FULL_REPORT=true; SHOW_FAILURES=true; SHOW_SEQUENCES=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -d "$TRACE_DIR" ]]; then
  echo "No trace directory found at: $TRACE_DIR"
  exit 0
fi

echo "=== Execution Trace Analysis ==="
echo "Period: last ${DAYS} day(s)"
echo ""

# Collect trace files for the period
TRACE_FILES=()
for i in $(seq 0 $((DAYS - 1))); do
  DATE=$(date -v-${i}d '+%Y-%m-%d' 2>/dev/null || date -d "${i} days ago" '+%Y-%m-%d' 2>/dev/null || continue)
  FILE="${TRACE_DIR}/${DATE}.jsonl"
  if [[ -f "$FILE" ]]; then
    TRACE_FILES+=("$FILE")
  fi
done

if [[ ${#TRACE_FILES[@]} -eq 0 ]]; then
  echo "No trace files found for the last ${DAYS} day(s)."
  exit 0
fi

# Combine all traces
ALL_TRACES=$(cat "${TRACE_FILES[@]}")
TOTAL_TRACES=$(echo "$ALL_TRACES" | wc -l | tr -d ' ')
echo "Total traces: ${TOTAL_TRACES}"

# Tool usage counts
echo ""
echo "Tool Usage:"
echo "$ALL_TRACES" | grep -o '"tool":"[^"]*"' | sed 's/"tool":"//;s/"//' | sort | uniq -c | sort -rn | while read count tool; do
  echo "  ${tool}: ${count}"
done

# Average scores by tool
echo ""
echo "Average Scores by Tool:"
echo "$ALL_TRACES" | grep -o '"tool":"[^"]*".*"success_score":[0-9]' | \
  sed 's/"tool":"//; s/".*"success_score":/,/' | \
  awk -F, '{tools[$1]+=$2; counts[$1]++} END {for(t in tools) printf "  %s: %.1f (n=%d)\n", t, tools[t]/counts[t], counts[t]}' | sort -t: -k2 -rn

# Failure analysis
if [[ "$SHOW_FAILURES" == "true" ]]; then
  echo ""
  echo "=== Failure Patterns (score <= 1) ==="
  FAILURES=$(echo "$ALL_TRACES" | grep '"success_score":1' || echo "")
  if [[ -n "$FAILURES" ]]; then
    FAIL_COUNT=$(echo "$FAILURES" | wc -l | tr -d ' ')
    echo "Total failures: ${FAIL_COUNT}"
    echo ""
    echo "Failed tools:"
    echo "$FAILURES" | grep -o '"tool":"[^"]*"' | sed 's/"tool":"//;s/"//' | sort | uniq -c | sort -rn | while read count tool; do
      echo "  ${tool}: ${count} failures"
    done
    echo ""
    echo "Failure intents:"
    echo "$FAILURES" | grep -o '"intent":"[^"]*"' | sed 's/"intent":"//;s/"//' | head -10 | while read intent; do
      echo "  - ${intent}"
    done
  else
    echo "No failures found!"
  fi
fi

# Sequence analysis
if [[ "$SHOW_SEQUENCES" == "true" ]]; then
  echo ""
  echo "=== Tool Sequences ==="
  echo "Most common tool transitions:"
  echo "$ALL_TRACES" | grep -o '"tool":"[^"]*"' | sed 's/"tool":"//;s/"//' | \
    awk 'NR>1{print prev" → "$0} {prev=$0}' | sort | uniq -c | sort -rn | head -10 | while read count seq; do
    echo "  [${count}x] ${seq}"
  done
fi

# Reaction distribution
if [[ "$FULL_REPORT" == "true" ]]; then
  echo ""
  echo "=== User Reactions ==="
  echo "$ALL_TRACES" | grep -o '"user_reaction":"[^"]*"' | sed 's/"user_reaction":"//;s/"//' | sort | uniq -c | sort -rn | while read count reaction; do
    echo "  ${reaction}: ${count}"
  done

  echo ""
  echo "=== Score Distribution ==="
  echo "$ALL_TRACES" | grep -o '"success_score":[0-9]' | sed 's/"success_score"://' | sort | uniq -c | sort -k2 | while read count score; do
    BAR=$(printf '%*s' "$count" '' | tr ' ' '█')
    echo "  Score ${score}: ${BAR} (${count})"
  done

  FAIL_RATE=$(echo "$ALL_TRACES" | grep -c '"success_score":1' || echo 0)
  echo ""
  echo "Overall failure rate: $(echo "scale=1; ${FAIL_RATE} * 100 / ${TOTAL_TRACES}" | bc 2>/dev/null || echo "N/A")%"
fi

echo ""
echo "Analysis complete."
