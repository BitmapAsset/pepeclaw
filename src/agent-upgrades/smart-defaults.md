# PepeClaw Superpowers: Smart Defaults

> Configuration recommendations that make OpenClaw agents smarter out of the box. These are opinionated defaults — override any that don't fit your setup.

---

## Heartbeat Configuration

### Work Hours (Active Mode)

```yaml
heartbeat:
  interval: 30m
  actions:
    - check_notifications
    - review_pending_todos
    - suggest_proactive_work
  quiet_after: 3  # stop suggesting after 3 consecutive idle checks
```

**Why 30 minutes:** Frequent enough to stay responsive, rare enough to not be annoying. The agent checks in, handles anything pending, and offers to help — but backs off if you're heads-down.

### After Hours (Maintenance Mode)

```yaml
heartbeat:
  interval: 120m
  actions:
    - consolidate_memory
    - cleanup_temp_files
    - run_nightly_evolution  # if scheduled
  notifications: critical_only
```

**Why 120 minutes:** After hours is for maintenance, not interruption. Memory consolidation, log cleanup, and evolution cycles run quietly in the background.

### Custom Schedules

```yaml
# Example: busier heartbeat during standup prep
schedules:
  - name: standup_prep
    cron: "45 8 * * 1-5"  # 8:45 AM weekdays
    interval: 10m
    duration: 30m
    actions:
      - summarize_yesterday
      - list_open_prs
      - check_ci_status
```

---

## Memory Architecture

### Directory Structure

```
memory/
  MEMORY.md              # Curated index — the "brain" (keep under 200 lines)
  user-profile.md        # User modeling output
  learnings.md           # Realtime learning entries
  scores/
    YYYY-MM-DD.jsonl     # Daily self-scoring data
  traces/
    YYYY-MM-DD.jsonl     # Daily execution traces
  2026-03-29.md          # Daily session log (today)
  2026-03-28.md          # Daily session log (yesterday)
  archive/
    2026-02/             # Archived monthly daily files
```

### MEMORY.md Structure

```markdown
# MEMORY.md — Agent Knowledge Base

## Project Context
- [key facts about the project that persist across sessions]

## User Preferences
- [link to user-profile.md for details]
- [top 3 most important preferences inline]

## Active Work
- [current sprint/focus area]
- [open PRs and their status]
- [blockers or waiting-on items]

## Rules & Guardrails
- [hard rules from past mistakes]
- [project conventions discovered]

## Quick Reference
- [frequently needed paths, URLs, credentials locations]
```

### Retention Policy

| Data Type | Retention | Archive Strategy |
|-----------|-----------|------------------|
| Daily files | 30 days active | Monthly archive folders |
| MEMORY.md | Permanent | Pruned weekly |
| Score data | 90 days | Aggregate into monthly summaries |
| Trace data | 14 days | Delete (recreatable) |
| Learnings | Permanent | Consolidate quarterly |
| User profile | Permanent | Update in place |

---

## Response Formatting

### Text-to-Speech Awareness

For long responses (>500 words), structure for optional TTS consumption:

```yaml
tts:
  enabled: true
  trigger: response_length > 500_words
  format:
    - lead_with_summary  # TTS-friendly one-liner
    - use_short_sentences  # easier to follow aurally
    - avoid_code_blocks_in_speech  # say "see the code below" instead
    - pause_markers: true  # insert natural break points
```

### Platform-Specific Formatting

```yaml
formatting:
  terminal:
    max_width: 100  # characters
    prefer: plain_text
    code_blocks: fenced_markdown
    tables: ascii
    colors: ansi_256

  web_ui:
    max_width: null  # fluid
    prefer: rich_markdown
    code_blocks: syntax_highlighted
    tables: html_or_markdown
    colors: css_variables

  mobile:
    max_width: 60  # narrower viewport
    prefer: concise_markdown
    code_blocks: collapsed_by_default
    tables: list_format  # tables don't render well on mobile
    colors: system_theme
```

### Response Length Guidelines

```yaml
response_length:
  quick_answer: 1-3 sentences     # "What's the port?" → "3000, defined in .env"
  explanation: 1-2 paragraphs     # "Why does this fail?" → context + cause + fix
  implementation: minimal_diff    # show only changed code, not the whole file
  architecture: bullet_points     # decisions as bullets, not essays
  debugging: step_by_step         # numbered steps with expected vs actual
```

---

## Tool Usage Defaults

### Preferred Tool Chain

```yaml
tools:
  file_search: glob          # not find
  content_search: grep       # not rg via bash
  file_read: Read            # not cat
  file_edit: Edit            # not sed
  file_create: Write         # not echo/heredoc
  destructive: trash         # not rm
  git: direct_commands       # prefer specific over git add -A
```

### Safety Thresholds

```yaml
safety:
  confirm_before:
    - delete_files
    - force_push
    - reset_hard
    - drop_tables
    - modify_ci_pipeline
    - send_external_messages

  auto_approve:
    - read_files
    - search_codebase
    - run_tests
    - create_commits  # on current branch only
    - install_dev_deps

  never_auto:
    - push_to_main
    - modify_production_config
    - access_credentials
```

---

## Integration Defaults

### Git Configuration

```yaml
git:
  commit_style: conventional  # feat:, fix:, docs:, etc.
  branch_naming: type/short-description  # feat/add-auth, fix/null-pointer
  pr_size: small  # prefer multiple small PRs
  always_sign: false  # unless user enables
  pre_commit_hooks: respect  # never --no-verify
```

### Editor Integration

```yaml
editor:
  format_on_save: true
  lint_on_save: true
  auto_import: true
  preferred_quotes: single  # unless project uses double
  trailing_comma: es5
  semicolons: project_default  # detect from existing code
```

---

## Performance Tuning

### Context Management

```yaml
context:
  max_files_in_memory: 10     # don't read 50 files at once
  prefer_targeted_reads: true  # read specific lines, not whole files
  cache_file_structure: true   # remember directory layout within session
  parallel_tool_calls: true    # when independent
```

### Token Efficiency

```yaml
efficiency:
  avoid_restating_user_input: true
  skip_preamble: true          # no "Sure, I'd be happy to..."
  code_diffs_over_full_files: true
  compress_repeated_patterns: true
  max_retries_before_asking: 2
```

---

## Quick Start

Apply all smart defaults at once with the PepeClaw Setup Wizard, or cherry-pick individual sections into your agent's configuration. Each section is independent — use what fits your workflow.
