#!/usr/bin/env bash
# Benchmark — Compare before/after evolution performance
# Usage: ./benchmark.sh [days-back]
set -euo pipefail

DATA_DIR="${OPENCLAW_DATA:-$HOME/.openclaw/data/pepe}"
EVOLUTION_DIR="$DATA_DIR/evolution-runs"
BENCHMARK_DIR="$DATA_DIR/genetic-evolution/benchmarks"
SCORES_DIR="$DATA_DIR/self-scores"

mkdir -p "$BENCHMARK_DIR"

DAYS_BACK="${1:-7}"

echo "═══════════════════════════════════════════════════"
echo "  EVOLUTION BENCHMARK — Last $DAYS_BACK days"
echo "═══════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────
# Collect evolution run data
# ─────────────────────────────────────────────────────────────
echo "Evolution Runs:"
echo "---"

TOTAL_CYCLES=0
TOTAL_APPLIED=0
TOTAL_FAILURES=0
TOTAL_TRACES=0

for log in "$EVOLUTION_DIR"/*.jsonl; do
    [ -f "$log" ] || continue

    while IFS= read -r line; do
        traces=$(echo "$line" | grep -oE '"traces_analyzed":[0-9]+' | cut -d: -f2 || echo "0")
        failures=$(echo "$line" | grep -oE '"failures_found":[0-9]+' | cut -d: -f2 || echo "0")
        applied=$(echo "$line" | grep -oE '"candidates_applied":[0-9]+' | cut -d: -f2 || echo "0")

        TOTAL_CYCLES=$((TOTAL_CYCLES + 1))
        TOTAL_TRACES=$((TOTAL_TRACES + traces))
        TOTAL_FAILURES=$((TOTAL_FAILURES + failures))
        TOTAL_APPLIED=$((TOTAL_APPLIED + applied))
    done < "$log"
done

echo "  Total cycles: $TOTAL_CYCLES"
echo "  Total traces analyzed: $TOTAL_TRACES"
echo "  Total failures found: $TOTAL_FAILURES"
echo "  Total mutations applied: $TOTAL_APPLIED"

if [ "$TOTAL_CYCLES" -gt 0 ]; then
    AVG_FAILURES=$((TOTAL_FAILURES / TOTAL_CYCLES))
    AVG_APPLIED=$((TOTAL_APPLIED / TOTAL_CYCLES))
    echo "  Avg failures/cycle: $AVG_FAILURES"
    echo "  Avg mutations/cycle: $AVG_APPLIED"
fi

# ─────────────────────────────────────────────────────────────
# Self-score trends
# ─────────────────────────────────────────────────────────────
echo ""
echo "Self-Score Trends:"
echo "---"

SCORE_FILES=0
TOTAL_ENTRIES=0
HIGH_SCORES=0
LOW_SCORES=0

for score_file in "$SCORES_DIR"/*.jsonl; do
    [ -f "$score_file" ] || continue
    SCORE_FILES=$((SCORE_FILES + 1))

    entries=$(wc -l < "$score_file" | tr -d ' ')
    TOTAL_ENTRIES=$((TOTAL_ENTRIES + entries))

    high=$(grep -cE '"score":[7-9]\.|"score":10' "$score_file" 2>/dev/null || echo "0")
    HIGH_SCORES=$((HIGH_SCORES + high))

    low=$(grep -cE '"score":[0-4]\.' "$score_file" 2>/dev/null || echo "0")
    LOW_SCORES=$((LOW_SCORES + low))
done

echo "  Score files: $SCORE_FILES"
echo "  Total entries: $TOTAL_ENTRIES"
echo "  High scores (7+): $HIGH_SCORES"
echo "  Low scores (<5): $LOW_SCORES"

if [ "$TOTAL_ENTRIES" -gt 0 ]; then
    HIGH_PCT=$((HIGH_SCORES * 100 / TOTAL_ENTRIES))
    LOW_PCT=$((LOW_SCORES * 100 / TOTAL_ENTRIES))
    echo "  High score rate: ${HIGH_PCT}%"
    echo "  Low score rate: ${LOW_PCT}%"
fi

# ─────────────────────────────────────────────────────────────
# Failure trend (is it improving?)
# ─────────────────────────────────────────────────────────────
echo ""
echo "Failure Trend:"
echo "---"

if [ "$TOTAL_CYCLES" -ge 2 ]; then
    # Compare first half vs second half of cycles
    HALF=$((TOTAL_CYCLES / 2))
    echo "  Comparing first $HALF cycles vs last $HALF cycles"
    echo "  (Full trend analysis requires the agent's reasoning)"
else
    echo "  Not enough data for trend analysis (need 2+ cycles)"
fi

# ─────────────────────────────────────────────────────────────
# Save benchmark snapshot
# ─────────────────────────────────────────────────────────────
SNAPSHOT_FILE="$BENCHMARK_DIR/$(date +%Y-%m-%d).json"
cat > "$SNAPSHOT_FILE" <<SNAP
{
  "date": "$(date +%Y-%m-%d)",
  "period_days": $DAYS_BACK,
  "cycles": $TOTAL_CYCLES,
  "traces": $TOTAL_TRACES,
  "failures": $TOTAL_FAILURES,
  "mutations_applied": $TOTAL_APPLIED,
  "score_entries": $TOTAL_ENTRIES,
  "high_scores": $HIGH_SCORES,
  "low_scores": $LOW_SCORES
}
SNAP

echo ""
echo "Benchmark snapshot saved: $SNAPSHOT_FILE"
echo ""
echo "═══════════════════════════════════════════════════"
