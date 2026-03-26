# Configuration Reference

All configuration lives in `~/.openclaw/data/pepe/config.json`. The installer creates a default configuration. Every option is documented below.

## Global

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `version` | string | `"2.0.0"` | Configuration schema version. Do not modify. |

## Dream Mode

Creative exploration system that runs during off-hours.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `dream_mode.enabled` | bool | `true` | Enable/disable Dream Mode entirely |
| `dream_mode.schedule` | string | `"2-5"` | Active hours (24h format). Agent explores during this window. |
| `dream_mode.max_dreams` | int | `200` | Maximum dreams to accumulate before oldest are pruned |
| `dream_mode.promotion_threshold` | float | `0.6` | Minimum combined score (novelty×0.4 + feasibility×0.6) to promote an idea to the morning brief |

**Tuning tips:**
- Lower `promotion_threshold` to 0.4 for more creative (but less practical) ideas
- Narrow `schedule` to `"3-4"` to reduce compute during off-hours
- Increase `max_dreams` if you have many active projects

## Meta-Learning Loop

Nightly self-analysis and improvement proposal engine.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `meta_learning.enabled` | bool | `true` | Enable/disable Meta-Learning |
| `meta_learning.schedule` | string | `"nightly"` | When to run analysis. Options: `"nightly"`, `"weekly"`, `"manual"` |
| `meta_learning.auto_apply_proposals` | bool | `false` | If `true`, approved proposals are applied automatically. If `false`, proposals require manual review. |

**Tuning tips:**
- Set `auto_apply_proposals: true` once you trust the system's judgment (after ~2 weeks)
- Use `"weekly"` schedule if you have low conversation volume

## Skill Genome

Evolutionary skill improvement through fitness tracking and mutation.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `skill_genome.evolution_cycle` | string | `"weekly"` | How often to run evolution. Options: `"weekly"`, `"biweekly"`, `"monthly"` |
| `skill_genome.mutation_threshold` | float | `0.2` | Bottom percentile of skills eligible for mutation (0.2 = bottom 20%) |
| `skill_genome.prune_threshold` | float | `0.05` | Skills with usage frequency below this are pruned |
| `skill_genome.rollback_window_days` | int | `14` | Days to wait before evaluating a mutation's impact. Mutations that decreased fitness within this window are auto-rolled back. |

**Tuning tips:**
- Increase `mutation_threshold` to 0.3 for more aggressive evolution
- Extend `rollback_window_days` to 21 for slower but safer evaluation
- Use `"biweekly"` cycle for small skill sets (< 20 skills)

## War Room

Project health monitoring and auto-triage.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `war_room.check_interval_hours` | int | `6` | Hours between health checks |
| `war_room.auto_triage_threshold` | int | `50` | Health score below which auto-triage activates (0-100) |
| `war_room.health_weights.git_activity` | float | `0.25` | Weight for git commit/PR activity |
| `war_room.health_weights.deploy_health` | float | `0.20` | Weight for deployment status |
| `war_room.health_weights.issue_health` | float | `0.20` | Weight for issue tracker health |
| `war_room.health_weights.blocker_status` | float | `0.20` | Weight for active blockers |
| `war_room.health_weights.momentum` | float | `0.15` | Weight for velocity momentum |

**Tuning tips:**
- Weights must sum to 1.0
- For deploy-heavy projects, increase `deploy_health` weight
- Lower `auto_triage_threshold` to 30 if you only want alerts for critical issues
- Set `check_interval_hours: 1` for production-critical projects

## Red Team

Adversarial challenge and bias detection engine.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `red_team.challenge_threshold_cost` | int | `1000` | Minimum decision cost ($) to trigger devil's advocate |
| `red_team.challenge_threshold_weeks` | int | `1` | Minimum effort (weeks) to trigger devil's advocate |
| `red_team.monthly_hindsight_audit` | bool | `true` | Run monthly calibration audit (predictions vs. reality) |

**Tuning tips:**
- Lower `challenge_threshold_cost` to 500 for more aggressive challenging
- Set both thresholds to 0 to challenge every decision (useful for learning)
- Disable `monthly_hindsight_audit` if you don't track decision outcomes

## Predictive Intent

Pattern mining and proactive pre-computation.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `predictive_intent.pattern_confidence_threshold` | float | `0.7` | Minimum confidence to act on a discovered pattern (0-1) |
| `predictive_intent.pre_compute_before_minutes` | int | `30` | Minutes before predicted need to start pre-computing |
| `predictive_intent.anomaly_sigma_threshold` | int | `2` | Standard deviations from baseline to flag as anomaly |
| `predictive_intent.anomaly_window_days` | int | `14` | Rolling window for computing baseline statistics |

**Tuning tips:**
- Lower `pattern_confidence_threshold` to 0.5 to catch weaker patterns (more false positives)
- Increase `pre_compute_before_minutes` to 60 for expensive computations
- Set `anomaly_sigma_threshold: 3` for fewer, more significant anomaly alerts

## Temporal Arbitrage

Time-value optimization for task scheduling.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `temporal_arbitrage.procrastination_threshold` | int | `3` | Number of deferrals before flagging procrastination |
| `temporal_arbitrage.opportunity_cost_switch_threshold` | float | `0.30` | Minimum value spread (30%) to recommend switching tasks |
| `temporal_arbitrage.deadline_buffer_percent` | float | `0.20` | Buffer added to deadline backward planning (20%) |

**Tuning tips:**
- Lower `procrastination_threshold` to 2 for stricter tracking
- Increase `opportunity_cost_switch_threshold` to 0.5 to reduce task-switching recommendations
- Increase `deadline_buffer_percent` to 0.3 for more conservative planning

## Environment Variables

These override config.json values:

| Variable | Description |
|----------|-------------|
| `OPENCLAW_WORKSPACE` | Override workspace detection |
| `PEPE_DATA_DIR` | Override data directory (default: `~/.openclaw/data/pepe`) |
| `PEPE_CONFIG` | Override config file path |
| `PEPE_LOG_LEVEL` | Logging verbosity: `quiet`, `normal`, `verbose`, `debug` |
| `PEPE_DRY_RUN` | Set to `1` to simulate without writing data |
