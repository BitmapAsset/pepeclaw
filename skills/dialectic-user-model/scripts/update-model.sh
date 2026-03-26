#!/usr/bin/env bash
# Dialectic User Model — Update profile from session data
# Usage: ./update-model.sh [session-log]
set -euo pipefail

DATA_DIR="${OPENCLAW_DATA:-$HOME/.openclaw/data/pepe}"
MODEL_DIR="$DATA_DIR/user-model"
PROFILE="$MODEL_DIR/dialectic-profile.json"
UPDATES_DIR="$MODEL_DIR/updates"
TODAY=$(date +%Y-%m-%d)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$MODEL_DIR" "$UPDATES_DIR"

# ─────────────────────────────────────────────────────────────
# Initialize profile if it doesn't exist
# ─────────────────────────────────────────────────────────────
if [ ! -f "$PROFILE" ]; then
    echo "Initializing new dialectic profile..."
    cat > "$PROFILE" <<'INIT'
{
  "version": "1.0.0",
  "created": "",
  "last_updated": "",
  "sessions_analyzed": 0,
  "decision_patterns": [],
  "communication_triggers": {
    "frustration": [],
    "satisfaction": [],
    "engagement": []
  },
  "emotional_indicators": {},
  "learning_style": {
    "primary": "unknown",
    "description": "Not yet determined",
    "code_preference": "unknown",
    "analogy_effectiveness": "unknown",
    "detail_tolerance": "unknown"
  },
  "trust_boundaries": {
    "autonomous": [],
    "ask_first": [],
    "never": []
  },
  "temporal_patterns": {
    "peak_hours": "unknown",
    "low_hours": "unknown",
    "session_length_avg": "unknown"
  }
}
INIT
    # Set created date
    if command -v jq >/dev/null 2>&1; then
        jq --arg d "$TODAY" '.created = $d | .last_updated = $d' "$PROFILE" > "$PROFILE.tmp" && mv "$PROFILE.tmp" "$PROFILE"
    fi
    echo "Profile initialized: $PROFILE"
fi

# ─────────────────────────────────────────────────────────────
# Analyze session log (if provided)
# ─────────────────────────────────────────────────────────────
SESSION_LOG="${1:-}"

if [ -n "$SESSION_LOG" ] && [ -f "$SESSION_LOG" ]; then
    echo "Analyzing session: $SESSION_LOG"
    echo "---"

    # Extract basic metrics
    LINES=$(wc -l < "$SESSION_LOG" | tr -d ' ')
    echo "  Session length: $LINES lines"

    # Look for frustration signals
    FRUSTRATION=$(grep -ciE "already told|wrong|no not|don't do|stop|ugh" "$SESSION_LOG" 2>/dev/null || echo "0")
    echo "  Frustration signals: $FRUSTRATION"

    # Look for satisfaction signals
    SATISFACTION=$(grep -ciE "perfect|exactly|great|thanks|nice|love it" "$SESSION_LOG" 2>/dev/null || echo "0")
    echo "  Satisfaction signals: $SATISFACTION"

    # Look for exploration signals
    EXPLORATION=$(grep -ciE "what if|could we|what about|how about|alternatively" "$SESSION_LOG" 2>/dev/null || echo "0")
    echo "  Exploration signals: $EXPLORATION"

    # Log the update
    cat >> "$UPDATES_DIR/${TODAY}.jsonl" <<UPDATE
{"timestamp":"$NOW","session":"$SESSION_LOG","lines":$LINES,"frustration":$FRUSTRATION,"satisfaction":$SATISFACTION,"exploration":$EXPLORATION}
UPDATE

    echo ""
    echo "Update logged to: $UPDATES_DIR/${TODAY}.jsonl"
else
    echo "Usage: $(basename "$0") <session-log>"
    echo ""
    echo "Without a session log, showing current profile summary:"
    echo "---"

    if command -v jq >/dev/null 2>&1; then
        echo "  Sessions analyzed: $(jq '.sessions_analyzed' "$PROFILE")"
        echo "  Last updated: $(jq -r '.last_updated' "$PROFILE")"
        echo "  Decision patterns: $(jq '.decision_patterns | length' "$PROFILE")"
        echo "  Learning style: $(jq -r '.learning_style.primary' "$PROFILE")"

        frustration_count=$(jq '.communication_triggers.frustration | length' "$PROFILE")
        satisfaction_count=$(jq '.communication_triggers.satisfaction | length' "$PROFILE")
        echo "  Frustration triggers: $frustration_count"
        echo "  Satisfaction triggers: $satisfaction_count"

        trust_auto=$(jq '.trust_boundaries.autonomous | length' "$PROFILE")
        trust_ask=$(jq '.trust_boundaries.ask_first | length' "$PROFILE")
        echo "  Trust: $trust_auto autonomous, $trust_ask ask-first"
    else
        echo "  Install jq for formatted output: brew install jq"
        echo "  Raw profile: $PROFILE"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Update session count and timestamp
# ─────────────────────────────────────────────────────────────
if [ -n "$SESSION_LOG" ] && command -v jq >/dev/null 2>&1; then
    jq --arg d "$TODAY" '.sessions_analyzed += 1 | .last_updated = $d' "$PROFILE" > "$PROFILE.tmp" && mv "$PROFILE.tmp" "$PROFILE"
    echo "Profile updated. Sessions analyzed: $(jq '.sessions_analyzed' "$PROFILE")"
fi
