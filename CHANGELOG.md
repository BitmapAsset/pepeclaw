# Changelog

All notable changes to Pepe 2.0 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-25

### Added
- **Skill Genome System** — Evolutionary skill improvement with fitness tracking, mutation, crossover, pruning, and auto-rollback
- **Predictive Intent Engine** — Temporal pattern mining, pre-computation, anomaly detection, and routine decision auto-completion
- **Dream Mode** — Off-hours creative exploration with 5 cognitive lenses (analogy, inversion, combination, constraint removal, random walk)
- **Meta-Learning Loop** — Nightly conversation analysis, failure pattern detection, capability gap identification, and self-modification proposals
- **Adversarial Red Team** — Anti-sycophancy engine with 25+ cognitive bias detection, assumption surfacing, risk quantification, and monthly hindsight audits
- **Project War Room** — Continuous health monitoring across 5 dimensions (git activity, deploy health, issue health, blocker status, momentum) with auto-triage
- **Temporal Arbitrage** — Time-value optimization with appreciating/depreciating task scoring, batch intelligence, procrastination detection, and opportunity cost analysis
- One-command installer (`install.sh`) for macOS and Linux
- Automatic cron job setup for all scheduled systems
- Default configuration with documented tuning options
- Full test suite for all 7 systems
- Architecture documentation showing system interconnections
- Configuration reference with tuning tips
- Example outputs for all systems

### Technical Details
- All data stored as append-only JSON/JSONL
- POSIX-compatible bash scripts (no zsh-specific features)
- No hardcoded paths — auto-detects OpenClaw workspace
- Clean uninstall via `./install.sh --uninstall`
