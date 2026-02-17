# 11 Implementation Plan: Observability, SLOs, and Release Gates

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Move governance from intuition to objective reliability gates before enabling new models or changing critical runtime behavior.

## Current state in this codebase

- Usage and session tracking exists in:
  - `convex/ai/agentSessions.ts`
  - `convex/ai/conversations.ts`
  - `convex/ai/platformAlerts.ts`
  - `convex/ai/deadLetterQueue.ts`
- Some runtime logs exist, but no unified SLO gate layer.

## Gaps

- No single SLO definition for AI runtime quality.
- No release gate tied to SLO regressions.
- Limited visibility for model fallback causes and tool reliability trends.

## Target state

- Defined SLO set:
  - tool success rate
  - model fallback rate
  - p95 response latency
  - cost per successful task
  - escalation rate
- Release gates block model enabling when SLOs fail.

## SLO threshold definitions (v1)

Use a rolling **24h** window for alerts and a rolling **7d** window for release-gate decisions.

| Metric | Target | Warning threshold | Critical threshold | Direction |
|---|---:|---:|---:|---|
| Tool success rate | >= 0.98 | < 0.97 | < 0.95 | Higher is better |
| Model fallback rate | <= 0.03 | > 0.05 | > 0.08 | Lower is better |
| P95 response latency (ms) | <= 8000 | > 10000 | > 15000 | Lower is better |
| Cost per successful task (USD) | <= 0.08 | > 0.12 | > 0.20 | Lower is better |
| Escalation rate | <= 0.04 | > 0.06 | > 0.10 | Lower is better |

### Alert policy

- Emit warning alert when metric crosses warning threshold.
- Emit critical alert when metric crosses critical threshold.
- Include metric name, observed value, threshold value, and window size in alert payload.

### Release-gate policy

- Block model enablement when any critical threshold is breached in the 7d window.
- Require manual approval when warning threshold is breached for more than 2 consecutive windows.
- Keep an override path with explicit audit trail for emergency rollout.

## Implementation chunks

1. Define SLO baselines and thresholds in docs.
2. Add queries/aggregations for each metric.
3. Add alerting rules in `platformAlerts` for threshold breaches.
4. Add model-enable precheck using recent SLO windows.
5. Add weekly reliability review script/runbook.

## Validation

- Tests for metric aggregation correctness.
- Backfill checks over historical data window.
- Alert trigger simulation tests.

## Risks

- Poor metric definitions leading to noisy or blind alerts.
- Release friction if gates are too strict early.

## Exit criteria

- SLO dashboards/queries available.
- Alerts fire for defined thresholds.
- Enablement flow consults SLO gate.
