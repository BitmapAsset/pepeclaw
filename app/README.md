<p align="center">
  <img src="https://img.shields.io/badge/PepeClaw-3D_AI_Agent_Visualizer-00d4aa?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHRleHQgeT0iMjAiIGZvbnQtc2l6ZT0iMjAiPvCfkLg8L3RleHQ+PC9zdmc+" alt="PepeClaw" />
  <br/>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/react-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/three.js-r183-black?style=flat-square&logo=threedotjs" alt="Three.js" />
  <img src="https://img.shields.io/badge/typescript-strict-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/vite-8-646cff?style=flat-square&logo=vite" alt="Vite" />
</p>

# 🐸 PepeClaw — See Your AI Agents Evolve in 3D

**The first real-time 3D visualization dashboard for autonomous, self-evolving AI agents.**

Watch your AI agents work, learn, compete, and evolve across seven interactive WebGL rooms — rendered live in your browser. No external 3D models, no setup wizards, no accounts. Just open it and see your agents think.

> **Nothing like this exists.** Devin shows you logs. Hermes is invisible. Claw3D visualizes but doesn't self-evolve. PepeClaw lets you **watch self-evolving agents in real-time 3D.**

---

## ✨ Features

- 🏢 **7 Interactive 3D Rooms** — each with unique WebGL visualizations and procedural geometry
- 🤖 **Animated 3D Agent Characters** — low-poly humanoids that work in each room with contextual animations
- 📡 **Real-time Data** — connects to the [OpenClaw](https://github.com/openclaw/openclaw) Gateway API, falls back gracefully to mock data
- 🎬 **Smooth Room Transitions** — camera lerp animations between rooms
- 🗺️ **Mini-Map** — overview of all rooms with agent positions
- ✨ **Particle Systems** — floating data particles, energy flows, and room-specific effects
- 💡 **Dynamic Lighting** — ambient colors shift per room mood
- 🔌 **Zero Config** — works fully offline with built-in mock data, no gateway required

## 🏠 The Rooms

| Room | What You See |
|------|-------------|
| 🧬 **Genome Lab** | 3D DNA helix with orbiting skill cards — watch skills mutate and evolve |
| 🌌 **Dream Chamber** | Starfield with aurora shader and connected dream nodes — creative ideation visualized |
| ⚔️ **War Room** | Project health cards with gauge rings and velocity charts — real-time project triage |
| 🔴 **Red Team Arena** | Opposing podiums with argument beams — watch agents debate decisions |
| 🧠 **Meta-Learning Center** | 3D brain with neural pathways and capability rings — self-improvement in action |
| ⏳ **Temporal Engine** | 3D hourglass with flowing timeline river — time optimization visualized |
| 🔐 **Identity Vault** | Vault door with rotating gear and floating identity cards — agent identity management |

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/BitmapAsset/pepeclaw.git
cd pepeclaw

# Install dependencies
npm install

# Start dev server — that's it
npm run dev
```

Open `http://localhost:5173` and you're in. No API keys, no setup, no config files.

### Production Build

```bash
npm run build    # TypeScript check + Vite build
npm run preview  # Preview the production build locally
```

## ⚙️ Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_GATEWAY_URL` | `http://localhost:3033` | OpenClaw Gateway API URL |

The app works **fully offline** with built-in mock data. No gateway connection is required.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **UI Framework** | React 19 + TypeScript (strict mode) |
| **3D Engine** | Three.js via React Three Fiber + drei |
| **Animations** | Framer Motion |
| **Styling** | Tailwind CSS 4 |
| **Build** | Vite 8 |
| **Target** | Any modern browser with WebGL2 |

## 📁 Architecture

```
src/
├── api/
│   ├── gateway.ts          # REST client for OpenClaw Gateway
│   └── DataProvider.tsx     # React context — real data with mock fallback
├── components/
│   ├── Scene.tsx            # Three.js canvas with all 7 rooms
│   ├── Agent3D.tsx          # Animated 3D agent character
│   └── MiniMap.tsx          # Room overview with agent positions
├── rooms/
│   ├── GenomeLab.tsx        # DNA helix + skill evolution (3D)
│   ├── DreamChamber.tsx     # Starfield + dream nodes (3D)
│   ├── WarRoom.tsx          # Project health cards (3D)
│   ├── RedTeamArena.tsx     # Debate UI panel (2D overlay)
│   ├── RedTeamArena3D.tsx   # Arena with podiums (3D scene)
│   ├── MetaLearningCenter.tsx    # Dashboard panel (2D overlay)
│   ├── MetaLearning3D.tsx        # Brain visualization (3D scene)
│   ├── TemporalEngine.tsx        # Timeline panel (2D overlay)
│   ├── TemporalEngine3D.tsx      # Hourglass + river (3D scene)
│   ├── IdentityVault.tsx         # Vault panel (2D overlay)
│   └── IdentityVault3D.tsx       # Vault door + cards (3D scene)
├── data/
│   └── mockData.ts          # Type definitions + mock data
├── App.tsx                  # Root component with HUD + navigation
└── main.tsx                 # Entry point
```

## ⚡ Performance

- **Procedural geometry only** — no external 3D model files to download
- **Code-split rooms** via `React.lazy()` — only loads what you view
- **DPR capped at 1.5×** for consistent frame rates
- **Target:** 60fps on mid-range hardware
- **Bundle size:** < 2MB

## 🤝 Works With

PepeClaw is designed for the [OpenClaw](https://github.com/openclaw/openclaw) ecosystem but works standalone with mock data. Compatible with any OpenClaw instance running self-evolving agent skills (skill-genome, dream-mode, meta-learning, etc.).

## 🗺️ Roadmap

- [ ] Isometric default camera view
- [ ] Auto-connect to local OpenClaw gateway
- [ ] Real-time agent activity mapping
- [ ] Breeding Arena (8th room) — agent crossover visualization
- [ ] Community Quest Board
- [ ] Export room snapshots as shareable images

## 📄 License

[MIT](LICENSE) — open source, free forever.

---

<p align="center">
  <b>PepeClaw</b> — built by <a href="https://github.com/BitmapAsset">BitmapAsset</a> 🐸🦞
  <br/>
  <sub>Part of the <a href="https://blockgenomics.io">Block Genomics</a> ecosystem</sub>
</p>
