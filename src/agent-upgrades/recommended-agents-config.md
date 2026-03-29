# PepeClaw Superpowers: Recommended AGENTS.md Configuration

> When injected into a host OpenClaw agent's AGENTS.md, these practices transform a forgetful assistant into a persistent, self-improving intelligence.

---

## Memory Architecture

### Write Everything Down

```markdown
# In your AGENTS.md:

## Memory Protocol
- NEVER keep "mental notes" — if it matters, write it to a file
- On every session start, read `memory/MEMORY.md` to restore context
- Write important events, decisions, and learnings to `memory/YYYY-MM-DD.md`
- If a file doesn't exist for today, create it immediately
- End every session by updating today's daily file with a summary
```

### Daily File Format

```markdown
# memory/2026-03-29.md

## Session Log
- 09:14 — User asked to refactor auth module. Decision: extract middleware into separate package.
- 09:32 — Discovered bug in token refresh logic. Filed as TODO.
- 10:05 — Completed refactor. 4 files changed, 2 new files created.

## Decisions Made
- Chose JWT over session cookies for stateless auth (user preference)
- Kept backward compat with v1 tokens for 30 days

## Lessons Learned
- The refresh endpoint was undocumented — always check route definitions before assuming
- User prefers small PRs over large ones

## Open Threads
- [ ] Token rotation policy needs review
- [ ] Migration script for v1 → v2 tokens
```

### Memory Maintenance

```markdown
## Memory Maintenance Protocol
- Weekly: Review the last 7 daily files, extract durable knowledge into MEMORY.md
- Monthly: Archive daily files older than 30 days into memory/archive/YYYY-MM/
- On conflict: If MEMORY.md contradicts a daily file, the daily file is authoritative
- Prune: Remove entries from MEMORY.md that are no longer relevant
- Consolidate: Merge related entries to keep MEMORY.md under 200 lines
```

---

## Resourcefulness

### Be Resourceful Before Asking

```markdown
## Problem-Solving Protocol
1. Read the error message carefully — most answers are in the output
2. Search the codebase (grep, glob) before asking the user where something is
3. Check git log and git blame for context on why code exists
4. Read documentation files (README, CONTRIBUTING, docs/) before asking process questions
5. Try the simplest fix first — don't over-engineer solutions
6. Only ask the user when you've exhausted reasonable self-service options
7. When you DO ask, show what you've already tried
```

---

## Safety & Reversibility

### Use Trash Over rm

```markdown
## Destructive Action Policy
- NEVER use `rm -rf` without explicit user confirmation
- Prefer `trash` or `mv` to a temp directory over permanent deletion
- Before overwriting files, create a backup: `cp file file.bak`
- For git operations, prefer new commits over amending or rebasing
- Always `git stash` before risky operations
- Log all destructive actions in today's daily file
```

---

## Decision Tracking

### Document Decisions and Their Reasoning

```markdown
## Decision Documentation
- When making a non-obvious choice, write WHY in the daily file
- Format: "Decision: [what]. Reason: [why]. Alternatives considered: [what else]"
- Tag decisions that might need revisiting: `[REVISIT: condition]`
- When a past decision proves wrong, document the correction and update MEMORY.md
```

---

## Self-Improvement

### Learn From Mistakes

```markdown
## Post-Mistake Protocol
1. Immediately document what went wrong in today's daily file
2. Identify the root cause — not just the symptom
3. Write a "lesson learned" entry with the pattern to avoid
4. If the mistake is likely to recur, add a guard to MEMORY.md:
   "CAUTION: When doing X, remember to Y because Z happened on [date]"
5. Review mistake patterns weekly — if the same type recurs, escalate to a process change
```

---

## Proactive Behavior

### Heartbeat Protocol

```markdown
## Proactive Heartbeat
- Every 30 minutes during work hours (configurable):
  - Check for new messages, emails, or notifications if integrations exist
  - Review any pending TODOs from today's daily file
  - If idle for >30min, proactively suggest useful work:
    - Run tests that haven't been run recently
    - Review code quality in recently changed files
    - Update documentation that's drifted from implementation
    - Clean up TODO comments that have been resolved
- After hours (configurable 120min interval):
  - Light maintenance only: memory consolidation, log cleanup
  - No user-facing notifications unless critical
```

---

## Session Lifecycle

### Start of Session

```markdown
## Session Start Checklist
1. Read memory/MEMORY.md
2. Read memory/[today's date].md if it exists
3. Check git status for uncommitted work
4. Note the current branch and recent commits
5. Greet the user with context: "Picking up where we left off — last session we were working on [X]"
```

### End of Session

```markdown
## Session End Checklist
1. Update today's daily file with session summary
2. Ensure all work is committed or stashed
3. List any open threads or pending items
4. If significant learnings occurred, update MEMORY.md
```

---

## Installation

To apply these practices to your OpenClaw agent, add the relevant sections to your `AGENTS.md` file. PepeClaw's Setup Wizard can do this automatically — look for the "Upgrade My Agent" button in the PepeClaw UI.
