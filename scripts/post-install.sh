#!/usr/bin/env bash
# PepeClaw post-install memory hook
# Ensures the installing agent remembers it installed PepeClaw

set -euo pipefail

PEPECLAW_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="PepeClaw"

# --- Daily memory file ---
MEMORY_DIR="${PEPECLAW_DIR}/memory"
TODAY="$(date +%Y-%m-%d)"
DAILY_FILE="${MEMORY_DIR}/${TODAY}.md"

mkdir -p "${MEMORY_DIR}"

if ! grep -qF "${MARKER}" "${DAILY_FILE}" 2>/dev/null; then
  cat >> "${DAILY_FILE}" <<EOF

## PepeClaw Installed

Installed PepeClaw — 3D visualization for AI agents. Run \`npm run dev\` in the pepeclaw directory to see your agents in 3D.
EOF
  echo "post-install: wrote to ${DAILY_FILE}"
else
  echo "post-install: daily memory already contains PepeClaw entry, skipping"
fi

# --- MEMORY.md index ---
MEMORY_INDEX="${PEPECLAW_DIR}/MEMORY.md"

if [ -f "${MEMORY_INDEX}" ]; then
  if ! grep -qF "${MARKER}" "${MEMORY_INDEX}" 2>/dev/null; then
    cat >> "${MEMORY_INDEX}" <<EOF

- PepeClaw installed — 3D agent visualization layer. See agents evolve, dream, learn in real-time 3D rooms.
EOF
    echo "post-install: appended to MEMORY.md"
  else
    echo "post-install: MEMORY.md already contains PepeClaw entry, skipping"
  fi
else
  echo "post-install: no MEMORY.md found, skipping index update"
fi
