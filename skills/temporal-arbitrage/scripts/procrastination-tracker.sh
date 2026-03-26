#!/usr/bin/env bash
# ==============================================================================
# procrastination-tracker.sh - Track deferred tasks and detect procrastination
#
# Maintains a JSON task log and analyzes deferral patterns to surface
# procrastination, stale tasks, and avoidance tendencies by category.
#
# Usage:
#   ./procrastination-tracker.sh --log-file /path/to/task-log.json \
#     --action report|defer|complete [--task-id ID] [--reason "text"]
#
# Actions:
#   report   - Analyze the log and produce a procrastination report
#   defer    - Record a deferral for the given task (requires --task-id)
#   complete - Mark a task as completed (requires --task-id)
#
# Log file format (JSON array):
#   [
#     {
#       "id": "task-001",
#       "description": "Update DNS records",
#       "category": "admin",
#       "created": "2026-03-01T10:00:00Z",
#       "deferrals": [{"date": "2026-03-05", "reason": "too busy"}],
#       "completed_date": null,
#       "status": "pending"
#     }
#   ]
#
# Dependencies: bash 4+, jq
# ==============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
LOG_FILE=""
ACTION=""
TASK_ID=""
REASON=""

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --log-file) LOG_FILE="$2";  shift 2 ;;
        --action)   ACTION="$2";    shift 2 ;;
        --task-id)  TASK_ID="$2";   shift 2 ;;
        --reason)   REASON="$2";    shift 2 ;;
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
if [[ -z "$LOG_FILE" ]]; then
    echo "Error: --log-file is required." >&2
    exit 1
fi

if [[ -z "$ACTION" ]]; then
    echo "Error: --action is required (report|defer|complete)." >&2
    exit 1
fi

if [[ ! "$ACTION" =~ ^(report|defer|complete)$ ]]; then
    echo "Error: --action must be report, defer, or complete." >&2
    exit 1
fi

if [[ "$ACTION" != "report" && -z "$TASK_ID" ]]; then
    echo "Error: --task-id is required for '$ACTION' action." >&2
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not installed." >&2
    exit 1
fi

# Initialize log file if it doesn't exist
if [[ ! -f "$LOG_FILE" ]]; then
    echo "[]" > "$LOG_FILE"
fi

# Validate JSON structure
if ! jq -e 'type == "array"' "$LOG_FILE" >/dev/null 2>&1; then
    echo "Error: Log file must contain a JSON array." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Current date helpers
# ---------------------------------------------------------------------------
TODAY=$(date "+%Y-%m-%d")
NOW_ISO=$(date -u "+%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date "+%Y-%m-%dT%H:%M:%SZ")

now_epoch() {
    date +%s
}

date_to_epoch() {
    local d="$1"
    # Try macOS format first
    if date -j -f "%Y-%m-%dT%H:%M:%SZ" "$d" +%s 2>/dev/null; then return; fi
    if date -j -f "%Y-%m-%dT%H:%M:%S%z" "$d" +%s 2>/dev/null; then return; fi
    if date -j -f "%Y-%m-%d" "$d" +%s 2>/dev/null; then return; fi
    # GNU date
    date -d "$d" +%s 2>/dev/null || echo "0"
}

# ---------------------------------------------------------------------------
# ACTION: defer
# ---------------------------------------------------------------------------
action_defer() {
    local task_exists
    task_exists=$(jq --arg id "$TASK_ID" '[.[] | select(.id == $id)] | length' "$LOG_FILE")

    if [[ "$task_exists" -eq 0 ]]; then
        echo "Error: Task '$TASK_ID' not found in log." >&2
        exit 1
    fi

    # Check task isn't already completed
    local status
    status=$(jq -r --arg id "$TASK_ID" '.[] | select(.id == $id) | .status' "$LOG_FILE")
    if [[ "$status" == "completed" ]]; then
        echo "Error: Task '$TASK_ID' is already completed. Cannot defer." >&2
        exit 1
    fi

    # Add deferral entry
    local deferral_obj
    deferral_obj=$(jq -n --arg date "$TODAY" --arg reason "$REASON" \
        '{ date: $date, reason: (if $reason == "" then "No reason given" else $reason end) }')

    local updated
    updated=$(jq --arg id "$TASK_ID" --argjson def "$deferral_obj" \
        '[.[] | if .id == $id then
            .deferrals = ((.deferrals // []) + [$def]) |
            .status = "deferred"
        else . end]' "$LOG_FILE")

    echo "$updated" > "$LOG_FILE"

    # Get updated deferral count
    local count
    count=$(echo "$updated" | jq --arg id "$TASK_ID" '.[] | select(.id == $id) | (.deferrals // []) | length')

    local warning=""
    if [[ "$count" -ge 3 ]]; then
        warning=" [PROCRASTINATION ALERT: deferred $count times]"
    fi

    jq -n \
        --arg id "$TASK_ID" \
        --arg date "$TODAY" \
        --arg reason "${REASON:-No reason given}" \
        --argjson count "$count" \
        --arg warning "$warning" \
        '{
            action: "deferred",
            task_id: $id,
            deferral_date: $date,
            reason: $reason,
            total_deferrals: $count,
            warning: (if $warning != "" then $warning else null end)
        }'
}

# ---------------------------------------------------------------------------
# ACTION: complete
# ---------------------------------------------------------------------------
action_complete() {
    local task_exists
    task_exists=$(jq --arg id "$TASK_ID" '[.[] | select(.id == $id)] | length' "$LOG_FILE")

    if [[ "$task_exists" -eq 0 ]]; then
        echo "Error: Task '$TASK_ID' not found in log." >&2
        exit 1
    fi

    local updated
    updated=$(jq --arg id "$TASK_ID" --arg now "$NOW_ISO" \
        '[.[] | if .id == $id then
            .status = "completed" |
            .completed_date = $now
        else . end]' "$LOG_FILE")

    echo "$updated" > "$LOG_FILE"

    # Calculate how long the task was open
    local created
    created=$(echo "$updated" | jq -r --arg id "$TASK_ID" '.[] | select(.id == $id) | .created // ""')
    local deferrals
    deferrals=$(echo "$updated" | jq --arg id "$TASK_ID" '.[] | select(.id == $id) | (.deferrals // []) | length')

    jq -n \
        --arg id "$TASK_ID" \
        --arg completed "$NOW_ISO" \
        --argjson deferrals "$deferrals" \
        '{
            action: "completed",
            task_id: $id,
            completed_date: $completed,
            total_deferrals_before_completion: $deferrals
        }'
}

# ---------------------------------------------------------------------------
# ACTION: report
# ---------------------------------------------------------------------------
action_report() {
    local NOW_EPOCH
    NOW_EPOCH=$(now_epoch)
    local SECONDS_PER_DAY=86400

    local total_tasks
    total_tasks=$(jq 'length' "$LOG_FILE")

    if [[ "$total_tasks" -eq 0 ]]; then
        jq -n '{
            message: "No tasks in log. Nothing to report.",
            procrastination_score: 0
        }'
        return
    fi

    # Count active (non-completed) tasks
    local active_tasks
    active_tasks=$(jq '[.[] | select(.status != "completed" and .status != "deleted")] | length' "$LOG_FILE")

    # Tasks deferred 3+ times (procrastination alerts)
    local procrastinating_tasks
    procrastinating_tasks=$(jq '[.[] |
        select(.status != "completed" and .status != "deleted") |
        select((.deferrals // []) | length >= 3)]' "$LOG_FILE")
    local procrastinating_count
    procrastinating_count=$(echo "$procrastinating_tasks" | jq 'length')

    # Stale tasks: open > 14 days with no recent activity
    local stale_tasks
    stale_tasks=$(jq --arg now "$NOW_ISO" --argjson threshold 14 '[
        .[] |
        select(.status != "completed" and .status != "deleted") |
        select(.created != null) |
        . as $task |
        (
            ($now | split("T")[0] | split("-") | .[0] + .[1] + .[2] | tonumber) -
            ($task.created | split("T")[0] | split("-") | .[0] + .[1] + .[2] | tonumber)
        ) as $date_diff |
        # Rough days-open calculation: compare YYYYMMDD numeric values
        select(
            (($now[0:4] | tonumber) * 365 + ($now[5:7] | tonumber) * 30 + ($now[8:10] | tonumber)) -
            (($task.created[0:4] | tonumber) * 365 + ($task.created[5:7] | tonumber) * 30 + ($task.created[8:10] | tonumber))
            > $threshold
        )
    ]' "$LOG_FILE" 2>/dev/null || echo "[]")
    local stale_count
    stale_count=$(echo "$stale_tasks" | jq 'length')

    # Category analysis: which categories get deferred most
    local category_deferrals
    category_deferrals=$(jq '[
        .[] |
        select(.status != "completed" and .status != "deleted") |
        select((.deferrals // []) | length > 0) |
        { category: (.category // "uncategorized"), deferral_count: ((.deferrals // []) | length) }
    ] |
    group_by(.category) |
    map({
        category: .[0].category,
        total_deferrals: (map(.deferral_count) | add),
        task_count: length
    }) |
    sort_by(-.total_deferrals)' "$LOG_FILE")

    # Total deferrals across all tasks
    local total_deferrals
    total_deferrals=$(jq '[.[].deferrals // [] | length] | add // 0' "$LOG_FILE")

    # Completed task count
    local completed_count
    completed_count=$(jq '[.[] | select(.status == "completed")] | length' "$LOG_FILE")

    # ---------------------------------------------------------------------------
    # Procrastination score (0-100, higher = more procrastination)
    #
    # Factors:
    #   - Ratio of procrastinating tasks to active tasks (40% weight)
    #   - Ratio of stale tasks to active tasks (30% weight)
    #   - Average deferrals per active task (20% weight)
    #   - Completion rate inverse (10% weight)
    # ---------------------------------------------------------------------------
    local proc_score
    proc_score=$(jq -n \
        --argjson active "$active_tasks" \
        --argjson proc "$procrastinating_count" \
        --argjson stale "$stale_count" \
        --argjson total_def "$total_deferrals" \
        --argjson total "$total_tasks" \
        --argjson completed "$completed_count" \
        '
        if $active == 0 then 0
        else
            (($proc / $active) * 40) +
            (($stale / $active) * 30) +
            ((if $active > 0 then ($total_def / $active) else 0 end) | (. * 4) | if . > 20 then 20 else . end) +
            ((1 - ($completed / $total)) * 10)
        end |
        if . > 100 then 100
        elif . < 0 then 0
        else . end |
        floor
    ')

    # ---------------------------------------------------------------------------
    # Generate per-task recommendations for procrastinating tasks
    # ---------------------------------------------------------------------------
    local task_recommendations
    task_recommendations=$(echo "$procrastinating_tasks" | jq '[.[] | {
        id: .id,
        description: .description,
        category: (.category // "uncategorized"),
        deferrals: ((.deferrals // []) | length),
        last_deferred: ((.deferrals // [])[-1].date // "unknown"),
        recommendation: (
            if ((.deferrals // []) | length) >= 5 then "Delete or delegate - persistent avoidance indicates this task may not be yours to do"
            elif ((.deferrals // []) | length) >= 4 then "Break into smaller pieces - the task scope may be causing avoidance"
            else "Do it now - three deferrals suggest resistance, not legitimate delay"
            end
        )
    }]')

    local stale_recommendations
    stale_recommendations=$(echo "$stale_tasks" | jq '[.[] | {
        id: .id,
        description: .description,
        category: (.category // "uncategorized"),
        created: .created,
        deferrals: ((.deferrals // []) | length),
        recommendation: "Stale task - delete if no longer relevant, or escalate if still needed"
    }]')

    # ---------------------------------------------------------------------------
    # Assemble report
    # ---------------------------------------------------------------------------
    jq -n \
        --argjson total_tasks "$total_tasks" \
        --argjson active_tasks "$active_tasks" \
        --argjson completed "$completed_count" \
        --argjson total_deferrals "$total_deferrals" \
        --argjson procrastinating_count "$procrastinating_count" \
        --argjson stale_count "$stale_count" \
        --argjson proc_score "$proc_score" \
        --argjson category_deferrals "$category_deferrals" \
        --argjson procrastinating "$task_recommendations" \
        --argjson stale "$stale_recommendations" \
        '{
            report_date: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
            summary: {
                total_tasks: $total_tasks,
                active_tasks: $active_tasks,
                completed_tasks: $completed,
                total_deferrals: $total_deferrals,
                procrastination_alerts: $procrastinating_count,
                stale_alerts: $stale_count,
                procrastination_score: $proc_score,
                score_interpretation: (
                    if $proc_score >= 70 then "Severe - significant avoidance patterns detected"
                    elif $proc_score >= 50 then "High - multiple tasks showing chronic deferral"
                    elif $proc_score >= 30 then "Moderate - some procrastination, mostly healthy"
                    elif $proc_score >= 10 then "Low - occasional deferral, normal behavior"
                    else "Minimal - strong execution discipline"
                    end
                )
            },
            category_analysis: $category_deferrals,
            procrastination_alerts: $procrastinating,
            stale_alerts: $stale,
            recommendations: (
                (if $procrastinating_count > 0 then
                    ["Address procrastinating tasks: \($procrastinating_count) task(s) deferred 3+ times"]
                else [] end) +
                (if $stale_count > 0 then
                    ["Review stale tasks: \($stale_count) task(s) open longer than 14 days"]
                else [] end) +
                (if ($category_deferrals | length > 0) then
                    ["Most-deferred category: \($category_deferrals[0].category) (\($category_deferrals[0].total_deferrals) deferrals) - consider delegation or automation"]
                else [] end) +
                (if $proc_score >= 50 then
                    ["High procrastination score (\($proc_score)/100) - consider time-boxing: commit to 25-minute focused sprints on deferred tasks"]
                else [] end)
            )
        }'
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
case "$ACTION" in
    defer)    action_defer    ;;
    complete) action_complete ;;
    report)   action_report   ;;
esac
