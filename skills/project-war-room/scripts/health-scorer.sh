#!/usr/bin/env bash
###############################################################################
# health-scorer.sh - Calculate project health scores (0-100)
#
# Evaluates a git project across five dimensions:
#   - Git Activity     (25 pts)
#   - Deployment Health (20 pts)
#   - Issue Health      (20 pts)
#   - Blocker Status    (20 pts)
#   - Momentum          (15 pts)
#
# Usage:
#   ./health-scorer.sh /path/to/project [--output json|text] [--quiet] [--save]
#
# Exit codes:
#   0 - Success
#   1 - Invalid arguments / not a git repo
###############################################################################
set -euo pipefail

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
OUTPUT_FORMAT="text"
QUIET=false
SAVE=false
PROJECT_DIR=""

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<'USAGE'
Usage: health-scorer.sh /path/to/project [OPTIONS]

Options:
  --output json|text   Output format (default: text)
  --quiet              Suppress informational messages
  --save               Persist results to STATE.md in the project directory
  -h, --help           Show this help message
USAGE
  exit 1
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      OUTPUT_FORMAT="${2:-text}"
      shift 2
      ;;
    --quiet)
      QUIET=true
      shift
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
# Helper: log (respects --quiet)
# ---------------------------------------------------------------------------
log() {
  if [[ "$QUIET" == false ]]; then
    echo "[health-scorer] $*" >&2
  fi
}

# ---------------------------------------------------------------------------
# Helper: safe integer — defaults to 0 on empty/non-numeric input
# ---------------------------------------------------------------------------
safe_int() {
  local val="${1:-0}"
  val="${val//[^0-9-]/}"
  echo "${val:-0}"
}

# ---------------------------------------------------------------------------
# Helper: clamp value between min and max
# ---------------------------------------------------------------------------
clamp() {
  local val="$1" min="$2" max="$3"
  val=$(safe_int "$val")
  (( val < min )) && val=$min
  (( val > max )) && val=$max
  echo "$val"
}

# ---------------------------------------------------------------------------
# Commit frequency scoring
# 1. Git Activity Score (max 25)
# ---------------------------------------------------------------------------
calculate_git_activity() {
  log "Scoring git activity..."
  local score=0

  # Commits in last 7 days
  local commits_7d
  commits_7d=$(git -C "$PROJECT_DIR" rev-list --count --since="7 days ago" HEAD 2>/dev/null || echo 0)
  commits_7d=$(safe_int "$commits_7d")

  if (( commits_7d == 0 )); then
    score=0
  elif (( commits_7d <= 2 )); then
    score=10
  elif (( commits_7d <= 7 )); then
    score=18
  else
    score=25
  fi

  # Penalize if no commits in 14+ days
  local commits_14d
  commits_14d=$(git -C "$PROJECT_DIR" rev-list --count --since="14 days ago" HEAD 2>/dev/null || echo 0)
  commits_14d=$(safe_int "$commits_14d")
  if (( commits_14d == 0 )); then
    score=$(( score - 10 ))
  fi

  # Bonus for PR merge activity (look for merge commits in last 7 days)
  local merges_7d
  merges_7d=$(git -C "$PROJECT_DIR" rev-list --count --merges --since="7 days ago" HEAD 2>/dev/null || echo 0)
  merges_7d=$(safe_int "$merges_7d")
  if (( merges_7d > 0 )); then
    score=$(( score + 3 ))
  fi

  score=$(clamp "$score" 0 25)

  echo "$score"
  GIT_DETAIL="commits_7d=$commits_7d merges_7d=$merges_7d commits_14d=$commits_14d"
}

# ---------------------------------------------------------------------------
# Deploy frequency (recency of last deploy)
# 2. Deployment Health Score (max 20)
# ---------------------------------------------------------------------------
calculate_deploy_health() {
  log "Scoring deployment health..."
  local score=15  # Neutral default if no deploy system detected
  local has_deploy_system=false
  local deploy_detail="none_detected"

  # Check for CI/CD configuration files
  local ci_files=(
    ".github/workflows"
    ".gitlab-ci.yml"
    "Jenkinsfile"
    ".circleci/config.yml"
    ".travis.yml"
    "vercel.json"
    "netlify.toml"
    "fly.toml"
    "render.yaml"
    "Dockerfile"
  )

  for ci_file in "${ci_files[@]}"; do
    if [[ -e "$PROJECT_DIR/$ci_file" ]]; then
      has_deploy_system=true
      deploy_detail="ci_detected=$ci_file"
      break
    fi
  done

  # Check for deploy scripts in package.json
  if [[ -f "$PROJECT_DIR/package.json" ]]; then
    if grep -qE '"deploy"|"release"|"publish"' "$PROJECT_DIR/package.json" 2>/dev/null; then
      has_deploy_system=true
      deploy_detail="${deploy_detail} pkg_deploy_script=true"
    fi
  fi

  if [[ "$has_deploy_system" == true ]]; then
    score=16  # Base score for having a deploy system

    # Check gh CLI for recent workflow runs if available
    if command -v gh &>/dev/null; then
      local last_run_status
      last_run_status=$(gh run list --repo "$PROJECT_DIR" --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "unknown")
      case "$last_run_status" in
        success)
          score=20
          deploy_detail="${deploy_detail} last_run=success"
          ;;
        failure)
          score=8
          deploy_detail="${deploy_detail} last_run=failure"
          ;;
        *)
          # Keep 16 — no recent run info
          deploy_detail="${deploy_detail} last_run=unknown"
          ;;
      esac
    fi
  fi

  score=$(clamp "$score" 0 20)
  echo "$score"
  DEPLOY_DETAIL="$deploy_detail"
}

# ---------------------------------------------------------------------------
# 3. Issue Health Score (max 20)
# ---------------------------------------------------------------------------
calculate_issue_health() {
  log "Scoring issue health..."
  local score=20
  local todo_count=0
  local gh_issue_count=0

  # Count TODO/FIXME/HACK markers in the codebase (excluding hidden dirs, node_modules, vendor)
  todo_count=$(grep -rIc -E '\b(TODO|FIXME|HACK)\b' "$PROJECT_DIR" \
    --exclude-dir='.git' \
    --exclude-dir='node_modules' \
    --exclude-dir='vendor' \
    --exclude-dir='.next' \
    --exclude-dir='dist' \
    --exclude-dir='build' \
    2>/dev/null | awk -F: '{s+=$NF} END {print s+0}') || todo_count=0
  todo_count=$(safe_int "$todo_count")

  # Deduct points based on TODO/FIXME/HACK density
  if (( todo_count > 50 )); then
    score=$(( score - 12 ))
  elif (( todo_count > 20 )); then
    score=$(( score - 8 ))
  elif (( todo_count > 10 )); then
    score=$(( score - 5 ))
  elif (( todo_count > 5 )); then
    score=$(( score - 2 ))
  fi

  # Check GitHub issues if gh CLI is available
  if command -v gh &>/dev/null; then
    gh_issue_count=$(gh issue list --repo "$PROJECT_DIR" --state open --limit 100 --json number --jq 'length' 2>/dev/null || echo 0)
    gh_issue_count=$(safe_int "$gh_issue_count")

    if (( gh_issue_count > 30 )); then
      score=$(( score - 6 ))
    elif (( gh_issue_count > 15 )); then
      score=$(( score - 4 ))
    elif (( gh_issue_count > 5 )); then
      score=$(( score - 2 ))
    fi
  fi

  score=$(clamp "$score" 0 20)
  echo "$score"
  ISSUE_DETAIL="todos=$todo_count gh_issues=$gh_issue_count"
}

# ---------------------------------------------------------------------------
# 4. Blocker Status Score (max 20)
# ---------------------------------------------------------------------------
calculate_blocker_status() {
  log "Scoring blocker status..."
  local score=20
  local blocker_tags=0
  local stale_prs=0

  # Check for BLOCKER/BLOCKED tags in codebase
  blocker_tags=$(grep -rIc -E '\b(BLOCKER|BLOCKED)\b' "$PROJECT_DIR" \
    --exclude-dir='.git' \
    --exclude-dir='node_modules' \
    --exclude-dir='vendor' \
    2>/dev/null | awk -F: '{s+=$NF} END {print s+0}') || blocker_tags=0
  blocker_tags=$(safe_int "$blocker_tags")

  # Check git log for BLOCKER/BLOCKED references in last 14 days
  local log_blockers
  log_blockers=$(git -C "$PROJECT_DIR" log --since="14 days ago" --oneline --grep='BLOCK' 2>/dev/null | wc -l || echo 0)
  log_blockers=$(safe_int "$log_blockers")
  blocker_tags=$(( blocker_tags + log_blockers ))

  if (( blocker_tags > 5 )); then
    score=$(( score - 15 ))
  elif (( blocker_tags > 2 )); then
    score=$(( score - 10 ))
  elif (( blocker_tags > 0 )); then
    score=$(( score - 5 ))
  fi

  # Check for stale PRs (open > 7 days) via gh CLI
  if command -v gh &>/dev/null; then
    local week_ago
    week_ago=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d 2>/dev/null || echo "")
    if [[ -n "$week_ago" ]]; then
      stale_prs=$(gh pr list --repo "$PROJECT_DIR" --state open --json createdAt \
        --jq "[.[] | select(.createdAt < \"${week_ago}T00:00:00Z\")] | length" 2>/dev/null || echo 0)
      stale_prs=$(safe_int "$stale_prs")
    fi
  fi

  if (( stale_prs > 3 )); then
    score=$(( score - 8 ))
  elif (( stale_prs > 0 )); then
    score=$(( score - 4 ))
  fi

  score=$(clamp "$score" 0 20)
  echo "$score"
  BLOCKER_DETAIL="blocker_tags=$blocker_tags stale_prs=$stale_prs"
}

# ---------------------------------------------------------------------------
# 5. Momentum Score (max 15)
# ---------------------------------------------------------------------------
calculate_momentum() {
  log "Scoring momentum..."
  local score=0

  # Days since last commit
  local last_commit_ts
  last_commit_ts=$(git -C "$PROJECT_DIR" log -1 --format='%ct' 2>/dev/null || echo 0)
  last_commit_ts=$(safe_int "$last_commit_ts")
  local now_ts
  now_ts=$(date +%s)
  local days_since_last=$(( (now_ts - last_commit_ts) / 86400 ))

  if (( days_since_last <= 1 )); then
    score=15
  elif (( days_since_last <= 3 )); then
    score=12
  elif (( days_since_last <= 7 )); then
    score=8
  elif (( days_since_last <= 14 )); then
    score=4
  else
    score=0
  fi

  # Velocity trend: compare last 7d vs prior 7d commits
  local commits_last_7d
  commits_last_7d=$(git -C "$PROJECT_DIR" rev-list --count --since="7 days ago" HEAD 2>/dev/null || echo 0)
  commits_last_7d=$(safe_int "$commits_last_7d")

  local commits_prior_7d
  commits_prior_7d=$(git -C "$PROJECT_DIR" rev-list --count --since="14 days ago" --until="7 days ago" HEAD 2>/dev/null || echo 0)
  commits_prior_7d=$(safe_int "$commits_prior_7d")

  local trend="stable"
  if (( commits_prior_7d > 0 )); then
    local ratio=$(( (commits_last_7d * 100) / commits_prior_7d ))
    if (( ratio > 130 )); then
      trend="accelerating"
      score=$(( score + 3 ))
    elif (( ratio < 70 )); then
      trend="decelerating"
      score=$(( score - 3 ))
    fi
  elif (( commits_last_7d > 0 )); then
    trend="accelerating"
    score=$(( score + 2 ))
  fi

  score=$(clamp "$score" 0 15)
  echo "$score"
  MOMENTUM_DETAIL="days_since_last=$days_since_last trend=$trend commits_7d=$commits_last_7d prior_7d=$commits_prior_7d"
}

# ---------------------------------------------------------------------------
# Letter grade from numeric score
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
# Main
# ---------------------------------------------------------------------------
main() {
  log "Evaluating project health for: $PROJECT_DIR"

  # Collect per-dimension detail strings (set by each function as side effect)
  GIT_DETAIL=""
  DEPLOY_DETAIL=""
  ISSUE_DETAIL=""
  BLOCKER_DETAIL=""
  MOMENTUM_DETAIL=""

  local git_score deploy_score issue_score blocker_score momentum_score

  git_score=$(calculate_git_activity)
  deploy_score=$(calculate_deploy_health)
  issue_score=$(calculate_issue_health)
  blocker_score=$(calculate_blocker_status)
  momentum_score=$(calculate_momentum)

  local total=$(( git_score + deploy_score + issue_score + blocker_score + momentum_score ))
  total=$(clamp "$total" 0 100)

  local grade
  grade=$(score_to_grade "$total")
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # -----------------------------------------------------------------------
  # JSON output
  # -----------------------------------------------------------------------
  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    cat <<EOF
{
  "project": "$PROJECT_DIR",
  "timestamp": "$timestamp",
  "total_score": $total,
  "grade": "$grade",
  "dimensions": {
    "git_activity": { "score": $git_score, "max": 25, "detail": "$GIT_DETAIL" },
    "deploy_health": { "score": $deploy_score, "max": 20, "detail": "$DEPLOY_DETAIL" },
    "issue_health": { "score": $issue_score, "max": 20, "detail": "$ISSUE_DETAIL" },
    "blocker_status": { "score": $blocker_score, "max": 20, "detail": "$BLOCKER_DETAIL" },
    "momentum": { "score": $momentum_score, "max": 15, "detail": "$MOMENTUM_DETAIL" }
  }
}
EOF

  # -----------------------------------------------------------------------
  # Text output
  # -----------------------------------------------------------------------
  else
    cat <<EOF
=======================================
  PROJECT HEALTH REPORT
=======================================
Project   : $PROJECT_DIR
Timestamp : $timestamp
Grade     : $grade ($total / 100)
---------------------------------------
  Git Activity     : $git_score / 25   ($GIT_DETAIL)
  Deployment Health: $deploy_score / 20   ($DEPLOY_DETAIL)
  Issue Health     : $issue_score / 20   ($ISSUE_DETAIL)
  Blocker Status   : $blocker_score / 20   ($BLOCKER_DETAIL)
  Momentum         : $momentum_score / 15   ($MOMENTUM_DETAIL)
=======================================
EOF
  fi

  # -----------------------------------------------------------------------
  # Persist to STATE.md if requested
  # -----------------------------------------------------------------------
  if [[ "$SAVE" == true ]]; then
    log "Saving results to $PROJECT_DIR/STATE.md"
    cat > "$PROJECT_DIR/STATE.md" <<EOF
# Project Health State

| Field | Value |
|-------|-------|
| Score | $total / 100 |
| Grade | $grade |
| Git Activity | $git_score / 25 |
| Deploy Health | $deploy_score / 20 |
| Issue Health | $issue_score / 20 |
| Blocker Status | $blocker_score / 20 |
| Momentum | $momentum_score / 15 |
| Updated | $timestamp |

## Detail
- Git: $GIT_DETAIL
- Deploy: $DEPLOY_DETAIL
- Issues: $ISSUE_DETAIL
- Blockers: $BLOCKER_DETAIL
- Momentum: $MOMENTUM_DETAIL
EOF
  fi
}

main
