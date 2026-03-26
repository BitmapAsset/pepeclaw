#!/usr/bin/env bash
###############################################################################
# dependency-mapper.sh - Map cross-project dependencies
#
# Scans a root directory for git repositories and builds a dependency graph
# by analysing package.json, import statements, git submodules, and shared
# configuration. Detects circular dependencies, critical-path projects,
# and single points of failure.
#
# Compatible with bash 3.2+ (macOS default).
#
# Usage:
#   ./dependency-mapper.sh /path/to/projects/root [--output json|text|dot]
#
# Exit codes:
#   0 - Success
#   1 - Invalid arguments
###############################################################################
set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve the directory this script lives in (for sibling script calls)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Temp directory for file-based key-value stores (bash 3.2 compat)
# ---------------------------------------------------------------------------
TMPDIR_KV="$(mktemp -d "${TMPDIR:-/tmp}/dep-mapper.XXXXXX")"
trap 'rm -rf "$TMPDIR_KV"' EXIT INT TERM HUP

# Key-value store files
KV_DEP_COUNT="$TMPDIR_KV/dep_count"
KV_DEPENDS_ON="$TMPDIR_KV/depends_on"
KV_KNOWN_PROJECTS="$TMPDIR_KV/known_projects"
KV_VISIT_STATE="$TMPDIR_KV/visit_state"

# Initialize empty files
touch "$KV_DEP_COUNT" "$KV_DEPENDS_ON" "$KV_KNOWN_PROJECTS" "$KV_VISIT_STATE"

# ---------------------------------------------------------------------------
# Key-value helper functions (file-based, bash 3.2 compatible)
# ---------------------------------------------------------------------------
kv_set() {
  local file="$1" key="$2" val="$3"
  grep -v "^${key} " "$file" > "${file}.tmp" 2>/dev/null || true
  echo "${key} ${val}" >> "${file}.tmp"
  mv "${file}.tmp" "$file"
}

kv_get() {
  local file="$1" key="$2"
  local result
  result=$(grep "^${key} " "$file" 2>/dev/null | head -1 | cut -d' ' -f2-) || true
  echo "$result"
}

kv_get_default() {
  local file="$1" key="$2" default="$3"
  local val
  val=$(kv_get "$file" "$key") || true
  echo "${val:-$default}"
}

kv_keys() {
  local file="$1"
  awk '{print $1}' "$file" 2>/dev/null || true
}

kv_has() {
  local file="$1" key="$2"
  grep -qF "$key" "$file" 2>/dev/null || return 1
}

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
OUTPUT_FORMAT="text"
ROOT_DIR=""

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<'USAGE'
Usage: dependency-mapper.sh /path/to/projects/root [OPTIONS]

Options:
  --output json|text|dot   Output format (default: text)
  -h, --help               Show this help message
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
    -h|--help)
      usage
      ;;
    -*)
      echo "Error: Unknown option '$1'" >&2
      usage
      ;;
    *)
      if [[ -z "$ROOT_DIR" ]]; then
        ROOT_DIR="$1"
      else
        echo "Error: Unexpected argument '$1'" >&2
        usage
      fi
      shift
      ;;
  esac
done

if [[ -z "$ROOT_DIR" ]]; then
  echo "Error: Projects root directory is required." >&2
  usage
fi

ROOT_DIR="$(cd "$ROOT_DIR" && pwd)"

if [[ ! -d "$ROOT_DIR" ]]; then
  echo "Error: '$ROOT_DIR' is not a valid directory." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Data structures (indexed arrays, bash 3.2 compatible)
#
# PROJECT_NAMES[i]   = short name of project i
# PROJECT_PATHS[i]   = absolute path
# EDGES               = newline-separated "source|target" pairs
# ---------------------------------------------------------------------------
PROJECT_NAMES=()
PROJECT_PATHS=()
EDGES=""

# ---------------------------------------------------------------------------
# Step 1: Discover git repositories (one level deep + root itself)
# ---------------------------------------------------------------------------
discover_projects() {
  # Check root itself
  if [[ -d "$ROOT_DIR/.git" ]]; then
    local name
    name=$(basename "$ROOT_DIR")
    PROJECT_NAMES+=("$name")
    PROJECT_PATHS+=("$ROOT_DIR")
  fi

  # Immediate subdirectories that are git repos
  for dir in "$ROOT_DIR"/*/; do
    [[ ! -d "$dir" ]] && continue
    if [[ -d "${dir}.git" ]]; then
      local name
      name=$(basename "$dir")
      PROJECT_NAMES+=("$name")
      PROJECT_PATHS+=("$dir")
    fi
  done

  echo "[dep-mapper] Found ${#PROJECT_NAMES[@]} project(s) under $ROOT_DIR" >&2
}

# ---------------------------------------------------------------------------
# Step 2: For each project, detect dependencies on sibling projects
# ---------------------------------------------------------------------------

build_project_lookup() {
  for name in "${PROJECT_NAMES[@]}"; do
    echo "$name" >> "$KV_KNOWN_PROJECTS"
  done
}

# Check package.json for local/workspace references to siblings
scan_package_json() {
  local project_name="$1"
  local project_path="$2"
  local pkg="$project_path/package.json"

  [[ ! -f "$pkg" ]] && return

  # Also look for sibling project names in dependency keys
  for sibling in "${PROJECT_NAMES[@]}"; do
    [[ "$sibling" == "$project_name" ]] && continue
    if grep -qE "\"$sibling\"" "$pkg" 2>/dev/null; then
      add_edge "$project_name" "$sibling"
    fi
  done

  # Check workspace references that point to ../<sibling>
  local workspace_refs
  workspace_refs=$(grep -oE '"\.\./[^"]*"' "$pkg" 2>/dev/null | tr -d '"' || true)
  while IFS= read -r ref; do
    [[ -z "$ref" ]] && continue
    local target
    target=$(basename "$ref")
    if [[ "$target" != "$project_name" ]] && grep -qF "$target" "$KV_KNOWN_PROJECTS" 2>/dev/null; then
      add_edge "$project_name" "$target"
    fi
  done <<< "$workspace_refs"
}

# Scan source files for import/require references to sibling projects
scan_imports() {
  local project_name="$1"
  local project_path="$2"

  for sibling in "${PROJECT_NAMES[@]}"; do
    [[ "$sibling" == "$project_name" ]] && continue

    # Look for import/require statements referencing sibling by name
    local found
    found=$(grep -rlE "(from\s+['\"]\.?\.?/?${sibling}[/'\" ]|require\s*\(\s*['\"]\.?\.?/?${sibling}[/'\" ])" \
      "$project_path" \
      --include='*.js' --include='*.ts' --include='*.jsx' --include='*.tsx' \
      --include='*.py' --include='*.go' --include='*.rs' \
      --exclude-dir='.git' --exclude-dir='node_modules' --exclude-dir='vendor' \
      --exclude-dir='dist' --exclude-dir='build' \
      2>/dev/null | head -1 || true)

    if [[ -n "$found" ]]; then
      add_edge "$project_name" "$sibling"
    fi
  done
}

# Check for git submodules referencing siblings
scan_submodules() {
  local project_name="$1"
  local project_path="$2"
  local gitmodules="$project_path/.gitmodules"

  [[ ! -f "$gitmodules" ]] && return

  for sibling in "${PROJECT_NAMES[@]}"; do
    [[ "$sibling" == "$project_name" ]] && continue
    if grep -q "$sibling" "$gitmodules" 2>/dev/null; then
      add_edge "$project_name" "$sibling"
    fi
  done
}

# Check for shared config / env references
scan_shared_config() {
  local project_name="$1"
  local project_path="$2"

  # Look for .env files referencing sibling project names
  for env_file in "$project_path"/.env*; do
    [[ ! -f "$env_file" ]] && continue
    for sibling in "${PROJECT_NAMES[@]}"; do
      [[ "$sibling" == "$project_name" ]] && continue
      if grep -qi "$sibling" "$env_file" 2>/dev/null; then
        add_edge "$project_name" "$sibling"
      fi
    done
  done
}

# Add a directed edge (source depends on target), deduplicating
add_edge() {
  local source="$1"
  local target="$2"
  local edge_key="${source}|${target}"

  # Deduplicate
  if echo "$EDGES" | grep -qF "$edge_key" 2>/dev/null; then
    return 0
  fi

  EDGES="${EDGES}${edge_key}"$'\n'

  # Update adjacency list
  local current_deps
  current_deps=$(kv_get "$KV_DEPENDS_ON" "$source")
  if [[ -z "$current_deps" ]]; then
    kv_set "$KV_DEPENDS_ON" "$source" "$target"
  else
    kv_set "$KV_DEPENDS_ON" "$source" "${current_deps},${target}"
  fi

  # Increment dependent count for target
  local current_count
  current_count=$(kv_get_default "$KV_DEP_COUNT" "$target" "0")
  kv_set "$KV_DEP_COUNT" "$target" "$(( current_count + 1 ))"
}

# Run all scanners for a single project
scan_project() {
  local name="$1"
  local path="$2"
  echo "[dep-mapper] Scanning: $name" >&2

  scan_package_json "$name" "$path"
  scan_imports "$name" "$path"
  scan_submodules "$name" "$path"
  scan_shared_config "$name" "$path"
}

# ---------------------------------------------------------------------------
# Step 3: Detect circular dependencies (DFS-based cycle detection)
# ---------------------------------------------------------------------------
CYCLES=()

detect_cycles() {
  for name in "${PROJECT_NAMES[@]}"; do
    kv_set "$KV_VISIT_STATE" "$name" "0"
  done

  for name in "${PROJECT_NAMES[@]}"; do
    local state
    state=$(kv_get_default "$KV_VISIT_STATE" "$name" "0")
    if [[ "$state" = "0" ]]; then
      dfs_visit "$name" ""
    fi
  done
}

dfs_visit() {
  local node="$1"
  local path="$2"

  kv_set "$KV_VISIT_STATE" "$node" "1"
  local new_path
  if [[ -n "$path" ]]; then
    new_path="$path -> $node"
  else
    new_path="$node"
  fi

  local deps_str
  deps_str=$(kv_get "$KV_DEPENDS_ON" "$node")
  if [[ -n "$deps_str" ]]; then
    local OLD_IFS="$IFS"
    IFS=','
    set -f
    for dep in $deps_str; do
      set +f
      IFS="$OLD_IFS"
      [[ -z "$dep" ]] && continue
      local dep_state
      dep_state=$(kv_get_default "$KV_VISIT_STATE" "$dep" "0")
      if [[ "$dep_state" = "1" ]]; then
        CYCLES+=("$new_path -> $dep")
      elif [[ "$dep_state" = "0" ]]; then
        dfs_visit "$dep" "$new_path"
      fi
      IFS=','
      set -f
    done
    set +f
    IFS="$OLD_IFS"
  fi

  kv_set "$KV_VISIT_STATE" "$node" "2"
}

# ---------------------------------------------------------------------------
# Step 4: Identify critical path projects (most dependents)
# ---------------------------------------------------------------------------
CRITICAL_PROJECTS=()

find_critical_projects() {
  # Sort projects by dependent count descending
  local sorted
  sorted=$(while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    local count
    count=$(kv_get "$KV_DEP_COUNT" "$key")
    echo "${count} ${key}"
  done < <(kv_keys "$KV_DEP_COUNT") | sort -rn)

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    CRITICAL_PROJECTS+=("$line")
  done <<< "$sorted"
}

# ---------------------------------------------------------------------------
# Step 5: Flag single points of failure
#   Projects with many dependents AND low health score
# ---------------------------------------------------------------------------
SPOF_WARNINGS=()

check_single_points_of_failure() {
  while IFS= read -r name; do
    [[ -z "$name" ]] && continue
    local count
    count=$(kv_get "$KV_DEP_COUNT" "$name")
    # Only flag projects with 2+ dependents
    if [[ "$count" -lt 2 ]]; then
      continue
    fi

    # Try to get health score via sibling script
    local project_path=""
    local i=0
    while [[ $i -lt ${#PROJECT_NAMES[@]} ]]; do
      if [[ "${PROJECT_NAMES[$i]}" = "$name" ]]; then
        project_path="${PROJECT_PATHS[$i]}"
        break
      fi
      i=$(( i + 1 ))
    done

    if [[ -n "$project_path" && -x "$SCRIPT_DIR/health-scorer.sh" ]]; then
      local score_json
      score_json=$("$SCRIPT_DIR/health-scorer.sh" "$project_path" --output json --quiet 2>/dev/null || echo '{}')
      local score
      score=$(echo "$score_json" | grep '"total_score"' | head -1 | sed 's/[^0-9]//g')
      score="${score:-0}"
      if [[ "$score" -lt 60 ]]; then
        SPOF_WARNINGS+=("$name (${count} dependents, health=${score})")
      fi
    fi
  done < <(kv_keys "$KV_DEP_COUNT")
}

# ---------------------------------------------------------------------------
# Output: JSON
# ---------------------------------------------------------------------------
output_json() {
  echo "{"
  echo "  \"root\": \"$ROOT_DIR\","
  echo "  \"project_count\": ${#PROJECT_NAMES[@]},"

  # Projects list
  echo "  \"projects\": ["
  local i=0
  while [[ $i -lt ${#PROJECT_NAMES[@]} ]]; do
    local comma=","
    if [[ $i -eq $(( ${#PROJECT_NAMES[@]} - 1 )) ]]; then
      comma=""
    fi
    local deps
    deps=$(kv_get "$KV_DEPENDS_ON" "${PROJECT_NAMES[$i]}")
    local dep_count
    dep_count=$(kv_get_default "$KV_DEP_COUNT" "${PROJECT_NAMES[$i]}" "0")
    # Convert comma-separated to JSON array
    local deps_json="[]"
    if [[ -n "$deps" ]]; then
      deps_json="[$(echo "$deps" | sed 's/[^,]*/"&"/g')]"
    fi
    echo "    { \"name\": \"${PROJECT_NAMES[$i]}\", \"path\": \"${PROJECT_PATHS[$i]}\", \"depends_on\": $deps_json, \"dependents\": ${dep_count} }${comma}"
    i=$(( i + 1 ))
  done
  echo "  ],"

  # Edges
  echo "  \"edges\": ["
  local edge_lines
  edge_lines=$(echo "$EDGES" | grep -v '^$' || true)
  local edge_count=0
  local total_edges
  total_edges=$(echo "$edge_lines" | grep -c '.' 2>/dev/null || echo 0)
  while IFS='|' read -r src tgt; do
    [[ -z "$src" ]] && continue
    edge_count=$(( edge_count + 1 ))
    local comma=","
    if [[ $edge_count -ge $total_edges ]]; then
      comma=""
    fi
    echo "    { \"from\": \"$src\", \"to\": \"$tgt\" }${comma}"
  done <<< "$edge_lines"
  echo "  ],"

  # Cycles
  echo -n "  \"circular_dependencies\": ["
  local i=0
  while [[ $i -lt ${#CYCLES[@]} ]]; do
    if [[ $i -gt 0 ]]; then
      echo -n ", "
    fi
    echo -n "\"${CYCLES[$i]}\""
    i=$(( i + 1 ))
  done
  echo "],"

  # Critical path
  echo -n "  \"critical_path_projects\": ["
  i=0
  while [[ $i -lt ${#CRITICAL_PROJECTS[@]} ]]; do
    if [[ $i -gt 0 ]]; then
      echo -n ", "
    fi
    echo -n "\"${CRITICAL_PROJECTS[$i]}\""
    i=$(( i + 1 ))
  done
  echo "],"

  # SPOF
  echo -n "  \"single_points_of_failure\": ["
  i=0
  while [[ $i -lt ${#SPOF_WARNINGS[@]} ]]; do
    if [[ $i -gt 0 ]]; then
      echo -n ", "
    fi
    echo -n "\"${SPOF_WARNINGS[$i]}\""
    i=$(( i + 1 ))
  done
  echo "]"

  echo "}"
}

# ---------------------------------------------------------------------------
# Output: Graphviz DOT
# ---------------------------------------------------------------------------
output_dot() {
  echo "digraph dependencies {"
  echo "  rankdir=LR;"
  echo "  node [shape=box, style=filled, fillcolor=lightblue];"
  echo ""

  # Highlight critical projects
  for entry in "${CRITICAL_PROJECTS[@]}"; do
    local name
    name=$(echo "$entry" | awk '{print $2}')
    echo "  \"$name\" [fillcolor=orange];"
  done

  # SPOF projects in red
  for warning in "${SPOF_WARNINGS[@]}"; do
    local name
    name=$(echo "$warning" | awk '{print $1}')
    echo "  \"$name\" [fillcolor=red, fontcolor=white];"
  done

  echo ""

  # Edges
  local edge_lines
  edge_lines=$(echo "$EDGES" | grep -v '^$' || true)
  while IFS='|' read -r src tgt; do
    [[ -z "$src" ]] && continue
    echo "  \"$src\" -> \"$tgt\";"
  done <<< "$edge_lines"

  # Mark cycles with red dashed edges
  for cycle in "${CYCLES[@]}"; do
    echo "  // CYCLE: $cycle"
  done

  echo "}"
}

# ---------------------------------------------------------------------------
# Output: Human-readable text
# ---------------------------------------------------------------------------
output_text() {
  cat <<EOF
==============================================
  DEPENDENCY MAP — $ROOT_DIR
==============================================
Projects found: ${#PROJECT_NAMES[@]}
EOF

  echo ""
  echo "--- Adjacency List ---"
  for name in "${PROJECT_NAMES[@]}"; do
    local deps
    deps=$(kv_get "$KV_DEPENDS_ON" "$name")
    deps="${deps:-none}"
    local dep_count
    dep_count=$(kv_get_default "$KV_DEP_COUNT" "$name" "0")
    printf "  %-30s depends on: %-40s  (depended on by %d project(s))\n" "$name" "$deps" "$dep_count"
  done

  echo ""
  echo "--- Circular Dependencies ---"
  if [[ ${#CYCLES[@]} -eq 0 ]]; then
    echo "  None detected."
  else
    for cycle in "${CYCLES[@]}"; do
      echo "  CYCLE: $cycle"
    done
  fi

  echo ""
  echo "--- Critical Path Projects (by dependent count) ---"
  if [[ ${#CRITICAL_PROJECTS[@]} -eq 0 ]]; then
    echo "  No project has dependents."
  else
    for entry in "${CRITICAL_PROJECTS[@]}"; do
      echo "  $entry"
    done
  fi

  echo ""
  echo "--- Single Points of Failure ---"
  if [[ ${#SPOF_WARNINGS[@]} -eq 0 ]]; then
    echo "  None detected."
  else
    for warning in "${SPOF_WARNINGS[@]}"; do
      echo "  WARNING: $warning"
    done
  fi

  echo ""
  echo "=============================================="
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  discover_projects

  if [[ ${#PROJECT_NAMES[@]} -eq 0 ]]; then
    echo "No git repositories found under $ROOT_DIR" >&2
    exit 0
  fi

  build_project_lookup

  # Scan each project for dependencies on siblings
  local i=0
  while [[ $i -lt ${#PROJECT_NAMES[@]} ]]; do
    scan_project "${PROJECT_NAMES[$i]}" "${PROJECT_PATHS[$i]}"
    i=$(( i + 1 ))
  done

  # Analysis
  detect_cycles
  find_critical_projects
  check_single_points_of_failure

  # Output
  case "$OUTPUT_FORMAT" in
    json) output_json ;;
    dot)  output_dot ;;
    *)    output_text ;;
  esac
}

main
