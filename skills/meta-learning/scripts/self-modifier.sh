#!/usr/bin/env bash
# self-modifier.sh — Proposes self-modifications based on meta-learning analysis
# Part of Meta-Learning Loop skill for Pepe 2.0
#
# Usage: ./self-modifier.sh [--days N] [--input DIR] [--output DIR] [--apply PROPOSAL_ID]

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
ANALYSIS_DIR="${ANALYSIS_DIR:-${SKILL_DIR}/data/daily}"
PROPOSALS_DIR="${PROPOSALS_DIR:-${SKILL_DIR}/data/proposals}"
METRICS_DIR="${METRICS_DIR:-${SKILL_DIR}/data/metrics}"
SKILLS_DIR="${SKILLS_DIR:-$OPENCLAW_WORKSPACE/skills}"
LOOKBACK_DAYS="${LOOKBACK_DAYS:-7}"
MIN_OCCURRENCES=2  # Minimum times a pattern must appear before proposing a fix

# --- Argument Parsing ---
ACTION="propose"
PROPOSAL_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --days) LOOKBACK_DAYS="$2"; shift 2 ;;
    --input) ANALYSIS_DIR="$2"; shift 2 ;;
    --output) PROPOSALS_DIR="$2"; shift 2 ;;
    --apply) ACTION="apply"; PROPOSAL_ID="$2"; shift 2 ;;
    --review) ACTION="review"; shift ;;
    --help)
      echo "Usage: $0 [--days N] [--input DIR] [--output DIR] [--apply PROPOSAL_ID] [--review]"
      echo ""
      echo "Generates self-modification proposals from conversation analysis."
      echo ""
      echo "Actions:"
      echo "  (default)        Generate new proposals from recent analysis"
      echo "  --review         List pending proposals with status"
      echo "  --apply ID       Apply a specific proposal (requires user approval)"
      echo ""
      echo "Options:"
      echo "  --days N         Number of days to look back (default: 7)"
      echo "  --input DIR      Directory containing daily analysis files"
      echo "  --output DIR     Directory for proposal output"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

mkdir -p "$PROPOSALS_DIR" "$METRICS_DIR"

# --- Review Action ---
if [[ "$ACTION" == "review" ]]; then
  echo "=== Pending Self-Modification Proposals ==="
  echo ""
  if [[ -d "$PROPOSALS_DIR" ]]; then
    found=0
    for proposal in "$PROPOSALS_DIR"/PROPOSAL-*.md; do
      [[ -f "$proposal" ]] || continue
      found=1
      id=$(basename "$proposal" .md)
      status=$(grep -m1 "^status:" "$proposal" 2>/dev/null | awk '{print $2}' || echo "unknown")
      title=$(grep -m1 "^# " "$proposal" 2>/dev/null | sed 's/^# //' || echo "untitled")
      impact=$(grep -m1 "^impact_score:" "$proposal" 2>/dev/null | awk '{print $2}' || echo "?")
      echo "  [$status] $id — $title (impact: $impact)"
    done
    if [[ $found -eq 0 ]]; then
      echo "  No proposals found."
    fi
  else
    echo "  No proposals directory found."
  fi
  exit 0
fi

# --- Apply Action ---
if [[ "$ACTION" == "apply" ]]; then
  PROPOSAL_FILE="$PROPOSALS_DIR/PROPOSAL-${PROPOSAL_ID}.md"
  if [[ ! -f "$PROPOSAL_FILE" ]]; then
    echo "Error: Proposal $PROPOSAL_ID not found at $PROPOSAL_FILE" >&2
    exit 1
  fi

  echo "=== Applying Proposal: $PROPOSAL_ID ==="
  echo ""
  echo "Proposal contents:"
  cat "$PROPOSAL_FILE"
  echo ""

  # Extract the modification commands from the proposal
  if command -v openclaw &>/dev/null; then
    openclaw run --prompt "$(cat <<PROMPT
Review this self-modification proposal and apply it.
The proposal is from the meta-learning system. Apply ONLY the specific changes described.
Report what was changed and verify the changes are safe.

Proposal:
$(cat "$PROPOSAL_FILE")

Current skills directory: $SKILLS_DIR

IMPORTANT: Only modify skill files (SKILL.md). Do not modify core system files.
Report exactly what you changed.
PROMPT
)" 2>/dev/null
  else
    echo "Error: openclaw CLI required to apply proposals" >&2
    exit 1
  fi

  # Update proposal status
  sed -i '' "s/^status: pending/status: applied/" "$PROPOSAL_FILE" 2>/dev/null || \
    sed -i "s/^status: pending/status: applied/" "$PROPOSAL_FILE" 2>/dev/null || true

  # Log the application
  echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"proposal\":\"$PROPOSAL_ID\",\"action\":\"applied\"}" >> "$METRICS_DIR/proposals.jsonl"

  echo ""
  echo "Proposal $PROPOSAL_ID applied. Monitor metrics to verify improvement."
  exit 0
fi

# --- Propose Action (Default) ---
echo "=== Generating Self-Modification Proposals ==="
echo "Looking back $LOOKBACK_DAYS days..."
echo ""

# Collect recent analysis files
ANALYSIS_FILES=()
for i in $(seq 0 "$((LOOKBACK_DAYS - 1))"); do
  if date -v-${i}d +%Y-%m-%d &>/dev/null 2>&1; then
    # macOS date
    check_date=$(date -v-${i}d +%Y-%m-%d)
  else
    # GNU date
    check_date=$(date -d "$i days ago" +%Y-%m-%d)
  fi
  file="$ANALYSIS_DIR/${check_date}.json"
  if [[ -f "$file" ]]; then
    ANALYSIS_FILES+=("$file")
  fi
done

if [[ ${#ANALYSIS_FILES[@]} -eq 0 ]]; then
  echo "No analysis files found for the last $LOOKBACK_DAYS days."
  echo "Run conversation-analyzer.sh first."
  exit 0
fi

echo "Found ${#ANALYSIS_FILES[@]} analysis file(s)"

# --- Aggregate Failure Patterns ---
aggregate_patterns() {
  python3 -c "
import json, sys, os
from collections import Counter

files = sys.argv[1:]
all_failures = []
all_corrections = []
all_improvements = []
all_patterns = []
quality_scores = []

for f in files:
    try:
        with open(f) as fh:
            data = json.load(fh)
        all_failures.extend(data.get('failures', []))
        all_corrections.extend(data.get('corrections', []))
        all_improvements.extend(data.get('improvement_signals', []))
        all_patterns.extend(data.get('patterns', []))
        qs = data.get('quality_score')
        if qs is not None and qs > 0:
            quality_scores.append(qs)
    except Exception as e:
        print(f'Warning: Could not parse {f}: {e}', file=sys.stderr)

# Count failure topics
failure_topics = Counter()
for f in all_failures:
    topic = f.get('topic', 'unknown') if isinstance(f, dict) else str(f)
    failure_topics[topic] += 1

# Count correction types
correction_topics = Counter()
for c in all_corrections:
    topic = c.get('topic', 'unknown') if isinstance(c, dict) else str(c)
    correction_topics[topic] += 1

# Find recurring patterns (appear >= $MIN_OCCURRENCES times)
recurring_failures = {k: v for k, v in failure_topics.items() if v >= $MIN_OCCURRENCES}
recurring_corrections = {k: v for k, v in correction_topics.items() if v >= $MIN_OCCURRENCES}

avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0

result = {
    'days_analyzed': len(files),
    'total_failures': len(all_failures),
    'total_corrections': len(all_corrections),
    'recurring_failures': recurring_failures,
    'recurring_corrections': recurring_corrections,
    'improvement_signals': list(set(all_improvements))[:20],
    'avg_quality_score': round(avg_quality, 3),
    'quality_trend': quality_scores
}

print(json.dumps(result, indent=2))
" "${ANALYSIS_FILES[@]}"
}

AGGREGATE=$(aggregate_patterns)
echo "Aggregate analysis:"
echo "$AGGREGATE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"  Days analyzed: {data['days_analyzed']}\")
print(f\"  Total failures: {data['total_failures']}\")
print(f\"  Total corrections: {data['total_corrections']}\")
print(f\"  Recurring failures: {len(data['recurring_failures'])}\")
print(f\"  Recurring corrections: {len(data['recurring_corrections'])}\")
print(f\"  Avg quality score: {data['avg_quality_score']}\")
print(f\"  Improvement signals: {len(data['improvement_signals'])}\")
"
echo ""

# --- Generate Proposals ---
RECURRING_FAILURES=$(echo "$AGGREGATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['recurring_failures']))")
RECURRING_CORRECTIONS=$(echo "$AGGREGATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['recurring_corrections']))")
IMPROVEMENT_COUNT=$(echo "$AGGREGATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['improvement_signals']))")

if [[ "$RECURRING_FAILURES" -eq 0 && "$RECURRING_CORRECTIONS" -eq 0 && "$IMPROVEMENT_COUNT" -eq 0 ]]; then
  echo "No recurring issues found. No proposals generated."
  exit 0
fi

echo "Generating proposals..."

# Generate proposal using AI if available, otherwise use template
generate_proposal() {
  local id="$1"
  local aggregate_data="$2"
  local proposal_file="$PROPOSALS_DIR/PROPOSAL-${id}.md"
  local created_ts
  created_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Try AI-powered proposal generation
  local ai_success=false
  if command -v openclaw &>/dev/null; then
    local prompt_file
    prompt_file=$(mktemp)
    cat > "$prompt_file" <<'PROMPTEOF'
Based on this analysis of recent conversation performance, generate a specific self-modification proposal.
Generate a proposal in markdown with YAML frontmatter containing: status (pending), impact_score (0-1), created, category.
Include sections: Problem, Root Cause, Proposed Change, Expected Impact, Rollback Plan, Verification.
Output ONLY the markdown.
PROMPTEOF
    echo "" >> "$prompt_file"
    echo "Analysis data:" >> "$prompt_file"
    echo "$aggregate_data" >> "$prompt_file"

    if openclaw run --prompt "$(cat "$prompt_file")" > "$proposal_file" 2>/dev/null; then
      if [[ -s "$proposal_file" ]]; then
        ai_success=true
      fi
    fi
    rm -f "$prompt_file"
  fi

  # Fallback: template-based proposal
  if [[ "$ai_success" != "true" ]]; then
    local details
    details=$(echo "$aggregate_data" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('recurring_failures'):
    print('### Recurring Failures')
    for topic, count in data['recurring_failures'].items():
        print(f'- **{topic}** ({count} occurrences)')
if data.get('recurring_corrections'):
    print('### Recurring Corrections')
    for topic, count in data['recurring_corrections'].items():
        print(f'- **{topic}** ({count} occurrences)')
if data.get('improvement_signals'):
    print('### Improvement Signals')
    for sig in data['improvement_signals'][:5]:
        print(f'- {sig}')
" 2>/dev/null || echo "_(details unavailable)_")

    cat > "$proposal_file" <<EOF
---
status: pending
impact_score: 0.5
created: $created_ts
category: behavior_adjustment
---

# Address Recurring Issues from Week Analysis

## Problem
Found $RECURRING_FAILURES recurring failure patterns and $RECURRING_CORRECTIONS recurring correction patterns over $LOOKBACK_DAYS days.

## Root Cause
Requires manual investigation of the recurring patterns listed in the aggregate analysis.

## Proposed Change
Review the following recurring issues and update relevant skill files:

$details

## Expected Impact
Reduce correction rate by addressing the most frequent issues.

## Rollback Plan
Revert skill file changes via git.

## Verification
Monitor correction_trend metric over next 7 days.
EOF
  fi

  echo "$proposal_file"
}

# Generate a unique proposal ID
PROPOSAL_ID=$(date +%Y%m%d)-$(printf '%04x' $RANDOM)
PROPOSAL_FILE=$(generate_proposal "$PROPOSAL_ID" "$AGGREGATE")

echo ""
echo "=== Proposal Generated ==="
echo "File: $PROPOSAL_FILE"
echo ""
if [[ -f "$PROPOSAL_FILE" ]]; then
  cat "$PROPOSAL_FILE"
fi

# Log proposal generation
echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"proposal\":\"$PROPOSAL_ID\",\"action\":\"generated\",\"recurring_failures\":$RECURRING_FAILURES,\"recurring_corrections\":$RECURRING_CORRECTIONS}" >> "$METRICS_DIR/proposals.jsonl"

echo ""
echo "To review all proposals: $0 --review"
echo "To apply this proposal:  $0 --apply $PROPOSAL_ID"
