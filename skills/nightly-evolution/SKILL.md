---
name: nightly-evolution
description: "Nightly self-improvement cron — runs 15-minute Karpathy autoresearch loops at midnight analyzing the agent's own conversations, tasks, and performance from the past 24 hours. Discovers concrete improvements and applies them automatically. Makes your agent measurably better every single day."
metadata:
  openclaw:
    emoji: "🌙"
    cron:
      schedule: "0 0 * * *"
      timezone: "local"
---

# Nightly Evolution — Self-Improving Agent via Autoresearch

Your agent gets smarter every night while you sleep.

## How It Works

At midnight every night, a cron job triggers a 15-minute autoresearch session that:

1. **Reviews the day** — Reads all conversations, tasks completed, errors hit, and decisions made in the last 24 hours
2. **Identifies patterns** — Finds recurring mistakes, missed opportunities, slow responses, and user friction points
3. **Runs Karpathy loops** — Iterates through improvement hypotheses, scoring each on impact, feasibility, and risk
4. **Applies improvements** — Updates agent memory, skill parameters, response templates, and workflow optimizations
5. **Logs results** — Writes a nightly evolution report to `memory/evolution/YYYY-MM-DD.md`

## What Gets Improved

- **Response quality** — Identifies where the agent gave suboptimal answers and why
- **Task efficiency** — Finds faster ways to accomplish recurring tasks
- **Skill gaps** — Discovers capabilities the user needs but the agent lacks
- **Memory optimization** — Cleans up redundant memory entries, strengthens important ones
- **Workflow automation** — Identifies manual steps that could be automated
- **Error prevention** — Learns from mistakes to avoid repeating them

## Installation

### Automatic (via install script)
```bash
# Already included in PepeClaw install
pepeclaw install nightly-evolution
```

### Manual
1. Copy this skill directory to your OpenClaw workspace: `~/.openclaw/workspace/skills/nightly-evolution/`
2. The cron job will be set up automatically on next agent startup
3. Or manually trigger: `openclaw cron add --name "nightly-evolution" --schedule "0 0 * * *" --payload-kind agentTurn --payload-message "Run nightly evolution autoresearch"`

## Configuration

Set in your agent's `HEARTBEAT.md` or as environment variables:

```
NIGHTLY_EVOLUTION_DURATION=15       # Minutes to run (default: 15)
NIGHTLY_EVOLUTION_TIME=00:00        # When to run (default: midnight local)
NIGHTLY_EVOLUTION_MODEL=default     # Model to use (default: agent's default model)
NIGHTLY_EVOLUTION_THINKING=high     # Thinking level (default: high for deep analysis)
```

## Cron Job Setup

The skill automatically registers a cron job when loaded:

```json
{
  "name": "nightly-evolution",
  "schedule": { "kind": "cron", "expr": "0 0 * * *", "tz": "local" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "NIGHTLY EVOLUTION AUTORESEARCH\n\nYou are running a 15-minute self-improvement session.\n\n1. Read today's memory file: memory/YYYY-MM-DD.md\n2. Read recent conversation history (last 24h)\n3. Run Karpathy autoresearch loops:\n   - Each iteration: identify ONE specific improvement\n   - Score it: impact (1-10), feasibility (1-10), risk (1-10)\n   - If score > 7: implement it (update memory, skills, or config)\n   - If score < 7: log it and move on\n4. Write evolution report to memory/evolution/YYYY-MM-DD.md\n5. Update MEMORY.md with any significant learnings\n\nFocus on:\n- Mistakes made today → how to prevent them\n- Slow responses → what data/skills to pre-cache\n- User frustrations → workflow improvements\n- Missed opportunities → new capabilities to develop\n- Recurring patterns → automation candidates\n\nRun continuously for 15 minutes. Do not stop early.",
    "timeoutSeconds": 1200
  },
  "delivery": { "mode": "none" }
}
```

## Evolution Report Format

Each night produces `memory/evolution/YYYY-MM-DD.md`:

```markdown
# Nightly Evolution Report — YYYY-MM-DD

## Summary
- Iterations run: 12
- Improvements found: 5
- Improvements applied: 3
- Composite score improvement: +0.4

## Improvements Applied
1. **Email response templates** — Created 3 new templates for common inquiry types (impact: 8, feasibility: 9)
2. **Calendar check optimization** — Now pre-fetches next 48h instead of 24h (impact: 6, feasibility: 10)
3. **Memory cleanup** — Removed 12 redundant entries, consolidated 4 (impact: 5, feasibility: 10)

## Improvements Logged (for future)
4. **Code review skill** — Agent lacks structured code review capability (impact: 9, feasibility: 4)
5. **Meeting prep automation** — Could auto-prepare briefs before calendar events (impact: 7, feasibility: 5)

## Patterns Observed
- User asks about weather 3x/week → consider proactive morning weather in standup
- 40% of coding tasks involve the same 3 repos → pre-index them
- Agent hesitated on 2 email sends → review autonomy boundaries
```

## Privacy

- All analysis happens locally on your machine
- No data is sent externally
- Evolution reports stay in your workspace
- You can review and revert any change
