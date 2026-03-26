#!/usr/bin/env bash
###############################################################################
# auto-triage.sh - Auto-investigate unhealthy projects
#
# Runs health-scorer.sh, and if the score falls below a threshold, performs
# a deep investigation and produces a prioritised triage report.
#
# Usage:
#   ./auto-triage.sh /path/to/project [--threshold 50] [--save]
#
# Exit codes:
#   0 - Success (project healthy or triage report generated)
#   1 - Invalid arguments / not a git repo
###############################################################################
set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve the directory this script lives in (for sibling script calls)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
THRESHOLD=50
SAVE=false
PROJECT_DIR=""

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<'USAGE'
Usage: auto-triage.sh /path/to/project [OPTIONS]

Options:
  --threshold N   Health score threshold below which triage runs (default: 50)
  --save          Write triage report to PROJECT_DIR/TRIAGE.md
  -h, --help      Show this help message
USAGE
  exit 1
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --threshold)
      THRESHOLD="${2:-50}"
      shift 2
      ;;
    --save)
      SAVE=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo "Error: Unknown option '$1'" >&2
      usage
      ;;
    *)
      if [[ -z "$PROJECT_DIR" ]]; then
        PROJECT_DIR="$1"
      else
        echo "Error: Unexpected argument '$1'" >&2
        usage
      fi
      shift
      ;;
  esac
done

if [[ -z "$PROJECT_DIR" ]]; then
  echo "Error: Project directory is required." >&2
  usage
fi

PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  echo "Error: '$PROJECT_DIR' is not a git repository." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Helper: safe integer
# ---------------------------------------------------------------------------
safe_int() {
  local val="${1:-0}"
  val="${val//[^0-9-]/}"
  echo "${val:-0}"
}

# ---------------------------------------------------------------------------
# Helper: letter grade
# ---------------------------------------------------------------------------
score_to_grade() {
  local s="$1"
  if (( s >= 90 )); then echo "A"
  elif (( s >= 80 )); then echo "B"
  elif (( s >= 70 )); then echo "C"
  elif (( s >= 50 )); then echo "D"
  else echo "F"
  fi
}

# ---------------------------------------------------------------------------
# Step 1: Run health scorer and capture JSON
# ---------------------------------------------------------------------------
get_health_score() {
  local health_json
  health_json=$("$SCRIPT_DIR/health-scorer.sh" "$PROJECT_DIR" --output json --quiet 2>/dev/null)

  # Extract total score — simple grep approach (no jq dependency)
  HEALTH_SCORE=$(echo "$health_json" | grep '"total_score"' | head -1 | sed 's/[^0-9]//g')
  HEALTH_SCORE=$(safe_int "$HEALTH_SCORE")
  HEALTH_JSON="$health_json"
}

# ---------------------------------------------------------------------------
# Step 2: Deep investigation functions
# ---------------------------------------------------------------------------

# Recent commits with messages
investigate_recent_commits() {
  RECENT_COMMITS=$(git -C "$PROJECT_DIR" log --oneline -20 --format="%h %s (%ar)" 2>/dev/null || echo "No commits found")
}

# CI / workflow status
investigate_ci() {
  CI_STATUS="No CI configuration detected."

  if [[ -d "$PROJECT_DIR/.github/workflows" ]]; then
    local workflow_files
    workflow_files=$(ls "$PROJECT_DIR/.github/workflows/"*.yml 2>/dev/null || ls "$PROJECT_DIR/.github/workflows/"*.yaml 2>/dev/null || true)
    if [[ -n "$workflow_files" ]]; then
      CI_STATUS="GitHub Actions workflows found: $(echo "$workflow_files" | wc -l | tr -d ' ') file(s)."

      # Attempt to get recent run status via gh CLI
      if command -v gh &>/dev/null; then
        local runs
        runs=$(gh run list --repo "$PROJECT_DIR" --limit 5 --json status,conclusion,name,createdAt \
          --jq '.[] | "\(.name) | \(.status) | \(.conclusion) | \(.createdAt)"' 2>/dev/null || true)
        if [[ -n "$runs" ]]; then
          CI_STATUS="${CI_STATUS}\n\nRecent runs:\n${runs}"
        fi
      fi
    fi
  fi
}

# Open PRs older than 3 days
investigate_stale_prs() {
  STALE_PRS="Unable to check PRs (gh CLI not available or not in a GitHub repo)."

  if command -v gh &>/dev/null; then
    local three_days_ago
    three_days_ago=$(date -v-3d +%Y-%m-%d 2>/dev/null || date -d "3 days ago" +%Y-%m-%d 2>/dev/null || echo "")
    if [[ -n "$three_days_ago" ]]; then
      STALE_PRS=$(gh pr list --repo "$PROJECT_DIR" --state open --json number,title,createdAt,author \
        --jq ".[] | select(.createdAt < \"${three_days_ago}T00:00:00Z\") | \"#\(.number) \(.title) (opened \(.createdAt[:10]) by \(.author.login))\"" 2>/dev/null || echo "None found or unable to query.")
      [[ -z "$STALE_PRS" ]] && STALE_PRS="None (all open PRs are recent)."
    fi
  fi
}

# TODO/FIXME/HACK counts
investigate_todos() {
  TODO_COUNT=$(grep -rIc -E '\bTODO\b' "$PROJECT_DIR" \
    --exclude-dir='.git' --exclude-dir='node_modules' --exclude-dir='vendor' \
    --exclude-dir='dist' --exclude-dir='build' 2>/dev/null \
    | awk -F: '{s+=$NF} END {print s+0}') || TODO_COUNT=0

  FIXME_COUNT=$(grep -rIc -E '\bFIXME\b' "$PROJECT_DIR" \
    --exclude-dir='.git' --exclude-dir='node_modules' --exclude-dir='vendor' \
    --exclude-dir='dist' --exclude-dir='build' 2>/dev/null \
    | awk -F: '{s+=$NF} END {print s+0}') || FIXME_COUNT=0

  HACK_COUNT=$(grep -rIc -E '\bHACK\b' "$PROJECT_DIR" \
    --exclude-dir='.git' --exclude-dir='node_modules' --exclude-dir='vendor' \
    --exclude-dir='dist' --exclude-dir='build' 2>/dev/null \
    | awk -F: '{s+=$NF} END {print s+0}') || HACK_COUNT=0

  TODO_COUNT=$(safe_int "$TODO_COUNT")
  FIXME_COUNT=$(safe_int "$FIXME_COUNT")
  HACK_COUNT=$(safe_int "$HACK_COUNT")
}

# Uncommitted changes
investigate_uncommitted() {
  local status
  status=$(git -C "$PROJECT_DIR" status --short 2>/dev/null || echo "")
  if [[ -z "$status" ]]; then
    UNCOMMITTED="Working tree is clean."
  else
    local count
    count=$(echo "$status" | wc -l | tr -d ' ')
    UNCOMMITTED="$count uncommitted change(s):\n$status"
  fi
}

# Dependency freshness
investigate_dependencies() {
  DEP_STATUS="No supported package manager detected."

  if [[ -f "$PROJECT_DIR/package.json" ]]; then
    if command -v npm &>/dev/null; then
      local outdated
      outdated=$(cd "$PROJECT_DIR" && npm outdated --json 2>/dev/null || echo "{}")
      local outdated_count
      outdated_count=$(echo "$outdated" | grep -c '"current"' 2>/dev/null || echo 0)
      outdated_count=$(safe_int "$outdated_count")
      if (( outdated_count > 0 )); then
        DEP_STATUS="npm: $outdated_count package(s) outdated."
      else
        DEP_STATUS="npm: all packages up to date."
      fi
    else
      DEP_STATUS="package.json found but npm not available for outdated check."
    fi
  fi

  if [[ -f "$PROJECT_DIR/requirements.txt" ]]; then
    DEP_STATUS="${DEP_STATUS}\nPython requirements.txt present (manual review recommended)."
  fi

  if [[ -f "$PROJECT_DIR/go.mod" ]]; then
    DEP_STATUS="${DEP_STATUS}\nGo module detected (run 'go list -m -u all' to check updates)."
  fi
}

# README staleness
investigate_readme() {
  README_STATUS="No README found."

  local readme_file=""
  for candidate in README.md README.rst README.txt README; do
    if [[ -f "$PROJECT_DIR/$candidate" ]]; then
      readme_file="$candidate"
      break
    fi
  done

  if [[ -n "$readme_file" ]]; then
    local last_modified
    last_modified=$(git -C "$PROJECT_DIR" log -1 --format='%ar' -- "$readme_file" 2>/dev/null || echo "unknown")
    README_STATUS="$readme_file last updated: $last_modified"
  fi
}

# ---------------------------------------------------------------------------
# Step 3: Identify top issues and recommended actions
# ---------------------------------------------------------------------------
declare -a ISSUES=()
declare -a ACTIONS=()
declare -a EFFORTS=()

build_recommendations() {
  # Priority 1: Uncommitted changes
  if [[ "$UNCOMMITTED" != "Working tree is clean." ]]; then
    ISSUES+=("Uncommitted changes in working tree")
    ACTIONS+=("Review and commit or stash pending changes")
    EFFORTS+=("5-15 minutes")
  fi

  # Priority 2: Stale PRs
  if [[ "$STALE_PRS" != *"None"* && "$STALE_PRS" != *"Unable"* ]]; then
    ISSUES+=("Stale pull requests open for >3 days")
    ACTIONS+=("Review, merge, or close stale PRs to unblock the pipeline")
    EFFORTS+=("30-60 minutes per PR")
  fi

  # Priority 3: High FIXME/HACK count
  local code_debt=$(( FIXME_COUNT + HACK_COUNT ))
  if (( code_debt > 10 )); then
    ISSUES+=("High code-debt markers: $FIXME_COUNT FIXME(s), $HACK_COUNT HACK(s)")
    ACTIONS+=("Schedule a tech-debt sprint to address critical FIXME/HACK items")
    EFFORTS+=("2-4 hours")
  fi

  # Priority 4: TODO overload
  if (( TODO_COUNT > 20 )); then
    ISSUES+=("$TODO_COUNT TODO markers — potential scope creep")
    ACTIONS+=("Convert TODOs to tracked issues; delete resolved ones")
    EFFORTS+=("1-2 hours")
  fi

  # Priority 5: Outdated dependencies
  if [[ "$DEP_STATUS" == *"outdated"* ]]; then
    ISSUES+=("Outdated package dependencies")
    ACTIONS+=("Run dependency update and verify tests pass")
    EFFORTS+=("30-90 minutes")
  fi

  # Priority 6: CI failures
  if [[ "$CI_STATUS" == *"failure"* ]]; then
    ISSUES+=("Recent CI failures detected")
    ACTIONS+=("Investigate and fix failing CI workflows")
    EFFORTS+=("30-120 minutes")
  fi

  # Priority 7: Stale README
  if [[ "$README_STATUS" == *"months ago"* || "$README_STATUS" == *"year"* ]]; then
    ISSUES+=("README may be outdated ($README_STATUS)")
    ACTIONS+=("Update README to reflect current project state")
    EFFORTS+=("30-60 minutes")
  fi

  # Ensure at least one entry
  if [[ ${#ISSUES[@]} -eq 0 ]]; then
    ISSUES+=("No critical issues found (score may be low due to inactivity)")
    ACTIONS+=("Resume active development or archive the project if dormant")
    EFFORTS+=("Varies")
  fi
}

# ---------------------------------------------------------------------------
# Step 4: Generate triage report
# ---------------------------------------------------------------------------
generate_report() {
  local grade
  grade=$(score_to_grade "$HEALTH_SCORE")
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Cap displayed issues to top 3
  local max_issues=3
  (( ${#ISSUES[@]} < max_issues )) && max_issues=${#ISSUES[@]}

  local report
  report=$(cat <<EOF
# Triage Report

**Project:** $PROJECT_DIR
**Date:** $timestamp
**Health Score:** $HEALTH_SCORE / 100 (Grade: $grade)
**Threshold:** $THRESHOLD

---

## Top Issues

EOF
)

  for (( i = 0; i < max_issues; i++ )); do
    report+="### $(( i + 1 )). ${ISSUES[$i]}

- **Recommended action:** ${ACTIONS[$i]}
- **Estimated effort:** ${EFFORTS[$i]}

"
  done

  report+="---

## Investigation Details

### Recent Commits
\`\`\`
$RECENT_COMMITS
\`\`\`

### CI Status
$(echo -e "$CI_STATUS")

### Stale Pull Requests
$(echo -e "$STALE_PRS")

### Code Markers
| Marker | Count |
|--------|-------|
| TODO   | $TODO_COUNT |
| FIXME  | $FIXME_COUNT |
| HACK   | $HACK_COUNT |

### Working Tree
$(echo -e "$UNCOMMITTED")

### Dependencies
$(echo -e "$DEP_STATUS")

### README
$README_STATUS

---

### Raw Health JSON
\`\`\`json
$HEALTH_JSON
\`\`\`
"

  # Output
  echo "$report"

  if [[ "$SAVE" == true ]]; then
    echo "$report" > "$PROJECT_DIR/TRIAGE.md"
    echo "[auto-triage] Report saved to $PROJECT_DIR/TRIAGE.md" >&2
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo "[auto-triage] Evaluating project: $PROJECT_DIR" >&2

  get_health_score
  echo "[auto-triage] Health score: $HEALTH_SCORE (threshold: $THRESHOLD)" >&2

  if (( HEALTH_SCORE >= THRESHOLD )); then
    echo "[auto-triage] Project is above threshold — no triage needed." >&2
    echo "Project is healthy (score $HEALTH_SCORE, threshold $THRESHOLD). No action required."
    return 0
  fi

  echo "[auto-triage] Score below threshold — running deep investigation..." >&2

  # Run all investigations
  investigate_recent_commits
  investigate_ci
  investigate_stale_prs
  investigate_todos
  investigate_uncommitted
  investigate_dependencies
  investigate_readme

  # Build recommendations from findings
  build_recommendations

  # Produce the report
  generate_report
}

main
