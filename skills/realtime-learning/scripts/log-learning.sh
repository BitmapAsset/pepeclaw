#!/usr/bin/env bash
# log-learning.sh — Log a micro-learning entry to memory/micro-learnings.md
# Usage: ./scripts/log-learning.sh --what "..." --should "..." --lesson "..." --category tools --severity moderate

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
LEARNING_FILE="${WORKSPACE_ROOT}/memory/micro-learnings.md"
MAX_ENTRIES="${MICRO_LEARNING_MAX_ENTRIES:-500}"

# Parse arguments
WHAT="" SHOULD="" LESSON="" CATEGORY="general" SEVERITY="moderate"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --what)     WHAT="$2"; shift 2 ;;
    --should)   SHOULD="$2"; shift 2 ;;
    --lesson)   LESSON="$2"; shift 2 ;;
    --category) CATEGORY="$2"; shift 2 ;;
    --severity) SEVERITY="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$WHAT" || -z "$SHOULD" || -z "$LESSON" ]]; then
  echo "Usage: $0 --what '...' --should '...' --lesson '...' [--category X] [--severity X]"
  exit 1
fi

# Ensure directory exists
mkdir -p "$(dirname "$LEARNING_FILE")"

# Create file with header if it doesn't exist
if [[ ! -f "$LEARNING_FILE" ]]; then
  cat > "$LEARNING_FILE" << 'HEADER'
# Micro-Learnings

Real-time lessons learned from mistakes and corrections.
Reviewed nightly by evolution for pattern detection.

---

HEADER
fi

# Generate timestamp
TIMESTAMP="$(date -u '+%Y-%m-%d %H:%M')"

# Append entry
cat >> "$LEARNING_FILE" << EOF

## [${TIMESTAMP}] ${CATEGORY}

- **What happened**: ${WHAT}
- **What should have been done**: ${SHOULD}
- **Lesson learned**: ${LESSON}
- **Category**: ${CATEGORY}
- **Severity**: ${SEVERITY}
EOF

# Rotate if too many entries (count ## headers)
ENTRY_COUNT=$(grep -c '^## \[' "$LEARNING_FILE" 2>/dev/null || echo 0)
if [[ "$ENTRY_COUNT" -gt "$MAX_ENTRIES" ]]; then
  # Keep header + last MAX_ENTRIES entries
  HEADER_END=$(grep -n '^---$' "$LEARNING_FILE" | head -1 | cut -d: -f1)
  ENTRIES_TO_REMOVE=$((ENTRY_COUNT - MAX_ENTRIES))

  echo "Rotating: removing oldest ${ENTRIES_TO_REMOVE} entries (keeping ${MAX_ENTRIES})"

  # Archive old entries
  ARCHIVE_FILE="${WORKSPACE_ROOT}/memory/micro-learnings-archive-$(date +%Y%m%d).md"
  head -n "$HEADER_END" "$LEARNING_FILE" > "$ARCHIVE_FILE"
  # Get line numbers of ## headers, find the cut point
  CUT_LINE=$(grep -n '^## \[' "$LEARNING_FILE" | sed -n "${ENTRIES_TO_REMOVE}p" | cut -d: -f1)
  if [[ -n "$CUT_LINE" ]]; then
    NEXT_ENTRY_LINE=$(grep -n '^## \[' "$LEARNING_FILE" | sed -n "$((ENTRIES_TO_REMOVE + 1))p" | cut -d: -f1)
    head -n "$((NEXT_ENTRY_LINE - 1))" "$LEARNING_FILE" | tail -n +"$((HEADER_END + 1))" >> "$ARCHIVE_FILE"

    # Rebuild main file
    TMPFILE=$(mktemp)
    head -n "$HEADER_END" "$LEARNING_FILE" > "$TMPFILE"
    tail -n +"$NEXT_ENTRY_LINE" "$LEARNING_FILE" >> "$TMPFILE"
    mv "$TMPFILE" "$LEARNING_FILE"
  fi
fi

echo "Micro-learning logged: [${TIMESTAMP}] ${CATEGORY} (${SEVERITY})"
