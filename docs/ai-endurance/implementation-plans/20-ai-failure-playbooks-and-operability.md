# 20 Implementation Plan: AI Failure Playbooks and Runtime Operability

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Close the remaining operations gap by codifying executable incident playbooks for model outages, tool degradation, and cost spikes, with each step tied to real runtime identifiers.

## Current state in this codebase

- Alert primitives and SLO thresholds exist in `convex/ai/platformAlerts.ts`.
- Runtime telemetry queries exist in `convex/ai/agentSessions.ts`, `convex/ai/escalation.ts`, and `convex/ai/billing.ts`.
- Delivery isolation and retry logic exists in `convex/ai/deadLetterQueue.ts` and `convex/ai/outboundDelivery.ts`.
- Model enablement already uses release gates in `convex/ai/platformModelManagement.ts`.

## Gaps

- Canonical incident playbooks were not centralized across Plan 20 docs.
- Alert/query names were referenced inconsistently instead of using a fixed runtime identifier registry.
- Operability actions were not explicitly tied to release-gate controls and closure criteria.

## Target state

- One canonical identifier registry is shared across operability docs.
- Model outage, tool degradation, and cost spike playbooks have explicit detect/contain/recover/close steps.
- Incident recovery actions are linked to runtime release gates and objective close criteria.

## Canonical runtime identifier registry

| Category | Runtime identifier | Source |
|---|---|---|
| Alert action | `ai/platformAlerts:sendPlatformAlert` | `convex/ai/platformAlerts.ts` |
| Alert types | `openrouter_payment`, `openrouter_error`, `rate_limit`, `service_outage`, `slo_breach` | `convex/ai/platformAlerts.ts` |
| SLO metric keys | `tool_success_rate`, `model_fallback_rate`, `p95_response_latency_ms`, `cost_per_successful_task_usd`, `escalation_rate` | `convex/ai/platformAlerts.ts` |
| Fallback telemetry query | `ai/agentSessions:getModelFallbackRate` | `convex/ai/agentSessions.ts` |
| Tool success/failure query | `ai/agentSessions:getToolSuccessFailureRatio` | `convex/ai/agentSessions.ts` |
| Receipt aging query | `ai/agentSessions:getAgingReceipts` | `convex/ai/agentSessions.ts` |
| Duplicate receipts query | `ai/agentSessions:getDuplicateReceipts` | `convex/ai/agentSessions.ts` |
| Stuck receipts query | `ai/agentSessions:getStuckReceipts` | `convex/ai/agentSessions.ts` |
| Replay-safe receipt debug query | `ai/agentSessions:getReplaySafeReceiptDebug` | `convex/ai/agentSessions.ts` |
| Replay-safe receipt request mutation | `ai/agentSessions:requestReplaySafeReceipt` | `convex/ai/agentSessions.ts` |
| Escalation metrics query | `ai/escalation:getEscalationMetrics` | `convex/ai/escalation.ts` |
| Cost/usage summary query | `ai/billing:getUsageSummary` | `convex/ai/billing.ts` |
| Model enable/disable mutations | `ai/platformModelManagement:enablePlatformModel`, `ai/platformModelManagement:disablePlatformModel` | `convex/ai/platformModelManagement.ts` |
| Model pricing query | `ai/modelPricing:getModelPricing` | `convex/ai/modelPricing.ts` |
| DLQ retry action (internal) | `ai/deadLetterQueue:retryDeadLetters` | `convex/ai/deadLetterQueue.ts` |

## Incident playbooks

### Playbook A: Model outage and provider instability

**Primary signals**
- `ai/platformAlerts:sendPlatformAlert` with `alertType=service_outage|openrouter_error|rate_limit|openrouter_payment`.
- `slo_breach` on `model_fallback_rate`.
- `ai/agentSessions:getModelFallbackRate` shows sustained fallback increase.

**Containment**
1. Freeze non-essential model changes (no new enablements/default flips).
2. Validate currently enabled model set via `ai/platformModels:getEnabledModels`.
3. Disable clearly failing model IDs via `ai/platformModelManagement:disablePlatformModel`.
4. Confirm fallback chain health using runtime failover telemetry logs and `getModelFallbackRate`.

**Recovery**
1. Re-enable model only after validation and release-gate pass through `ai/platformModelManagement:enablePlatformModel` (`operationalReviewAcknowledged=true`).
2. Verify price resolution and non-fallback coverage via `ai/modelPricing:getModelPricing`.
3. Close incident when fallback rate returns inside SLO warning threshold for 2 consecutive windows.

**Post-incident artifact**
- Incident note must include affected model IDs, alert types fired, and exact enable/disable mutations executed.

### Playbook B: Tool degradation and delivery contract instability

**Primary signals**
- `slo_breach` on `tool_success_rate` and/or `escalation_rate`.
- `ai/agentSessions:getToolSuccessFailureRatio` indicates elevated failures.
- Receipt anomalies from `getAgingReceipts`, `getDuplicateReceipts`, `getStuckReceipts`.

**Containment**
1. Identify failing tool cluster and channel surface.
2. Move at-risk agents to safer execution posture (supervised/draft-only) using existing AI settings controls.
3. For stuck ingress receipts, inspect with `getReplaySafeReceiptDebug` and log intent with `requestReplaySafeReceipt`.
4. For outbound backlog, run DLQ recovery (`ai/deadLetterQueue:retryDeadLetters`) via operator workflow.

**Recovery**
1. Confirm tool success ratio stabilizes within SLO warning threshold.
2. Confirm stuck/aging receipts are draining to normal envelope.
3. Confirm escalation queue trend normalizes via `ai/escalation:getEscalationMetrics`.

**Post-incident artifact**
- Capture failing tools, affected channels, receipt IDs sampled, and replay requests logged.

### Playbook C: Cost spikes and budget integrity incidents

**Primary signals**
- `slo_breach` on `cost_per_successful_task_usd`.
- Unexpected spend from `ai/billing:getUsageSummary`.
- Secondary pressure signs from `model_fallback_rate` and escalations.

**Containment**
1. Identify top spend drivers (org, model, workflow) from billing + session stats.
2. Pause optional high-cost experiments and non-critical AI traffic.
3. Validate model routing against org defaults and enabled allow-list.
4. Enforce conservative defaults until costs re-enter threshold.

**Recovery**
1. Confirm cost metric is below warning threshold for 2 consecutive windows.
2. Confirm no hidden fallback loop is inflating spend.
3. Re-open paused traffic gradually with explicit owner approval.

**Post-incident artifact**
- Record before/after spend deltas, routed model mix, and recovery threshold timestamps.

## Release gate linkage

- Any model re-enable during/after outage must pass `evaluateModelEnablementReleaseGates` through `ai/platformModelManagement:enablePlatformModel`.
- Operational review acknowledgement is mandatory for model enablement and must reference the active incident record when relevant.

## Implementation chunks

1. Publish canonical runtime identifier registry for alert/query/mutation/action references.
2. Publish executable model outage playbook mapped to runtime failover and model control-plane operations.
3. Publish executable tool degradation playbook mapped to tool success telemetry and receipt operations.
4. Publish executable cost spike playbook mapped to cost telemetry and model pricing checks.
5. Tie model re-enable path to release-gate acknowledgement and incident closure evidence requirements.

## Validation

- `npm run docs:guard`.
- Confirm every identifier in the registry resolves to a real function/key in source files.
- Run at least one tabletop drill per playbook category and store evidence links in lane docs (`WSK-02`).

## Risks

- Identifier drift if runtime names change without docs updates.
- Overly broad containment actions can create unnecessary customer impact.
- Missing owner/accountability can delay incident closure.

## Exit criteria

- Canonical playbooks for model outage, tool degradation, and cost spikes are published.
- Every playbook step references real runtime identifiers.
- Plan 20 operability gap is closed with checklist + drill evidence tracked in queue artifacts.
