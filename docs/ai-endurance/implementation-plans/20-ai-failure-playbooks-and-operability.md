# 20 Implementation Plan: AI Failure Playbooks and Runtime Operability

<!-- ci:ai-endurance-plan-template=v1 -->

## Objective

Close the remaining open operations gap by codifying actionable failure playbooks and integrating them with runtime observability and escalation signals.

## Current state in this codebase

- SLO thresholds and alerting primitives exist (`convex/ai/platformAlerts.ts`).
- Dead-letter retry exists for outbound delivery (`convex/ai/deadLetterQueue.ts`).
- Escalation and degraded-mode signals are emitted in runtime paths.
- Master plan still calls out missing failure playbooks.

## Gaps

- No canonical runbook for model outage, tool degradation, and cost spike incidents.
- Alert-to-action mapping is not centralized.
- On-call triage flow and rollback steps are not standardized.
- Release gates are not linked to specific incident playbook triggers.

## Target state

- Canonical playbooks exist and are linked to telemetry signals.
- Each incident class has clear detection, containment, recovery, and postmortem steps.
- Runtime docs include command/query snippets for fast triage.
- Closure criteria for incident resolution are standardized.

## Implementation chunks

1. Author model outage playbook with failover and communication steps.
2. Author tool degradation playbook with degraded-mode and escalation steps.
3. Author cost-spike playbook with throttling and policy fallback steps.
4. Link playbooks to alert IDs and release-gate conditions.
5. Add periodic operability review checklist and ownership mapping.

## Validation

- `npm run docs:guard` on all playbook updates.
- Tabletop drill for one incident in each playbook category.
- Verify alert names/queries referenced in docs exist in code.

## Risks

- Playbooks can rot if not tied to actual alert/query names.
- Overly generic runbooks may be ignored during real incidents.
- Missing ownership assignment can block incident response execution.

## Exit criteria

- All three core incident playbooks are published and reviewed.
- Each playbook maps to specific runtime signals and responders.
- Master plan residual gap for failure playbooks is fully closed.
