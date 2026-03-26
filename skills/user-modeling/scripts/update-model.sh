#!/usr/bin/env bash
# update-model.sh — Update or view the user model
# Usage: ./scripts/update-model.sh [--show] [--field F --value V] [--reset F] [--export FILE]

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
MODEL_FILE="${WORKSPACE_ROOT}/${USER_MODEL_FILE:-data/user-model.json}"

ACTION="update" FIELD="" VALUE="" EXPORT_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --show)   ACTION="show"; shift ;;
    --field)  FIELD="$2"; shift 2 ;;
    --value)  VALUE="$2"; shift 2 ;;
    --reset)  ACTION="reset"; FIELD="$2"; shift 2 ;;
    --export) ACTION="export"; EXPORT_FILE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Ensure data directory exists
mkdir -p "$(dirname "$MODEL_FILE")"

# Create default model if doesn't exist
if [[ ! -f "$MODEL_FILE" ]]; then
  cat > "$MODEL_FILE" << 'EOF'
{
  "version": 1,
  "last_updated": null,
  "communication": {
    "style": "unknown",
    "detail_level": "unknown",
    "preferred_format": "unknown",
    "emoji_preference": "unknown"
  },
  "expertise": {
    "languages": [],
    "frameworks": [],
    "domains": [],
    "experience_level": "unknown"
  },
  "workflow": {
    "preferred_tools": {},
    "common_tasks": [],
    "automation_preferences": {}
  },
  "schedule": {
    "timezone": "unknown",
    "active_hours": {}
  },
  "preferences": {
    "likes": [],
    "dislikes": [],
    "pet_peeves": []
  },
  "projects": {
    "active": []
  },
  "interaction_stats": {
    "total_sessions": 0,
    "correction_rate": 0,
    "praise_rate": 0,
    "avg_satisfaction_score": 0
  }
}
EOF
  echo "Created default user model at: ${MODEL_FILE}"
fi

case "$ACTION" in
  show)
    if command -v jq &>/dev/null; then
      jq '.' "$MODEL_FILE"
    else
      cat "$MODEL_FILE"
    fi
    ;;

  update)
    if [[ -n "$FIELD" && -n "$VALUE" ]]; then
      if command -v jq &>/dev/null; then
        TMPFILE=$(mktemp)
        jq --arg f "$FIELD" --arg v "$VALUE" 'setpath($f | split("."); $v)' "$MODEL_FILE" > "$TMPFILE" && mv "$TMPFILE" "$MODEL_FILE"
        echo "Updated: ${FIELD} = ${VALUE}"
      else
        echo "jq is required for field updates. Install with: brew install jq"
        exit 1
      fi
    else
      # Update timestamp
      if command -v jq &>/dev/null; then
        TMPFILE=$(mktemp)
        jq --arg ts "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" '.last_updated = $ts' "$MODEL_FILE" > "$TMPFILE" && mv "$TMPFILE" "$MODEL_FILE"
        echo "User model timestamp updated."
      fi
    fi
    ;;

  reset)
    if [[ -n "$FIELD" ]]; then
      if command -v jq &>/dev/null; then
        TMPFILE=$(mktemp)
        jq --arg f "$FIELD" 'setpath($f | split("."); "unknown")' "$MODEL_FILE" > "$TMPFILE" && mv "$TMPFILE" "$MODEL_FILE"
        echo "Reset: ${FIELD} → will be re-detected"
      else
        echo "jq is required. Install with: brew install jq"
        exit 1
      fi
    fi
    ;;

  export)
    if [[ -n "$EXPORT_FILE" ]]; then
      cp "$MODEL_FILE" "$EXPORT_FILE"
      echo "Exported to: ${EXPORT_FILE}"
    fi
    ;;

  *)
    echo "Usage: $0 [--show] [--field F --value V] [--reset F] [--export FILE]"
    ;;
esac
