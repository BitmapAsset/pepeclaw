#!/usr/bin/env bash
# mutation-engine.sh — Rewrite underperforming skills via subagent mutation
# Part of the Skill Genome System for Pepe 2.0
#
# Usage:
#   mutation-engine.sh mutate <skill_dir>         Mutate a specific skill
#   mutation-engine.sh candidates                  List mutation candidates (bottom 20%)
#   mutation-engine.sh crossover <skill_a> <skill_b>  Generate a fused skill
#   mutation-engine.sh rollback <skill_dir>        Rollback to previous version
#   mutation-engine.sh archive <skill_dir>         Archive a dead skill

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_GENOME_DIR="$(dirname "$SCRIPT_DIR")"
ARCHIVE_DIR="${SKILL_GENOME_DIR}/archive"
DATA_DIR="${SKILL_GENOME_DIR}/data"
FITNESS_TRACKER="${SCRIPT_DIR}/fitness-tracker.sh"
SKILLS_ROOT="$(dirname "$SKILL_GENOME_DIR")"

mkdir -p "$ARCHIVE_DIR" "$DATA_DIR"

usage() {
    cat <<'EOF'
Usage:
  mutation-engine.sh mutate <skill_dir>            Mutate a specific skill
  mutation-engine.sh candidates                     List mutation candidates (bottom 20%)
  mutation-engine.sh crossover <skill_a> <skill_b>  Generate a fused skill
  mutation-engine.sh rollback <skill_dir>           Rollback to previous version
  mutation-engine.sh archive <skill_dir>            Archive a dead skill
EOF
    exit 1
}

# Extract genome YAML from a SKILL.md
extract_genome() {
    local skill_md="$1"
    if [ ! -f "$skill_md" ]; then
        echo "Error: $skill_md not found" >&2
        return 1
    fi
    # Extract YAML frontmatter between --- delimiters
    sed -n '/^---$/,/^---$/p' "$skill_md" | sed '1d;$d'
}

# Get the skill name from SKILL.md frontmatter
get_skill_name() {
    local skill_md="$1"
    extract_genome "$skill_md" | grep '^name:' | sed 's/^name: *//' | tr -d '"'"'"
}

# Get current genome version
get_genome_version() {
    local skill_md="$1"
    extract_genome "$skill_md" | grep '  version:' | head -1 | sed 's/.*version: *//' | tr -d ' '
}

# List mutation candidates — bottom 20% by fitness
cmd_candidates() {
    local all_scores
    all_scores=$("$FITNESS_TRACKER" scores 2>/dev/null)

    if [ "$all_scores" = "[]" ] || [ -z "$all_scores" ]; then
        echo "No fitness data available yet."
        return
    fi

    local total
    total=$(echo "$all_scores" | jq 'length')

    if [ "$total" -eq 0 ]; then
        echo "No skills tracked."
        return
    fi

    # Bottom 20% (at least 1)
    local bottom_count
    bottom_count=$(awk "BEGIN {c = int($total * 0.2); if (c < 1) c = 1; print c}")

    echo "$all_scores" | jq -c "sort_by(.fitness) | .[:$bottom_count] | .[]"
}

# Archive current SKILL.md before mutation
archive_skill() {
    local skill_md="$1"
    local skill_name
    skill_name=$(get_skill_name "$skill_md")
    local version
    version=$(get_genome_version "$skill_md")

    local archive_path="${ARCHIVE_DIR}/${skill_name}_v${version}_$(date +%Y%m%d).md"
    cp "$skill_md" "$archive_path"
    echo "Archived: ${archive_path}"
}

# Generate mutation prompt for the subagent
generate_mutation_prompt() {
    local skill_md="$1"
    local skill_name
    skill_name=$(get_skill_name "$skill_md")

    # Get failure logs for this skill
    local failures
    failures=$(jq -c --arg sk "$skill_name" 'select(.skill == $sk and (.outcome == "rejected" or .outcome == "edited"))' "${DATA_DIR}/fitness-log.jsonl" 2>/dev/null | tail -20)

    local current_content
    current_content=$(cat "$skill_md")

    local score_data
    score_data=$("$FITNESS_TRACKER" score "$skill_name" 2>/dev/null)

    cat <<PROMPT
You are the Skill Genome Mutation Engine. Your job is to rewrite an underperforming skill to improve its fitness.

## Current Skill (${skill_name})
\`\`\`markdown
${current_content}
\`\`\`

## Fitness Data
\`\`\`json
${score_data}
\`\`\`

## Recent Failures/Edits (last 20)
\`\`\`json
${failures}
\`\`\`

## Instructions
1. Analyze why this skill is underperforming based on the failure/edit logs
2. Rewrite the skill to address the identified issues
3. Preserve the genome header but increment version by 1 and mutations by 1
4. Update last_mutated to today's date
5. Keep the same name and tags
6. Output ONLY the complete new SKILL.md content, nothing else

Focus on:
- Clearer trigger descriptions
- Better prompt engineering
- More specific instructions
- Addressing patterns in the failure logs
PROMPT
}

# Mutate a skill
cmd_mutate() {
    local skill_dir="${1:?Missing skill directory path}"
    local skill_md="${skill_dir}/SKILL.md"

    if [ ! -f "$skill_md" ]; then
        echo "Error: ${skill_md} not found" >&2
        exit 1
    fi

    local skill_name
    skill_name=$(get_skill_name "$skill_md")
    echo "Mutating skill: ${skill_name}"

    # Archive current version
    archive_skill "$skill_md"

    # Generate the mutation prompt
    local prompt_file="${DATA_DIR}/mutation-prompt-${skill_name}.md"
    generate_mutation_prompt "$skill_md" > "$prompt_file"

    echo "Mutation prompt generated: ${prompt_file}"
    echo ""
    echo "To execute the mutation, run a subagent with this prompt:"
    echo "  openclaw agent run --prompt-file '${prompt_file}' --output '${skill_md}'"
    echo ""
    echo "Or apply manually by editing ${skill_md} based on the analysis."
    echo ""

    # Update genome metadata (version, mutations, last_mutated) in place
    # This happens after the subagent writes the new content
    local version
    version=$(get_genome_version "$skill_md")
    local new_version=$((version + 1))
    local today
    today=$(date +%Y-%m-%d)

    echo "After mutation, update genome header:"
    echo "  version: ${new_version}"
    echo "  mutations: +1"
    echo "  last_mutated: ${today}"

    # Log the mutation event
    local entry
    entry=$(jq -n -c \
        --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --arg sk "$skill_name" \
        --arg oc "mutation" \
        --argjson ver "$new_version" \
        '{timestamp:$ts, skill:$sk, event:"mutation", new_version:$ver}')
    echo "$entry" >> "${DATA_DIR}/mutation-log.jsonl"

    echo "Mutation initiated for ${skill_name} (v${version} → v${new_version})"
}

# Apply genome metadata updates after mutation
apply_mutation_metadata() {
    local skill_md="$1"
    local version
    version=$(get_genome_version "$skill_md")
    local new_version=$((version + 1))
    local today
    today=$(date +%Y-%m-%d)

    # Use sed to update version, mutations, and last_mutated in the frontmatter
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/  version: ${version}/  version: ${new_version}/" "$skill_md"
        sed -i '' "s/  last_mutated: .*/  last_mutated: ${today}/" "$skill_md"
    else
        sed -i "s/  version: ${version}/  version: ${new_version}/" "$skill_md"
        sed -i "s/  last_mutated: .*/  last_mutated: ${today}/" "$skill_md"
    fi

    # Increment mutations count
    local current_mutations
    current_mutations=$(extract_genome "$skill_md" | grep '  mutations:' | sed 's/.*mutations: *//' | tr -d ' ')
    local new_mutations=$((current_mutations + 1))
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s/  mutations: ${current_mutations}/  mutations: ${new_mutations}/" "$skill_md"
    else
        sed -i "s/  mutations: ${current_mutations}/  mutations: ${new_mutations}/" "$skill_md"
    fi

    echo "Updated genome: version=${new_version}, mutations=${new_mutations}, last_mutated=${today}"
}

# Generate a crossover (fused) skill from two parents
cmd_crossover() {
    local skill_a_name="${1:?Missing first skill name}"
    local skill_b_name="${2:?Missing second skill name}"

    local skill_a_dir="${SKILLS_ROOT}/${skill_a_name}"
    local skill_b_dir="${SKILLS_ROOT}/${skill_b_name}"

    if [ ! -f "${skill_a_dir}/SKILL.md" ] || [ ! -f "${skill_b_dir}/SKILL.md" ]; then
        echo "Error: Both skills must exist in ${SKILLS_ROOT}/" >&2
        exit 1
    fi

    local fused_name="${skill_a_name}-${skill_b_name}"
    local fused_dir="${SKILLS_ROOT}/${fused_name}"

    if [ -d "$fused_dir" ]; then
        echo "Error: Fused skill ${fused_name} already exists" >&2
        exit 1
    fi

    mkdir -p "$fused_dir"

    local content_a content_b
    content_a=$(cat "${skill_a_dir}/SKILL.md")
    content_b=$(cat "${skill_b_dir}/SKILL.md")

    local today
    today=$(date +%Y-%m-%d)

    # Generate crossover prompt
    local prompt_file="${DATA_DIR}/crossover-prompt-${fused_name}.md"
    cat > "$prompt_file" <<PROMPT
You are the Skill Genome Crossover Engine. Your job is to fuse two skills into a new combined skill.

## Parent Skill A (${skill_a_name})
\`\`\`markdown
${content_a}
\`\`\`

## Parent Skill B (${skill_b_name})
\`\`\`markdown
${content_b}
\`\`\`

## Instructions
1. Create a new SKILL.md that combines the capabilities of both parent skills
2. The fused skill should be more than the sum of its parts — find synergies
3. Use this genome header:

\`\`\`yaml
---
name: ${fused_name}
description: Fused skill combining ${skill_a_name} and ${skill_b_name}.
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: "${skill_a_name} + ${skill_b_name}"
    created: ${today}
    last_mutated: null
    generation: 2
  tags: [combined from both parents]
  dependencies: [combined from both parents]
---
\`\`\`

4. Output ONLY the complete SKILL.md content
PROMPT

    echo "Crossover prompt generated: ${prompt_file}"
    echo "Target directory: ${fused_dir}"
    echo ""
    echo "To execute the crossover, run a subagent with this prompt:"
    echo "  openclaw agent run --prompt-file '${prompt_file}' --output '${fused_dir}/SKILL.md'"

    # Log the crossover event
    local entry
    entry=$(jq -n -c \
        --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --arg sa "$skill_a_name" \
        --arg sb "$skill_b_name" \
        --arg fn "$fused_name" \
        '{timestamp:$ts, event:"crossover", parent_a:$sa, parent_b:$sb, fused:$fn}')
    echo "$entry" >> "${DATA_DIR}/mutation-log.jsonl"
}

# Rollback a skill to its previous archived version
cmd_rollback() {
    local skill_dir="${1:?Missing skill directory path}"
    local skill_md="${skill_dir}/SKILL.md"

    if [ ! -f "$skill_md" ]; then
        echo "Error: ${skill_md} not found" >&2
        exit 1
    fi

    local skill_name
    skill_name=$(get_skill_name "$skill_md")

    # Find the most recent archive for this skill
    local latest_archive
    latest_archive=$(ls -t "${ARCHIVE_DIR}/${skill_name}_v"* 2>/dev/null | head -1)

    if [ -z "$latest_archive" ]; then
        echo "Error: No archive found for ${skill_name}" >&2
        exit 1
    fi

    echo "Rolling back ${skill_name} to: ${latest_archive}"
    cp "$latest_archive" "$skill_md"

    # Log the rollback
    local entry
    entry=$(jq -n -c \
        --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --arg sk "$skill_name" \
        --arg ar "$latest_archive" \
        '{timestamp:$ts, skill:$sk, event:"rollback", archive:$ar}')
    echo "$entry" >> "${DATA_DIR}/mutation-log.jsonl"

    echo "Rollback complete."
}

# Archive a dead skill
cmd_archive() {
    local skill_dir="${1:?Missing skill directory path}"
    local skill_md="${skill_dir}/SKILL.md"

    if [ ! -f "$skill_md" ]; then
        echo "Error: ${skill_md} not found" >&2
        exit 1
    fi

    local skill_name
    skill_name=$(get_skill_name "$skill_md")
    local archive_path="${ARCHIVE_DIR}/${skill_name}_dead_$(date +%Y%m%d)"

    # Move entire skill directory to archive
    mv "$skill_dir" "$archive_path"

    # Log the archival
    local entry
    entry=$(jq -n -c \
        --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --arg sk "$skill_name" \
        --arg ar "$archive_path" \
        '{timestamp:$ts, skill:$sk, event:"archived", archive:$ar}')
    echo "$entry" >> "${DATA_DIR}/mutation-log.jsonl"

    # Add tombstone to fitness log
    local tombstone
    tombstone=$(jq -n -c \
        --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --arg sk "$skill_name" \
        '{timestamp:$ts, skill:$sk, outcome:"archived"}')
    echo "$tombstone" >> "${DATA_DIR}/fitness-log.jsonl"

    echo "Archived dead skill: ${skill_name} → ${archive_path}"
}

# Main dispatch
case "${1:-}" in
    mutate)     shift; cmd_mutate "$@" ;;
    candidates) cmd_candidates ;;
    crossover)  shift; cmd_crossover "$@" ;;
    rollback)   shift; cmd_rollback "$@" ;;
    archive)    shift; cmd_archive "$@" ;;
    apply-meta) shift; apply_mutation_metadata "$@" ;;
    *)          usage ;;
esac
