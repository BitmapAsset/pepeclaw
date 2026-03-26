# Anima 3D — Autoresearch Build Program

## Mission
Build a stunning 3D visualization of self-evolving AI agents. This is TWO products in one repo:
1. **Anima Skills** — The self-evolving agent intelligence (already built, in /skills)
2. **Anima 3D** — The visualization layer that makes it visible

## What to Build

### Core App (React + Three.js)
- Isometric 3D office with rooms for each Anima system
- Real-time data visualization from OpenClaw/Anima data files
- Responsive — works on desktop and mobile
- Beautiful, polished, demo-ready

### Rooms/Zones
1. **Genome Lab** — Skill evolution visualization
   - DNA helix showing skill genomes
   - Fitness scores as health bars
   - Mutation animations when skills evolve
   
2. **Dream Chamber** — Night-time creative exploration
   - Starfield/aurora background
   - Connection lines between project nodes
   - Dream journal entries floating as cards
   
3. **War Room** — Project health command center
   - Project cards with health gauges (0-100)
   - Velocity graphs
   - Red/yellow/green status lights
   
4. **Red Team Arena** — Adversarial debate visualization
   - Two agents facing off
   - Argument/counter-argument bubbles
   - Bias detection alerts
   
5. **Meta-Learning Center** — Self-improvement dashboard
   - Performance metrics over time
   - Self-modification proposals board
   - Capability gap radar chart

6. **Temporal Engine** — Time optimization
   - Task timeline with priority colors
   - Batch groupings
   - Procrastination tracker

### Technical Requirements
- React 19 + Vite
- @react-three/fiber + @react-three/drei for 3D
- Tailwind CSS for UI panels
- Mock data mode (works without OpenClaw connected)
- Real data mode (reads from OpenClaw workspace files)
- < 5MB bundle size
- 60fps on modern hardware

## The Loop
1. Set up project scaffolding
2. Build one room at a time
3. Polish and iterate
4. Test performance
5. REPEAT until every room is stunning

## Quality Bar
- This must look like a PRODUCT, not a hackathon project
- Think: would this get featured on Product Hunt?
- Smooth animations, beautiful colors, intuitive navigation
- Demo video potential — every frame should be screenshot-worthy
