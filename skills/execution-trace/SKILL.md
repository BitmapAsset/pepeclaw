---
name: execution-trace
description: "Execution trace logger — logs every significant tool call with input, output, user reaction, and success score. Stores daily JSONL files for nightly evolution pattern analysis. Includes a trace analyzer that finds top failure patterns and optimization opportunities."
metadata:
  openclaw:
    emoji: "📊"
    triggers:
      - "show traces"
      - "analyze traces"
      - "trace report"
      - "what tools did I use"
      - "execution history"
    data_dir: "data/execution-traces"
genome:
  version: 1
  fitness: 0.5
  mutations: 0
  lineage:
    parent: null
    created: 2026-03-26
    last_mutated: null
    generation: 1
  tags:
    - observability
    - tracing
    - analytics
    - performance
  dependencies: []
---

# Execution Trace Logger

Full observability for your agent's tool usage. Know exactly what works, what fails, and why.

## How It Works

Every significant tool call is logged to `data/execution-traces/YYYY-MM-DD.jsonl` with:

- What tool was called and why
- What the input and output were (summarized)
- How the user reacted
- A success score

Nightly evolution reads these traces to find patterns like "always check .secrets/ before asking for API keys."

## Trace Format

Each line in the JSONL file:

```json
{
  "timestamp": "2026-03-26T14:32:00Z",
  "session_id": "abc123",
  "tool": "Bash",
  "intent": "Check if Docker is running",
  "input_summary": "docker ps",
  "output_summary": "3 containers running: postgres, redis, api",
  "duration_ms": 450,
  "user_reaction": "accepted",
  "success_score": 4,
  "context": {
    "task": "Deploy API service",
    "step": 3,
    "preceding_tool": "Read",
    "following_tool": "Edit"
  },
  "tags": ["docker", "deployment", "infrastructure"]
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO 8601 | When the tool was called |
| `session_id` | string | Current session identifier |
| `tool` | string | Tool name (Bash, Read, Edit, Write, Grep, etc.) |
| `intent` | string | Why the tool was called (1 sentence) |
| `input_summary` | string | Summarized input (≤200 chars) |
| `output_summary` | string | Summarized output (≤200 chars) |
| `duration_ms` | number | How long the call took |
| `user_reaction` | enum | `accepted`, `corrected`, `ignored`, `praised`, `rejected` |
| `success_score` | 1-4 | 1=failed, 2=acceptable, 3=good, 4=excellent |
| `context` | object | Task context, preceding/following tools |
| `tags` | string[] | Auto-generated topic tags |

## Agent Behavior Instructions

### After Every Tool Call
```
1. Determine if the tool call was "significant" (skip trivial reads, glob for navigation)
2. Summarize input and output (≤200 chars each, strip sensitive data)
3. Observe user reaction to the result
4. Assign success score based on:
   - 1: Tool failed, user corrected, or result was wrong
   - 2: Tool succeeded but user adjusted approach
   - 3: Tool succeeded, user continued without issue
   - 4: User explicitly praised or result exceeded expectations
5. Append trace entry to data/execution-traces/YYYY-MM-DD.jsonl
```

### Significant Tool Calls (always log)
- File writes and edits
- Bash commands that modify state
- API calls via MCP tools
- Search operations that inform decisions
- Any tool call that the user reacts to

### Skip (don't log)
- Navigation reads (just looking around)
- Glob/Grep for orientation
- Repeated retries of the same command

## Scripts

### log-trace.sh
Log a single trace entry.

```bash
./scripts/log-trace.sh \
  --tool "Bash" \
  --intent "Deploy to staging" \
  --input "kubectl apply -f deploy.yaml" \
  --output "deployment/api configured" \
  --reaction "accepted" \
  --score 3
```

### analyze-traces.sh
Find patterns in execution traces. This is the key script for nightly evolution.

```bash
# Analyze today's traces
./scripts/analyze-traces.sh

# Analyze last 7 days
./scripts/analyze-traces.sh --days 7

# Find top failure patterns
./scripts/analyze-traces.sh --failures

# Find most-used tool sequences
./scripts/analyze-traces.sh --sequences

# Generate optimization report
./scripts/analyze-traces.sh --report
```

### Analysis Output

The analyzer produces:

```markdown
## Trace Analysis Report — 2026-03-26

### Top Failure Patterns
1. **API key not found** (4 occurrences) → Always check .secrets/ first
2. **Wrong file path** (3 occurrences) → Use Glob before Read
3. **Docker not running** (2 occurrences) → Check Docker status on session start

### Most Effective Sequences
1. Grep → Read → Edit (92% success rate, avg score 3.4)
2. Glob → Read → Write (88% success rate, avg score 3.1)

### Tool Usage Stats
| Tool | Calls | Avg Score | Failure Rate |
|------|-------|-----------|--------------|
| Bash | 45    | 3.2       | 8%           |
| Read | 38    | 3.6       | 2%           |
| Edit | 22    | 2.9       | 12%          |

### Recommendations
- Pre-check file existence before editing (reduces Edit failures by ~50%)
- Cache frequently accessed file paths in session context
- Use Grep before Bash for search operations
```

## Installation

### Automatic
```bash
pepeclaw install execution-trace
```

### Manual
1. Copy `skills/execution-trace/` to your OpenClaw workspace
2. Create `data/execution-traces/` directory
3. Agent will start logging on next session

## Configuration

```
TRACE_DIR=data/execution-traces              # Where to store traces
TRACE_MAX_FILE_SIZE_MB=10                     # Rotate after this size
TRACE_RETENTION_DAYS=90                       # Keep traces for this long
TRACE_SENSITIVITY_FILTER=true                 # Strip API keys, passwords from summaries
TRACE_MIN_LOG_LEVEL=significant              # significant|all|none
```

## Cron Setup

```json
{
  "name": "trace-analyzer",
  "schedule": { "kind": "cron", "expr": "30 0 * * *", "tz": "local" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run trace analysis for today. Read data/execution-traces/ for the last 24h. Find failure patterns, effective sequences, and optimization opportunities. Write report to data/execution-traces/analysis-YYYY-MM-DD.md. Feed findings to nightly evolution.",
    "timeoutSeconds": 300
  }
}
```

## Integration Points

- **Writes**: `data/execution-traces/YYYY-MM-DD.jsonl`
- **Read by**: nightly-evolution, skill-autocreator, self-scoring
- **Feeds**: Pattern detection, workflow optimization, skill generation
- **Consumed by**: meta-learning (failure analysis), openclaw-optimizer (tool coverage)

## Privacy

- Sensitive data (API keys, passwords, tokens) is automatically stripped from summaries
- All traces stay local
- User can delete any trace file
- Configurable retention period
