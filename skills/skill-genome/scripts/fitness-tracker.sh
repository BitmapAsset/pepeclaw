#!/usr/bin/env bash
# fitness-tracker.sh — Track skill invocations and compute fitness scores
# Part of the Skill Genome System for Pepe 2.0
#
# Usage:
#   fitness-tracker.sh log <skill> <outcome> [session] [co_skills...]
#   fitness-tracker.sh score <skill>
#   fitness-tracker.sh scores
#   fitness-tracker.sh leaderboard
#   fitness-tracker.sh dead [threshold]
#   fitness-tracker.sh cooccurrence [min_count]
#
# Outcomes: accepted, edited, rejected

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${SKILL_DIR}/data"
LOG_FILE="${DATA_DIR}/fitness-log.jsonl"
LEADERBOARD_FILE="${SKILL_DIR}/SKILL_FITNESS.md"

EVAL_WINDOW_DAYS="${GENOME_EVAL_WINDOW:-30}"

mkdir -p "$DATA_DIR"
touch "$LOG_FILE"

usage() {
    cat <<'EOF'
Usage:
  fitness-tracker.sh log <skill> <outcome> [session] [co_skills...]
  fitness-tracker.sh score <skill>
  fitness-tracker.sh scores
  fitness-tracker.sh leaderboard
  fitness-tracker.sh dead [threshold]
  fitness-tracker.sh cooccurrence [min_count]

Commands:
  log           Record a skill invocation outcome (accepted/edited/rejected)
  score         Compute fitness score for a single skill
  scores        Compute fitness scores for all skills
  leaderboard   Generate SKILL_FITNESS.md leaderboard
  dead          List dead skills (usage_frequency < threshold, default 0.05)
  cooccurrence  Find frequently co-occurring skill pairs
EOF
    exit 1
}

# Log a skill invocation
cmd_log() {
    local skill="${1:?Missing skill name}"
    local outcome="${2:?Missing outcome (accepted/edited/rejected)}"
    local session="${3:-$(date +%s)}"
    shift 3 2>/dev/null || true
    local co_skills=("$@")

    # Validate outcome
    case "$outcome" in
        accepted|edited|rejected) ;;
        *) echo "Error: outcome must be accepted, edited, or rejected" >&2; exit 1 ;;
    esac

    # Build co_skills JSON array
    local co_json="[]"
    if [ ${#co_skills[@]} -gt 0 ]; then
        co_json=$(printf '%s\n' "${co_skills[@]}" | jq -R . | jq -s .)
    fi

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local entry
    entry=$(jq -n -c \
        --arg ts "$timestamp" \
        --arg sk "$skill" \
        --arg oc "$outcome" \
        --arg se "$session" \
        --argjson co "$co_json" \
        '{timestamp:$ts, skill:$sk, outcome:$oc, session:$se, co_skills:$co}')

    echo "$entry" >> "$LOG_FILE"
    echo "Logged: $skill → $outcome"
}

# Get entries within the evaluation window
get_window_entries() {
    local cutoff_ts
    if [[ "$(uname)" == "Darwin" ]]; then
        cutoff_ts=$(date -u -v-"${EVAL_WINDOW_DAYS}"d +"%Y-%m-%dT%H:%M:%SZ")
    else
        cutoff_ts=$(date -u -d "-${EVAL_WINDOW_DAYS} days" +"%Y-%m-%dT%H:%M:%SZ")
    fi
    jq -c --arg cutoff "$cutoff_ts" 'select(.timestamp >= $cutoff)' "$LOG_FILE" 2>/dev/null || true
}

# Compute fitness for a single skill
cmd_score() {
    local skill="${1:?Missing skill name}"
    local entries
    entries=$(get_window_entries | jq -c --arg sk "$skill" 'select(.skill == $sk)')

    if [ -z "$entries" ]; then
        echo '{"skill":"'"$skill"'","fitness":0.5,"success_rate":0,"usage_frequency":0,"satisfaction":0,"total_invocations":0,"accepted":0,"edited":0,"rejected":0}'
        return
    fi

    # Count outcomes
    local accepted edited rejected total
    accepted=$(echo "$entries" | jq -s '[.[] | select(.outcome=="accepted")] | length')
    edited=$(echo "$entries" | jq -s '[.[] | select(.outcome=="edited")] | length')
    rejected=$(echo "$entries" | jq -s '[.[] | select(.outcome=="rejected")] | length')
    total=$((accepted + edited + rejected))

    if [ "$total" -eq 0 ]; then
        echo '{"skill":"'"$skill"'","fitness":0.5,"success_rate":0,"usage_frequency":0,"satisfaction":0,"total_invocations":0,"accepted":0,"edited":0,"rejected":0}'
        return
    fi

    # Get max invocations across all skills for normalization
    local max_invocations
    max_invocations=$(get_window_entries | jq -s 'group_by(.skill) | map(length) | max // 1')

    # Compute components using awk for float math
    local success_rate usage_freq satisfaction fitness
    if [ $((accepted + rejected)) -gt 0 ]; then
        success_rate=$(awk "BEGIN {printf \"%.4f\", $accepted / ($accepted + $rejected)}")
    else
        success_rate="1.0000"
    fi
    usage_freq=$(awk "BEGIN {printf \"%.4f\", $total / $max_invocations}")
    satisfaction=$(awk "BEGIN {printf \"%.4f\", ($accepted + 0.5 * $edited) / $total}")
    fitness=$(awk "BEGIN {printf \"%.4f\", 0.5 * $success_rate + 0.3 * $usage_freq + 0.2 * $satisfaction}")

    local last_ts
    last_ts=$(echo "$entries" | jq -s 'sort_by(.timestamp) | last | .timestamp' -r)

    jq -n -c \
        --arg sk "$skill" \
        --argjson fi "$fitness" \
        --argjson sr "$success_rate" \
        --argjson uf "$usage_freq" \
        --argjson sa "$satisfaction" \
        --argjson ti "$total" \
        --argjson ac "$accepted" \
        --argjson ed "$edited" \
        --argjson re "$rejected" \
        --arg lt "$last_ts" \
        --argjson pd "$EVAL_WINDOW_DAYS" \
        '{skill:$sk, fitness:$fi, success_rate:$sr, usage_frequency:$uf, satisfaction:$sa, total_invocations:$ti, accepted:$ac, edited:$ed, rejected:$re, last_invocation:$lt, period_days:$pd}'
}

# Compute scores for all tracked skills
cmd_scores() {
    local skills
    skills=$(get_window_entries | jq -r '.skill' | sort -u)

    if [ -z "$skills" ]; then
        echo "[]"
        return
    fi

    local results="["
    local first=true
    while IFS= read -r skill; do
        if [ "$first" = true ]; then
            first=false
        else
            results+=","
        fi
        results+=$(cmd_score "$skill")
    done <<< "$skills"
    results+="]"

    echo "$results" | jq -s '.[0] | sort_by(-.fitness)'
}

# Generate the SKILL_FITNESS.md leaderboard
cmd_leaderboard() {
    local scores
    scores=$(cmd_scores)

    local now
    now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "$LEADERBOARD_FILE" <<EOF
# Skill Fitness Leaderboard

> Auto-generated by the Skill Genome System on ${now}
> Evaluation window: ${EVAL_WINDOW_DAYS} days

| Rank | Skill | Fitness | Success Rate | Usage | Satisfaction | Invocations | Accepted | Edited | Rejected |
|------|-------|---------|--------------|-------|--------------|-------------|----------|--------|----------|
EOF

    local rank=1
    echo "$scores" | jq -c '.[]' 2>/dev/null | while IFS= read -r row; do
        local skill fitness sr uf sa ti ac ed re
        skill=$(echo "$row" | jq -r '.skill')
        fitness=$(echo "$row" | jq -r '.fitness | . * 100 | round / 100')
        sr=$(echo "$row" | jq -r '.success_rate | . * 100 | round / 100')
        uf=$(echo "$row" | jq -r '.usage_frequency | . * 100 | round / 100')
        sa=$(echo "$row" | jq -r '.satisfaction | . * 100 | round / 100')
        ti=$(echo "$row" | jq -r '.total_invocations')
        ac=$(echo "$row" | jq -r '.accepted')
        ed=$(echo "$row" | jq -r '.edited')
        re=$(echo "$row" | jq -r '.rejected')

        echo "| ${rank} | ${skill} | ${fitness} | ${sr} | ${uf} | ${sa} | ${ti} | ${ac} | ${ed} | ${re} |" >> "$LEADERBOARD_FILE"
        rank=$((rank + 1))
    done

    echo "" >> "$LEADERBOARD_FILE"
    echo "## Legend" >> "$LEADERBOARD_FILE"
    echo "- **Fitness**: Composite score (0.5×success + 0.3×usage + 0.2×satisfaction)" >> "$LEADERBOARD_FILE"
    echo "- **Success Rate**: accepted / (accepted + rejected)" >> "$LEADERBOARD_FILE"
    echo "- **Usage**: Normalized invocation count relative to most-used skill" >> "$LEADERBOARD_FILE"
    echo "- **Satisfaction**: (accepted + 0.5×edited) / total" >> "$LEADERBOARD_FILE"

    echo "Leaderboard written to ${LEADERBOARD_FILE}"
}

# List dead skills (usage below threshold)
cmd_dead() {
    local threshold="${1:-0.05}"
    local scores
    scores=$(cmd_scores)

    echo "$scores" | jq -c --argjson t "$threshold" '.[] | select(.usage_frequency < $t)' 2>/dev/null
}

# Find co-occurring skill pairs
cmd_cooccurrence() {
    local min_count="${1:-3}"

    get_window_entries | jq -s '
        [.[] | select(.co_skills | length > 0) |
            {skill, co_skills: .co_skills[]} |
            [.skill, .co_skills] | sort | join(" + ")] |
        group_by(.) |
        map({pair: .[0], count: length}) |
        sort_by(-.count) |
        [.[] | select(.count >= '"$min_count"')]
    ' 2>/dev/null || echo "[]"
}

# Main dispatch
case "${1:-}" in
    log)          shift; cmd_log "$@" ;;
    score)        shift; cmd_score "$@" ;;
    scores)       cmd_scores ;;
    leaderboard)  cmd_leaderboard ;;
    dead)         shift; cmd_dead "$@" ;;
    cooccurrence) shift; cmd_cooccurrence "$@" ;;
    *)            usage ;;
esac
