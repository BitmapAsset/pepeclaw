#!/usr/bin/env bash
###############################################################################
# velocity-tracker.sh - Track project velocity over time
#
# Analyzes commit history to produce weekly velocity metrics including
# commit counts, files changed, lines added/removed, rolling averages,
# trend detection (via simple linear regression), and anomaly flagging.
#
# Usage:
#   ./velocity-tracker.sh /path/to/project [--weeks N] [--output json|text]
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
NUM_WEEKS=8
PROJECT_DIR=""

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<'USAGE'
Usage: velocity-tracker.sh /path/to/project [OPTIONS]

Options:
  --weeks N            Number of weeks to analyse (default: 8)
  --output json|text   Output format (default: text)
  -h, --help           Show this help message
USAGE
  exit 1
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --weeks)
      NUM_WEEKS="${2:-8}"
      shift 2
      ;;
    --output)
      OUTPUT_FORMAT="${2:-text}"
      shift 2
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
# Helper: date arithmetic (portable macOS / Linux)
# ---------------------------------------------------------------------------
date_weeks_ago() {
  local n="$1"
  if date -v-1d +%s &>/dev/null; then
    # macOS
    date -v-"${n}w" +%Y-%m-%d
  else
    # GNU date
    date -d "${n} weeks ago" +%Y-%m-%d
  fi
}

# ---------------------------------------------------------------------------
# Collect weekly data
# ---------------------------------------------------------------------------
declare -a WEEK_LABELS=()
declare -a WEEK_COMMITS=()
declare -a WEEK_FILES=()
declare -a WEEK_ADDED=()
declare -a WEEK_REMOVED=()

collect_weekly_data() {
  for (( i = NUM_WEEKS; i >= 1; i-- )); do
    local week_start week_end
    week_start=$(date_weeks_ago "$i")
    week_end=$(date_weeks_ago "$(( i - 1 ))")

    WEEK_LABELS+=("$week_start")

    # Commits
    local commits
    commits=$(git -C "$PROJECT_DIR" rev-list --count --since="$week_start" --until="$week_end" HEAD 2>/dev/null || echo 0)
    commits=$(safe_int "$commits")
    WEEK_COMMITS+=("$commits")

    # Unique files changed
    local files
    files=$(git -C "$PROJECT_DIR" log --since="$week_start" --until="$week_end" --name-only --pretty=format: HEAD 2>/dev/null \
      | sort -u | grep -c '.' 2>/dev/null || echo 0)
    files=$(safe_int "$files")
    WEEK_FILES+=("$files")

    # Lines added / removed
    local diffstat
    diffstat=$(git -C "$PROJECT_DIR" log --since="$week_start" --until="$week_end" --numstat --pretty=format: HEAD 2>/dev/null || true)
    local added=0 removed=0
    if [[ -n "$diffstat" ]]; then
      added=$(echo "$diffstat" | awk '{s+=$1} END {print s+0}')
      removed=$(echo "$diffstat" | awk '{s+=$2} END {print s+0}')
    fi
    added=$(safe_int "$added")
    removed=$(safe_int "$removed")
    WEEK_ADDED+=("$added")
    WEEK_REMOVED+=("$removed")
  done
}

# ---------------------------------------------------------------------------
# Rolling average (last 4 entries or fewer)
# ---------------------------------------------------------------------------
rolling_avg() {
  # Accept array values as positional args (bash 3.2 compatible, no namerefs)
  local vals=("$@")
  local len=${#vals[@]}
  local window=4
  (( window > len )) && window=$len
  local sum=0
  for (( j = len - window; j < len; j++ )); do
    sum=$(( sum + vals[j] ))
  done
  if (( window > 0 )); then
    echo $(( sum / window ))
  else
    echo 0
  fi
}

# ---------------------------------------------------------------------------
# Simple linear regression on weekly commit counts
#   Returns slope * 1000 (integer approximation) and trend label
# ---------------------------------------------------------------------------
compute_trend() {
  local n=${#WEEK_COMMITS[@]}
  if (( n < 2 )); then
    TREND_SLOPE=0
    TREND_LABEL="stable"
    return
  fi

  # Compute sums for least-squares: y = a + b*x  where x = 0..n-1
  local sum_x=0 sum_y=0 sum_xy=0 sum_x2=0
  for (( k = 0; k < n; k++ )); do
    local y=${WEEK_COMMITS[$k]}
    sum_x=$(( sum_x + k ))
    sum_y=$(( sum_y + y ))
    sum_xy=$(( sum_xy + k * y ))
    sum_x2=$(( sum_x2 + k * k ))
  done

  # slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x^2)
  local numerator=$(( n * sum_xy - sum_x * sum_y ))
  local denominator=$(( n * sum_x2 - sum_x * sum_x ))

  if (( denominator == 0 )); then
    TREND_SLOPE=0
  else
    # Multiply by 1000 for precision before integer division
    TREND_SLOPE=$(( (numerator * 1000) / denominator ))
  fi

  if (( TREND_SLOPE > 200 )); then
    TREND_LABEL="accelerating"
  elif (( TREND_SLOPE < -200 )); then
    TREND_LABEL="decelerating"
  else
    TREND_LABEL="stable"
  fi
}

# ---------------------------------------------------------------------------
# Anomaly detection: flag weeks with commit counts > 2 stddev from mean
# ---------------------------------------------------------------------------
detect_anomalies() {
  ANOMALY_WEEKS=()
  local n=${#WEEK_COMMITS[@]}
  (( n < 3 )) && return

  # Mean
  local sum=0
  for (( k = 0; k < n; k++ )); do
    sum=$(( sum + WEEK_COMMITS[k] ))
  done
  local mean=$(( sum / n ))

  # Variance (integer approximation)
  local var_sum=0
  for (( k = 0; k < n; k++ )); do
    local diff=$(( WEEK_COMMITS[k] - mean ))
    var_sum=$(( var_sum + diff * diff ))
  done
  local variance=$(( var_sum / n ))

  # stddev approximation via integer sqrt (Newton's method)
  local stddev=0
  if (( variance > 0 )); then
    stddev=$variance
    local prev=0
    for _ in {1..20}; do
      prev=$stddev
      stddev=$(( (stddev + variance / stddev) / 2 ))
      (( stddev == prev )) && break
    done
  fi

  local threshold=$(( mean + 2 * stddev ))
  local low_threshold=$(( mean - 2 * stddev ))

  for (( k = 0; k < n; k++ )); do
    if (( WEEK_COMMITS[k] > threshold || WEEK_COMMITS[k] < low_threshold )); then
      ANOMALY_WEEKS+=("${WEEK_LABELS[$k]}")
    fi
  done
}

# ---------------------------------------------------------------------------
# Output — JSON
# ---------------------------------------------------------------------------
output_json() {
  local avg
  avg=$(rolling_avg "${WEEK_COMMITS[@]}")

  echo "{"
  echo "  \"project\": \"$PROJECT_DIR\","
  echo "  \"weeks_analysed\": $NUM_WEEKS,"
  echo "  \"rolling_avg_commits\": $avg,"
  echo "  \"trend\": \"$TREND_LABEL\","
  echo "  \"trend_slope_x1000\": $TREND_SLOPE,"

  # Anomalies
  echo -n "  \"anomaly_weeks\": ["
  for (( k = 0; k < ${#ANOMALY_WEEKS[@]}; k++ )); do
    (( k > 0 )) && echo -n ", "
    echo -n "\"${ANOMALY_WEEKS[$k]}\""
  done
  echo "],"

  # Weekly data array
  echo "  \"weekly\": ["
  local n=${#WEEK_LABELS[@]}
  for (( k = 0; k < n; k++ )); do
    local comma=","
    (( k == n - 1 )) && comma=""
    cat <<EOF
    {
      "week_start": "${WEEK_LABELS[$k]}",
      "commits": ${WEEK_COMMITS[$k]},
      "files_changed": ${WEEK_FILES[$k]},
      "lines_added": ${WEEK_ADDED[$k]},
      "lines_removed": ${WEEK_REMOVED[$k]}
    }${comma}
EOF
  done
  echo "  ]"
  echo "}"
}

# ---------------------------------------------------------------------------
# Output — Text
# ---------------------------------------------------------------------------
output_text() {
  local avg
  avg=$(rolling_avg "${WEEK_COMMITS[@]}")

  cat <<EOF
==============================================
  VELOCITY TRACKER — $PROJECT_DIR
==============================================
Weeks analysed    : $NUM_WEEKS
Rolling avg commits: $avg / week
Trend             : $TREND_LABEL (slope x1000 = $TREND_SLOPE)
Anomaly weeks     : ${ANOMALY_WEEKS[*]:-none}
----------------------------------------------
EOF

  printf "%-14s %8s %8s %10s %10s\n" "Week Start" "Commits" "Files" "Added" "Removed"
  printf "%-14s %8s %8s %10s %10s\n" "-----------" "-------" "-----" "-------" "-------"

  local n=${#WEEK_LABELS[@]}
  for (( k = 0; k < n; k++ )); do
    printf "%-14s %8d %8d %10d %10d\n" \
      "${WEEK_LABELS[$k]}" \
      "${WEEK_COMMITS[$k]}" \
      "${WEEK_FILES[$k]}" \
      "${WEEK_ADDED[$k]}" \
      "${WEEK_REMOVED[$k]}"
  done

  echo "=============================================="
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  collect_weekly_data
  compute_trend
  detect_anomalies

  case "$OUTPUT_FORMAT" in
    json) output_json ;;
    *)    output_text ;;
  esac
}

main
