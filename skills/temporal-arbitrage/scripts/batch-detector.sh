#!/usr/bin/env bash
# ==============================================================================
# batch-detector.sh - Group similar tasks for efficient batching
#
# Reads a JSON array of tasks, groups them by category and overlapping tags,
# filters by urgency threshold, and calculates batch efficiency savings.
#
# Usage:
#   ./batch-detector.sh --tasks-file /path/to/tasks.json \
#     [--min-batch 2] [--max-urgency 40]
#
# Input JSON format (array of objects):
#   [
#     {
#       "id": "task-001",
#       "description": "Reply to vendor emails",
#       "category": "communication",
#       "tags": ["email", "vendor"],
#       "urgency_score": 25,
#       "effort_hours": 0.5
#     }
#   ]
#
# Dependencies: bash 4+, jq
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
TASKS_FILE=""
MIN_BATCH=2
MAX_URGENCY=40

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tasks-file)   TASKS_FILE="$2";   shift 2 ;;
        --min-batch)    MIN_BATCH="$2";    shift 2 ;;
        --max-urgency)  MAX_URGENCY="$2";  shift 2 ;;
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
# Validate
# ---------------------------------------------------------------------------
if [[ -z "$TASKS_FILE" ]]; then
    echo "Error: --tasks-file is required." >&2
    exit 1
fi

if [[ ! -f "$TASKS_FILE" ]]; then
    echo "Error: Tasks file not found: $TASKS_FILE" >&2
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not installed." >&2
    exit 1
fi

# Validate JSON structure
if ! jq -e 'type == "array"' "$TASKS_FILE" >/dev/null 2>&1; then
    echo "Error: Tasks file must contain a JSON array." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Timeslot mapping by category
# ---------------------------------------------------------------------------
timeslot_for_category() {
    case "$1" in
        coding)         echo "morning (9:00-12:00)"       ;;
        creative)       echo "morning (9:00-12:00)"       ;;
        research)       echo "morning (10:00-12:00)"      ;;
        review)         echo "midday (13:00-15:00)"       ;;
        planning)       echo "midday (13:00-15:00)"       ;;
        communication)  echo "afternoon (15:00-17:00)"    ;;
        admin)          echo "end of day (17:00-18:00)"   ;;
        *)              echo "flexible"                    ;;
    esac
}

# ---------------------------------------------------------------------------
# Main batching logic (all in jq + bash)
# ---------------------------------------------------------------------------

# Step 1: Filter tasks below the urgency threshold
BATCHABLE_TASKS=$(jq --argjson max "$MAX_URGENCY" \
    '[.[] | select(.urgency_score <= $max)]' "$TASKS_FILE")

UNBATCHABLE_TASKS=$(jq --argjson max "$MAX_URGENCY" \
    '[.[] | select(.urgency_score > $max)]' "$TASKS_FILE")

BATCHABLE_COUNT=$(echo "$BATCHABLE_TASKS" | jq 'length')

if [[ "$BATCHABLE_COUNT" -lt "$MIN_BATCH" ]]; then
    # Not enough tasks to form any batch
    jq -n --argjson unbatchable "$UNBATCHABLE_TASKS" \
        --argjson all "$(jq '.' "$TASKS_FILE")" \
    '{
        batches: [],
        unbatchable: $all,
        message: "Not enough low-urgency tasks to form batches."
    }'
    exit 0
fi

# Step 2: Group by category
CATEGORIES=$(echo "$BATCHABLE_TASKS" | jq -r '[.[].category] | unique | .[]')

# Step 3: Build batches
BATCHES="[]"
BATCH_ID=0
BATCHED_IDS="[]"

for category in $CATEGORIES; do
    # Get tasks in this category
    CATEGORY_TASKS=$(echo "$BATCHABLE_TASKS" | jq --arg cat "$category" \
        '[.[] | select(.category == $cat)]')
    CATEGORY_COUNT=$(echo "$CATEGORY_TASKS" | jq 'length')

    if [[ "$CATEGORY_COUNT" -lt "$MIN_BATCH" ]]; then
        continue
    fi

    # Within this category, further sub-group by overlapping tags
    # Strategy: greedy clustering - tasks share at least one tag to be in the same batch
    PROCESSED="[]"
    REMAINING="$CATEGORY_TASKS"

    while true; do
        REMAINING_COUNT=$(echo "$REMAINING" | jq 'length')
        if [[ "$REMAINING_COUNT" -lt "$MIN_BATCH" ]]; then
            break
        fi

        # Take the first task as the seed
        SEED_TAGS=$(echo "$REMAINING" | jq '.[0].tags // []')
        SEED_ID=$(echo "$REMAINING" | jq -r '.[0].id')

        # Find all tasks that share at least one tag with the seed
        CLUSTER=$(echo "$REMAINING" | jq --argjson seed_tags "$SEED_TAGS" \
            '[.[] | select(
                (.tags // []) as $t |
                ($seed_tags | length == 0 and ($t | length == 0)) or
                ([$t[] as $tag | $seed_tags | index($tag) != null] | any)
            )]')

        # If seed has no tags, cluster all tagless tasks in the category
        CLUSTER_COUNT=$(echo "$CLUSTER" | jq 'length')

        if [[ "$CLUSTER_COUNT" -lt "$MIN_BATCH" ]]; then
            # Can't form a batch from this seed, remove it and continue
            REMAINING=$(echo "$REMAINING" | jq --arg sid "$SEED_ID" \
                '[.[] | select(.id != $sid)]')
            continue
        fi

        BATCH_ID=$((BATCH_ID + 1))
        TIMESLOT=$(timeslot_for_category "$category")

        # Calculate effort totals
        TOTAL_EFFORT=$(echo "$CLUSTER" | jq '[.[].effort_hours] | add // 0')
        # Batch efficiency: 20% savings from reduced context-switching
        BATCH_EFFORT=$(echo "$TOTAL_EFFORT" | awk '{ printf "%.2f", $1 * 0.80 }')
        TIME_SAVED=$(echo "$TOTAL_EFFORT" | awk -v be="$BATCH_EFFORT" '{ printf "%.2f", $1 - be }')

        # Collect batched task IDs
        CLUSTER_IDS=$(echo "$CLUSTER" | jq '[.[].id]')
        BATCHED_IDS=$(echo "$BATCHED_IDS" | jq --argjson new "$CLUSTER_IDS" '. + $new')

        # Build batch object
        BATCH_OBJ=$(jq -n \
            --arg bid "batch-${BATCH_ID}" \
            --arg cat "$category" \
            --argjson tasks "$CLUSTER" \
            --argjson total "$TOTAL_EFFORT" \
            --arg batch "$BATCH_EFFORT" \
            --arg saved "$TIME_SAVED" \
            --arg slot "$TIMESLOT" \
            '{
                batch_id: $bid,
                category: $cat,
                tasks: [$tasks[] | {id, description, tags, urgency_score, effort_hours}],
                total_effort: $total,
                batch_effort: ($batch | tonumber),
                time_saved: ($saved | tonumber),
                suggested_timeslot: $slot
            }')

        BATCHES=$(echo "$BATCHES" | jq --argjson b "$BATCH_OBJ" '. + [$b]')

        # Remove clustered tasks from remaining
        REMAINING=$(echo "$REMAINING" | jq --argjson used "$CLUSTER_IDS" \
            '[.[] | select(.id as $id | $used | index($id) | not)]')
    done
done

# Step 4: Sort batches by time_saved descending (largest savings first)
BATCHES=$(echo "$BATCHES" | jq 'sort_by(-.time_saved)')

# Step 5: Collect unbatchable tasks (high urgency + those that didn't fit a batch)
LEFTOVER=$(echo "$BATCHABLE_TASKS" | jq --argjson used "$BATCHED_IDS" \
    '[.[] | select(.id as $id | $used | index($id) | not)]')

ALL_UNBATCHABLE=$(jq -n --argjson high "$UNBATCHABLE_TASKS" --argjson left "$LEFTOVER" \
    '$high + $left')

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
jq -n \
    --argjson batches "$BATCHES" \
    --argjson unbatchable "$ALL_UNBATCHABLE" \
    '{
        batches: $batches,
        unbatchable: [$unbatchable[] | {id, description, category, urgency_score, effort_hours}],
        summary: {
            total_batches: ($batches | length),
            total_tasks_batched: ([$batches[].tasks | length] | add // 0),
            total_time_saved: ([$batches[].time_saved] | add // 0),
            unbatchable_count: ($unbatchable | length)
        }
    }'
