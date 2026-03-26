# PepeClaw

A 3D visualization dashboard for autonomous AI agent evolution in [OpenClaw](https://github.com/openclaw). Watch self-evolving agents work, learn, and compete across eight thematic rooms — all rendered in real-time WebGL.

## Screenshots

The app runs entirely with built-in mock data — no OpenClaw gateway required. Open `npm run dev` and you'll see animated 3D agents working across all rooms immediately.

## Features

- **8 Interactive 3D Rooms** — each with unique WebGL visualizations and procedural geometry
- **Animated 3D Agent Characters** — low-poly humanoids that work in each room with contextual animations
- **Emotion Engine** — agents display emotional states (focused, creative, stressed, curious, satisfied) based on their activity
- **Consciousness Stream** — floating thought bubbles and neural pathways between agents
- **Real-time Data** — connects to the OpenClaw Gateway API, falls back gracefully to mock data
- **Smooth Room Transitions** — camera lerp animations between rooms
- **Mini-Map** — overview of all rooms with agent positions
- **Activity Feed** — real-time log of agent actions across rooms
- **Breeding Arena** — combine agent genomes to create new agents
- **Particle Systems** — floating data particles, energy flows, and room-specific effects
- **Dynamic Lighting** — ambient colors shift per room mood
- **7 Self-Evolving Skills** — installable skill modules that run on cron schedules

### Rooms

| Room | Visualization |
|------|--------------|
| Genome Lab | 3D DNA helix with orbiting skill cards |
| Dream Chamber | Starfield with aurora shader, connected dream nodes, and Memory Palace |
| War Room | Project health cards with gauge rings and velocity charts |
| Red Team Arena | Opposing podiums with argument beams and bias detection |
| Meta-Learning Center | 3D brain with neural pathways and capability rings |
| Temporal Engine | 3D hourglass with flowing timeline river |
| Identity Vault | Vault door with rotating gear and floating identity cards |
| Breeding Arena | Agent genome crossover with child agent visualization |

### Skills

PepeClaw includes 7 self-evolving skills in the `skills/` directory. Each skill runs independently and can be installed into any OpenClaw workspace.

| Skill | Purpose |
|-------|---------|
| `skill-genome` | Evolutionary fitness tracking, mutation, and crossover of skill capabilities |
| `predictive-intent` | Pattern mining, anomaly detection, and pre-computation of likely tasks |
| `dream-mode` | Creative exploration during off-hours with cross-pollination of ideas |
| `meta-learning` | Self-analysis of conversation patterns and capability gap detection |
| `adversarial-red-team` | Bias detection, assumption surfacing, and contrarian viewpoint generation |
| `project-war-room` | Project health scoring, velocity tracking, and dependency mapping |
| `temporal-arbitrage` | Task scheduling optimization, batch detection, and procrastination tracking |

Install all skills to your OpenClaw workspace:

```bash
./install.sh
```

## Tech Stack

- **React 19** + **TypeScript** (strict mode)
- **Three.js** via **React Three Fiber** + **drei**
- **Framer Motion** for UI animations
- **Tailwind CSS** for styling
- **Vite** for dev/build
- **Vitest** for testing

## Getting Started

```bash
# Clone the repository
git clone https://github.com/BitmapAsset/pepeclaw.git
cd pepeclaw

# Install dependencies
npm install

# Start dev server (works immediately with mock data)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Preview production build
npm run preview
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_GATEWAY_URL` | `http://localhost:3033` | OpenClaw Gateway API URL |

The app works fully offline with built-in mock data. No gateway connection is required.

### Connecting to OpenClaw Gateway

When the gateway is available, PepeClaw automatically fetches live data every 15 seconds. If the gateway goes offline, it falls back to mock data seamlessly.

**CORS**: If you're running the gateway on a different origin, ensure it sends the appropriate CORS headers:

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Headers: Accept, Content-Type
```

## Architecture

```
src/
├── api/
│   ├── gateway.ts            # REST client with 10s timeout for OpenClaw Gateway
│   └── DataProvider.tsx       # React context — real data with mock fallback
├── components/
│   ├── Scene.tsx              # Three.js canvas with all 8 rooms
│   ├── Agent3D.tsx            # Animated 3D agent with emotion engine
│   ├── ConsciousnessStream.tsx # Thought bubbles & neural pathways
│   ├── ActivityFeed.tsx       # Real-time agent activity log
│   └── MiniMap.tsx            # Room overview with agent positions
├── rooms/
│   ├── GenomeLab.tsx          # DNA helix + skill evolution (3D)
│   ├── DreamChamber.tsx       # Starfield + dream nodes + Memory Palace (3D)
│   ├── WarRoom.tsx            # Project health cards (3D)
│   ├── RedTeamArena.tsx       # Debate UI panel (2D overlay)
│   ├── RedTeamArena3D.tsx     # Arena with podiums (3D scene)
│   ├── MetaLearningCenter.tsx # Dashboard panel (2D overlay)
│   ├── MetaLearning3D.tsx     # Brain visualization (3D scene)
│   ├── TemporalEngine.tsx     # Timeline panel (2D overlay)
│   ├── TemporalEngine3D.tsx   # Hourglass + river (3D scene)
│   ├── IdentityVault.tsx      # Vault panel (2D overlay)
│   ├── IdentityVault3D.tsx    # Vault door + cards (3D scene)
│   ├── BreedingArena.tsx      # Breeding UI panel (2D overlay)
│   └── BreedingArena3D.tsx    # Breeding visualization (3D scene)
├── data/
│   └── mockData.ts            # Type definitions + mock data
├── App.tsx                    # Root component with HUD + navigation
└── main.tsx                   # Entry point

skills/                        # 7 self-evolving OpenClaw skills
├── skill-genome/
├── predictive-intent/
├── dream-mode/
├── meta-learning/
├── adversarial-red-team/
├── project-war-room/
└── temporal-arbitrage/

tests/                         # Vitest test suite
├── mockData.test.ts           # Mock data integrity tests
├── gateway.test.ts            # API client tests
├── dataProvider.test.ts       # Data provider fallback tests
└── skills.test.ts             # Skill directory validation tests
```

## Performance

- Procedural geometry only — no external 3D model files
- Code-split rooms via `React.lazy()`
- DPR capped at 1.5x for consistent frame rates
- Gateway requests have 10s timeout to prevent hangs
- Target: 60fps on mid-range hardware

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[MIT](LICENSE)
