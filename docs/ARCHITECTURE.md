# Architecture — How the 7 Systems Interconnect

Pepe 2.0 is not 7 independent tools. It's a **compound intelligence network** where each system feeds data into the others, creating a flywheel effect that accelerates improvement over time.

## System Overview

```
    ┌─────────────────────────────────────────────────────────────────────┐
    │                        PEPE 2.0 RUNTIME                            │
    │                                                                     │
    │   NIGHTLY CYCLE (1-5 AM)                                           │
    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │
    │   │ Meta-Learning│  │ Dream Mode  │  │ Predictive Intent       │    │
    │   │ (1 AM)       │  │ (3 AM)      │  │ Pre-Compute (5:30 AM)  │    │
    │   │              │  │             │  │                         │    │
    │   │ Analyze      │  │ Explore     │  │ Mine patterns           │    │
    │   │ conversations│  │ creative    │  │ Pre-compute results     │    │
    │   │ Find failures│  │ connections │  │ Detect anomalies        │    │
    │   │ Propose fixes│  │ Score ideas │  │ Cache predictions       │    │
    │   └──────┬───────┘  └──────┬──────┘  └────────────┬────────────┘   │
    │          │                 │                       │                │
    │          ▼                 ▼                       ▼                │
    │   ┌──────────────────────────────────────────────────────────┐     │
    │   │                   SHARED DATA LAYER                      │     │
    │   │  ~/.openclaw/data/pepe/                                  │     │
    │   │                                                          │     │
    │   │  fitness-logs/   dreams/   patterns/   analysis/         │     │
    │   │  proposals/      anomalies/  health/   challenges/       │     │
    │   └──────────────────────────────────────────────────────────┘     │
    │          │                 │                       │                │
    │          ▼                 ▼                       ▼                │
    │   CONTINUOUS CYCLE                                                  │
    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │
    │   │ War Room     │  │ Adversarial │  │ Temporal Arbitrage      │    │
    │   │ (Every 6hr)  │  │ Red Team    │  │ (On demand)             │    │
    │   │              │  │ (On trigger)│  │                         │    │
    │   │ Score health │  │ Challenge   │  │ Score time-sensitivity  │    │
    │   │ Auto-triage  │  │ decisions   │  │ Detect procrastination  │    │
    │   │ Map deps     │  │ Detect bias │  │ Optimize scheduling     │    │
    │   └──────────────┘  │ Surface     │  └─────────────────────────┘   │
    │                      │ assumptions│                                  │
    │                      └─────────────┘                                │
    │                                                                     │
    │   WEEKLY CYCLE                                                      │
    │   ┌──────────────────────────────────────────────────────────┐     │
    │   │ Skill Genome — Evolution Cycle (Sunday 4 AM)             │     │
    │   │ Compute fitness → Mutate bottom 20% → Crossover winners  │     │
    │   │ → Prune dead skills → Rollback failures                  │     │
    │   └──────────────────────────────────────────────────────────┘     │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Between Systems

### Meta-Learning → Skill Genome
The Meta-Learning Loop identifies **recurring failure patterns** and **capability gaps**. This data feeds directly into the Skill Genome's mutation engine:

- Failure patterns (2+ occurrences) → mutation candidates
- Gap reports → signals for crossover or new skill creation
- Success patterns → fitness score inputs

### Dream Mode → Meta-Learning
Dream Mode generates creative ideas during off-hours. The highest-scored ideas (novelty × 0.4 + feasibility × 0.6 > 0.6) are promoted to the Meta-Learning system as **improvement proposals**.

### War Room → Temporal Arbitrage
When the War Room detects a health drop (score < 50), it generates a prioritized action list. Temporal Arbitrage ingests these actions and integrates them into the overall task scheduling, weighting them by:

- Blocker resolution urgency
- Health recovery potential
- Cross-project dependency criticality

### Adversarial Red Team → All Systems
The Red Team acts as a cross-cutting concern. It challenges:

- **Meta-Learning proposals** before they're applied
- **Dream Mode ideas** before they're promoted
- **War Room triage recommendations** before execution
- **Temporal Arbitrage schedule changes** for opportunity cost validation

### Predictive Intent → Temporal Arbitrage
Predictive Intent discovers temporal patterns (daily, weekly, sequential, situational). These patterns inform Temporal Arbitrage's scheduling model:

- Known daily patterns → pre-allocated time slots
- Sequential patterns → automatic task chaining
- Anomalies → priority interrupts

### Skill Genome → All Skills
The Genome system wraps all other skills. Every skill (including the 6 other Pepe systems) has a genome header tracking fitness. The evolution cycle affects all skills equally — **Pepe 2.0 improves its own improvement systems.**

## Scheduling

| System | Schedule | Trigger | Duration |
|--------|----------|---------|----------|
| Meta-Learning | Daily 1 AM | Cron | ~10 min |
| Dream Mode | Daily 3 AM | Cron | ~30 min |
| Predictive Intent | Daily 5:30 AM | Cron | ~5 min |
| War Room | Every 6 hours | Cron | ~5 min |
| Skill Genome | Weekly (Sunday 4 AM) | Cron | ~15 min |
| Red Team | On-demand + Monthly 1st | Trigger + Cron | Varies |
| Temporal Arbitrage | On-demand | Conversation trigger | ~1 min |

## Data Storage

All data is stored as **append-only JSON/JSONL files** under `~/.openclaw/data/pepe/`:

```
~/.openclaw/data/pepe/
├── config.json                     # Global configuration
├── skill-genome/
│   ├── fitness-logs/               # JSONL: per-skill invocation outcomes
│   ├── archives/                   # Pre-mutation skill backups
│   └── crossovers/                 # Crossover experiment records
├── predictive-intent/
│   ├── patterns/                   # Discovered temporal patterns
│   ├── cache/                      # Pre-computed results (TTL: 30 min)
│   └── anomalies/                  # Detected anomalies
├── dream-mode/
│   ├── dreams/                     # Individual dream records
│   └── morning-briefs/             # Daily top-3 idea summaries
├── meta-learning/
│   ├── analysis/                   # Daily conversation analysis
│   ├── proposals/                  # Self-modification proposals
│   └── gaps/                       # Capability gap reports
├── adversarial-red-team/
│   ├── challenges/                 # Devil's advocate reports
│   ├── biases/                     # Detected cognitive biases
│   ├── assumptions/                # Surfaced assumptions
│   └── audits/                     # Monthly hindsight audits
├── project-war-room/
│   ├── health/                     # Health score snapshots
│   ├── velocity/                   # Velocity trend data
│   ├── triage/                     # Auto-triage reports
│   └── dependencies/               # Cross-project dependency maps
└── temporal-arbitrage/
    ├── scores/                     # Task time-sensitivity scores
    ├── batches/                    # Batch grouping records
    └── deferrals/                  # Procrastination tracking
```

## The Compound Effect

Week 1: Systems operate independently, gathering baseline data.
Week 2: Meta-Learning starts finding patterns. Genome computes first fitness scores.
Week 4: First evolution cycle completes. Dream Mode has 100+ ideas. Predictive Intent pre-computes your morning routine.
Month 2: Error rates measurably decline. Red Team has calibration data. War Room trends are meaningful.
Month 3+: **The flywheel is spinning.** Each cycle improves the systems that improve the other systems.

This is why Pepe 2.0 is fundamentally different from static agent frameworks. It doesn't just run — **it compounds.**
