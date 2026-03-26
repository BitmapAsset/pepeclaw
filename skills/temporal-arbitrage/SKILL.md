---
name: Temporal Arbitrage Engine
description: Time-value optimization for task scheduling and prioritization
version: 1.0.0
fitness: 50
mutations: 0
lineage: original
created: "2026-03-25"
triggers:
  - "what should I work on"
  - "prioritize tasks"
  - "batch tasks"
  - "time sensitive"
  - "procrastination"
  - "opportunity cost"
  - "schedule optimization"
---

# Temporal Arbitrage Engine

The Temporal Arbitrage Engine treats time as a market commodity. Every task has a
time-value curve: some tasks appreciate in urgency (merge conflicts compound, leads
go cold, market windows close), while others depreciate (administrative work that
can be batched, refactors that can wait). The engine exploits the spread between
these curves to maximize output per unit of time invested.

## Core Systems

### Time-Sensitivity Scoring

Each task receives a dynamic urgency score (0-100) based on its time-value profile.

- **Appreciating tasks** gain urgency exponentially as their deadline approaches.
  A merge conflict that takes 10 minutes today may take 2 hours tomorrow. A sales
  lead contacted within 5 minutes converts at 9x the rate of one contacted after
  an hour. The scorer applies an exponential multiplier to these tasks, surfacing
  them before the cost curve inflects.
- **Depreciating tasks** lose effective urgency over time because they become more
  efficient when batched or deferred to a natural breakpoint. Responding to 10
  non-urgent emails in one session takes less total time than responding to each
  as it arrives.
- **Neutral tasks** have linear urgency tied purely to deadline proximity.

The scoring algorithm factors in deadline distance, effort-to-deadline ratio,
dependency chains, and blocking status. See `scripts/time-scorer.sh` for the
full implementation.

### Batch Intelligence

Low-urgency tasks with overlapping categories or tags are grouped into efficient
batches. Context-switching carries a measurable cost (studies show 20-40% overhead
per switch), so the engine identifies tasks that share cognitive context and
recommends processing them together.

Batches are assigned optimal timeslots aligned to task type:
- **Coding tasks** cluster into morning deep-work blocks.
- **Communication tasks** (emails, reviews, Slack) batch into afternoon slots.
- **Administrative tasks** fill end-of-day wind-down periods.

See `scripts/batch-detector.sh` for grouping logic and efficiency calculations.

### Procrastination Detection

The engine maintains a deferral log for every task. When a task has been deferred
3 or more times, it triggers a procrastination alert with targeted recommendations:

| Deferral Count | Signal              | Recommended Action                  |
|----------------|---------------------|-------------------------------------|
| 1              | Normal rescheduling | No action                           |
| 2              | Early warning       | Review priority and effort estimate  |
| 3+             | Procrastination     | Do now, delegate, delete, or decompose |
| Stale (14d+)   | Abandoned           | Delete or escalate                  |

Category-level analysis reveals systemic avoidance patterns. If 80% of deferred
tasks are in the "admin" category, the engine recommends delegation or automation
for that class of work.

See `scripts/procrastination-tracker.sh` for tracking and reporting.

### Opportunity Cost Calculator

Every hour spent on Task A is an hour not spent on Task B. The engine estimates
the opportunity cost of the current task by comparing its value-per-hour against
the highest-value alternative in the queue. When the spread exceeds a configurable
threshold, it issues a context-switch recommendation.

Inputs:
- Current task value (revenue impact, dependency unblocking, risk reduction)
- Alternative task values from the scored queue
- Context-switch penalty (default: 20 minutes of lost productivity)

The switch is only recommended when the alternative's net value (after switch
penalty) exceeds the current task's value by at least 30%.

### Deadline Backward Planning

For tasks with fixed deadlines, the engine generates a reverse timeline:

1. Start from the deadline.
2. Subtract buffer time (default: 20% of total effort).
3. Place milestones at even intervals working backward.
4. Calculate the latest responsible start date.
5. Set progressive alerts at each milestone.

If the latest start date has already passed, the task is flagged as at-risk with
a compressed schedule recommendation.

### Chronotype Optimization

Tasks are tagged with an energy requirement (`peak`, `moderate`, `low`) and
aligned to the user's energy curve throughout the day:

- **Peak energy (morning):** Creative work, complex problem-solving, deep coding,
  architectural decisions.
- **Moderate energy (midday):** Code reviews, research, planning sessions,
  collaborative work.
- **Low energy (afternoon/evening):** Email, status updates, routine admin,
  dependency updates, batch processing.

The engine respects this mapping when suggesting task order and timeslots.

## Data Model

All tasks conform to the schema defined in `references/task-schema.json`. The
schema enforces consistent structure across scoring, batching, and tracking
subsystems.

## Scripts

| Script                        | Purpose                                      |
|-------------------------------|----------------------------------------------|
| `scripts/time-scorer.sh`      | Score task time-sensitivity and urgency       |
| `scripts/batch-detector.sh`   | Group similar tasks for efficient batching    |
| `scripts/procrastination-tracker.sh` | Track deferrals and detect avoidance patterns |

## Usage Examples

Score a task:
```bash
./scripts/time-scorer.sh --task "Fix authentication bypass in login flow" \
  --deadline "2026-04-01" --type appreciating --effort-hours 4 \
  --dependencies "deploy-v2.1,security-audit"
```

Find batchable tasks:
```bash
./scripts/batch-detector.sh --tasks-file ./my-tasks.json --min-batch 2 --max-urgency 40
```

Check procrastination patterns:
```bash
./scripts/procrastination-tracker.sh --log-file ./task-log.json --action report
```

Defer a task:
```bash
./scripts/procrastination-tracker.sh --log-file ./task-log.json --action defer \
  --task-id "task-042" --reason "Blocked on API credentials"
```
