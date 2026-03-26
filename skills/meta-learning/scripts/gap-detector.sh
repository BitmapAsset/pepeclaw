#!/usr/bin/env bash
# gap-detector.sh — Identifies and prioritizes capability gaps
# Part of Meta-Learning Loop skill for Pepe 2.0
#
# Usage: ./gap-detector.sh [--days N] [--input DIR] [--output DIR]

set -euo pipefail

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
OPENCLAW_WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
ANALYSIS_DIR="${ANALYSIS_DIR:-${SKILL_DIR}/data/daily}"
GAPS_DIR="${GAPS_DIR:-${SKILL_DIR}/data/gaps}"
SKILLS_DIR="${SKILLS_DIR:-$OPENCLAW_WORKSPACE/skills}"
LOOKBACK_DAYS="${LOOKBACK_DAYS:-14}"

# --- Argument Parsing ---
while [[ $# -gt 0 ]]; do
  case $1 in
    --days) LOOKBACK_DAYS="$2"; shift 2 ;;
    --input) ANALYSIS_DIR="$2"; shift 2 ;;
    --output) GAPS_DIR="$2"; shift 2 ;;
    --list) ACTION="list"; shift ;;
    --help)
      echo "Usage: $0 [--days N] [--input DIR] [--output DIR] [--list]"
      echo ""
      echo "Detects capability gaps from conversation analysis and existing skill inventory."
      echo ""
      echo "Options:"
      echo "  --days N     Lookback period (default: 14)"
      echo "  --input DIR  Analysis directory"
      echo "  --output DIR Gaps output directory"
      echo "  --list       List known gaps with status"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

ACTION="${ACTION:-detect}"
mkdir -p "$GAPS_DIR"

# --- List Action ---
if [[ "$ACTION" == "list" ]]; then
  echo "=== Known Capability Gaps ==="
  echo ""
  found=0
  for gap_file in "$GAPS_DIR"/GAP-*.md; do
    [[ -f "$gap_file" ]] || continue
    found=1
    id=$(basename "$gap_file" .md)
    status=$(grep -m1 "^status:" "$gap_file" 2>/dev/null | awk '{print $2}' || echo "unknown")
    category=$(grep -m1 "^category:" "$gap_file" 2>/dev/null | awk '{print $2}' || echo "unknown")
    priority=$(grep -m1 "^priority:" "$gap_file" 2>/dev/null | awk '{print $2}' || echo "?")
    title=$(grep -m1 "^# " "$gap_file" 2>/dev/null | sed 's/^# //' || echo "untitled")
    echo "  [$status] $id — $title (category: $category, priority: $priority)"
  done
  if [[ $found -eq 0 ]]; then
    echo "  No gaps recorded."
  fi
  exit 0
fi

# --- Detect Action ---
echo "=== Capability Gap Detection ==="
echo "Scanning last $LOOKBACK_DAYS days of analysis..."
echo ""

# Collect analysis files
ANALYSIS_FILES=()
for i in $(seq 0 "$((LOOKBACK_DAYS - 1))"); do
  if date -v-${i}d +%Y-%m-%d &>/dev/null 2>&1; then
    check_date=$(date -v-${i}d +%Y-%m-%d)
  else
    check_date=$(date -d "$i days ago" +%Y-%m-%d)
  fi
  file="$ANALYSIS_DIR/${check_date}.json"
  if [[ -f "$file" ]]; then
    ANALYSIS_FILES+=("$file")
  fi
done

if [[ ${#ANALYSIS_FILES[@]} -eq 0 ]]; then
  echo "No analysis files found. Run conversation-analyzer.sh first."
  exit 0
fi

echo "Found ${#ANALYSIS_FILES[@]} analysis file(s)"

# Inventory current skills
echo ""
echo "Inventorying current skills..."
SKILL_LIST=""
if [[ -d "$SKILLS_DIR" ]]; then
  SKILL_LIST=$(find "$SKILLS_DIR" -name "SKILL.md" -type f 2>/dev/null | while read -r f; do
    dir=$(dirname "$f")
    skill_name=$(basename "$dir")
    echo "$skill_name"
  done | sort | tr '\n' ', ')
fi
echo "Current skills: ${SKILL_LIST:-none}"

# --- Gap Analysis ---
analyze_gaps() {
  python3 -c "
import json, sys, os
from collections import Counter

analysis_files = []
for f in sys.argv[1:]:
    if f == '--skills':
        break
    analysis_files.append(f)

# Parse analysis files
all_failures = []
all_corrections = []
all_improvements = []

for f in analysis_files:
    try:
        with open(f) as fh:
            data = json.load(fh)
        all_failures.extend(data.get('failures', []))
        all_corrections.extend(data.get('corrections', []))
        all_improvements.extend(data.get('improvement_signals', []))
    except Exception:
        pass

# Categorize gaps
gaps = []

# Gap from failures: group by topic/type
failure_topics = Counter()
for f in all_failures:
    if isinstance(f, dict):
        topic = f.get('topic', 'unknown')
        detail = f.get('detail', '')
    else:
        topic = str(f)
        detail = ''
    failure_topics[topic] += 1

for topic, count in failure_topics.most_common(10):
    if count >= 2:
        # Determine gap category
        category = 'missing_skill'
        if any(w in topic.lower() for w in ['tool', 'api', 'mcp', 'integration']):
            category = 'missing_tool'
        elif any(w in topic.lower() for w in ['knowledge', 'understand', 'context']):
            category = 'missing_knowledge'
        elif any(w in topic.lower() for w in ['approach', 'strategy', 'method']):
            category = 'wrong_approach'

        gaps.append({
            'topic': topic,
            'category': category,
            'frequency': count,
            'severity': min(1.0, count / 5.0),  # normalize
            'priority': round(min(1.0, count / 5.0) * (count / max(len(analysis_files), 1)), 3),
            'source': 'failure_analysis'
        })

# Gaps from improvement signals
for signal in set(all_improvements):
    if signal and signal != 'null':
        gaps.append({
            'topic': signal,
            'category': 'improvement_signal',
            'frequency': 1,
            'severity': 0.5,
            'priority': 0.5,
            'source': 'explicit_signal'
        })

# Sort by priority
gaps.sort(key=lambda g: g['priority'], reverse=True)

print(json.dumps({
    'total_gaps': len(gaps),
    'gaps': gaps[:20],
    'analysis_files_scanned': len(analysis_files),
    'total_failures_analyzed': len(all_failures),
    'total_corrections_analyzed': len(all_corrections)
}, indent=2))
" "${ANALYSIS_FILES[@]}"
}

GAP_DATA=$(analyze_gaps)

echo ""
echo "Gap analysis results:"
echo "$GAP_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"  Total gaps found: {data['total_gaps']}\")
print(f\"  Files scanned: {data['analysis_files_scanned']}\")
print(f\"  Failures analyzed: {data['total_failures_analyzed']}\")
print(f\"  Corrections analyzed: {data['total_corrections_analyzed']}\")
if data['gaps']:
    print()
    print('  Top gaps:')
    for g in data['gaps'][:5]:
        print(f\"    [{g['category']}] {g['topic']} (freq: {g['frequency']}, priority: {g['priority']})\")
"

# --- Write Gap Reports ---
echo ""
echo "Writing gap reports..."

echo "$GAP_DATA" | python3 -c "
import json, sys, os
from datetime import datetime

data = json.load(sys.stdin)
gaps_dir = '$GAPS_DIR'
written = 0

for i, gap in enumerate(data['gaps']):
    # Create a stable ID from the topic
    topic_slug = gap['topic'].lower()
    topic_slug = ''.join(c if c.isalnum() else '-' for c in topic_slug)[:40].strip('-')
    gap_id = f'{topic_slug}'
    gap_file = os.path.join(gaps_dir, f'GAP-{gap_id}.md')

    # Don't overwrite existing gap reports (they may have been updated manually)
    if os.path.exists(gap_file):
        # Update frequency count
        with open(gap_file) as f:
            content = f.read()
        if f\"frequency: {gap['frequency']}\" not in content:
            content = content.replace('status: open', 'status: open  # updated')
        continue

    report = f'''---
status: open
category: {gap['category']}
priority: {gap['priority']}
frequency: {gap['frequency']}
severity: {gap['severity']}
detected: {datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}
---

# Capability Gap: {gap['topic']}

## Category
{gap['category'].replace('_', ' ').title()}

## Evidence
- Detected {gap['frequency']} occurrence(s) over the analysis period
- Source: {gap['source']}
- Severity: {gap['severity']:.1f}/1.0

## Impact
This gap causes {'failures' if gap['source'] == 'failure_analysis' else 'suboptimal responses'} when the user needs help with: {gap['topic']}

## Possible Solutions
- [ ] New skill to handle this task type
- [ ] MCP tool integration for external capability
- [ ] Behavior adjustment in existing skills
- [ ] Knowledge base update

## Resolution
_Pending investigation_
'''
    with open(gap_file, 'w') as f:
        f.write(report)
    written += 1
    print(f'  Written: GAP-{gap_id}.md')

if written == 0:
    print('  No new gap reports needed (all gaps already tracked).')
else:
    print(f'  {written} new gap report(s) written.')
"

echo ""
echo "To list all gaps: $0 --list"
echo "Gap reports: $GAPS_DIR/"
