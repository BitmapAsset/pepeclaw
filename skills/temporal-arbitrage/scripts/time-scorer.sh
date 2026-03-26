#!/usr/bin/env bash
# ==============================================================================
# time-scorer.sh - Score task time-sensitivity and urgency
#
# Calculates a dynamic urgency score (0-100) based on deadline proximity,
# time-sensitivity type, effort estimates, and dependency chains. Outputs
# a JSON object with the score, recommendation, and risk assessment.
#
# Usage:
#   ./time-scorer.sh --task "description" --deadline "YYYY-MM-DD" \
#     [--type appreciating|depreciating|neutral] \
#     [--effort-hours N] \
#     [--dependencies "task1,task2"]
#
# Dependencies: bash 4+, date, bc (or awk for math), jq (optional, for pretty output)
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
TASK_DESCRIPTION=""
DEADLINE=""
SENSITIVITY_TYPE="neutral"
EFFORT_HOURS=0
DEPENDENCIES=""

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --task)        TASK_DESCRIPTION="$2"; shift 2 ;;
        --deadline)    DEADLINE="$2";          shift 2 ;;
        --type)        SENSITIVITY_TYPE="$2";  shift 2 ;;
        --effort-hours) EFFORT_HOURS="$2";     shift 2 ;;
        --dependencies) DEPENDENCIES="$2";     shift 2 ;;
        -h|--help)
            sed -n '2,/^# =====/{ /^# =====/d; s/^# \?//; p }' "$0"
            exit 0
            ;;
        *)
            echo "Error: Unknown option '$1'" >&2
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Validate required inputs
# ---------------------------------------------------------------------------
if [[ -z "$TASK_DESCRIPTION" ]]; then
    echo "Error: --task is required." >&2
    exit 1
fi

if [[ -z "$DEADLINE" ]]; then
    echo "Error: --deadline is required (YYYY-MM-DD)." >&2
    exit 1
fi

if [[ ! "$SENSITIVITY_TYPE" =~ ^(appreciating|depreciating|neutral)$ ]]; then
    echo "Error: --type must be appreciating, depreciating, or neutral." >&2
    exit 1
fi

if ! [[ "$EFFORT_HOURS" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    echo "Error: --effort-hours must be a non-negative number." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Date calculations (portable across macOS and Linux)
# ---------------------------------------------------------------------------
now_epoch() {
    date +%s
}

date_to_epoch() {
    local d="$1"
    # macOS
    if date -j -f "%Y-%m-%d" "$d" +%s 2>/dev/null; then
        return
    fi
    # Linux / GNU date
    date -d "$d" +%s 2>/dev/null || {
        echo "Error: Cannot parse date '$d'. Use YYYY-MM-DD format." >&2
        exit 1
    }
}

NOW_EPOCH=$(now_epoch)
DEADLINE_EPOCH=$(date_to_epoch "$DEADLINE")
CREATED_EPOCH=$NOW_EPOCH  # assume task scored at creation unless extended later

SECONDS_PER_DAY=86400
DAYS_REMAINING=$(( (DEADLINE_EPOCH - NOW_EPOCH) / SECONDS_PER_DAY ))

# Guard: if deadline is today or past, days_remaining = 0 (handled below)
if [[ $DAYS_REMAINING -lt 0 ]]; then
    DAYS_REMAINING=0
fi

# Total duration assumes the task was created today for scoring purposes.
# In a real integration this would come from the task record.
TOTAL_DURATION_DAYS=$DAYS_REMAINING
if [[ $TOTAL_DURATION_DAYS -lt 1 ]]; then
    TOTAL_DURATION_DAYS=1
fi

# ---------------------------------------------------------------------------
# Arithmetic helper (awk-based, no bc dependency)
# ---------------------------------------------------------------------------
calc() {
    awk "BEGIN { printf \"%.2f\", $1 }"
}

calc_int() {
    awk "BEGIN { printf \"%d\", $1 }"
}

# ---------------------------------------------------------------------------
# 1. Base urgency: based on absolute days remaining until deadline
#    Uses a decay curve — urgency rises sharply as deadline approaches.
# ---------------------------------------------------------------------------
if [[ $DAYS_REMAINING -eq 0 ]]; then
    BASE_URGENCY=100
elif [[ $DAYS_REMAINING -le 1 ]]; then
    BASE_URGENCY=90
elif [[ $DAYS_REMAINING -le 3 ]]; then
    BASE_URGENCY=75
elif [[ $DAYS_REMAINING -le 7 ]]; then
    BASE_URGENCY=55
elif [[ $DAYS_REMAINING -le 14 ]]; then
    BASE_URGENCY=35
elif [[ $DAYS_REMAINING -le 30 ]]; then
    BASE_URGENCY=20
else
    # Far out: scale down from 15 toward 5 as days increase
    BASE_URGENCY=$(calc_int "15 - ($DAYS_REMAINING - 30) * 0.1")
    if [[ $BASE_URGENCY -lt 5 ]]; then
        BASE_URGENCY=5
    fi
fi

# ---------------------------------------------------------------------------
# 2. Time-sensitivity multiplier
# ---------------------------------------------------------------------------
case "$SENSITIVITY_TYPE" in
    appreciating)
        # Exponential boost: urgency compounds as deadline nears.
        # Multiplier ranges from 1.0 (far out) to 2.0 (at deadline).
        # Formula: 1 + e^(-days_remaining/7) capped at 2.0
        MULTIPLIER=$(calc "1.0 + (2.718281828 ^ (-1 * $DAYS_REMAINING / 7.0))")
        # Cap at 2.0
        MULTIPLIER=$(calc "($MULTIPLIER > 2.0) ? 2.0 : $MULTIPLIER")
        ;;
    depreciating)
        # Discount: these tasks are cheaper when batched later.
        # Multiplier ranges from 0.5 (far out, very discounted) to 0.9 (at deadline).
        if [[ $DAYS_REMAINING -eq 0 ]]; then
            MULTIPLIER="0.90"
        else
            MULTIPLIER=$(calc "0.5 + 0.4 * (1.0 - $DAYS_REMAINING / ($TOTAL_DURATION_DAYS * 1.0))")
        fi
        ;;
    neutral)
        MULTIPLIER="1.00"
        ;;
esac

ADJUSTED_URGENCY=$(calc_int "$BASE_URGENCY * $MULTIPLIER")

# ---------------------------------------------------------------------------
# 3. Dependency boost: each dependent task adds 5 points (max +25)
# ---------------------------------------------------------------------------
DEP_COUNT=0
if [[ -n "$DEPENDENCIES" ]]; then
    IFS=',' read -ra DEP_ARRAY <<< "$DEPENDENCIES"
    DEP_COUNT=${#DEP_ARRAY[@]}
fi

DEP_BOOST=$(calc_int "$DEP_COUNT * 5")
if [[ $DEP_BOOST -gt 25 ]]; then
    DEP_BOOST=25
fi

ADJUSTED_URGENCY=$(( ADJUSTED_URGENCY + DEP_BOOST ))

# ---------------------------------------------------------------------------
# 4. Effort-to-deadline ratio warning
# ---------------------------------------------------------------------------
EFFORT_RATIO=0
EFFORT_WARNING=""
if (( $(echo "$EFFORT_HOURS > 0" | awk '{ print ($1 > 0) }') )); then
    AVAILABLE_HOURS=$(calc "$DAYS_REMAINING * 6")  # assume 6 productive hrs/day
    if (( $(echo "$AVAILABLE_HOURS" | awk '{ print ($1 > 0) }') )); then
        EFFORT_RATIO=$(calc "$EFFORT_HOURS / $AVAILABLE_HOURS * 100")
    else
        EFFORT_RATIO="100.00"
    fi

    # If effort > 80% of available time, boost urgency and flag
    if (( $(echo "$EFFORT_RATIO" | awk '{ print ($1 >= 80) }') )); then
        EFFORT_WARNING="Effort estimate consumes ${EFFORT_RATIO}% of remaining productive hours."
        ADJUSTED_URGENCY=$(( ADJUSTED_URGENCY + 15 ))
    fi
fi

# ---------------------------------------------------------------------------
# 5. Clamp final score to 0-100
# ---------------------------------------------------------------------------
if [[ $ADJUSTED_URGENCY -gt 100 ]]; then
    ADJUSTED_URGENCY=100
fi
if [[ $ADJUSTED_URGENCY -lt 0 ]]; then
    ADJUSTED_URGENCY=0
fi

# ---------------------------------------------------------------------------
# 6. Determine recommendation
# ---------------------------------------------------------------------------
if [[ $DAYS_REMAINING -eq 0 && $DEADLINE_EPOCH -lt $NOW_EPOCH ]]; then
    RECOMMENDATION="past due - emergency"
elif [[ $ADJUSTED_URGENCY -ge 85 ]]; then
    RECOMMENDATION="do now"
elif [[ $ADJUSTED_URGENCY -ge 60 ]]; then
    RECOMMENDATION="schedule this week"
elif [[ $ADJUSTED_URGENCY -ge 40 ]]; then
    if [[ "$SENSITIVITY_TYPE" == "depreciating" ]]; then
        RECOMMENDATION="batch with similar"
    else
        RECOMMENDATION="schedule this week"
    fi
elif [[ $ADJUSTED_URGENCY -ge 20 ]]; then
    RECOMMENDATION="can defer"
else
    RECOMMENDATION="can defer"
fi

# Override: if task has many dependencies, bump recommendation
if [[ $DEP_COUNT -ge 3 && "$RECOMMENDATION" == "can defer" ]]; then
    RECOMMENDATION="schedule this week"
fi

# ---------------------------------------------------------------------------
# 7. Risk level
# ---------------------------------------------------------------------------
if [[ $ADJUSTED_URGENCY -ge 80 ]]; then
    RISK_LEVEL="critical"
elif [[ $ADJUSTED_URGENCY -ge 60 ]]; then
    RISK_LEVEL="high"
elif [[ $ADJUSTED_URGENCY -ge 40 ]]; then
    RISK_LEVEL="medium"
else
    RISK_LEVEL="low"
fi

# ---------------------------------------------------------------------------
# 8. Optimal start date (backward from deadline minus effort + 20% buffer)
# ---------------------------------------------------------------------------
if (( $(echo "$EFFORT_HOURS > 0" | awk '{ print ($1 > 0) }') )); then
    BUFFERED_HOURS=$(calc "$EFFORT_HOURS * 1.2")
    WORK_DAYS_NEEDED=$(calc_int "$BUFFERED_HOURS / 6 + 1")
    OPTIMAL_START_EPOCH=$(( DEADLINE_EPOCH - (WORK_DAYS_NEEDED * SECONDS_PER_DAY) ))
    # macOS
    if OPTIMAL_START_DATE=$(date -j -f "%s" "$OPTIMAL_START_EPOCH" "+%Y-%m-%d" 2>/dev/null); then
        :
    else
        OPTIMAL_START_DATE=$(date -d "@$OPTIMAL_START_EPOCH" "+%Y-%m-%d" 2>/dev/null || echo "unknown")
    fi
else
    OPTIMAL_START_DATE="N/A (no effort estimate provided)"
fi

# ---------------------------------------------------------------------------
# 9. Build JSON output
# ---------------------------------------------------------------------------
# Escape description for JSON safety
ESCAPED_DESCRIPTION=$(printf '%s' "$TASK_DESCRIPTION" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g')

# Build dependencies JSON array
DEP_JSON="[]"
if [[ -n "$DEPENDENCIES" ]]; then
    DEP_JSON="["
    IFS=',' read -ra DEP_ARRAY <<< "$DEPENDENCIES"
    for i in "${!DEP_ARRAY[@]}"; do
        dep=$(echo "${DEP_ARRAY[$i]}" | xargs)  # trim whitespace
        if [[ $i -gt 0 ]]; then DEP_JSON+=","; fi
        DEP_JSON+="\"$dep\""
    done
    DEP_JSON+="]"
fi

JSON_OUTPUT=$(cat <<ENDJSON
{
  "task": "${ESCAPED_DESCRIPTION}",
  "urgency_score": ${ADJUSTED_URGENCY},
  "time_sensitivity_type": "${SENSITIVITY_TYPE}",
  "deadline": "${DEADLINE}",
  "days_remaining": ${DAYS_REMAINING},
  "effort_hours": ${EFFORT_HOURS},
  "effort_to_deadline_ratio": "${EFFORT_RATIO}%",
  "dependencies": ${DEP_JSON},
  "dependency_count": ${DEP_COUNT},
  "recommendation": "${RECOMMENDATION}",
  "optimal_start_date": "${OPTIMAL_START_DATE}",
  "risk_level": "${RISK_LEVEL}"$(if [[ -n "$EFFORT_WARNING" ]]; then echo ","; echo "  \"warning\": \"${EFFORT_WARNING}\""; fi)
}
ENDJSON
)

# Pretty-print with jq if available, otherwise raw output
if command -v jq &>/dev/null; then
    echo "$JSON_OUTPUT" | jq .
else
    echo "$JSON_OUTPUT"
fi
