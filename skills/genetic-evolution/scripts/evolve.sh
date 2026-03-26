#!/usr/bin/env bash
# Genetic Evolution Engine — One evolution cycle
# Usage: ./evolve.sh [history]
set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw}"
DATA_DIR="${OPENCLAW_DATA:-$HOME/.openclaw/data/pepe}"
EVOLUTION_DIR="$DATA_DIR/evolution-runs"
TRACES_DIR="$DATA_DIR/execution-traces"
SCORES_DIR="$DATA_DIR/self-scores"
MUTATIONS_DIR="$DATA_DIR/skill-mutations"
SKILL_DIR="$WORKSPACE/skills"
TODAY=$(date +%Y-%m-%d)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$EVOLUTION_DIR" "$TRACES_DIR" "$SCORES_DIR" "$MUTATIONS_DIR"

# ─────────────────────────────────────────────────────────────
# History mode
# ─────────────────────────────────────────────────────────────
if [ "${1:-}" = "history" ]; then
    echo "Evolution Run History"
    echo "---"
    for log in "$EVOLUTION_DIR"/*.jsonl; do
        [ -f "$log" ] || continue
        echo ""
        echo "$(basename "$log" .jsonl):"
        tail -1 "$log" | while IFS= read -r line; do
            traces=$(echo "$line" | grep -oE '"traces_analyzed":[0-9]+' | cut -d: -f2 || echo "0")
            failures=$(echo "$line" | grep -oE '"failures_found":[0-9]+' | cut -d: -f2 || echo "0")
            applied=$(echo "$line" | grep -oE '"candidates_applied":[0-9]+' | cut -d: -f2 || echo "0")
            echo "  Traces: $traces | Failures: $failures | Applied: $applied"
        done
    done
    exit 0
fi

echo "═══════════════════════════════════════════════════"
echo "  GENETIC EVOLUTION CYCLE — $NOW"
echo "═══════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────
# Step 1: COLLECT — Read execution traces and self-scores
# ─────────────────────────────────────────────────────────────
echo "[1/6] Collecting execution traces and self-scores..."

TRACE_COUNT=0
FAILURE_COUNT=0
LOW_SCORE_COUNT=0

# Count traces from last 24 hours
for trace_file in "$TRACES_DIR"/*.jsonl; do
    [ -f "$trace_file" ] || continue
    file_lines=$(wc -l < "$trace_file" | tr -d ' ')
    TRACE_COUNT=$((TRACE_COUNT + file_lines))

    # Count failures (entries with "error" or "failed")
    failures=$(grep -c '"status":"error"\|"status":"failed"\|"outcome":"rejected"' "$trace_file" 2>/dev/null || echo "0")
    FAILURE_COUNT=$((FAILURE_COUNT + failures))
done

# Count low self-scores
for score_file in "$SCORES_DIR"/*.jsonl; do
    [ -f "$score_file" ] || continue
    low=$(grep -cE '"score":[0-4]\.' "$score_file" 2>/dev/null || echo "0")
    LOW_SCORE_COUNT=$((LOW_SCORE_COUNT + low))
done

echo "  Traces found: $TRACE_COUNT"
echo "  Failures found: $FAILURE_COUNT"
echo "  Low scores found: $LOW_SCORE_COUNT"

if [ "$TRACE_COUNT" -eq 0 ] && [ "$FAILURE_COUNT" -eq 0 ]; then
    echo ""
    echo "No traces to analyze. Skipping evolution cycle."
    echo "{\"timestamp\":\"$NOW\",\"traces_analyzed\":0,\"failures_found\":0,\"candidates_proposed\":0,\"candidates_applied\":0,\"status\":\"skipped_no_data\"}" >> "$EVOLUTION_DIR/${TODAY}.jsonl"
    exit 0
fi

# ─────────────────────────────────────────────────────────────
# Step 2: ANALYZE — Group failures by category
# ─────────────────────────────────────────────────────────────
echo ""
echo "[2/6] Analyzing failure categories..."

TOOL_USE_FAILURES=0
MEMORY_FAILURES=0
KNOWLEDGE_FAILURES=0
COMMUNICATION_FAILURES=0

for trace_file in "$TRACES_DIR"/*.jsonl "$MUTATIONS_DIR"/*.jsonl; do
    [ -f "$trace_file" ] || continue

    # Categorize by keywords in the failure entries
    tool_f=$(grep -c '"category":"tool_use"\|"tool.*error"\|"tool.*failed"' "$trace_file" 2>/dev/null || echo "0")
    TOOL_USE_FAILURES=$((TOOL_USE_FAILURES + tool_f))

    mem_f=$(grep -c '"category":"memory"\|"forgot"\|"repeated"' "$trace_file" 2>/dev/null || echo "0")
    MEMORY_FAILURES=$((MEMORY_FAILURES + mem_f))

    know_f=$(grep -c '"category":"knowledge"\|"outdated"\|"incorrect"' "$trace_file" 2>/dev/null || echo "0")
    KNOWLEDGE_FAILURES=$((KNOWLEDGE_FAILURES + know_f))

    comm_f=$(grep -c '"category":"communication"\|"verbose"\|"misunderstood"' "$trace_file" 2>/dev/null || echo "0")
    COMMUNICATION_FAILURES=$((COMMUNICATION_FAILURES + comm_f))
done

echo "  Tool use:       $TOOL_USE_FAILURES"
echo "  Memory:         $MEMORY_FAILURES"
echo "  Knowledge:      $KNOWLEDGE_FAILURES"
echo "  Communication:  $COMMUNICATION_FAILURES"

# ─────────────────────────────────────────────────────────────
# Step 3: PROPOSE — Generate candidate mutations
# ─────────────────────────────────────────────────────────────
echo ""
echo "[3/6] Generating candidate mutations..."

CANDIDATES=0
CANDIDATES_FILE=$(mktemp)
trap 'rm -f "$CANDIDATES_FILE"' EXIT

propose_candidates() {
    local category="$1"
    local count="$2"

    if [ "$count" -eq 0 ]; then
        return
    fi

    echo "  Category: $category ($count failures)"

    # Find skills most likely related to this category
    for skill_dir in "$SKILL_DIR"/*/; do
        [ -d "$skill_dir" ] || continue
        local skill_name
        skill_name=$(basename "$skill_dir")
        local skill_file="$skill_dir/SKILL.md"
        [ -f "$skill_file" ] || continue

        # Check if skill is related to this category
        local related=0
        case "$category" in
            tool_use)
                grep -qi "tool\|search\|grep\|glob\|read\|edit" "$skill_file" 2>/dev/null && related=1
                ;;
            memory)
                grep -qi "memory\|context\|recall\|remember\|model" "$skill_file" 2>/dev/null && related=1
                ;;
            knowledge)
                grep -qi "knowledge\|learn\|fact\|reference\|data" "$skill_file" 2>/dev/null && related=1
                ;;
            communication)
                grep -qi "communi\|response\|user\|output\|format" "$skill_file" 2>/dev/null && related=1
                ;;
        esac

        if [ "$related" -eq 1 ]; then
            # Generate a candidate entry
            echo "{\"category\":\"$category\",\"skill\":\"$skill_name\",\"type\":\"point_mutation\",\"estimated_impact\":$((count > 5 ? 8 : count + 3)),\"feasibility\":0.8,\"risk\":2}" >> "$CANDIDATES_FILE"
            CANDIDATES=$((CANDIDATES + 1))
        fi
    done
}

propose_candidates "tool_use" "$TOOL_USE_FAILURES"
propose_candidates "memory" "$MEMORY_FAILURES"
propose_candidates "knowledge" "$KNOWLEDGE_FAILURES"
propose_candidates "communication" "$COMMUNICATION_FAILURES"

echo "  Total candidates: $CANDIDATES"

# ─────────────────────────────────────────────────────────────
# Step 4: SCORE — Rate candidates
# ─────────────────────────────────────────────────────────────
echo ""
echo "[4/6] Scoring candidates..."

APPLIED=0
APPLIED_LOG=""
SKIPPED_LOG=""

if [ -f "$CANDIDATES_FILE" ] && [ -s "$CANDIDATES_FILE" ]; then
    while IFS= read -r candidate; do
        skill=$(echo "$candidate" | grep -oE '"skill":"[^"]+"' | cut -d'"' -f4)
        impact=$(echo "$candidate" | grep -oE '"estimated_impact":[0-9]+' | cut -d: -f2)
        feasibility=$(echo "$candidate" | grep -oE '"feasibility":[0-9.]+' | cut -d: -f2)
        risk=$(echo "$candidate" | grep -oE '"risk":[0-9]+' | cut -d: -f2)

        # score = (impact * feasibility) / risk
        # Using integer math: score_x10 = (impact * feasibility_x10) / risk
        feasibility_x10=$(echo "$feasibility" | sed 's/0\.//' | sed 's/^0*//')
        [ -z "$feasibility_x10" ] && feasibility_x10=5
        score_x10=$(( (impact * feasibility_x10) / risk ))

        if [ "$score_x10" -gt 70 ]; then
            echo "  APPLY: $skill (score: ${score_x10}/10)"
            APPLIED=$((APPLIED + 1))
            APPLIED_LOG="${APPLIED_LOG}{\"skill\":\"$skill\",\"score\":$score_x10},"
        else
            echo "  SKIP:  $skill (score: ${score_x10}/10 — below threshold)"
            SKIPPED_LOG="${SKIPPED_LOG}{\"skill\":\"$skill\",\"score\":$score_x10},"
        fi
    done < "$CANDIDATES_FILE"
fi

# ─────────────────────────────────────────────────────────────
# Step 5: SELECT — Apply top mutations (max 4)
# ─────────────────────────────────────────────────────────────
echo ""
echo "[5/6] Applying mutations..."

if [ "$APPLIED" -eq 0 ]; then
    echo "  No candidates above threshold. No mutations applied."
else
    if [ "$APPLIED" -gt 4 ]; then
        echo "  Capping at 4 mutations per cycle (had $APPLIED candidates)"
        APPLIED=4
    fi
    echo "  Applied $APPLIED mutation(s)"
    echo "  Note: Actual SKILL.md edits are performed by the agent during conversation."
    echo "  The evolution log records which skills need attention."
fi

# ─────────────────────────────────────────────────────────────
# Step 6: LOG — Record the evolution run
# ─────────────────────────────────────────────────────────────
echo ""
echo "[6/6] Logging evolution run..."

# Clean trailing commas
APPLIED_LOG=$(echo "$APPLIED_LOG" | sed 's/,$//')
SKIPPED_LOG=$(echo "$SKIPPED_LOG" | sed 's/,$//')

LOG_ENTRY=$(cat <<ENTRY
{"timestamp":"$NOW","traces_analyzed":$TRACE_COUNT,"failures_found":$FAILURE_COUNT,"low_scores":$LOW_SCORE_COUNT,"categories":{"tool_use":$TOOL_USE_FAILURES,"memory":$MEMORY_FAILURES,"knowledge":$KNOWLEDGE_FAILURES,"communication":$COMMUNICATION_FAILURES},"candidates_proposed":$CANDIDATES,"candidates_applied":$APPLIED,"applied":[$APPLIED_LOG],"skipped":[$SKIPPED_LOG]}
ENTRY
)

echo "$LOG_ENTRY" >> "$EVOLUTION_DIR/${TODAY}.jsonl"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  EVOLUTION CYCLE COMPLETE"
echo "  Traces: $TRACE_COUNT | Failures: $FAILURE_COUNT | Applied: $APPLIED"
echo "═══════════════════════════════════════════════════"
