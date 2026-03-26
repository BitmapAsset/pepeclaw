#!/usr/bin/env bash
# evolution-cycle.sh — Weekly cron script that runs the full skill evolution cycle
# Part of the Skill Genome System for Pepe 2.0
#
# Usage:
#   evolution-cycle.sh [--dry-run]
#
# Cron schedule (weekly, Sunday 3 AM):
#   0 3 * * 0 /path/to/evolution-cycle.sh >> /path/to/data/evolution.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_GENOME_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="${SKILL_GENOME_DIR}/data"
ARCHIVE_DIR="${SKILL_GENOME_DIR}/archive"
SKILLS_ROOT="$(dirname "$SKILL_GENOME_DIR")"
FITNESS_TRACKER="${SCRIPT_DIR}/fitness-tracker.sh"
MUTATION_ENGINE="${SCRIPT_DIR}/mutation-engine.sh"
EVOLUTION_LOG="${DATA_DIR}/evolution.log"
REPORT_FILE="${DATA_DIR}/evolution-report-$(date +%Y%m%d).md"

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
    DRY_RUN=true
fi

mkdir -p "$DATA_DIR" "$ARCHIVE_DIR"

log() {
    local msg="[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $1"
    echo "$msg"
    echo "$msg" >> "$EVOLUTION_LOG"
}

log "=========================================="
log "EVOLUTION CYCLE START $(if $DRY_RUN; then echo '(DRY RUN)'; fi)"
log "=========================================="

# ─── Phase 1: Compute Fitness Scores ────────────────────────────────────────

log "Phase 1: Computing fitness scores..."
ALL_SCORES=$("$FITNESS_TRACKER" scores 2>/dev/null || echo "[]")
TOTAL_SKILLS=$(echo "$ALL_SCORES" | jq 'length' 2>/dev/null || echo 0)
log "  Tracked skills: ${TOTAL_SKILLS}"

if [ "$TOTAL_SKILLS" -eq 0 ]; then
    log "  No skills tracked yet. Skipping evolution."
    log "EVOLUTION CYCLE END (nothing to do)"
    exit 0
fi

# ─── Phase 2: Generate Leaderboard ──────────────────────────────────────────

log "Phase 2: Generating fitness leaderboard..."
if ! $DRY_RUN; then
    "$FITNESS_TRACKER" leaderboard
    log "  Leaderboard written."
else
    log "  [DRY RUN] Would generate leaderboard."
fi

# ─── Phase 3: Identify Mutation Candidates ──────────────────────────────────

log "Phase 3: Identifying mutation candidates (bottom 20%)..."
CANDIDATES=$("$MUTATION_ENGINE" candidates 2>/dev/null || echo "")
CANDIDATE_COUNT=0
CANDIDATE_NAMES=""

if [ -n "$CANDIDATES" ]; then
    CANDIDATE_COUNT=$(echo "$CANDIDATES" | wc -l | tr -d ' ')
    CANDIDATE_NAMES=$(echo "$CANDIDATES" | jq -r '.skill' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
fi

log "  Mutation candidates (${CANDIDATE_COUNT}): ${CANDIDATE_NAMES:-none}"

# ─── Phase 4: Mutate Underperforming Skills ─────────────────────────────────

log "Phase 4: Processing mutations..."
MUTATIONS_INITIATED=0

if [ -n "$CANDIDATES" ]; then
    echo "$CANDIDATES" | while IFS= read -r candidate; do
        local_skill=$(echo "$candidate" | jq -r '.skill')
        local_fitness=$(echo "$candidate" | jq -r '.fitness')
        local_skill_dir="${SKILLS_ROOT}/${local_skill}"

        if [ ! -d "$local_skill_dir" ]; then
            log "  SKIP: ${local_skill} (directory not found at ${local_skill_dir})"
            continue
        fi

        if [ ! -f "${local_skill_dir}/SKILL.md" ]; then
            log "  SKIP: ${local_skill} (no SKILL.md)"
            continue
        fi

        log "  MUTATE: ${local_skill} (fitness: ${local_fitness})"
        if ! $DRY_RUN; then
            "$MUTATION_ENGINE" mutate "$local_skill_dir" 2>&1 | while IFS= read -r line; do
                log "    ${line}"
            done
            MUTATIONS_INITIATED=$((MUTATIONS_INITIATED + 1))
        else
            log "    [DRY RUN] Would mutate ${local_skill}"
        fi
    done
fi

log "  Mutations initiated: ${MUTATIONS_INITIATED}"

# ─── Phase 5: Detect Crossover Candidates ───────────────────────────────────

log "Phase 5: Detecting crossover candidates..."
COOCCURRENCES=$("$FITNESS_TRACKER" cooccurrence 3 2>/dev/null || echo "[]")
COOCCURRENCE_COUNT=$(echo "$COOCCURRENCES" | jq 'length' 2>/dev/null || echo 0)
log "  Co-occurring skill pairs (3+ sessions): ${COOCCURRENCE_COUNT}"

if [ "$COOCCURRENCE_COUNT" -gt 0 ]; then
    echo "$COOCCURRENCES" | jq -c '.[]' 2>/dev/null | while IFS= read -r pair; do
        local_pair_name=$(echo "$pair" | jq -r '.pair')
        local_count=$(echo "$pair" | jq -r '.count')
        log "  CROSSOVER CANDIDATE: ${local_pair_name} (co-occurred ${local_count} times)"
    done
fi

# ─── Phase 6: Prune Dead Skills ────────────────────────────────────────────

log "Phase 6: Checking for dead skills (< 5% usage)..."
DEAD_SKILLS=$("$FITNESS_TRACKER" dead 0.05 2>/dev/null || echo "")
DEAD_COUNT=0

if [ -n "$DEAD_SKILLS" ]; then
    DEAD_COUNT=$(echo "$DEAD_SKILLS" | wc -l | tr -d ' ')
fi

log "  Dead skills found: ${DEAD_COUNT}"

if [ -n "$DEAD_SKILLS" ]; then
    echo "$DEAD_SKILLS" | while IFS= read -r dead; do
        local_skill=$(echo "$dead" | jq -r '.skill')
        local_freq=$(echo "$dead" | jq -r '.usage_frequency')
        local_skill_dir="${SKILLS_ROOT}/${local_skill}"

        log "  DEAD: ${local_skill} (usage: ${local_freq})"
        if ! $DRY_RUN && [ -d "$local_skill_dir" ]; then
            "$MUTATION_ENGINE" archive "$local_skill_dir" 2>&1 | while IFS= read -r line; do
                log "    ${line}"
            done
        else
            log "    [DRY RUN] Would archive ${local_skill}"
        fi
    done
fi

# ─── Phase 7: Check for Rollback Candidates ────────────────────────────────

log "Phase 7: Checking for rollback candidates..."
MUTATION_LOG="${DATA_DIR}/mutation-log.jsonl"

if [ -f "$MUTATION_LOG" ]; then
    # Find skills mutated 14+ days ago whose fitness declined
    FOURTEEN_DAYS_AGO=""
    if [[ "$(uname)" == "Darwin" ]]; then
        FOURTEEN_DAYS_AGO=$(date -u -v-14d +"%Y-%m-%dT%H:%M:%SZ")
    else
        FOURTEEN_DAYS_AGO=$(date -u -d "-14 days" +"%Y-%m-%dT%H:%M:%SZ")
    fi

    RECENT_MUTATIONS=$(jq -c --arg cutoff "$FOURTEEN_DAYS_AGO" \
        'select(.event == "mutation" and .timestamp <= $cutoff)' "$MUTATION_LOG" 2>/dev/null || true)

    if [ -n "$RECENT_MUTATIONS" ]; then
        echo "$RECENT_MUTATIONS" | while IFS= read -r mutation; do
            local_skill=$(echo "$mutation" | jq -r '.skill')
            local_score_data=$("$FITNESS_TRACKER" score "$local_skill" 2>/dev/null)
            local_current_fitness=$(echo "$local_score_data" | jq -r '.fitness')

            # If fitness is still below 0.3, recommend rollback
            if awk "BEGIN {exit !($local_current_fitness < 0.3)}"; then
                log "  ROLLBACK CANDIDATE: ${local_skill} (fitness: ${local_current_fitness} after mutation)"
            fi
        done
    fi
    log "  Rollback check complete."
else
    log "  No mutation history found."
fi

# ─── Phase 8: Generate Evolution Report ────────────────────────────────────

log "Phase 8: Generating evolution report..."

cat > "$REPORT_FILE" <<EOF
# Evolution Report — $(date +%Y-%m-%d)

## Summary
- **Skills tracked**: ${TOTAL_SKILLS}
- **Mutation candidates**: ${CANDIDATE_COUNT} (${CANDIDATE_NAMES:-none})
- **Crossover candidates**: ${COOCCURRENCE_COUNT}
- **Dead skills**: ${DEAD_COUNT}
- **Mode**: $(if $DRY_RUN; then echo 'Dry Run'; else echo 'Live'; fi)

## Fitness Overview
$(echo "$ALL_SCORES" | jq -r '.[] | "- **\(.skill)**: fitness=\(.fitness), invocations=\(.total_invocations), success=\(.success_rate)"' 2>/dev/null || echo "No data")

## Actions Taken
$(if $DRY_RUN; then echo "- Dry run — no actions taken"; else echo "- See evolution.log for details"; fi)

## Crossover Opportunities
$(echo "$COOCCURRENCES" | jq -r '.[] | "- \(.pair) (co-occurred \(.count) times)"' 2>/dev/null || echo "- None detected")

---
*Generated by the Skill Genome Evolution Cycle*
EOF

log "  Report: ${REPORT_FILE}"

log "=========================================="
log "EVOLUTION CYCLE COMPLETE"
log "=========================================="
