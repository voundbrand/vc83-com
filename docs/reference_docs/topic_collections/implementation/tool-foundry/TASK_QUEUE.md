# Tool Foundry Task Queue

**Last updated:** 2026-03-01  
**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry`  
**Source request:** Build a world-class Tool Foundry so agents can safely create new tools alongside human operators without bypassing one-agent trust and approval boundaries.

---

## Queue rules

1. Allowed statuses are only: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
2. Only one task may be `IN_PROGRESS` globally unless lane policy explicitly allows one active row per lane.
3. Promote from `PENDING` to `READY` only when all dependencies are satisfied by dependency token rules.
4. Deterministic pick order is `P0` before `P1`, then lowest task ID.
5. Any capability escalation or secret/network scope expansion must fail closed unless explicit approval and evidence requirements are satisfied.
6. Tool Foundry must never invent backend behavior in production; unsupported requests must return deterministic `blocked` outcomes with unblocking steps.
7. Every row must run listed `Verify` commands before moving to `DONE`.
8. Sync `INDEX.md`, `MASTER_PLAN.md`, `TASK_QUEUE.md`, and `SESSION_PROMPTS.md` after each lane milestone.
9. Keep row size to 1-2 hour slices with explicit verification commands.
10. Record blockers in `Notes` and continue with the next deterministic `READY` row.
11. Frontline intake routing must remain interview-first and only call `request_feature` after explicit user confirmation evidence.

---

## Dependency token rules

1. `ID`: dependency must be `DONE` before this row can move `PENDING` -> `READY`.
2. `ID@READY`: dependency must be `READY` or `DONE` before this row can move `PENDING` -> `READY`.
3. `ID@DONE_GATE`: row may become `READY`/`IN_PROGRESS`, but cannot move to `DONE` until dependency is `DONE`.

---

## Verification profiles

| Profile | Command |
|---|---|
| `V-DOCS` | `npm run docs:guard` |
| `V-TYPE` | `npm run typecheck` |
| `V-LINT` | `npm run lint` |
| `V-UNIT-TF` | `npm run test:unit:tool-foundry` |
| `V-TF-GUARD` | `npm run tool-foundry:guard` |

---

## Execution lanes

| Lane | Purpose | Primary ownership | Merge-overlap policy |
|---|---|---|---|
| `A` | Charter, risk model, and canonical contracts | Workstream docs and policy contracts | No runtime integration before lane `A` `P0` rows are `DONE` |
| `B` | Stage policy and execution authorization contracts | `convex/ai/toolFoundry/*`; tests | Keep logic deterministic and side-effect free |
| `C` | Runtime gap-path integration | `convex/ai/agentExecution.ts`; `convex/ai/agentToolOrchestration.ts` | Do not bypass existing trust/event scaffolds |
| `D` | CI and anti-regression guardrails | `scripts/ci/*`; `.github/workflows/*` | Enforce tests/docs evidence for foundry changes |
| `E` | Observability and trust telemetry | `convex/ai/trustEvents.ts`; docs and tests | Keep approval evidence machine-verifiable |
| `F` | Pilot, rollout gates, closeout | tests + docs + runbooks | Close only when all `P0` rows are `DONE` or `BLOCKED` |

---

## Dependency-based status flow

1. Start with lane `A` (`TFD-001`, `TFD-002`).
2. Lane `B` starts after lane `A` `P0` rows are `DONE`.
3. Lane `D` can start after `TFD-003` is `DONE`.
4. Lane `C` starts after `TFD-004` and `TFD-006` are `DONE`.
5. Lane `E` starts after `TFD-005` is `DONE` (enables `TFD-007`).
6. Lane `F` starts after lane `C` and lane `E` `P0` rows are `DONE`.

---

## Task queue

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
|---|---|---:|---|---|---|---|---|---|---|
| `TFD-001` | `A` | 1 | `P0` | `DONE` | - | Create dedicated Tool Foundry queue-first workstream with deterministic lane contracts and execution guardrails | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/SESSION_PROMPTS.md` | `V-DOCS` | Completed 2026-02-26 in this run; queue-first scaffold created with deterministic schema, lane gates, and verify profiles. Verification: `npm run docs:guard` -> `Docs guard passed.` |
| `TFD-002` | `A` | 1 | `P0` | `DONE` | `TFD-001` | Freeze promotion-stage and execution-authorization invariants (`draft`/`staged`/`canary`/`trusted`) as machine-testable contracts | `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/contracts.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md` | `V-UNIT-TF`; `V-TYPE` | Completed 2026-02-26 in this run; deterministic stage-promotion + execution authorization contract introduced with unit coverage. Verification: `npm run typecheck` passed; `npm run test:unit:tool-foundry` passed (`13` tests). |
| `TFD-003` | `B` | 2 | `P0` | `DONE` | `TFD-002` | Add capability-limited execution policy matrix and deny-by-default decisioning helpers for capability/scope/token checks | `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/contracts.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts` | `V-UNIT-TF`; `V-TYPE` | Completed 2026-02-26 in this run as part of shared contracts module and tests. Verification reused `TFD-002` stack (`V-TYPE`, `V-UNIT-TF`) and passed. |
| `TFD-004` | `D` | 2 | `P0` | `DONE` | `TFD-001` | Add Tool Foundry CI guard script + workflow to enforce tests/docs coupling for foundry code changes | `/Users/foundbrand_001/Development/vc83-com/scripts/ci/check-tool-foundry-guard.sh`; `/Users/foundbrand_001/Development/vc83-com/.github/workflows/tool-foundry-guard.yml`; `/Users/foundbrand_001/Development/vc83-com/package.json` | `V-TF-GUARD` | Completed 2026-02-26 in this run; guard script and workflow added with diff-aware enforcement. Verification: `npm run tool-foundry:guard` -> `Tool Foundry guard passed.` |
| `TFD-005` | `C` | 3 | `P0` | `DONE` | `TFD-003`, `TFD-004` | Implement runtime `capability gap` path: when no internal concept/tool exists, return deterministic `blocked` + unblocking plan and emit proposal artifact | `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentExecution.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/agentToolOrchestration.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/executionRuntimeContracts.test.ts` | `V-TYPE`; `V-UNIT-TF` | Completed 2026-02-26 in this run; unknown-tool runtime path now returns deterministic `blocked` payload with missing-contract details, unblocking steps, and ToolSpec draft artifact metadata. Verification: `npm run typecheck` passed; `npm run test:unit:tool-foundry` passed (`13` tests); `npx vitest run tests/unit/ai/executionRuntimeContracts.test.ts` passed (`7` tests); `npm run docs:guard` passed. |
| `TFD-006` | `C` | 3 | `P1` | `DONE` | `TFD-005` | Persist `ToolSpec` proposals (inputs/outputs, capabilities, risk labels, verification intent) as deterministic backlog artifacts | `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/*`; `/Users/foundbrand_001/Development/vc83-com/convex/schema.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts` | `V-TYPE`; `V-UNIT-TF` | 2026-02-26: transitioned `PENDING` -> `READY` -> `IN_PROGRESS` -> `DONE`. Deterministic backlog upsert + provenance/trace + rollback semantics implemented and runtime-wired. Verify: `npm run typecheck` passed; `npm run test:unit:tool-foundry` passed (`16` tests); targeted `npx vitest run tests/unit/ai/toolFoundryContracts.test.ts -t "tool foundry proposal backlog persistence contracts"` passed (`3` tests, `13` skipped); `npm run docs:guard` passed. |
| `TFD-007` | `E` | 4 | `P0` | `DONE` | `TFD-005` | Extend trust events for foundry lifecycle (`proposal_created`, `promotion_requested`, `promotion_granted`, `promotion_denied`, `execution_blocked`) | `/Users/foundbrand_001/Development/vc83-com/convex/ai/trustEvents.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/trustEventTaxonomy.test.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md` | `V-TYPE`; `V-UNIT-TF`; `V-DOCS` | 2026-02-27: completed lifecycle trust telemetry hardening. Added required foundry evidence fields (`correlation_id`, `lineage_id`, `thread_id`, `workflow_key`, `frontline_intake_trigger`, `boundary_reason`) and wired runtime + proposal/promotion emissions with deterministic boundary metadata. Verify: `npm run typecheck` passed; `npm run test:unit:tool-foundry` passed (`16` tests); `npx vitest run tests/unit/ai/trustEventTaxonomy.test.ts` passed (`16` tests); `npm run docs:guard` passed. |
| `TFD-008` | `E` | 4 | `P1` | `DONE` | `TFD-007` | Add operator-facing foundry evidence view contract (policy checks, test evidence, approval chain, canary metrics, rollback readiness) | `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/*`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md` | `V-TYPE`; `V-LINT`; `V-UNIT-TF` | 2026-02-27: completed read-only evidence view contract in `/Users/foundbrand_001/Development/vc83-com/src/components/window-content/agents/tool-foundry-evidence-contract.ts` with deterministic policy/test/approval/canary/rollback sections and explicit operator-mobile feature-flag gate. Verification: `npm run typecheck` passed; `npm run lint` passed (0 errors, existing repo warnings only); `npm run test:unit:tool-foundry` passed (`19` tests); `npm run docs:guard` passed. |
| `TFD-009` | `F` | 5 | `P0` | `DONE` | `TFD-005`, `TFD-007` | Pilot two real gap scenarios (one read-only, one mutating) and prove deterministic `blocked`/proposal/promotion behavior | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryContracts.test.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md` | `V-TYPE`; `V-UNIT-TF`; `V-DOCS` | 2026-02-27: completed pilot coverage in `tests/unit/ai/toolFoundryContracts.test.ts` with deterministic read-only and mutating gap scenarios, negative controls for approval bypass and capability escalation, and desktop/mobile evidence contract parity check when mobile flag is enabled. Verification: `npm run typecheck` passed; `npm run test:unit:tool-foundry` passed (`22` tests); `npm run docs:guard` passed. |
| `TFD-010` | `F` | 5 | `P1` | `DONE` | `TFD-009` | Closeout: publish rollout recommendation, residual risks, rollback path, and synchronized queue artifacts | `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/TASK_QUEUE.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/INDEX.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/SESSION_PROMPTS.md` | `V-DOCS` | 2026-02-27: closeout completed. Rollout recommendation: proceed with controlled desktop/web Tool Foundry rollout under current trust gates; operator-mobile full rollout decision is `NO-GO` until dedicated intake entrypoint + parity regression suite land; feature-flag contract-only parity remains `GO`. Rollback path: freeze promotions to `canary`/`trusted`, force mutating execution to `require_approval`, disable mobile parity flag, and apply proposal rollback plans per backlog trace keys. Verification: `npm run docs:guard` passed. |
| `TFD-011` | `B` | 6 | `P0` | `DONE` | `TFD-010` | Add caller-ready Tool Foundry promotion decision mutation (`sessionId`-based) so UI/integration callers can adopt hardened backend path immediately | `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/proposalBacklog.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryGovernance.test.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/INTEGRITY_CONTRACT.md` | `V-TYPE`; `V-UNIT-TF`; `V-DOCS` | 2026-03-01: completed by adding `submitProposalPromotionDecision` (`mutation`) with session-auth + super-admin fail-closed enforcement and regression coverage. |
| `TFD-012` | `B` | 6 | `P0` | `DONE` | `TFD-011` | Remove ambiguity from internal promotion-decision contract by requiring explicit `actorUserId` in internal mutation path | `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/proposalBacklog.ts`; `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryGovernance.test.ts` | `V-TYPE`; `V-UNIT-TF` | 2026-03-01: completed by making `actorUserId` required in `resolveProposalPromotionDecision` args and preserving super-admin gate. |
| `TFD-013` | `A` | 6 | `P1` | `DONE` | `TFD-011`, `TFD-012` | Add immutable-core governance drift guard so critical tool contracts cannot evolve without explicit core allowlist update | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/toolFoundryGovernance.test.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/toolFoundry/integrity.ts`; `/Users/foundbrand_001/Development/vc83-com/convex/ai/tools/contracts.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md` | `V-UNIT-TF`; `V-DOCS` | 2026-03-01: completed with a deterministic test asserting `CRITICAL_TOOL_NAMES` remains covered by immutable `CORE_TOOL_CLASS_ALLOWLIST`. |
| `TFD-014` | `C` | 7 | `P0` | `DONE` | `TFD-013` | Wire operator-mobile boundary CTA entrypoint to launch frontline interview-first Tool Foundry intake kickoff in-thread when runtime policy blocks execution | `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/app/(tabs)/index.tsx`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/chat/frontlineFeatureIntake.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/i18n/translations.ts` | `V-TYPE`; `V-DOCS` | 2026-03-01: completed with fail-safe CTA gating from `policyError`, deterministic kickoff payload composition (`trigger=tool_failure`), and a scoped command-gate bypass for this intake path only so blocked-runtime states can still route feature intake. |
| `TFD-015` | `E` | 7 | `P0` | `DONE` | `TFD-014` | Add dedicated regression tests for operator-mobile kickoff prompt composition and boundary CTA launch gating behavior | `/Users/foundbrand_001/Development/vc83-com/tests/unit/ai/mobileFrontlineFeatureIntake.test.ts`; `/Users/foundbrand_001/Development/vc83-com/apps/operator-mobile/src/lib/chat/frontlineFeatureIntake.ts`; `/Users/foundbrand_001/Development/vc83-com/docs/reference_docs/topic_collections/implementation/tool-foundry/MASTER_PLAN.md` | `V-TYPE`; `V-UNIT-TF`; `V-DOCS` | 2026-03-01: completed with dedicated unit coverage for interview contract strings, explicit-confirmation requirement before `request_feature`, CTA visibility gating, and tool-failure kickoff launch payload derivation from runtime boundary signals. |

---

## Current kickoff

- Active task: none.
- Next promotable task: none (`TFD-001`..`TFD-015` are `DONE`).
- Immediate objective: maintain closeout posture and open a new queued workstream only for net-new Tool Foundry scope.
