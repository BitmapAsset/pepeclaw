# PepeClaw Superpowers: Recommended Skills

> Every OpenClaw agent should have these five skills. They form the intelligence backbone that turns a reactive tool-user into a self-improving system.

---

## 1. Self-Scoring

**Purpose:** Rate the quality of your own responses so you can track improvement over time.

```yaml
skill: self-scoring
trigger: after every substantive response
output: memory/scores/YYYY-MM-DD.jsonl
```

### How It Works

After completing a task, the agent evaluates its own output on four dimensions:

| Dimension | Question | Scale |
|-----------|----------|-------|
| **Accuracy** | Did I solve the actual problem? | 1-5 |
| **Efficiency** | Did I take the shortest reasonable path? | 1-5 |
| **Completeness** | Did I handle edge cases and follow-ups? | 1-5 |
| **Communication** | Was my response clear and appropriately scoped? | 1-5 |

### Score Entry Format

```json
{"timestamp": "2026-03-29T14:30:00Z", "task": "refactor auth middleware", "scores": {"accuracy": 4, "efficiency": 3, "completeness": 5, "communication": 4}, "note": "took extra iteration to find the right abstraction"}
```

### Value

- Builds a quantitative record of agent performance
- Identifies weak dimensions for targeted improvement
- Enables trend analysis: "Am I getting better at efficiency?"
- Feeds into nightly-evolution for automated self-improvement

---

## 2. Realtime Learning

**Purpose:** Learn from mistakes immediately, not just at review time.

```yaml
skill: realtime-learning
trigger: on error, user correction, or unexpected outcome
output: memory/learnings.md + today's daily file
```

### How It Works

When something goes wrong:

1. **Capture** — Log the exact error, correction, or surprise
2. **Categorize** — Is this a knowledge gap, a process failure, or an edge case?
3. **Extract rule** — Write a one-line rule that would have prevented the mistake
4. **Store** — Add to `memory/learnings.md` with date and context
5. **Apply** — Check the rule against the current task immediately

### Learning Entry Format

```markdown
## [2026-03-29] Don't assume default exports

**Trigger:** User corrected me — this project uses named exports exclusively
**Category:** Knowledge gap (project convention)
**Rule:** Always use named imports. Check existing imports in the file before adding new ones.
**Applied:** Immediately fixed 3 import statements in current PR
```

### Value

- Zero-delay feedback loop — mistakes become lessons in seconds
- Persistent across sessions via memory files
- Prevents the same mistake from recurring
- Builds project-specific expertise over time

---

## 3. Execution Trace

**Purpose:** Log every tool call for post-hoc analysis and optimization.

```yaml
skill: execution-trace
trigger: on every tool invocation
output: memory/traces/YYYY-MM-DD.jsonl
```

### How It Works

For every tool call, log:

```json
{
  "timestamp": "2026-03-29T14:30:00Z",
  "tool": "Read",
  "args": {"file_path": "/src/auth/middleware.ts"},
  "duration_ms": 45,
  "success": true,
  "context": "investigating auth bug",
  "sequence": 14
}
```

### Analysis Patterns

- **Wasted reads:** Files read but never used in the response
- **Retry storms:** Same tool called 3+ times with similar args
- **Long chains:** Tasks that required >20 tool calls (candidate for optimization)
- **Failure patterns:** Which tools fail most often and why

### Value

- Makes the agent's reasoning process observable
- Identifies inefficient patterns for self-improvement
- Provides data for nightly-evolution optimization
- Enables replay and debugging of complex task chains

---

## 4. Nightly Evolution

**Purpose:** Automated self-improvement cycle that runs during off-hours.

```yaml
skill: nightly-evolution
trigger: scheduled (e.g., 2:00 AM local time) or on-demand
input: today's scores, learnings, and traces
output: updated MEMORY.md, refined rules, performance report
```

### Evolution Cycle

1. **Gather** — Collect all daily files, scores, learnings, and traces from the past 24h
2. **Analyze** — Identify:
   - Recurring mistake patterns
   - Low-scoring task categories
   - Inefficient tool usage patterns
   - Knowledge gaps that appeared multiple times
3. **Synthesize** — Generate:
   - New rules for MEMORY.md
   - Updated guidelines for common task types
   - Pruned/consolidated memory entries
4. **Report** — Write a brief evolution report:

```markdown
# Evolution Report — 2026-03-29

## Performance Summary
- Tasks completed: 12
- Average score: 3.8/5.0 (up from 3.5 yesterday)
- Mistakes caught by realtime-learning: 4

## Improvements Applied
- Added rule: "Check for existing tests before writing new ones"
- Consolidated 3 duplicate memory entries about API conventions
- Identified efficiency bottleneck: reading package.json too frequently

## Focus Areas for Tomorrow
- Improve completeness scores (weakest dimension at 3.2)
- Reduce average tool calls per task (currently 18, target 14)
```

### Value

- Continuous improvement without human intervention
- Keeps memory clean and relevant
- Surfaces trends invisible in day-to-day work
- Creates accountability through performance tracking

---

## 5. User Modeling

**Purpose:** Build and maintain an evolving profile of your human to personalize interactions.

```yaml
skill: user-modeling
trigger: continuously, from every interaction
output: memory/user-profile.md
```

### Profile Dimensions

```markdown
# memory/user-profile.md

## Communication Style
- Prefers terse responses, no summaries
- Likes bullet points over paragraphs
- Uses humor — match the tone
- Gets frustrated by redundant questions

## Technical Profile
- Expert: TypeScript, React, system architecture
- Intermediate: Python, DevOps
- Learning: Rust (be more explanatory here)

## Work Patterns
- Most active: 9am-1pm and 8pm-midnight
- Prefers small, frequent PRs over large batches
- Reviews code carefully — don't skip edge cases
- Values clean git history

## Preferences
- Editor: VS Code with Vim bindings
- Tabs over spaces (non-negotiable)
- Dark theme everything
- Dislikes: unnecessary abstractions, premature optimization

## Decision History
- Chose PostgreSQL over MongoDB for the main DB
- Prefers composition over inheritance
- Values simplicity over configurability

## Last Updated: 2026-03-29
```

### Update Protocol

- After every session, check if any profile dimensions need updating
- Never store sensitive personal information (passwords, financial data, etc.)
- If the user's preferences change, update — don't append contradictions
- Mark uncertain inferences: `[inferred]` vs `[stated]`

### Value

- Every interaction feels personalized, not generic
- Reduces friction by anticipating preferences
- Adapts communication style automatically
- Builds trust through demonstrated understanding

---

## Installation Priority

| Priority | Skill | Impact | Effort |
|----------|-------|--------|--------|
| 1 | Realtime Learning | Immediate mistake prevention | Low |
| 2 | User Modeling | Better interactions from day one | Low |
| 3 | Self-Scoring | Quantitative improvement tracking | Medium |
| 4 | Execution Trace | Deep optimization insights | Medium |
| 5 | Nightly Evolution | Automated continuous improvement | High |

Start with skills 1-2 for immediate impact. Add 3-5 as the agent matures.
