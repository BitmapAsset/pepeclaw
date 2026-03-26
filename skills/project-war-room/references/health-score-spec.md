# Health Score Specification

## Overview

The Project War Room health score is a composite metric (0-100) that quantifies the overall state of a project across five weighted dimensions. Scores are computed every 6 hours and persisted in the project's `STATE.md` file. The scoring system is designed to surface problems early, reward consistent activity, and penalize stagnation.

## Score Composition

| Dimension          | Max Points | Weight |
|--------------------|------------|--------|
| Git Activity       | 25         | 25%    |
| Deployment Health  | 20         | 20%    |
| Issue Health       | 20         | 20%    |
| Blocker Status     | 20         | 20%    |
| Momentum           | 15         | 15%    |
| **Total**          | **100**    | **100%** |

## Thresholds and Grades

| Score Range | Grade | Label     | Color  | Action                          |
|-------------|-------|-----------|--------|---------------------------------|
| 80 - 100    | A     | Healthy   | Green  | No action required              |
| 60 - 79     | B     | Attention | Yellow | Included in cycle briefing      |
| 40 - 59     | C     | Warning   | Orange | Standalone alert sent           |
| 20 - 39     | D     | Critical  | Red    | Immediate alert + auto-triage   |
| 0 - 19      | F     | Failed    | Red    | Immediate alert + auto-triage   |

Auto-triage triggers automatically when the composite score drops below **50**.

---

## Dimension 1: Git Activity (25 points)

Measures the pulse of development work through commit frequency, code review throughput, and branch hygiene.

### Sub-Scores

#### 1a. Commits Per Week (10 pts)

Counts the number of commits to the default branch in the trailing 7-day window.

```
commits_score = min(10, commits_7d * (10 / target_commits))
```

| Parameter         | Default Value | Description                    |
|-------------------|---------------|--------------------------------|
| `target_commits`  | 15            | Expected weekly commit count   |

- 15+ commits/week = full 10 points.
- Linear scale below target. Zero commits = 0 points.

#### 1b. PR Merge Rate (10 pts)

Ratio of merged PRs to opened PRs over the trailing 7-day window.

```
merge_rate = merged_prs_7d / max(1, open_prs + merged_prs_7d)
merge_score = merge_rate * 10
```

- 100% merge rate = 10 points.
- Penalizes PR pile-up where reviews are bottlenecked.

#### 1c. Branch Staleness (5 pts)

Penalizes branches that have not received commits in over 14 days.

```
stale_ratio = stale_branches / max(1, total_branches)
staleness_score = (1 - stale_ratio) * 5
```

| Parameter          | Default Value | Description                              |
|--------------------|---------------|------------------------------------------|
| `stale_threshold`  | 14 days       | Days without commits before branch is stale |

- Zero stale branches = full 5 points.
- All branches stale = 0 points.

---

## Dimension 2: Deployment Health (20 points)

Evaluates the reliability and cadence of deployments.

### Sub-Scores

#### 2a. Last Deploy Status (8 pts)

Binary score based on the most recent deployment outcome.

```
deploy_status_score = 8 if last_deploy_status == "success" else 0
```

- A failed last deploy zeroes out this sub-score entirely to ensure visibility.

#### 2b. Deploy Frequency (7 pts)

Number of deployments in the trailing 30-day window compared to target.

```
frequency_score = min(7, deploy_count_30d * (7 / target_deploys))
```

| Parameter        | Default Value | Description                      |
|------------------|---------------|----------------------------------|
| `target_deploys` | 8             | Expected monthly deploy count    |

- 8+ deploys/month = full 7 points.
- Linear scale below target.

#### 2c. Rollback Rate (5 pts)

Penalizes rollbacks as a proportion of total deployments.

```
rollback_ratio = rollback_count_30d / max(1, deploy_count_30d)
rollback_score = (1 - rollback_ratio) * 5
```

- Zero rollbacks = full 5 points.
- 100% rollback rate = 0 points.

---

## Dimension 3: Issue Health (20 points)

Tracks issue backlog health, composition, and age.

### Sub-Scores

#### 3a. Open Issues Count (8 pts)

Penalizes excessive open issues relative to a sustainable threshold.

```
overflow_ratio = max(0, open_count - acceptable_open) / acceptable_open
issues_count_score = max(0, 8 - (overflow_ratio * 8))
```

| Parameter         | Default Value | Description                          |
|-------------------|---------------|--------------------------------------|
| `acceptable_open` | 20            | Max open issues before penalty       |

- 20 or fewer open issues = full 8 points.
- 40 open issues = 0 points. Clamped at 0.

#### 3b. Bug-to-Feature Ratio (6 pts)

A healthy project has more feature work than bug fixes. Penalizes when bugs dominate.

```
bug_ratio = bug_count / max(1, bug_count + feature_count)
bug_ratio_score = (1 - bug_ratio) * 6
```

- Zero bugs = full 6 points.
- All issues are bugs = 0 points.

#### 3c. Average Issue Age (6 pts)

Penalizes aging issues that sit unresolved.

```
age_penalty = min(1, avg_age_days / max_acceptable_age)
issue_age_score = (1 - age_penalty) * 6
```

| Parameter            | Default Value | Description                          |
|----------------------|---------------|--------------------------------------|
| `max_acceptable_age` | 30 days       | Average age threshold for zero score |

- Average age of 0 days = full 6 points.
- Average age of 30+ days = 0 points.

---

## Dimension 4: Blocker Status (20 points)

Blockers are the highest-urgency signals. This dimension heavily penalizes unresolved blockers and cross-project blocking chains.

### Sub-Scores

#### 4a. Active Blockers Count (10 pts)

Each active blocker deducts from the maximum score.

```
blocker_penalty = min(10, active_count * penalty_per_blocker)
blockers_count_score = 10 - blocker_penalty
```

| Parameter             | Default Value | Description                    |
|-----------------------|---------------|--------------------------------|
| `penalty_per_blocker` | 3             | Points deducted per blocker    |

- Zero blockers = full 10 points.
- 4+ blockers = 0 points.

#### 4b. Blocker Age (5 pts)

Aging blockers indicate systemic resolution failure.

```
age_penalty = min(1, avg_blocker_age_days / max_blocker_age)
blocker_age_score = (1 - age_penalty) * 5
```

| Parameter          | Default Value | Description                              |
|--------------------|---------------|------------------------------------------|
| `max_blocker_age`  | 14 days       | Average blocker age for full penalty     |

- Fresh blockers (0 days) = full 5 points.
- Average age of 14+ days = 0 points.

#### 4c. Blocked Dependencies (5 pts)

Penalizes projects that are being blocked by other projects.

```
dep_penalty = min(5, len(blocked_by) * penalty_per_dep)
blocked_dep_score = 5 - dep_penalty
```

| Parameter          | Default Value | Description                                |
|--------------------|---------------|--------------------------------------------|
| `penalty_per_dep`  | 2.5           | Points deducted per blocking dependency    |

- Not blocked by any project = full 5 points.
- Blocked by 2+ projects = 0 points.

---

## Dimension 5: Momentum (15 points)

Captures the project's forward trajectory and developer engagement.

### Sub-Scores

#### 5a. Days Since Last Meaningful Commit (7 pts)

A "meaningful commit" excludes auto-generated commits, dependency bumps, and formatting-only changes.

```
recency_penalty = min(1, days_since_last_commit / max_idle_days)
recency_score = (1 - recency_penalty) * 7
```

| Parameter        | Default Value | Description                              |
|------------------|---------------|------------------------------------------|
| `max_idle_days`  | 7             | Days idle before score reaches zero      |

- Commit today = full 7 points.
- 7+ days idle = 0 points.

#### 5b. Velocity Trend (5 pts)

Compares 7-day task completion rate to the 30-day rolling average.

```
if velocity_trend == "up":
    trend_score = 5
elif velocity_trend == "stable":
    trend_score = 3
else:  # "down"
    trend_score = 0
```

- Accelerating projects get full marks.
- Decelerating projects get zero to drive attention.

#### 5c. Contributor Activity (3 pts)

Number of unique contributors with commits in the trailing 7-day window.

```
contributor_score = min(3, active_contributors * (3 / target_contributors))
```

| Parameter             | Default Value | Description                        |
|-----------------------|---------------|------------------------------------|
| `target_contributors` | 3             | Expected active contributor count  |

- 3+ active contributors = full 3 points.
- Solo contributor = 1 point.
- Zero contributors = 0 points.

---

## Composite Score Calculation

```
health_score = git_activity_score + deployment_score + issue_health_score + blocker_score + momentum_score
```

The composite score is the direct sum of all five dimension scores. No additional weighting or normalization is applied since the per-dimension maximums already encode the intended weights.

## Grade Assignment

```
if health_score >= 80: grade = "A"
elif health_score >= 60: grade = "B"
elif health_score >= 40: grade = "C"
elif health_score >= 20: grade = "D"
else: grade = "F"
```

## Auto-Triage Trigger

When `health_score < 50`, the auto-triage system activates. It:

1. Identifies the two lowest-scoring dimensions.
2. Within those dimensions, pinpoints the sub-scores most responsible for the deficit.
3. Generates remediation actions ranked by expected score recovery:
   - Resolving a blocker: estimated +3 to +10 points.
   - Merging stale PRs: estimated +2 to +5 points.
   - Closing aged issues: estimated +1 to +3 points.
   - Deploying pending changes: estimated +5 to +8 points.
4. Sends a Telegram alert with the triage summary and action list.

## Scoring Frequency

- **Standard cycle:** Every 6 hours.
- **On-demand:** Triggered by explicit "project health" or "triage" commands.
- **Post-action:** Re-scored after auto-triage actions are completed to validate recovery.
