#!/usr/bin/env bash
# generate-draft.sh — Generate a SKILL.md draft from a detected pattern
# Usage: ./scripts/generate-draft.sh --pattern "pattern-name" [--dry-run] [--all]

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
DRAFTS_DIR="${WORKSPACE_ROOT}/${SKILL_DRAFTS_DIR:-memory/skill-drafts}"

PATTERN="" DRY_RUN=false GEN_ALL=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pattern) PATTERN="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --all)     GEN_ALL=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$PATTERN" && "$GEN_ALL" == "false" ]]; then
  echo "Usage: $0 --pattern 'pattern-name' [--dry-run]"
  echo "       $0 --all [--dry-run]"
  exit 1
fi

mkdir -p "$DRAFTS_DIR"

generate_draft() {
  local name="$1"
  local slug=$(echo "$name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
  local date=$(date -u '+%Y-%m-%d')
  local draft_file="${DRAFTS_DIR}/${slug}.md"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] Would create: ${draft_file}"
    echo ""
  fi

  local content=$(cat << EOF
---
name: ${slug}
description: "Auto-detected pattern: ${name}"
metadata:
  openclaw:
    emoji: "🔧"
    auto_generated: true
    source_pattern: "${name}"
    confidence: 0.7
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: skill-autocreator
    created: ${date}
    generation: 1
  tags: [auto-generated]
---

# ${name}

Auto-generated skill from detected pattern.

## Pattern Summary
- **Source**: execution trace analysis
- **Detection date**: ${date}

## Suggested Implementation
<!-- Review and fill in implementation details -->

## Review Checklist
- [ ] Verify this pattern is worth automating
- [ ] Check for edge cases
- [ ] Add proper implementation steps
- [ ] Approve by moving to skills/ directory
EOF
)

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "$content"
  else
    echo "$content" > "$draft_file"
    echo "Draft created: ${draft_file}"
  fi
}

if [[ -n "$PATTERN" ]]; then
  generate_draft "$PATTERN"
elif [[ "$GEN_ALL" == "true" ]]; then
  echo "Generating all pending drafts..."
  echo "(Run detect-patterns.sh first to identify patterns)"
fi

echo ""
echo "Done. Review drafts in: ${DRAFTS_DIR}/"
echo "Approve by moving to skills/ directory."
