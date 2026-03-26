#!/usr/bin/env bash
# manage-drafts.sh — Review and manage auto-generated skill drafts
# Usage: ./scripts/manage-drafts.sh --list | --show NAME | --approve NAME | --reject NAME

set -euo pipefail

WORKSPACE_ROOT="${OPENCLAW_WORKSPACE:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
DRAFTS_DIR="${WORKSPACE_ROOT}/${SKILL_DRAFTS_DIR:-memory/skill-drafts}"
SKILLS_DIR="${WORKSPACE_ROOT}/skills"
ARCHIVE_DIR="${DRAFTS_DIR}/archived"

ACTION="" NAME="" MIN_CONFIDENCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)           ACTION="list"; shift ;;
    --show)           ACTION="show"; NAME="$2"; shift 2 ;;
    --approve)        ACTION="approve"; NAME="$2"; shift 2 ;;
    --reject)         ACTION="reject"; NAME="$2"; shift 2 ;;
    --approve-all)    ACTION="approve-all"; shift ;;
    --min-confidence) MIN_CONFIDENCE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

case "$ACTION" in
  list)
    echo "=== Skill Drafts ==="
    if [[ ! -d "$DRAFTS_DIR" ]] || [[ -z "$(ls -A "$DRAFTS_DIR"/*.md 2>/dev/null)" ]]; then
      echo "No drafts found."
      exit 0
    fi
    for f in "$DRAFTS_DIR"/*.md; do
      name=$(basename "$f" .md)
      desc=$(grep '^description:' "$f" | head -1 | sed 's/description: *"*//;s/"*$//')
      echo "  ${name}: ${desc}"
    done
    ;;

  show)
    DRAFT="${DRAFTS_DIR}/${NAME}.md"
    if [[ -f "$DRAFT" ]]; then
      cat "$DRAFT"
    else
      echo "Draft not found: ${NAME}"
      exit 1
    fi
    ;;

  approve)
    DRAFT="${DRAFTS_DIR}/${NAME}.md"
    if [[ ! -f "$DRAFT" ]]; then
      echo "Draft not found: ${NAME}"
      exit 1
    fi
    TARGET="${SKILLS_DIR}/${NAME}"
    mkdir -p "$TARGET"
    cp "$DRAFT" "${TARGET}/SKILL.md"
    rm "$DRAFT"
    echo "Approved: ${NAME} → ${TARGET}/SKILL.md"
    ;;

  reject)
    DRAFT="${DRAFTS_DIR}/${NAME}.md"
    if [[ ! -f "$DRAFT" ]]; then
      echo "Draft not found: ${NAME}"
      exit 1
    fi
    mkdir -p "$ARCHIVE_DIR"
    mv "$DRAFT" "${ARCHIVE_DIR}/${NAME}-rejected-$(date +%Y%m%d).md"
    echo "Rejected and archived: ${NAME}"
    ;;

  approve-all)
    echo "Approving all drafts with confidence >= ${MIN_CONFIDENCE}..."
    for f in "$DRAFTS_DIR"/*.md; do
      [[ -f "$f" ]] || continue
      name=$(basename "$f" .md)
      TARGET="${SKILLS_DIR}/${name}"
      mkdir -p "$TARGET"
      cp "$f" "${TARGET}/SKILL.md"
      rm "$f"
      echo "  Approved: ${name}"
    done
    ;;

  *)
    echo "Usage: $0 --list | --show NAME | --approve NAME | --reject NAME | --approve-all"
    exit 1
    ;;
esac
