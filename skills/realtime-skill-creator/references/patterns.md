# Common Patterns to Watch For

Reference guide for the real-time skill creator. These are patterns frequently observed
in agent sessions that are good candidates for skill extraction.

## Code Transformation Patterns

| Pattern | Detection Signal | Skill Template |
|---------|-----------------|----------------|
| Import fixing | 3+ `edit` calls targeting import lines | `import-fixer` |
| Test scaffolding | Creating test files following same structure | `test-scaffolder` |
| Type annotation | Adding types to untyped functions | `type-annotator` |
| Error handling | Wrapping calls in try/catch with same pattern | `error-wrapper` |
| Refactor rename | grep → find refs → rename across files | `safe-renamer` |

## Workflow Patterns

| Pattern | Detection Signal | Skill Template |
|---------|-----------------|----------------|
| Bug fix cycle | read → reproduce → fix → test → verify | `bug-fix-flow` |
| Feature addition | plan → scaffold → implement → test → document | `feature-flow` |
| Code review prep | diff → lint → test → format → commit | `review-prep` |
| Migration | find old pattern → replace → test → verify no regressions | `migration-runner` |
| Debug session | log → reproduce → inspect → hypothesize → test fix | `debug-flow` |

## Communication Patterns

| Pattern | Detection Signal | Skill Template |
|---------|-----------------|----------------|
| Status updates | Same format of progress reports | `status-reporter` |
| Explanation style | Repeated structure in explanations | `explainer` |
| Decision framing | Same pros/cons analysis format | `decision-framer` |

## File Operation Patterns

| Pattern | Detection Signal | Skill Template |
|---------|-----------------|----------------|
| Config update | Same sequence of config file modifications | `config-updater` |
| Log analysis | grep logs → extract patterns → summarize | `log-analyzer` |
| Dependency update | check outdated → update → test → lock | `dep-updater` |

## Anti-Patterns (Do NOT Create Skills For)

- **One-off tasks** — pattern must appear 3+ times
- **Trivial operations** — single grep or read is not a skill
- **User-specific data** — skills must be generalizable
- **Security-sensitive operations** — credential handling, auth flows
- **Destructive operations** — rm, drop, force-push should remain explicit

## Similarity Scoring

When comparing two tool-call sequences for structural similarity:

```
similarity = matching_steps / max(len(seq_a), len(seq_b))

matching criteria:
  - Same tool name: +1.0
  - Same tool, similar args: +0.8
  - Same tool, different args: +0.6
  - Different tool, same purpose: +0.3

threshold: 0.70 (70% similarity triggers draft)
```
