# Agentic Knowledge + Compliance Architecture Master Plan

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/platform/knowledge_compliance_architecture`  
**Last updated:** 2026-03-25

---

## Objective

Ship a practical target architecture for knowledge + agents + compliance that:

1. Preserves strict platform/org/project boundaries.
2. Keeps compliance decisions evidence-backed and auditable.
3. Uses fail-closed defaults for missing context, missing evidence, and authority mismatches.
4. Supports incremental migration from current runtime with minimal disruption.

---

## Current state in this codebase

1. Org-scoped knowledge retrieval is implemented through `organizationKnowledgeChunks` and `organizationMedia`.
2. Finder->AI knowledge kickoff exists and passes selected references as runtime context.
3. Compliance center has Inbox/Vault/Governance with strong owner/super-admin authority split.
4. AVV outreach, transfer workflow, security workflow, and gate evaluation already enforce many fail-closed checks.
5. Agent runtime is centralized in `convex/ai/agentExecution.ts` with layered tool scoping and audit telemetry.

---

## Gaps

1. No canonical cross-scope context contract across platform/org/project.
2. Finder-provided references are useful context but not yet fully treated as evidence-grade artifacts.
3. Retrieval and citation layers are partially disconnected from compliance evidence provenance.
4. Orchestration patterns are mixed; planning/evaluation semantics are not consistently explicit per workflow.
5. Freshness and version semantics for knowledge indexes are not elevated as first-class runtime policy decisions.

## Pre-work decisions (before coding starts)

1. Canonical schema ownership: confirm one source for `scope`, `authority`, and citation class enums.
2. Default classification policy: decide whether legacy items default to `advisory_reference` and who can promote to `auditable_evidence`.
3. Scope resolution rules: finalize default scope selection precedence (`project` override vs `org` fallback vs explicit `platform`).
4. Shadow-mode thresholds: define promote-to-enforce criteria (false-positive tolerance, minimum sample size, and review owner).
5. Feature-flag rollout model: choose per-surface flags (Finder, Layers, AI Chat, Compliance Center) and tenant override behavior.
6. Telemetry contract: finalize event names and required fields for would-block decisions, approvals, and evidence completeness.

---

## Target state

1. Hybrid orchestration: deterministic planner/evaluator guardrails around a primary execution agent.
2. Canonical context contract with required scope and authority metadata on every retrieval/action turn.
3. Knowledge pipeline separates advisory knowledge from compliance-grade evidence, with explicit citation classes.
4. Compliance action lifecycle is standardized: `plan -> gate -> execute -> verify -> audit`.
5. Human approval gates are consistent for external comms and risk-bearing mutations.
6. Global policy evaluator runs in shadow mode for non-compliance surfaces before strict enforcement rollout.

---

## Implementation chunks

### Phase 0 (Week 1): Minimal viable architecture contract

1. Finalize context boundary contract (`platform`, `org`, `project`) and runtime enforcement points.
2. Add citation classes (`advisory_reference`, `auditable_evidence`) and enforce fail-closed behavior for evidence-required decisions.
3. Standardize compliance action policy mapping using existing `owner_only|approval_required|agent_auto_allowed` decisions.

### Phase 1 (Week 2): Integration and reliability

1. Wire Finder/Layers/Compliance kickoff payloads to include explicit scope + authority labels in UI and runtime metadata.
2. Add regression tests for cross-org isolation, stale reference handling, and blocked GO attempts.
3. Add telemetry for citation quality, evidence completeness, and approval-gate outcomes.
4. Add non-blocking shadow compliance evaluation for non-compliance surfaces with would-block analytics.

### Phase 2 (Post-2-week hardening): Migration and rollout

1. Backfill legacy contexts into canonical contract format.
2. Roll out feature flags per workflow surface.
3. Publish operator runbook and residual-risk go/no-go report.

### Phase 2 rollout package (`KCA-010`)

1. Telemetry dashboard contract is now anchored to `compliance_operational_telemetry_v1` and exposed via `getComplianceMigrationRolloutPackage` in `convex/complianceControlPlane.ts`.
2. Runbook bundle is explicit and deterministic:
`/Users/foundbrand_001/Development/vc83-com/docs/platform/knowledge_compliance_architecture/MASTER_PLAN.md`
`/Users/foundbrand_001/Development/vc83-com/docs/platform/knowledge_compliance_architecture/TASK_QUEUE.md`
`/Users/foundbrand_001/Development/vc83-com/docs/platform/knowledge_compliance_architecture/SESSION_PROMPTS.md`
3. Controlled enablement flags (override object path: `objects(type="compliance_rollout_flag_bundle", subtype="migration_controls", name="compliance_migration_rollout_flags").customProperties.complianceRolloutFlags`):
`telemetryDashboardsEnabled` (default `true`)
`runbooksEnabled` (default `true`)
`contextLabelEnforcementEnabled` (default `true`)
`shadowModeEvaluatorEnabled` (default `false`)
`strictEnforcementEnabled` (default `false`; only effective when shadow mode is enabled)
4. Strict-enforcement readiness is fail-closed and only reports ready when strict enforcement flag is enabled, critical alert count is `0`, and effective gate status is `GO`.

---

## Validation

1. `npm run docs:guard`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run test:integration`

---

## Exit criteria

1. Every compliance-critical agent action has explicit authority + evidence contract checks.
2. Citation output differentiates advisory context from auditable evidence.
3. Cross-scope retrieval is blocked unless explicitly authorized and audited.
4. Phase 0/1 deliverables pass verification gates and are reflected in queue artifacts.

---

## Risks and mitigations

1. Risk: Over-centralizing orchestration in one runtime file increases change risk.  
Mitigation: Keep shared kernel but move policy contracts into narrow modules with tests.
2. Risk: Evidence/advisory citation confusion causes false confidence.  
Mitigation: Enforce citation classes and fail-closed when auditable evidence is required.
3. Risk: Scope leaks across platform/org/project.  
Mitigation: Mandatory scope fields and deny-by-default cross-scope queries.
4. Risk: Workflow friction from too many approvals.  
Mitigation: Limit approvals to high-risk/external actions; keep low-risk reads auto-allowed.
5. Risk: Shadow-mode signal noise creates low-trust telemetry.  
Mitigation: Start with a narrow policy subset, add per-surface sampling controls, and define clear promote-to-enforce thresholds.

---

## Execution log

1. 2026-03-25: Runtime architecture audit against `convex/ai/agents/ARCHITECTURE.md` completed; removed direct Der Terminmacher contract fallback from `convex/ai/agentExecution.ts` so runtime-module discovery flows only through `convex/ai/agents/runtimeModuleRegistry.ts`.
2. 2026-03-25: Lane `D` row `KCA-008` started to surface scope, authority, and citation quality labels in Finder/Layers/Compliance AI kickoff UX.
3. 2026-03-25: `KCA-008` completed with deterministic kickoff label contracts (`scope`, `authority`, `citation quality`) surfaced in Finder + Layers launch UX and AI kickoff shell for knowledge/layers/compliance contexts; verify gates passed (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`).
4. 2026-03-25: Lane `E` row `KCA-010` started (migration rollout package with telemetry, runbooks, and controlled enablement flags).
5. 2026-03-25: `KCA-010` blocked on required verify baseline (`npm run typecheck`) due unrelated error in `convex/ai/agentCatalogAdmin.ts:4869` (`topologyCompatibility` missing in `ResolvedTemplateCertificationContext` assignment). `npm run docs:guard` passed. Unblock requires baseline type-contract repair before row can be marked `DONE`.
6. 2026-03-25: Baseline unblock verified (`npm run typecheck` PASS) after restoring topology compatibility contract in `convex/ai/agentCatalogAdmin.ts`; `KCA-010` resumed to `IN_PROGRESS` pending row verify closure.
7. 2026-03-25: `KCA-010` completed. Verify PASS: `npm run docs:guard`, `npm run typecheck`. Dependency promotion moved `KCA-011` to `IN_PROGRESS` as the next deterministic row.
8. 2026-03-25: `KCA-011` completed (shadow-mode evaluator for non-compliance surfaces + would-block telemetry + per-surface rollout flags). Verify PASS: `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`.
9. 2026-03-25: Additional baseline verification fixes landed during `KCA-011` closure cycle: `convex/ai/orgAgentFollowUpRuntime.ts` DB context typing guard and deterministic test hardening in `tests/unit/ai/derTerminmacherOrchestration.test.ts`. Queue reached terminal state (`KCA-001`..`KCA-011` all `DONE`).
