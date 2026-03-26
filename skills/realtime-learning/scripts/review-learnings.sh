#!/usr/bin/env bash
# review-learnings.sh — Review and analyze micro-learnings for patterns
# Usage: ./scripts/review-learnings.sh [--days N] [--patterns] [--category X]

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
LEARNING_FILE="${WORKSPACE_ROOT}/memory/micro-learnings.md"

DAYS=1 SHOW_PATTERNS=false CATEGORY_FILTER=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --days)     DAYS="$2"; shift 2 ;;
    --patterns) SHOW_PATTERNS=true; shift ;;
    --category) CATEGORY_FILTER="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$LEARNING_FILE" ]]; then
  echo "No micro-learnings file found at: $LEARNING_FILE"
  exit 0
fi

echo "=== Micro-Learning Review ==="
echo ""

# Count total entries
TOTAL=$(grep -c '^## \[' "$LEARNING_FILE" 2>/dev/null || echo 0)
echo "Total entries: ${TOTAL}"

# Count by category
echo ""
echo "By Category:"
grep '^\- \*\*Category\*\*:' "$LEARNING_FILE" | sed 's/.*: //' | sort | uniq -c | sort -rn | while read count cat; do
  echo "  ${cat}: ${count}"
done

# Count by severity
echo ""
echo "By Severity:"
grep '^\- \*\*Severity\*\*:' "$LEARNING_FILE" | sed 's/.*: //' | sort | uniq -c | sort -rn | while read count sev; do
  echo "  ${sev}: ${count}"
done

if [[ "$SHOW_PATTERNS" == "true" ]]; then
  echo ""
  echo "=== Pattern Detection ==="
  echo ""
  echo "Repeated Lessons (potential skill candidates):"

  # Find similar lessons by extracting key phrases
  grep '^\- \*\*Lesson learned\*\*:' "$LEARNING_FILE" | sed 's/.*: //' | sort | uniq -c | sort -rn | head -10 | while read count lesson; do
    if [[ "$count" -gt 1 ]]; then
      echo "  [${count}x] ${lesson}"
    fi
  done

  echo ""
  echo "Repeated Categories with Critical Severity:"
  grep -B3 'Severity\*\*: critical' "$LEARNING_FILE" | grep 'Category' | sed 's/.*: //' | sort | uniq -c | sort -rn | head -5 | while read count cat; do
    echo "  [${count}x critical] ${cat}"
  done
fi

echo ""
echo "=== Recent Entries (last ${DAYS} day(s)) ==="
CUTOFF_DATE=$(date -v-${DAYS}d '+%Y-%m-%d' 2>/dev/null || date -d "${DAYS} days ago" '+%Y-%m-%d' 2>/dev/null || echo "0000-00-00")

# Show recent entries (simplified — shows last N entries as proxy)
RECENT_COUNT=$((DAYS * 10))  # Estimate ~10 entries per day
tail -n +5 "$LEARNING_FILE" | tail -n "$((RECENT_COUNT * 6))" 2>/dev/null || tail -n +5 "$LEARNING_FILE"
