# Cognitive Biases Reference

Reference catalog for the Adversarial Red Team bias detection system.
Organized by category with detection patterns and debiasing strategies.

---

## Decision-Making Biases

### Confirmation Bias
**What:** Seeking, interpreting, or recalling information that confirms pre-existing beliefs.
**Detection signals:** Selective question framing ("Isn't X true?"), ignoring contradicting data, cherry-picking supporting evidence.
**Debiasing:** Actively seek disconfirming evidence. Ask: "What would change my mind?"

### Anchoring Bias
**What:** Over-relying on the first piece of information encountered when making decisions.
**Detection signals:** Decisions heavily influenced by initial numbers, first offers, or earliest data points.
**Debiasing:** Generate independent estimates before seeing anchors. Consider multiple reference points.

### Sunk Cost Fallacy
**What:** Continuing a course of action because of past investment (time, money, effort) rather than future expected value.
**Detection signals:** "We've already invested X", "Can't stop now", "Too far to turn back."
**Debiasing:** Evaluate decisions based only on future costs and benefits. Ask: "If I hadn't started this, would I start it now?"

### Status Quo Bias
**What:** Preference for the current state of affairs, even when change would be beneficial.
**Detection signals:** "Why change?", "It's always worked", "Too risky to change."
**Debiasing:** Evaluate the status quo with the same scrutiny as alternatives. Ask: "Would I choose this if starting fresh?"

### Loss Aversion
**What:** Losses feel roughly twice as painful as equivalent gains feel good.
**Detection signals:** Excessive focus on what could go wrong, reluctance to take calculated risks, "can't afford to lose."
**Debiasing:** Frame decisions in terms of net expected value. Compare regret of inaction vs. action.

### Endowment Effect
**What:** Overvaluing things you already own or have created.
**Detection signals:** Refusing fair offers, overpricing own work, reluctance to kill own projects.
**Debiasing:** Evaluate possessions at market rate. Ask: "Would I acquire this at its current cost?"

---

## Prediction & Estimation Biases

### Overconfidence Bias
**What:** Excessive confidence in one's predictions, judgments, or abilities.
**Detection signals:** Extreme certainty language ("definitely", "guaranteed", "100%"), narrow confidence intervals, dismissing uncertainty.
**Debiasing:** Use reference class forecasting. Track prediction accuracy over time. Widen confidence intervals.

### Planning Fallacy
**What:** Systematically underestimating time, cost, and complexity of future tasks.
**Detection signals:** "Should only take a day", "Easy fix", "Straightforward", aggressive timelines.
**Debiasing:** Use historical data for similar tasks. Apply multipliers (2-3x for software). Plan for the 80th percentile, not the median.

### Optimism Bias
**What:** Overestimating the probability of positive outcomes and underestimating negative ones.
**Detection signals:** Best-case planning, dismissing risks, "it'll work out."
**Debiasing:** Conduct pre-mortems. Use base rates for similar endeavors.

### Hindsight Bias
**What:** After an event, believing it was predictable all along.
**Detection signals:** "I knew it", "It was obvious", "Anyone could have seen that."
**Debiasing:** Record predictions before outcomes. Review calibration regularly.

### Base Rate Neglect
**What:** Ignoring general statistical information in favor of specific case details.
**Detection signals:** Focusing on anecdotes over data, ignoring historical success/failure rates.
**Debiasing:** Always start with the base rate. Then adjust for specific circumstances.

---

## Social & Group Biases

### Bandwagon Effect (Groupthink)
**What:** Adopting beliefs or behaviors because many others do.
**Detection signals:** "Everyone thinks so", "The market says", "All experts agree", lack of dissent.
**Debiasing:** Seek contrarian views. Ask: "What would a smart, well-informed person who disagrees say?"

### Authority Bias
**What:** Giving excessive weight to opinions of perceived authorities.
**Detection signals:** "X says so" (without examining the reasoning), deferring to titles/credentials.
**Debiasing:** Evaluate arguments on their merits, not their source. Experts are wrong regularly.

### Survivorship Bias
**What:** Drawing conclusions only from visible successes, ignoring invisible failures.
**Detection signals:** "Look at how X succeeded by doing Y", studying only winners.
**Debiasing:** Actively seek failure cases. Ask: "How many others did the same thing and failed?"

### Social Proof
**What:** Assuming others' behavior indicates correct behavior.
**Detection signals:** "Everyone else is doing it", copying competitors without analysis, trend-following.
**Debiasing:** Evaluate independently. Crowds are often wrong, especially at extremes.

---

## Information Processing Biases

### Availability Heuristic
**What:** Overweighting information that comes to mind easily (recent, vivid, emotional).
**Detection signals:** Decisions driven by recent events, news headlines, or dramatic stories.
**Debiasing:** Use data over anecdotes. Ask: "Am I overweighting this because it's memorable?"

### Framing Effect
**What:** Being influenced by how information is presented rather than the information itself.
**Detection signals:** Different responses to "90% survival rate" vs "10% mortality rate."
**Debiasing:** Reframe the problem multiple ways before deciding. Present data in both positive and negative frames.

### Narrative Fallacy
**What:** Imposing story structure on random or complex events to make them understandable.
**Detection signals:** Overly neat explanations, "because of X, then Y happened", post-hoc storytelling.
**Debiasing:** Accept that many outcomes are driven by randomness. Demand statistical evidence, not just stories.

### Recency Bias
**What:** Overweighting recent events when predicting the future.
**Detection signals:** "The trend is", "Lately", "Based on last month", extrapolating short-term data.
**Debiasing:** Look at longer time horizons. Consider mean reversion. Ask: "Is this recent trend permanent or cyclical?"

### Selection Bias
**What:** Drawing conclusions from non-representative data.
**Detection signals:** Small samples, self-selected groups, unrepresentative feedback.
**Debiasing:** Consider how the data was collected. Seek representative samples.

---

## Action & Commitment Biases

### Escalation of Commitment
**What:** Increasing investment in a losing course of action to justify past decisions.
**Detection signals:** Doubling down after setbacks, "we just need a little more", throwing good money after bad.
**Debiasing:** Set kill criteria in advance. Have a neutral party review ongoing investments.

### IKEA Effect
**What:** Overvaluing things you helped create, regardless of quality.
**Detection signals:** Resistance to replacing self-built solutions, defending own code/designs beyond merit.
**Debiasing:** Get external evaluations. Compare against off-the-shelf alternatives objectively.

### Commitment Bias (Consistency)
**What:** Desire to appear consistent with past statements/positions, even when wrong.
**Detection signals:** Defending past positions despite new evidence, reluctance to change stated plans.
**Debiasing:** Explicitly celebrate changing your mind when warranted. Value accuracy over consistency.

### Hyperbolic Discounting
**What:** Preferring immediate rewards over larger future rewards.
**Detection signals:** Choosing quick fixes over proper solutions, prioritizing short-term over long-term.
**Debiasing:** Calculate the true time-value tradeoff. Ask: "Will my future self thank me for this choice?"

---

## Risk Assessment Biases

### Neglect of Probability
**What:** Ignoring probability when evaluating uncertain events — treating all non-zero risks as equal.
**Detection signals:** "It could happen" (without quantifying likelihood), treating 1% and 40% risks the same.
**Debiasing:** Always estimate probability AND impact. Calculate expected value.

### Zero-Risk Bias
**What:** Preferring to eliminate one small risk entirely rather than reducing overall risk more effectively.
**Detection signals:** Disproportionate effort on eliminating minor risks, ignoring larger risks.
**Debiasing:** Prioritize risk reduction by expected value (probability x impact), not by how complete the reduction feels.

### Affect Heuristic
**What:** Making judgments based on current emotions rather than objective analysis.
**Detection signals:** Decisions right after emotional events, "gut feeling" without analysis, mood-dependent evaluations.
**Debiasing:** Delay major decisions when emotional. Use structured decision frameworks.

---

## Usage Notes

### For the Bias Detector
- Pattern matching catches obvious signals but misses subtle bias
- Deep (AI) analysis catches framing and narrative biases better
- Multiple biases often co-occur (e.g., sunk cost + escalation of commitment)
- False positives are acceptable — better to flag and dismiss than to miss

### For the Contrarian Spawner
- Use this catalog to structure devil's advocate arguments
- The strongest counter-arguments often combine multiple bias observations
- Quantify everything: "You show signs of planning fallacy — historically, similar projects take 2.3x your estimate"

### Severity Ratings
- **Low:** Bias present but unlikely to significantly affect outcome
- **Medium:** Bias could meaningfully shift the decision or its timing
- **High:** Bias is likely the primary driver of the current direction
- **Critical:** Bias is masking a potentially catastrophic risk
