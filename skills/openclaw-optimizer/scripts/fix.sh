#!/usr/bin/env bash
# fix.sh — Apply fixes from the OpenClaw optimizer audit
# Usage: ./scripts/fix.sh --fix "fix-name" | --all-safe | --interactive --all

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

FIX="" ALL_SAFE=false INTERACTIVE=false ALL=false DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fix)         FIX="$2"; shift 2 ;;
    --all-safe)    ALL_SAFE=true; shift ;;
    --interactive) INTERACTIVE=true; shift ;;
    --all)         ALL=true; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

apply_fix() {
  local name="$1"
  echo "Applying fix: ${name}"

  case "$name" in
    create-memory-md)
      mkdir -p "${WORKSPACE_ROOT}/memory"
      if [[ ! -f "${WORKSPACE_ROOT}/memory/MEMORY.md" ]]; then
        cat > "${WORKSPACE_ROOT}/memory/MEMORY.md" << 'EOF'
# Memory Index

Organized index of agent memory files.

## User Profile
- [USER.md](USER.md) — User preferences and profile

## Learnings
- [micro-learnings.md](micro-learnings.md) — Real-time lessons from corrections

## Evolution
- [evolution/](evolution/) — Nightly evolution reports
EOF
        echo "  Created: memory/MEMORY.md"
      fi
      ;;

    create-user-profile)
      mkdir -p "${WORKSPACE_ROOT}/memory"
      if [[ ! -f "${WORKSPACE_ROOT}/memory/USER.md" ]]; then
        cat > "${WORKSPACE_ROOT}/memory/USER.md" << 'EOF'
# User Profile

## Communication Preferences
- Style: (to be detected)
- Detail level: (to be detected)

## Expertise
- Languages: (to be detected)
- Domains: (to be detected)

## Preferences
- Likes: (to be detected)
- Dislikes: (to be detected)
EOF
        echo "  Created: memory/USER.md"
      fi
      ;;

    create-secrets-dir)
      mkdir -p "${WORKSPACE_ROOT}/.secrets"
      if [[ ! -f "${WORKSPACE_ROOT}/.secrets/.env.example" ]]; then
        cat > "${WORKSPACE_ROOT}/.secrets/.env.example" << 'EOF'
# API Keys — copy to .env and fill in values
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# TIKHUB_API_KEY=
# GITHUB_TOKEN=
EOF
        echo "  Created: .secrets/.env.example"
      fi
      ;;

    create-config-dir)
      mkdir -p "${WORKSPACE_ROOT}/config"
      if [[ ! -f "${WORKSPACE_ROOT}/config/mcp-servers.json" ]]; then
        echo '{"servers": {}}' > "${WORKSPACE_ROOT}/config/mcp-servers.json"
        echo "  Created: config/mcp-servers.json"
      fi
      ;;

    create-data-dirs)
      mkdir -p "${WORKSPACE_ROOT}/data/execution-traces" \
               "${WORKSPACE_ROOT}/data/self-scores"
      echo "  Created: data/execution-traces/, data/self-scores/"
      ;;

    restructure-memory)
      echo "  Memory restructuring requires manual review. Run audit.sh --section memory for details."
      ;;

    *)
      echo "  Unknown fix: ${name}"
      return 1
      ;;
  esac
}

if [[ -n "$FIX" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY RUN] Would apply: ${FIX}"
  else
    apply_fix "$FIX"
  fi
elif [[ "$ALL_SAFE" == "true" ]]; then
  SAFE_FIXES=("create-memory-md" "create-user-profile" "create-secrets-dir" "create-config-dir" "create-data-dirs")
  for fix in "${SAFE_FIXES[@]}"; do
    if [[ "$DRY_RUN" == "true" ]]; then
      echo "[DRY RUN] Would apply: ${fix}"
    elif [[ "$INTERACTIVE" == "true" ]]; then
      read -p "Apply '${fix}'? [y/N] " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_fix "$fix"
      fi
    else
      apply_fix "$fix"
    fi
  done
else
  echo "Usage: $0 --fix NAME | --all-safe | --all [--interactive] [--dry-run]"
  echo ""
  echo "Available fixes:"
  echo "  create-memory-md      Create structured MEMORY.md"
  echo "  create-user-profile   Create USER.md template"
  echo "  create-secrets-dir    Create .secrets/ with .env template"
  echo "  create-config-dir     Create config/ with MCP template"
  echo "  create-data-dirs      Create data directories for traces/scores"
  echo "  restructure-memory    Restructure flat memory (manual)"
fi
