---
name: deep-search
description: "Cross-session deep search — before asking the user for ANY API key, tool config, or capability question, the agent searches .secrets/, config/, skills/, and data/ directories first. Eliminates redundant questions and makes the agent feel like it actually knows the workspace."
metadata:
  openclaw:
    emoji: "🔍"
    triggers:
      - "deep search"
      - "search everything"
      - "find in workspace"
      - "do you have access to"
      - "what tools do I have"
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
    - search
    - discovery
    - workspace-awareness
    - context
  dependencies: []
---

# Cross-Session Deep Search

Never ask the user for something that's already in the workspace.

## How It Works

Before asking the user for ANY information, the agent searches:

1. **`.secrets/*.env`** — API keys, tokens, credentials
2. **`config/*.json`** — MCP servers, tool configurations, preferences
3. **`skills/*/SKILL.md`** — Installed capabilities and their triggers
4. **`data/**/*.json`** — Cached results, previous outputs, stored data
5. **`memory/**/*.md`** — All memory files including micro-learnings
6. **Environment variables** — Currently loaded env vars

## The Golden Rule

> **Before asking the user for any API key, tool config, or capability — search .secrets/, config/, env files, and memory first.**

If you find it → use it silently.
If you don't find it → then ask.

## Search Locations

### API Keys & Credentials
```
Search order:
1. .secrets/*.env          — Primary secrets store
2. .env                    — Root environment file
3. .env.local              — Local overrides
4. config/credentials.json — Structured credentials
5. ~/.config/openclaw/     — Global OpenClaw config
6. Environment variables   — Currently loaded
```

### Tool & MCP Configurations
```
Search order:
1. config/*.json           — Tool configurations
2. config/mcp-servers.json — MCP server registry
3. .claude/settings.json   — Claude-specific settings
4. skills/*/SKILL.md       — Skill-embedded tool configs
```

### Installed Capabilities
```
Search order:
1. skills/*/SKILL.md       — All installed skills
2. config/mcp-servers.json — Available MCP tools
3. memory/capabilities.md  — Documented capabilities
4. package.json            — npm scripts and tools
```

### Cached Data & Previous Results
```
Search order:
1. data/**/*.json          — Structured cached data
2. data/**/*.jsonl         — Log-format cached data
3. memory/**/*.md          — Memory-stored results
4. /tmp/openclaw-cache/    — Temporary cache
```

## Agent Behavior Instructions

### On Session Start
```
1. Scan workspace structure (top-level dirs + skills/ listing)
2. Load .secrets/*.env if accessible (note available keys)
3. Load config/mcp-servers.json (note available tools)
4. List skills/*/SKILL.md (note installed capabilities)
5. Store this workspace map in session context
```

### Before Asking User for Information
```
BEFORE asking "Do you have an API key for X?":
  1. Search .secrets/ for any file containing "X" or related terms
  2. Search .env files for X_API_KEY, X_TOKEN, X_SECRET patterns
  3. Search config/ for X-related configuration
  4. Check environment variables

BEFORE asking "Do you have a tool for Y?":
  1. Search skills/ for Y-related SKILL.md files
  2. Search config/mcp-servers.json for Y-related servers
  3. Check package.json for Y-related scripts
  4. Search memory/ for previous Y-related tool usage

BEFORE asking "Have we done Z before?":
  1. Search data/ for Z-related cached results
  2. Search memory/ for Z-related entries
  3. Check execution traces for Z-related tool calls
  4. Search git log for Z-related commits
```

### Search Patterns

For API key discovery, search these patterns:
```
*_API_KEY, *_TOKEN, *_SECRET, *_KEY, *_PASSWORD
*_ACCESS_KEY, *_CLIENT_ID, *_CLIENT_SECRET
OPENAI_*, ANTHROPIC_*, TIKHUB_*, GITHUB_*, SLACK_*
```

For tool discovery:
```
skills/*/SKILL.md → name field
config/mcp-servers.json → server names
package.json → scripts section
Makefile → target names
```

## Example Scenarios

### Scenario 1: User asks "Can you check TikTok trends?"
```
WRONG: "Do you have a TikHub API key?"
RIGHT:
  1. Search .secrets/ for TIKHUB_API_KEY → Found!
  2. Search skills/ for social-monitoring → Found!
  3. Proceed silently using found key and skill
```

### Scenario 2: User asks "Deploy to staging"
```
WRONG: "What's your deployment setup?"
RIGHT:
  1. Search config/ for deploy config → Found deploy.json
  2. Search scripts/ for deploy scripts → Found deploy.sh
  3. Check package.json scripts → Found "deploy:staging"
  4. Proceed with npm run deploy:staging
```

### Scenario 3: User asks "Send a Slack message"
```
WRONG: "Do you have Slack configured?"
RIGHT:
  1. Search config/mcp-servers.json for slack → Found MCP server
  2. Search .secrets/ for SLACK_TOKEN → Found!
  3. Proceed with MCP Slack tool
```

## Installation

### Automatic
```bash
pepeclaw install deep-search
```

### Manual
1. Copy `skills/deep-search/` to your OpenClaw workspace
2. Agent will start deep searching on next session
3. No additional setup needed — it searches what already exists

## Configuration

```
DEEP_SEARCH_SECRETS_DIR=.secrets              # Where to find secrets
DEEP_SEARCH_CONFIG_DIR=config                  # Where to find configs
DEEP_SEARCH_CACHE_WORKSPACE_MAP=true          # Cache workspace structure on session start
DEEP_SEARCH_SILENT=true                        # Don't announce searches to user
DEEP_SEARCH_LOG_DISCOVERIES=true              # Log found resources to execution trace
```

## Integration Points

- **Reads**: `.secrets/`, `config/`, `skills/`, `data/`, `memory/`, env vars
- **Feeds**: execution-trace (logs discoveries), realtime-learning (logs when user had to provide info that was searchable)
- **Used by**: All other skills (as a pre-check before user interaction)

## Privacy

- Secrets found are used but never logged in plain text
- Search operations are local only
- No data leaves your machine
- Respects .gitignore patterns
