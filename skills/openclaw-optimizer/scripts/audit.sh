#!/usr/bin/env bash
# audit.sh — Full audit of OpenClaw setup with scoring and recommendations
# Usage: ./scripts/audit.sh [--section NAME] [--format markdown|json]

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

SECTION="" FORMAT="markdown"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --section) SECTION="$2"; shift 2 ;;
    --format)  FORMAT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

SCORE=0 MAX_SCORE=0 RECOMMENDATIONS=()

check() {
  local desc="$1" path="$2" points="$3"
  MAX_SCORE=$((MAX_SCORE + points))
  if [[ -e "${WORKSPACE_ROOT}/${path}" ]]; then
    echo "  ✅ ${desc}"
    SCORE=$((SCORE + points))
    return 0
  else
    echo "  ❌ ${desc}"
    return 1
  fi
}

check_not_empty() {
  local desc="$1" path="$2" points="$3"
  MAX_SCORE=$((MAX_SCORE + points))
  if [[ -f "${WORKSPACE_ROOT}/${path}" ]] && [[ -s "${WORKSPACE_ROOT}/${path}" ]]; then
    echo "  ✅ ${desc}"
    SCORE=$((SCORE + points))
    return 0
  else
    echo "  ❌ ${desc}"
    return 1
  fi
}

echo "╔══════════════════════════════════════╗"
echo "║     OpenClaw Optimizer Audit         ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Workspace: ${WORKSPACE_ROOT}"
echo "Date: $(date '+%Y-%m-%d %H:%M')"
echo ""

# --- Memory Architecture ---
if [[ -z "$SECTION" || "$SECTION" == "memory" ]]; then
  echo "### 1. Memory Architecture"
  check "MEMORY.md exists" "memory/MEMORY.md" 2 || check "MEMORY.md (root)" "MEMORY.md" 2 || RECOMMENDATIONS+=("Create structured MEMORY.md")
  check_not_empty "USER.md exists" "memory/USER.md" 1 || check_not_empty "USER.md (root)" "USER.md" 1 || RECOMMENDATIONS+=("Create USER.md with user profile")
  check "Memory directory organized" "memory" 1 || RECOMMENDATIONS+=("Create memory/ directory structure")
  check "Micro-learnings file" "memory/micro-learnings.md" 1 || RECOMMENDATIONS+=("Install realtime-learning skill")
  echo ""
fi

# --- Search Quality ---
if [[ -z "$SECTION" || "$SECTION" == "search" ]]; then
  echo "### 2. Search Quality"
  check "deep-search skill" "skills/deep-search/SKILL.md" 2 || RECOMMENDATIONS+=("Install deep-search skill")
  check ".secrets/ directory" ".secrets" 1 || RECOMMENDATIONS+=("Create .secrets/ for API keys")
  check "Config directory" "config" 1 || RECOMMENDATIONS+=("Create config/ for tool configs")
  echo ""
fi

# --- Heartbeat ---
if [[ -z "$SECTION" || "$SECTION" == "heartbeat" ]]; then
  echo "### 3. Heartbeat Configuration"
  check "HEARTBEAT.md exists" "HEARTBEAT.md" 2 || RECOMMENDATIONS+=("Create HEARTBEAT.md with health checks")
  echo ""
fi

# --- Cron Jobs ---
if [[ -z "$SECTION" || "$SECTION" == "cron" ]]; then
  echo "### 4. Cron Jobs"
  check "Nightly evolution" "skills/nightly-evolution/SKILL.md" 2 || RECOMMENDATIONS+=("Install nightly-evolution skill")
  check "Skill autocreator" "skills/skill-autocreator/SKILL.md" 1 || RECOMMENDATIONS+=("Install skill-autocreator for automated skill generation")
  echo ""
fi

# --- Tool Coverage ---
if [[ -z "$SECTION" || "$SECTION" == "tools" ]]; then
  echo "### 5. Tool Coverage"
  SKILL_COUNT=$(ls -d "${WORKSPACE_ROOT}/skills/"*/SKILL.md 2>/dev/null | wc -l | tr -d ' ')
  MAX_SCORE=$((MAX_SCORE + 2))
  if [[ "$SKILL_COUNT" -ge 5 ]]; then
    echo "  ✅ ${SKILL_COUNT} skills installed"
    SCORE=$((SCORE + 2))
  elif [[ "$SKILL_COUNT" -ge 1 ]]; then
    echo "  ⚠️  Only ${SKILL_COUNT} skill(s) installed"
    SCORE=$((SCORE + 1))
    RECOMMENDATIONS+=("Install more skills for better coverage")
  else
    echo "  ❌ No skills installed"
    RECOMMENDATIONS+=("Install skills for your common workflows")
  fi
  echo ""
fi

# --- Self-Improvement Pipeline ---
if [[ -z "$SECTION" || "$SECTION" == "self-improvement" ]]; then
  echo "### 6. Self-Improvement Pipeline"
  check "Realtime learning" "skills/realtime-learning/SKILL.md" 1 || RECOMMENDATIONS+=("Install realtime-learning")
  check "Execution traces" "skills/execution-trace/SKILL.md" 1 || RECOMMENDATIONS+=("Install execution-trace")
  check "Self-scoring" "skills/self-scoring/SKILL.md" 1 || RECOMMENDATIONS+=("Install self-scoring")
  check "Trace data directory" "data/execution-traces" 1 || RECOMMENDATIONS+=("Create data/execution-traces/")
  check "Score data directory" "data/self-scores" 1 || RECOMMENDATIONS+=("Create data/self-scores/")
  echo ""
fi

# --- Summary ---
echo "═══════════════════════════════════════"
echo "Score: ${SCORE}/${MAX_SCORE}"
PERCENTAGE=$((SCORE * 100 / (MAX_SCORE > 0 ? MAX_SCORE : 1)))
echo "Rating: ${PERCENTAGE}%"
echo ""

if [[ ${#RECOMMENDATIONS[@]} -gt 0 ]]; then
  echo "### Recommendations"
  for i in "${!RECOMMENDATIONS[@]}"; do
    echo "  $((i+1)). ${RECOMMENDATIONS[$i]}"
  done
fi

echo ""
echo "Run ./scripts/fix.sh to apply recommendations."
