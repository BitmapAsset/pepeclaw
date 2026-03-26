#!/usr/bin/env bash
# Pattern Detector — Analyzes session logs for repeated patterns
# Usage: ./pattern-detector.sh <command> [args]
set -euo pipefail

SKILL_DRAFTS_DIR="${OPENCLAW_WORKSPACE:-$HOME/.openclaw}/memory/skill-drafts"
DATA_DIR="${OPENCLAW_DATA:-$HOME/.openclaw/data/pepe}/realtime-skill-creator"
PATTERNS_DIR="$DATA_DIR/patterns"
INSTALLS_DIR="$DATA_DIR/installs"

mkdir -p "$SKILL_DRAFTS_DIR" "$PATTERNS_DIR" "$INSTALLS_DIR"

usage() {
    cat <<EOF
Usage: $(basename "$0") <command> [args]

Commands:
  analyze <session-log>   Analyze a session log for repeated patterns
  list-drafts             List skill drafts awaiting user approval
  install <draft-name>    Install a draft skill to the skills directory
  stats                   Show pattern detection statistics

EOF
}

cmd_analyze() {
    local session_log="${1:?Usage: analyze <session-log>}"

    if [ ! -f "$session_log" ]; then
        echo "Error: Session log not found: $session_log" >&2
        exit 1
    fi

    echo "Analyzing session log: $session_log"
    echo "---"

    # Extract tool call sequences
    local tool_calls
    tool_calls=$(grep -oE '"tool":\s*"[^"]+"' "$session_log" 2>/dev/null | \
        sed 's/"tool":\s*"//;s/"//' | sort | uniq -c | sort -rn)

    if [ -z "$tool_calls" ]; then
        echo "No tool calls found in session log."
        echo "Tip: Session logs should contain JSON entries with \"tool\" fields."
        exit 0
    fi

    echo "Tool call frequency:"
    echo "$tool_calls"
    echo ""

    # Find tools called 3+ times
    local repeated
    repeated=$(echo "$tool_calls" | awk '$1 >= 3 {print $2}')

    if [ -z "$repeated" ]; then
        echo "No patterns detected (threshold: 3+ repetitions)"
        exit 0
    fi

    echo "Repeated patterns detected:"
    for tool in $repeated; do
        local count
        count=$(echo "$tool_calls" | awk -v t="$tool" '$2 == t {print $1}')
        echo "  - $tool: $count times"
    done

    # Log the detection
    local today
    today=$(date +%Y-%m-%d)
    local log_file="$PATTERNS_DIR/${today}.jsonl"
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"session_log\":\"$session_log\",\"patterns\":\"$repeated\"}" >> "$log_file"

    echo ""
    echo "Pattern log saved to: $log_file"
    echo "Use the agent to draft skills for these patterns."
}

cmd_list_drafts() {
    if [ ! -d "$SKILL_DRAFTS_DIR" ] || [ -z "$(ls -A "$SKILL_DRAFTS_DIR" 2>/dev/null)" ]; then
        echo "No skill drafts pending."
        echo "Drafts are created during conversations when patterns are detected."
        exit 0
    fi

    echo "Pending skill drafts:"
    echo "---"
    for draft in "$SKILL_DRAFTS_DIR"/*.md; do
        local name
        name=$(basename "$draft" .md)
        local desc
        desc=$(grep -m1 "^description:" "$draft" 2>/dev/null | sed 's/description:\s*//' || echo "No description")
        echo "  $name — $desc"
    done
    echo ""
    echo "Install with: $(basename "$0") install <draft-name>"
}

cmd_install() {
    local draft_name="${1:?Usage: install <draft-name>}"
    local draft_file="$SKILL_DRAFTS_DIR/${draft_name}.md"

    if [ ! -f "$draft_file" ]; then
        echo "Error: Draft not found: $draft_file" >&2
        echo "Run 'list-drafts' to see available drafts." >&2
        exit 1
    fi

    local skill_dir="${OPENCLAW_WORKSPACE:-$HOME/.openclaw}/skills/$draft_name"
    mkdir -p "$skill_dir/scripts" "$skill_dir/references"

    cp "$draft_file" "$skill_dir/SKILL.md"
    chmod +x "$skill_dir/scripts/"*.sh 2>/dev/null || true

    # Log the installation
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"draft\":\"$draft_name\",\"installed_to\":\"$skill_dir\"}" \
        >> "$INSTALLS_DIR/installs.jsonl"

    echo "Skill installed: $draft_name → $skill_dir"
    echo "Draft removed from pending."
    rm -f "$draft_file"
}

cmd_stats() {
    echo "Real-Time Skill Creator — Statistics"
    echo "---"

    local draft_count=0
    if [ -d "$SKILL_DRAFTS_DIR" ]; then
        draft_count=$(find "$SKILL_DRAFTS_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    fi
    echo "Pending drafts: $draft_count"

    local install_count=0
    if [ -f "$INSTALLS_DIR/installs.jsonl" ]; then
        install_count=$(wc -l < "$INSTALLS_DIR/installs.jsonl" | tr -d ' ')
    fi
    echo "Total installed: $install_count"

    local pattern_files=0
    if [ -d "$PATTERNS_DIR" ]; then
        pattern_files=$(find "$PATTERNS_DIR" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
    fi
    echo "Pattern log files: $pattern_files"
}

# Main
case "${1:-}" in
    analyze)     shift; cmd_analyze "$@" ;;
    list-drafts) cmd_list_drafts ;;
    install)     shift; cmd_install "$@" ;;
    stats)       cmd_stats ;;
    *)           usage ;;
esac
