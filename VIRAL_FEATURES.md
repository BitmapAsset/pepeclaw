# PepeClaw Office Viewer - Launch Positioning

This file is the public packaging brief for the Anima-3D demo. Keep it aligned with the browser viewer that is actually shipping.

## Core Hook

AI agents are usually invisible: logs, traces, process lists, and scattered dashboards. PepeClaw makes agent work visible as an office you can inspect.

One-line version:

> A 3D office viewer for watching AI agents work in real time.

Sharper launch version:

> Stop staring at logs. Watch your agents work.

## What Makes The Demo Shareable

- **Immediate visual read**: the first screen is the office, not a marketing page.
- **Agents have bodies and places**: work is mapped to rooms and movement instead of flat rows.
- **Operational UI is visible**: minimap, activity feed, status, and panels explain what is happening.
- **Eight-room structure**: the office implies a broader runtime system without requiring a long pitch.
- **Zero-config demo mode**: people can clone and run without an OpenClaw gateway.
- **Live-data path**: the same viewer can connect to a gateway when available.

## Message Boundaries

Use:

- Model-agnostic runtime visibility layer.
- 3D/isometric office viewer.
- Live agent workspace.
- Demo data works out of the box.
- Optional OpenClaw gateway integration.

Avoid:

- Claiming this replaces base models.
- Claiming live production telemetry unless the gateway is connected.
- Calling placeholder screenshots final.
- Overstating unverified visual polish before the browser pass lands.
- Treating Mythos as the launch story for this repo; Mythos is a later runtime-advantage layer.

## Public Feature List

- Full-screen office viewer with eight agent rooms.
- Room navigation through clicks, keyboard controls, and overview mode.
- Agent selection and status visibility.
- Minimap for spatial orientation.
- Activity feed for current work.
- Detail panels for specialized rooms.
- Built-in demo data fallback.
- Optional gateway bridge for live OpenClaw data.
- Vite build and Vitest coverage.

## Screenshot Targets

Capture these after the viewer polish lane finishes:

1. **Hero overview**: full office visible, agents readable, no awkward empty space.
2. **Agent focus**: selected agent plus readable room context.
3. **Operational layer**: activity feed and minimap visible without clutter.
4. **Room detail**: one high-signal panel, preferably Genome Lab, War Room, Meta-Learning, or Breeding Arena.

Suggested filenames:

- `docs/screenshots/hero.jpg`
- `docs/screenshots/agent-focus.jpg`
- `docs/screenshots/operations-layer.jpg`
- `docs/screenshots/room-detail.jpg`

## Demo Capture Notes

Use a browser window wide enough to show the office without cramped controls. Avoid recording the first cold load; start capture after the app is stable.

30-second video structure:

1. 0-5s: overview of the office.
2. 5-10s: pan/zoom to prove interactivity.
3. 10-17s: click a room.
4. 17-23s: select an agent and show activity context.
5. 23-30s: return to overview and hold on the final composition.

## Launch Checklist

- Browser-verify `http://localhost:5173` on a clean run.
- Confirm `npm run build` passes.
- Confirm `npm run test` passes or document any known warning separately.
- Replace placeholder hero image with the final screenshot.
- Add at least one fresh close-up screenshot.
- Record one short demo clip.
- Confirm README install steps work from a fresh clone.
- Confirm `.env` is optional and demo mode works offline.
- Publish with the office-viewer hook, not the broader Mythos roadmap.

## Suggested Public Posts

Short:

```text
AI agents should not be invisible background processes.

PepeClaw gives them a 3D office you can watch: rooms, agents, status, activity, and live data hooks.

Runs locally with demo data.
```

Technical:

```text
Built a local 3D/isometric office viewer for AI agents.

React + Phaser + Vite, demo-data fallback by default, optional OpenClaw gateway connection when live telemetry is available.

The goal: make agent work inspectable at a glance instead of buried in logs.
```
