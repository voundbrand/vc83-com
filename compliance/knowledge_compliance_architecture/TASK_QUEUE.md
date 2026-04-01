# Agentic Knowledge + Compliance Architecture Task Queue

**Last updated:** 2026-03-27  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture`  
**Source request:** Bird's-eye architecture regroup for platform/org/project knowledge context, agent orchestration, and compliance workflows.

| `KCA-012` | `A` | 4 | `P0` | `DONE` | `KCA-011` | Extend architecture docs for dual-scope compliance operations (`org mode` + `platform mode`) with deterministic authority boundaries and rollout constraints. | `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/SESSION_PROMPTS.md` | `npm run docs:guard` | Completed 2026-03-27. Docs extended for dual-scope operations and fail-closed platform-org authority boundaries. Verify PASS: `npm run docs:guard`. |
| `KCA-013` | `C` | 4 | `P0` | `DONE` | `KCA-012` | Add backend authority contract for platform mode: allow super-admin compliance decision mutations only when target org equals configured platform org; keep tenant orgs read-only for super-admin decisions. | `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceOutreachAgent.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceTransferWorkflow.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceSecurityWorkflow.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/lib/platformOrg.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/compliance/complianceInheritancePolicy.test.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/e2e/compliance/compliance-inbox-gate.spec.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-27. Added fail-closed platform-org resolver and mutation authority checks across governance, outreach, transfer, and security workflows. Verify PASS: `npm run typecheck`; `npm run test:unit`; `npm run docs:guard`. |
| `KCA-014` | `D` | 4 | `P0` | `DONE` | `KCA-013` | Add Compliance Center scope switch (`Org mode` vs `Platform mode`) for super-admin and route Inbox/Evidence/Governance org IDs deterministically by selected mode. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/compliance-window.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/compliance-org-governance-tab.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/compliance-evidence-vault-tab.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-27. Super-admin scope mode UI now routes compliance tabs to selected org context and editability follows backend platform-org authority contract. Verify PASS: `npm run typecheck`; `npm run test:unit`; `npm run docs:guard`. |
| `KCA-015` | `D` | 4 | `P1` | `DONE` | `KCA-014` | Ship platform trust-package operator surface (download/export of platform compliance package and explicit version metadata) in existing Compliance Center. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/compliance-evidence-vault-tab.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceEvidenceVault.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-27. Added `getCompliancePlatformTrustPackage` contract (versioned advisory package entries + per-entry download readiness) and Evidence Vault trust-package export/download UI with manifest export support. Verify PASS: `npm run typecheck`; `npm run test:unit`; `npm run docs:guard`. |
| `KCA-016` | `C` | 4 | `P1` | `DONE` | `KCA-013` | Complete AVV lane persistence wiring so wizard completion and outreach queue state stay in sync with deterministic planner metrics. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/compliance-inbox-wizard.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/compliance-inbox-tab.tsx`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceOutreachAgent.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-27. AVV wizard completion now persists outreach dossiers/state, planner emits deterministic AVV follow-up actions, and inbox callback re-selects deterministic next action after completion. Verify PASS: `npm run typecheck`; `npm run test:unit`; `npm run docs:guard`. |

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. At most one row may be `IN_PROGRESS` globally.
3. Promote `PENDING` to `READY` only when all dependencies are `DONE`.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Every row must execute listed `Verify` commands before moving to `DONE`.
6. Fail-closed behavior is mandatory for authority, evidence, and mutating actions.
7. Human approval gates are required for external comms and high-risk compliance mutations.
8. Keep source-of-truth and index state explicit; no silent fallback to stale knowledge.
9. Preserve org isolation: cross-org reads/writes require explicit policy and audit.
10. Keep `TASK_QUEUE.md`, `SESSION_PROMPTS.md`, `INDEX.md`, and `MASTER_PLAN.md` synchronized.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-UNIT` | `npm run test:unit` |
| `V-INTEG` | `npm run test:integration` |
| `V-E2E-DESKTOP` | `npm run test:e2e:desktop` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Architecture contract and ADR decisions | workstream docs + ADR specs | no runtime code changes |
| `B` | Knowledge system contract (SoT, indexing, retrieval, citations) | `convex/organizationMedia.ts`, `convex/ai/*`, schemas | avoid compliance mutation logic |
| `C` | Compliance execution model (planner, executor, approvals, audit) | `convex/compliance*`, `convex/ai/orgAction*` | avoid frontend layout/theme edits |
| `D` | UI integration for context boundaries and evidence-grade citations | `src/components/window-content/*` | avoid deep schema migrations |
| `E` | Migration, validation, and rollout hardening | tests + telemetry + docs | starts after lanes `B/C` P0 closure |

---

## Dependency-based status flow

1. Lane `A` rows must be `DONE` before lane `B` or `C` starts.
2. Lane `D` starts only after `KCA-004` and `KCA-006` are `DONE`.
3. Lane `E` starts only after all lane `B` and lane `C` `P0` rows are `DONE`.
4. Any blocked `P0` row halts promotion of dependent rows.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `KCA-001` | `A` | 1 | `P0` | `DONE` | - | Produce current-state architecture map (storage, retrieval, tools, UI entry points, authority, fail-closed inventory). | `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/INDEX.md` | `npm run docs:guard` | Completed 2026-03-25 (architecture regroup baseline). |
| `KCA-002` | `A` | 1 | `P0` | `DONE` | `KCA-001` | Define scope boundaries for platform/mother-org, tenant/org, and project context with authority and inheritance semantics. | `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/MASTER_PLAN.md` | `npm run docs:guard` | Completed 2026-03-25. |
| `KCA-003` | `A` | 1 | `P0` | `DONE` | `KCA-002` | Select target orchestration model (single-agent vs planner/evaluator vs hybrid) and publish recommendation rationale. | `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/MASTER_PLAN.md` | `npm run docs:guard` | Completed 2026-03-25. |
| `KCA-004` | `B` | 2 | `P0` | `DONE` | `KCA-003` | Add canonical knowledge context contract (`platform|org|project`) with required provenance and confidence fields. | `/Users/foundbrand_001/Development/vc83-com/convex/organizationMedia.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/aiSchemas.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-25; canonical scope/provenance/confidence contracts now emitted in retrieval + runtime telemetry. |
| `KCA-005` | `B` | 2 | `P0` | `DONE` | `KCA-004` | Implement evidence-grade citation linking from retrieved chunks/references to immutable evidence objects where applicable. | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceEvidenceVault.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-25; citations now classify as `auditable_evidence` when linked to active immutable evidence objects, otherwise `advisory_reference`. |
| `KCA-006` | `C` | 2 | `P0` | `DONE` | `KCA-003` | Define compliance action runtime contract: plan -> gate -> execute -> verify -> audit with explicit human approval checkpoints. | `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceOutreachAgent.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/orgActionPolicy.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-25; lifecycle envelope + approval checkpoint gating now emitted for core Governance + Outreach mutations with deterministic audit snapshots. |
| `KCA-007` | `C` | 2 | `P0` | `DONE` | `KCA-006` | Enforce deterministic approval policy mapping for Inbox/Vault/Governance actions (`owner_only`, `approval_required`, `agent_auto_allowed`). | `/Users/foundbrand_001/Development/vc83-com/convex/ai/orgActionPolicy.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/orgAgentActionRuntimeSchemas.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-25; explicit compliance surface policy map now resolves deterministic Inbox/Vault/Governance decisions ahead of generic fallback logic. |
| `KCA-008` | `D` | 3 | `P1` | `DONE` | `KCA-004`, `KCA-006` | Update Finder/Layers/Compliance AI kickoff payload UX to show scope, authority, and citation quality labels to operator. | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/finder-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/ai-chat-window/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/src/components/layers/layers-canvas.tsx` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-25; Finder + Layers kickoff UX now surfaces scope/authority/citation labels, AI kickoff payloads include deterministic label tokens, and kickoff shell shows labels for knowledge/layers/compliance contexts. Verify: PASS (`npm run typecheck`, `npm run test:unit`, `npm run docs:guard`). |
| `KCA-009` | `E` | 3 | `P0` | `DONE` | `KCA-005`, `KCA-007` | Add regression tests for fail-closed behavior across missing evidence, cross-org access, stale references, and blocked GO attempts. | `/Users/foundbrand_001/Development/vc83-com/tests/unit/compliance`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai`; `/Users/foundbrand_001/Development/vc83-com/tests/e2e/compliance` | `npm run test:unit`; `npm run test:integration`; `npm run docs:guard` | Completed 2026-03-25; regression matrix now covers blocked GO posture, cross-org share denial, and stale/missing evidence fail-closed behavior in unit + integration suites. |
| `KCA-010` | `E` | 3 | `P1` | `DONE` | `KCA-009` | Ship migration rollout package: telemetry dashboards, runbooks, and controlled enablement flags for new contracts. | `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/compliance/knowledge_compliance_architecture/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts` | `npm run docs:guard`; `npm run typecheck` | Completed 2026-03-25. Files finalized for this row: `convex/complianceControlPlane.ts`, `compliance/knowledge_compliance_architecture/MASTER_PLAN.md`, `compliance/knowledge_compliance_architecture/INDEX.md`, `compliance/knowledge_compliance_architecture/TASK_QUEUE.md`, `compliance/knowledge_compliance_architecture/SESSION_PROMPTS.md`. Verify PASS: `npm run docs:guard`, `npm run typecheck`. Dependency promotion: `KCA-011` selected as next deterministic row and moved to `IN_PROGRESS`. |
| `KCA-011` | `C` | 3 | `P1` | `DONE` | `KCA-007` | Add global shadow-mode compliance evaluator for non-compliance surfaces (non-blocking), with would-block telemetry and per-surface feature flags. | `/Users/foundbrand_001/Development/vc83-com/convex/complianceControlPlane.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/schemas/orgAgentActionRuntimeSchemas.ts` | `npm run typecheck`; `npm run test:unit`; `npm run docs:guard` | Completed 2026-03-25. Files changed: `convex/complianceControlPlane.ts`, `convex/ai/agentExecution.ts`, `convex/schemas/orgAgentActionRuntimeSchemas.ts`, `tests/unit/compliance/complianceShadowModeEvaluator.test.ts`, `tests/unit/ai/orgAgentActionRuntimeSchemas.test.ts`. Verify PASS: `npm run typecheck`, `npm run test:unit`, `npm run docs:guard`. Additional baseline fixes during verify: `convex/ai/orgAgentFollowUpRuntime.ts` (`ctx.db` typing), `tests/unit/ai/derTerminmacherOrchestration.test.ts` (deterministic preview-call ID assertion hardening). Dependency promotion: none (terminal queue row).

---

## Current kickoff

- Active task: none.
- Deterministic next row: none (queue extension `KCA-012`..`KCA-016` complete).
