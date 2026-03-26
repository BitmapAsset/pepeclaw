#!/usr/bin/env bash
# Generate Insights — Produce actionable insights from the dialectic user model
# Usage: ./generate-insights.sh
set -euo pipefail

DATA_DIR="${OPENCLAW_DATA:-$HOME/.openclaw/data/pepe}"
MODEL_DIR="$DATA_DIR/user-model"
PROFILE="$MODEL_DIR/dialectic-profile.json"
INSIGHTS_DIR="$MODEL_DIR/insights"
UPDATES_DIR="$MODEL_DIR/updates"
TODAY=$(date +%Y-%m-%d)

mkdir -p "$INSIGHTS_DIR"

if [ ! -f "$PROFILE" ]; then
    echo "No dialectic profile found. Run update-model.sh first."
    exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "  DIALECTIC USER MODEL — INSIGHTS"
echo "  Generated: $TODAY"
echo "═══════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────
# Profile Summary
# ─────────────────────────────────────────────────────────────
echo "Profile Summary:"
echo "---"

if command -v jq >/dev/null 2>&1; then
    sessions=$(jq '.sessions_analyzed' "$PROFILE")
    last_updated=$(jq -r '.last_updated' "$PROFILE")
    learning=$(jq -r '.learning_style.primary' "$PROFILE")

    echo "  Sessions analyzed: $sessions"
    echo "  Last updated: $last_updated"
    echo "  Learning style: $learning"

    decision_count=$(jq '.decision_patterns | length' "$PROFILE")
    echo "  Decision patterns tracked: $decision_count"

    if [ "$decision_count" -gt 0 ]; then
        echo ""
        echo "  Top decision patterns:"
        jq -r '.decision_patterns | sort_by(-.confidence) | .[0:5][] | "    [\(.confidence)] \(.pattern)"' "$PROFILE" 2>/dev/null || true
    fi
else
    echo "  Install jq for detailed insights: brew install jq"
    echo "  Profile: $PROFILE"
fi

# ─────────────────────────────────────────────────────────────
# Communication Analysis
# ─────────────────────────────────────────────────────────────
echo ""
echo "Communication Insights:"
echo "---"

if command -v jq >/dev/null 2>&1; then
    frust=$(jq '.communication_triggers.frustration | length' "$PROFILE")
    satis=$(jq '.communication_triggers.satisfaction | length' "$PROFILE")
    engage=$(jq '.communication_triggers.engagement | length' "$PROFILE")

    echo "  Frustration triggers: $frust"
    if [ "$frust" -gt 0 ]; then
        jq -r '.communication_triggers.frustration[] | "    AVOID: \(.)"' "$PROFILE" 2>/dev/null || true
    fi

    echo "  Satisfaction triggers: $satis"
    if [ "$satis" -gt 0 ]; then
        jq -r '.communication_triggers.satisfaction[] | "    DO: \(.)"' "$PROFILE" 2>/dev/null || true
    fi

    echo "  Engagement triggers: $engage"
    if [ "$engage" -gt 0 ]; then
        jq -r '.communication_triggers.engagement[] | "    ENGAGE: \(.)"' "$PROFILE" 2>/dev/null || true
    fi
fi

# ─────────────────────────────────────────────────────────────
# Trust Boundary Summary
# ─────────────────────────────────────────────────────────────
echo ""
echo "Trust Boundaries:"
echo "---"

if command -v jq >/dev/null 2>&1; then
    auto=$(jq '.trust_boundaries.autonomous | length' "$PROFILE")
    ask=$(jq '.trust_boundaries.ask_first | length' "$PROFILE")
    never=$(jq '.trust_boundaries.never | length' "$PROFILE")

    echo "  Autonomous ($auto):"
    jq -r '.trust_boundaries.autonomous[] | "    OK: \(.)"' "$PROFILE" 2>/dev/null || echo "    (none yet)"

    echo "  Ask first ($ask):"
    jq -r '.trust_boundaries.ask_first[] | "    ASK: \(.)"' "$PROFILE" 2>/dev/null || echo "    (none yet)"

    echo "  Never ($never):"
    jq -r '.trust_boundaries.never[] | "    NEVER: \(.)"' "$PROFILE" 2>/dev/null || echo "    (none yet)"
fi

# ─────────────────────────────────────────────────────────────
# Update History Trends
# ─────────────────────────────────────────────────────────────
echo ""
echo "Session Trends:"
echo "---"

TOTAL_FRUSTRATION=0
TOTAL_SATISFACTION=0
UPDATE_COUNT=0

for update_file in "$UPDATES_DIR"/*.jsonl; do
    [ -f "$update_file" ] || continue
    while IFS= read -r line; do
        f=$(echo "$line" | grep -oE '"frustration":[0-9]+' | cut -d: -f2 || echo "0")
        s=$(echo "$line" | grep -oE '"satisfaction":[0-9]+' | cut -d: -f2 || echo "0")
        TOTAL_FRUSTRATION=$((TOTAL_FRUSTRATION + f))
        TOTAL_SATISFACTION=$((TOTAL_SATISFACTION + s))
        UPDATE_COUNT=$((UPDATE_COUNT + 1))
    done < "$update_file"
done

echo "  Updates recorded: $UPDATE_COUNT"
echo "  Total frustration signals: $TOTAL_FRUSTRATION"
echo "  Total satisfaction signals: $TOTAL_SATISFACTION"

if [ "$UPDATE_COUNT" -gt 0 ]; then
    echo "  Avg frustration/session: $((TOTAL_FRUSTRATION / UPDATE_COUNT))"
    echo "  Avg satisfaction/session: $((TOTAL_SATISFACTION / UPDATE_COUNT))"

    if [ "$TOTAL_SATISFACTION" -gt "$TOTAL_FRUSTRATION" ]; then
        echo "  Trend: POSITIVE — user is generally satisfied"
    elif [ "$TOTAL_FRUSTRATION" -gt "$TOTAL_SATISFACTION" ]; then
        echo "  Trend: NEEDS WORK — frustration exceeds satisfaction"
    else
        echo "  Trend: NEUTRAL — balanced signals"
    fi
fi

# ─────────────────────────────────────────────────────────────
# Actionable Recommendations
# ─────────────────────────────────────────────────────────────
echo ""
echo "Recommendations:"
echo "---"

if command -v jq >/dev/null 2>&1; then
    learning=$(jq -r '.learning_style.primary' "$PROFILE")
    case "$learning" in
        top-down)
            echo "  1. Start responses with the big picture, add details on request"
            ;;
        bottom-up)
            echo "  1. Start with specific examples, then generalize"
            ;;
        *)
            echo "  1. Observe how user responds to different explanation structures"
            ;;
    esac
fi

echo "  2. Review frustration triggers before each response"
echo "  3. Proactively use satisfaction triggers"
echo "  4. Stay within trust boundaries — ask before crossing"

# ─────────────────────────────────────────────────────────────
# Save insight report
# ─────────────────────────────────────────────────────────────
REPORT_FILE="$INSIGHTS_DIR/${TODAY}.txt"
echo "" >> "$REPORT_FILE"
echo "Insight report saved: $REPORT_FILE"

echo ""
echo "═══════════════════════════════════════════════════"
