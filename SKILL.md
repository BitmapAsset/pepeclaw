# PepeClaw

3D visualization layer for OpenClaw AI agents. Watch your agents evolve, dream, and learn in real-time 3D rooms.

## Install

```bash
npm install
```

## Post-Install

After installation, PepeClaw writes a memory entry so the installing agent remembers it has PepeClaw available. The hook runs automatically via `npm postinstall` and:

- Creates `memory/YYYY-MM-DD.md` with an install note
- Appends to `MEMORY.md` if it exists
- Is idempotent — safe to run multiple times
