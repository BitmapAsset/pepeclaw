#!/usr/bin/env bash
# detect-patterns.sh — Scan execution traces for repeated workflow patterns
# Usage: ./scripts/detect-patterns.sh [--days N] [--min-occurrences N] [--min-confidence F]

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
TRACE_DIR="${WORKSPACE_ROOT}/${TRACE_DIR:-data/execution-traces}"
DRAFTS_DIR="${WORKSPACE_ROOT}/${SKILL_DRAFTS_DIR:-memory/skill-drafts}"

DAYS="${PATTERN_LOOKBACK_DAYS:-7}"
MIN_OCC="${PATTERN_MIN_OCCURRENCES:-3}"
MIN_CONF="${PATTERN_MIN_CONFIDENCE:-0.6}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --days)             DAYS="$2"; shift 2 ;;
    --min-occurrences)  MIN_OCC="$2"; shift 2 ;;
    --min-confidence)   MIN_CONF="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== Pattern Detection ==="
echo "Scanning last ${DAYS} days, min occurrences: ${MIN_OCC}"
echo ""

# Collect trace files
TRACE_FILES=""
for i in $(seq 0 $((DAYS - 1))); do
  DATE=$(date -v-${i}d '+%Y-%m-%d' 2>/dev/null || date -d "${i} days ago" '+%Y-%m-%d' 2>/dev/null || continue)
  FILE="${TRACE_DIR}/${DATE}.jsonl"
  if [[ -f "$FILE" ]]; then
    TRACE_FILES="${TRACE_FILES} ${FILE}"
  fi
done

if [[ -z "$TRACE_FILES" ]]; then
  echo "No trace files found for the last ${DAYS} days."
  exit 0
fi

ALL_TRACES=$(cat $TRACE_FILES)
TOTAL=$(echo "$ALL_TRACES" | wc -l | tr -d ' ')
echo "Total traces to analyze: ${TOTAL}"
echo ""

# Pattern 1: Repeated tool sequences (3-tool windows)
echo "--- Tool Sequence Patterns ---"
echo "$ALL_TRACES" | grep -o '"tool":"[^"]*"' | sed 's/"tool":"//;s/"//' | \
  awk 'NR>=3{print p2" → "p1" → "$0} {p2=p1; p1=$0}' | \
  sort | uniq -c | sort -rn | while read count seq; do
  if [[ "$count" -ge "$MIN_OCC" ]]; then
    echo "  [${count}x] ${seq}"
  fi
done

echo ""

# Pattern 2: Repeated intents
echo "--- Repeated Task Patterns ---"
echo "$ALL_TRACES" | grep -o '"intent":"[^"]*"' | sed 's/"intent":"//;s/"//' | \
  sort | uniq -c | sort -rn | head -15 | while read count intent; do
  if [[ "$count" -ge "$MIN_OCC" ]]; then
    echo "  [${count}x] ${intent}"
  fi
done

echo ""

# Pattern 3: Repeated tag combinations
echo "--- Tag Cluster Patterns ---"
echo "$ALL_TRACES" | grep -o '"tags":\[[^]]*\]' | sort | uniq -c | sort -rn | head -10 | while read count tags; do
  if [[ "$count" -ge "$MIN_OCC" ]]; then
    echo "  [${count}x] ${tags}"
  fi
done

echo ""

# Pattern 4: Error-recovery sequences (score 1 followed by same tool with higher score)
echo "--- Error-Recovery Patterns ---"
echo "$ALL_TRACES" | grep -o '"tool":"[^"]*".*"success_score":[0-9]' | \
  sed 's/"tool":"//; s/".*"success_score":/,/' | \
  awk -F, 'NR>1 && prev_score==1 && $1==prev_tool && $2>1 {print prev_tool": fail → retry → success"} {prev_tool=$1; prev_score=$2}' | \
  sort | uniq -c | sort -rn | while read count pattern; do
  if [[ "$count" -ge "$MIN_OCC" ]]; then
    echo "  [${count}x] ${pattern}"
  fi
done

echo ""
echo "Pattern detection complete. Use generate-draft.sh to create skill drafts from patterns."
