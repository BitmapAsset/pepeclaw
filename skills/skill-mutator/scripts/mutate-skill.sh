#!/usr/bin/env bash
# Skill Mutator — Safely edit SKILL.md files with backup and logging
# Usage: ./mutate-skill.sh <command> [args]
set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw}"
SKILL_DIR="$WORKSPACE/skills"
DATA_DIR="${OPENCLAW_DATA:-$HOME/.openclaw/data/pepe}/skill-mutations"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="$DATA_DIR/${TODAY}.jsonl"

mkdir -p "$DATA_DIR"

usage() {
    cat <<EOF
Usage: $(basename "$0") <command> [args]

Commands:
  <skill-name> <section> "<description>"   Apply a mutation
  history <skill-name>                      View mutation history
  rollback <skill-name> [timestamp]         Rollback to a backup
  today                                     View today's mutations
  stats                                     Mutation statistics

EOF
}

cmd_mutate() {
    local skill_name="${1:?Skill name required}"
    local section="${2:?Section name required}"
    local description="${3:?Fix description required}"
    local skill_file="$SKILL_DIR/$skill_name/SKILL.md"

    if [ ! -f "$skill_file" ]; then
        echo "Error: Skill not found: $skill_file" >&2
        exit 1
    fi

    # Safety: never mutate the mutator
    if [ "$skill_name" = "skill-mutator" ]; then
        echo "Error: Cannot mutate the skill-mutator (self-modification prohibited)" >&2
        exit 1
    fi

    # Create backup
    local timestamp
    timestamp=$(date +%Y%m%d%H%M%S)
    local backup_file="${skill_file}.backup.${timestamp}"
    cp "$skill_file" "$backup_file"
    echo "Backup created: $backup_file"

    # Log the mutation (before/after will be filled by the agent)
    local log_entry
    log_entry=$(cat <<ENTRY
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","skill":"$skill_name","section":"$section","description":"$description","backup":"$backup_file","status":"pending"}
ENTRY
    )
    echo "$log_entry" >> "$LOG_FILE"

    echo "Mutation logged. The agent should now edit: $skill_file"
    echo "Section to update: $section"
    echo "Description: $description"
}

cmd_history() {
    local skill_name="${1:?Skill name required}"

    echo "Mutation history for: $skill_name"
    echo "---"

    local found=0
    for log in "$DATA_DIR"/*.jsonl; do
        [ -f "$log" ] || continue
        local matches
        matches=$(grep "\"skill\":\"$skill_name\"" "$log" 2>/dev/null || true)
        if [ -n "$matches" ]; then
            echo "$matches" | while IFS= read -r line; do
                local ts desc
                ts=$(echo "$line" | grep -oE '"timestamp":"[^"]+"' | cut -d'"' -f4)
                desc=$(echo "$line" | grep -oE '"description":"[^"]+"' | cut -d'"' -f4)
                echo "  [$ts] $desc"
            done
            found=1
        fi
    done

    if [ "$found" -eq 0 ]; then
        echo "  No mutations recorded."
    fi
}

cmd_rollback() {
    local skill_name="${1:?Skill name required}"
    local skill_file="$SKILL_DIR/$skill_name/SKILL.md"

    if [ ! -f "$skill_file" ]; then
        echo "Error: Skill not found: $skill_file" >&2
        exit 1
    fi

    # Find most recent backup or use specified timestamp
    local timestamp="${2:-}"
    local backup_file

    if [ -n "$timestamp" ]; then
        backup_file="${skill_file}.backup.${timestamp}"
    else
        backup_file=$(ls -t "${skill_file}.backup."* 2>/dev/null | head -1)
    fi

    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        echo "Error: No backup found for $skill_name" >&2
        exit 1
    fi

    cp "$backup_file" "$skill_file"
    echo "Rolled back $skill_name to: $(basename "$backup_file")"

    # Log the rollback
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"skill\":\"$skill_name\",\"action\":\"rollback\",\"backup\":\"$backup_file\"}" >> "$LOG_FILE"
}

cmd_today() {
    if [ ! -f "$LOG_FILE" ]; then
        echo "No mutations today."
        exit 0
    fi

    echo "Mutations on $TODAY:"
    echo "---"
    while IFS= read -r line; do
        local skill desc
        skill=$(echo "$line" | grep -oE '"skill":"[^"]+"' | cut -d'"' -f4)
        desc=$(echo "$line" | grep -oE '"description":"[^"]+"' | cut -d'"' -f4)
        echo "  [$skill] $desc"
    done < "$LOG_FILE"
}

cmd_stats() {
    echo "Skill Mutation Statistics"
    echo "---"

    local total=0
    local files=0
    for log in "$DATA_DIR"/*.jsonl; do
        [ -f "$log" ] || continue
        local count
        count=$(wc -l < "$log" | tr -d ' ')
        total=$((total + count))
        files=$((files + 1))
    done

    echo "Total mutations: $total"
    echo "Log files: $files"

    if [ "$total" -gt 0 ]; then
        echo ""
        echo "Most mutated skills:"
        cat "$DATA_DIR"/*.jsonl 2>/dev/null | \
            grep -oE '"skill":"[^"]+"' | \
            sort | uniq -c | sort -rn | head -5 | \
            while read -r count skill; do
                skill_name=$(echo "$skill" | cut -d'"' -f4)
                echo "  $skill_name: $count mutations"
            done
    fi
}

# Main
case "${1:-}" in
    history)  shift; cmd_history "$@" ;;
    rollback) shift; cmd_rollback "$@" ;;
    today)    cmd_today ;;
    stats)    cmd_stats ;;
    -h|--help|"") usage ;;
    *)        cmd_mutate "$@" ;;
esac
