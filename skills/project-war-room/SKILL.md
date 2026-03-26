---
name: project-war-room
description: Autonomous project health monitoring, auto-triage, and decision engine for multi-project environments
version: 1.0.0
fitness: 50
mutations: 0
lineage: original
created: "2026-03-25"
triggers:
  - "project health"
  - "war room"
  - "project status"
  - "what should I work on"
  - "triage projects"
  - "health check"
  - "blocker report"
  - "dependency map"
  - "stakeholder briefing"
schedule: "every 6 hours"
---

# Project War Room

The Project War Room is a continuous, autonomous monitoring system that tracks the health, velocity, and interdependencies of every project in the workspace. It operates on a 6-hour cycle, scoring projects, detecting anomalies, triaging issues, and generating actionable briefings. When a developer asks "what should I work on?", the War Room has already computed the answer.

## Core Capabilities

### 1. Health Scoring (0-100)

Every project receives a composite health score derived from five weighted dimensions:

| Dimension          | Weight | Signal Sources                                      |
|--------------------|--------|-----------------------------------------------------|
| Git Activity       | 25 pts | Commits/week, PR merge rate, branch staleness       |
| Deployment Health  | 20 pts | Last deploy status, deploy frequency, rollback rate  |
| Issue Health       | 20 pts | Open issues, bug-to-feature ratio, avg issue age     |
| Blocker Status     | 20 pts | Active blockers, blocker age, blocked dependencies   |
| Momentum           | 15 pts | Days since last commit, velocity trend, contributors |

Scores map to grades: A (80-100), B (60-79), C (40-59), D (20-39), F (0-19). Full scoring rubric is in `references/health-score-spec.md`.

### 2. Velocity Tracking

Tracks task completion rates across 7-day and 30-day windows. Computes velocity trend (up/down/stable) by comparing the current 7-day rate against the rolling 30-day average. Story point throughput is tracked when available.

### 3. Auto-Triage

When a project's health score drops below 50, auto-triage activates:
- Identifies the lowest-scoring dimensions contributing to the drop.
- Scans for stale branches, aging blockers, and unmerged PRs.
- Generates a prioritized action list with estimated impact on health score recovery.
- Sends an alert via Telegram with the triage summary.

### 4. Cross-Project Dependency Mapping

Builds a directed graph of project dependencies. Detects:
- Circular dependencies that could cause cascading failures.
- Projects that are blocking others (high fan-out blockers).
- Projects that are blocked and losing velocity as a result.
- Dependency chains where a single upstream failure propagates downstream.

### 5. Stakeholder Briefings

Generates concise, human-readable briefings suitable for async communication:
- Per-project health summary with trend arrows.
- Top 3 risks across all projects.
- Recommended focus areas for the next cycle.
- Blockers requiring human intervention.

### 6. "What Should I Work On?" Decision Engine

Ranks work items across all projects using a composite priority score:
- Blocker resolution (highest weight -- unblocking others multiplies impact).
- Health score recovery potential (which tasks move the needle most).
- Velocity momentum (favor projects trending down to arrest decline).
- Dependency criticality (upstream projects get priority over leaf nodes).
- Staleness penalty (items untouched for >7 days get boosted).

## Project State

Each project's state is persisted at `/projects/{name}/STATE.md` and conforms to the schema defined in `references/project-state-schema.json`. State files are updated every scoring cycle and serve as the single source of truth for all War Room operations.

## Scripts

The War Room delegates data collection and computation to four shell scripts located in the `scripts/` directory. Run them in the order listed below for a full cycle.

### health-scorer.sh

Computes the composite health score for a project.

```
Usage: ./scripts/health-scorer.sh <project-path>
```

- Reads git log, deployment records, and issue tracker state from the project directory.
- Outputs a JSON object with per-dimension scores and the composite total.
- Writes the score to the project's `STATE.md` under the `health_score` field.
- Exit code 0 on success, 1 if the project path is invalid, 2 if data is stale.

### velocity-tracker.sh

Calculates velocity metrics over 7-day and 30-day windows.

```
Usage: ./scripts/velocity-tracker.sh <project-path>
```

- Counts completed tasks (closed issues, merged PRs) in each window.
- Computes velocity trend by comparing current 7-day rate to 30-day rolling average.
- Updates the `velocity` section of the project's `STATE.md`.

### auto-triage.sh

Runs the auto-triage analysis when health score falls below threshold.

```
Usage: ./scripts/auto-triage.sh <project-path> [--threshold 50]
```

- Reads the current health score from `STATE.md`. Exits early if score is above threshold.
- Analyzes each scoring dimension to identify the primary degradation sources.
- Generates a prioritized list of remediation actions.
- Sends a Telegram notification with the triage summary if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` environment variables are set.

### dependency-mapper.sh

Builds and analyzes the cross-project dependency graph.

```
Usage: ./scripts/dependency-mapper.sh <workspace-path>
```

- Scans all projects in the workspace for declared dependencies.
- Detects circular dependencies, critical path bottlenecks, and cascade risks.
- Updates the `dependencies` and `blockers.blocked_by` / `blockers.blocking` fields in each project's `STATE.md`.

## Agent Instructions

When the War Room skill is triggered, follow this procedure:

1. **Scheduled cycle (every 6 hours):**
   - Enumerate all projects under the workspace `/projects/` directory.
   - For each project, run `health-scorer.sh` followed by `velocity-tracker.sh`.
   - Run `dependency-mapper.sh` once at the workspace level after all projects are scored.
   - For any project with health score < 50, run `auto-triage.sh`.
   - Generate a stakeholder briefing summarizing the cycle results.
   - Send the briefing via Telegram.

2. **On trigger "what should I work on":**
   - Load the latest `STATE.md` for all projects.
   - Run the decision engine ranking algorithm (blocker resolution > health recovery > velocity momentum > dependency criticality > staleness).
   - Present the top 5 recommended work items with rationale.

3. **On trigger "project health" or "project status":**
   - If a specific project is named, show its full health breakdown.
   - If no project is named, show a ranked table of all projects by health score.

4. **On trigger "blocker report":**
   - List all active blockers across projects, sorted by age descending.
   - Highlight cross-project blockers and their downstream impact.

5. **On trigger "dependency map":**
   - Run `dependency-mapper.sh` and present the dependency graph.
   - Flag any circular dependencies or high-risk chains.

6. **On trigger "triage projects":**
   - Run auto-triage on all projects below the threshold, regardless of schedule.

## Notifications

All alerts and briefings are delivered via Telegram. Required environment variables:

- `TELEGRAM_BOT_TOKEN` -- Bot API token.
- `TELEGRAM_CHAT_ID` -- Target chat or group ID.

Alert levels follow the health score thresholds:
- **Critical** (score 0-39): Immediate notification with full triage report.
- **Warning** (score 40-59): Notification with top contributing factors.
- **Attention** (score 60-79): Included in 6-hour briefing, no standalone alert.
- **Healthy** (score 80-100): No alert; status included in briefing only.

## Reference Files

- `references/health-score-spec.md` -- Full scoring rubric with formulas and thresholds.
- `references/project-state-schema.json` -- JSON Schema for the project state object.
