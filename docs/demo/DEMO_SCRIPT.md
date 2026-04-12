# PepeClaw Office Viewer Demo Script

Use this after the visual polish lane lands and before public launch.

## Preflight

```bash
npm install
npm run build
npm run test
npm run dev
```

Open `http://localhost:5173`.

Confirm:

- The office renders without a blank or stuck loading state.
- Demo data appears without a gateway.
- Rooms are clickable.
- Agents are visible and selectable.
- Activity feed and minimap are readable.
- Keyboard controls work: `Escape`, `Space`, and arrow keys.

## 2-Minute Live Walkthrough

1. Start on overview.

   Say: "PepeClaw turns AI agent work into a visible office. Instead of reading logs first, you can see where agents are and what kind of work is active."

2. Pan and zoom lightly.

   Say: "This is an interactive viewer, not a static dashboard. The office layout gives agent work a spatial model."

3. Click Genome Lab, War Room, Meta-Learning, or Breeding Arena.

   Say: "Each room maps to a category of agent behavior: capability evolution, project health, learning, identity, scheduling, review, and composition."

4. Select an agent.

   Say: "Agents have status and context, so selection can become the bridge from visual overview to operational detail."

5. Point out the activity feed and minimap.

   Say: "The surrounding UI keeps the scene readable. The feed explains current work; the minimap keeps orientation."

6. Return to overview.

   Say: "The important part is that this runs immediately with demo data. Live OpenClaw data can be connected through the gateway, but the demo is not blocked on setup."

## Screenshot Sequence

1. Fresh-load the app and wait for animation/layout to settle.
2. Capture the overview hero.
3. Capture one agent-focused shot.
4. Capture one room-detail shot.
5. Replace README placeholder assets only with fresh browser captures.

## Public Launch Sequence

1. Finish viewer polish and browser verification.
2. Run `npm run build` and `npm run test`.
3. Capture final screenshots and optional 20-30 second video.
4. Update README image references if filenames changed.
5. Tag the repo/demo around "3D office viewer for AI agents".
6. Publish short post first, then technical thread/post with install steps.
7. Watch for first-run feedback: blank screen, install issue, unreadable UI, confusing gateway setup.
