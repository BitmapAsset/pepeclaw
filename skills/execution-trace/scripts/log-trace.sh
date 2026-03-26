#!/usr/bin/env bash
# log-trace.sh — Log an execution trace entry to daily JSONL file
# Usage: ./scripts/log-trace.sh --tool Bash --intent "..." --input "..." --output "..." --reaction accepted --score 3

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
TRACE_DIR="${WORKSPACE_ROOT}/${TRACE_DIR:-data/execution-traces}"
TODAY=$(date -u '+%Y-%m-%d')
TRACE_FILE="${TRACE_DIR}/${TODAY}.jsonl"

# Parse arguments
TOOL="" INTENT="" INPUT="" OUTPUT="" REACTION="accepted" SCORE=3 TAGS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tool)     TOOL="$2"; shift 2 ;;
    --intent)   INTENT="$2"; shift 2 ;;
    --input)    INPUT="$2"; shift 2 ;;
    --output)   OUTPUT="$2"; shift 2 ;;
    --reaction) REACTION="$2"; shift 2 ;;
    --score)    SCORE="$2"; shift 2 ;;
    --tags)     TAGS="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$TOOL" ]]; then
  echo "Usage: $0 --tool NAME --intent '...' --input '...' --output '...' [--reaction X] [--score N] [--tags 'a,b,c']"
  exit 1
fi

mkdir -p "$TRACE_DIR"

# Truncate input/output to 200 chars
INPUT="${INPUT:0:200}"
OUTPUT="${OUTPUT:0:200}"

# Escape quotes for JSON
json_escape() { echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' '; }

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
SESSION_ID="${OPENCLAW_SESSION_ID:-$(echo $$ | md5sum 2>/dev/null | cut -c1-8 || echo $$)}"

# Build tags array
TAGS_JSON="[]"
if [[ -n "$TAGS" ]]; then
  TAGS_JSON="[$(echo "$TAGS" | sed 's/,/","/g; s/^/"/; s/$/"/' )]"
fi

# Write JSONL entry
cat >> "$TRACE_FILE" << EOF
{"timestamp":"${TIMESTAMP}","session_id":"${SESSION_ID}","tool":"$(json_escape "$TOOL")","intent":"$(json_escape "$INTENT")","input_summary":"$(json_escape "$INPUT")","output_summary":"$(json_escape "$OUTPUT")","user_reaction":"${REACTION}","success_score":${SCORE},"tags":${TAGS_JSON}}
EOF

echo "Trace logged: ${TOOL} (score: ${SCORE}) → ${TRACE_FILE}"
